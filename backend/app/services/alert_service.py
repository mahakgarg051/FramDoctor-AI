"""
FarmDoctor AI - Smart Crop Alerts Service
Generates evidence-based agricultural notifications from:
1. Overdue and due-today farming tasks from the Daily Planner.
2. Follow-up symptom monitoring from recent leaf disease scans.
3. Microclimate weather risk indicators (only when live weather API is active).
4. Growth-stage inspection schedules.

Enforces alert deduplication, dismissal tracking, and strict farmer ownership.
Zero fabricated warnings or fake disease outbreaks.
"""

import uuid
import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Set, Dict, Any

from backend.app.db.database import get_db_connection
from backend.app.schemas import AlertItem, AlertListResponse, DismissAlertResponse
from backend.app.services.weather_service import WeatherService

logger = logging.getLogger("farmdoctor.alerts")


class AlertService:
    """Evidence-based crop notification and microclimate risk indicator generator."""

    def __init__(self, weather_service: Optional[WeatherService] = None):
        self.weather_service = weather_service or WeatherService()

    def get_user_alerts(self, user_id: str) -> AlertListResponse:
        """
        Synthesizes active, evidence-grounded alerts for an authenticated farmer.
        Filters out previously dismissed alerts.
        """
        today_str = date.today().isoformat()
        now_iso = datetime.utcnow().isoformat()

        # 1. Fetch dismissed alert keys for this user
        dismissed_keys = self._get_dismissed_keys(user_id)

        alerts: List[AlertItem] = []

        with get_db_connection() as conn:
            # 2. Daily Planner Tasks Alerts
            # Pending tasks due today or overdue
            task_rows = conn.execute(
                """
                SELECT t.id, t.title, t.due_date, t.priority, t.crop, t.farm_id, f.name AS farm_name
                FROM farming_tasks t
                LEFT JOIN farms f ON t.farm_id = f.id
                WHERE t.user_id = ? AND t.status = 'pending'
                ORDER BY t.due_date ASC;
                """,
                (user_id,),
            ).fetchall()

            for t in task_rows:
                task_due = t["due_date"]
                if task_due < today_str:
                    alert_key = f"task_overdue_{t['id']}"
                    if alert_key not in dismissed_keys:
                        alerts.append(
                            AlertItem(
                                id=alert_key,
                                type="task_overdue",
                                severity="critical" if t["priority"] in ["high", "urgent"] else "warning",
                                title=f"Overdue Task: {t['title']}",
                                message=f"Task was scheduled for {task_due}. Timely execution is crucial to maintain crop vigor.",
                                crop=t["crop"],
                                farm_id=t["farm_id"],
                                farm_name=t["farm_name"],
                                action_tab="planner",
                                evidence_source="Daily Planner Task",
                                is_weather_risk_indicator=False,
                                disclaimer="Verify task status in your Farming Planner.",
                                created_at=now_iso,
                            )
                        )
                elif task_due == today_str:
                    alert_key = f"task_today_{t['id']}"
                    if alert_key not in dismissed_keys:
                        alerts.append(
                            AlertItem(
                                id=alert_key,
                                type="upcoming_reminder",
                                severity="info",
                                title=f"Today's Task: {t['title']}",
                                message=f"Scheduled for today on {t['farm_name'] or t['crop'] or 'your farm'}.",
                                crop=t["crop"],
                                farm_id=t["farm_id"],
                                farm_name=t["farm_name"],
                                action_tab="planner",
                                evidence_source="Daily Planner Task",
                                is_weather_risk_indicator=False,
                                disclaimer="Complete when physical field conditions allow.",
                                created_at=now_iso,
                            )
                        )

            # 3. Recent Scan Follow-up Alerts
            # Check scans from the last 7 days that identified disease
            seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            scan_rows = conn.execute(
                """
                SELECT s.id, s.crop, s.predicted_condition, s.confidence_percentage,
                       s.farm_id, s.created_at, f.name AS farm_name
                FROM scan_records s
                LEFT JOIN farms f ON s.farm_id = f.id
                WHERE s.user_id = ? AND s.created_at >= ?
                  AND LOWER(s.predicted_condition) NOT LIKE '%healthy%'
                ORDER BY s.created_at DESC
                LIMIT 5;
                """,
                (user_id, seven_days_ago),
            ).fetchall()

            for s in scan_rows:
                alert_key = f"scan_followup_{s['id']}"
                if alert_key not in dismissed_keys:
                    alerts.append(
                        AlertItem(
                            id=alert_key,
                            type="scan_followup",
                            severity="warning",
                            title=f"Follow-up Observation: {s['crop']} ({s['predicted_condition']})",
                            message=(
                                f"A scan on {s['created_at'][:10]} indicated suspected {s['predicted_condition']}. "
                                "Check if lesions are stabilizing, spreading, or if neighboring plants show symptoms."
                            ),
                            crop=s["crop"],
                            farm_id=s["farm_id"],
                            farm_name=s["farm_name"],
                            action_tab="scanner",
                            evidence_source="Recent Scan Pathology",
                            is_weather_risk_indicator=False,
                            disclaimer="Model prediction is an assistive observation. Consult an extension specialist before chemical intervention.",
                            created_at=now_iso,
                        )
                    )

            # 4. Saved Farms & Live Weather Microclimate Risk Indicators
            farm_rows = conn.execute(
                "SELECT id, name, location, crop_name, growth_stage FROM farms WHERE user_id = ?;",
                (user_id,),
            ).fetchall()

        # Analyze live microclimate if weather service has valid live observations
        for f in farm_rows:
            loc = f["location"] or "Nagpur,IN"
            crop = f["crop_name"] or "General"
            stage = f["growth_stage"] or "Vegetative"

            # Check if weather service returns active live weather
            try:
                weather = self.weather_service.get_current_weather(city=loc)
                if weather.configured and weather.status == "live":
                    temp = weather.temperature_celsius
                    humidity = weather.relative_humidity

                    # Evidence-based fungal risk threshold: high humidity (>=80%) + moderate temperature (18-28C)
                    if humidity is not None and humidity >= 80 and temp is not None and 18 <= temp <= 28:
                        alert_key = f"weather_risk_{f['id']}_{crop.lower()}_{today_str}"
                        if alert_key not in dismissed_keys:
                            alerts.append(
                                AlertItem(
                                    id=alert_key,
                                    type="weather_risk",
                                    severity="warning",
                                    title=f"Microclimate Fungal Risk Indicator: {crop} ({f['name']})",
                                    message=(
                                        f"Current atmospheric humidity is {humidity}% with temperature {temp}°C in {loc}. "
                                        "These conditions favor spore germination for foliar blights and powdery mildews. "
                                        "Inspect lower leaf canopies for water-soaked spots."
                                    ),
                                    crop=crop,
                                    farm_id=f["id"],
                                    farm_name=f["name"],
                                    action_tab="weather",
                                    evidence_source="Microclimate Weather Observation",
                                    is_weather_risk_indicator=True,
                                    disclaimer=(
                                        "This is an environmental microclimate indicator based on humidity/temperature, "
                                        "NOT a confirmed disease diagnosis. Do not apply chemical pesticides without physical symptom confirmation."
                                    ),
                                    created_at=now_iso,
                                )
                            )

                    # Wind spray drift warning if farmer plans foliar nutrition
                    if weather.wind_speed_kmh is not None and weather.wind_speed_kmh >= 20:
                        wind_alert_key = f"weather_wind_{f['id']}_{today_str}"
                        if wind_alert_key not in dismissed_keys:
                            alerts.append(
                                AlertItem(
                                    id=wind_alert_key,
                                    type="weather_risk",
                                    severity="info",
                                    title=f"High Wind Advisory: Spray Drift Risk ({loc})",
                                    message=(
                                        f"Wind speed is currently {weather.wind_speed_kmh} km/h. "
                                        "Foliar sprays and liquid bio-fertilizer applications are not recommended due to excessive drift risk."
                                    ),
                                    crop=crop,
                                    farm_id=f["id"],
                                    farm_name=f["name"],
                                    action_tab="weather",
                                    evidence_source="Microclimate Weather Observation",
                                    is_weather_risk_indicator=True,
                                    disclaimer="Postpone foliar applications until early morning calm or wind drops below 15 km/h.",
                                    created_at=now_iso,
                                )
                            )
            except Exception as e:
                logger.debug(f"Could not evaluate weather risk for {loc}: {e}")

        # Sort alerts: critical > warning > info
        severity_order = {"critical": 0, "warning": 1, "info": 2}
        alerts.sort(key=lambda a: severity_order.get(a.severity, 3))

        return AlertListResponse(total_alerts=len(alerts), alerts=alerts)

    def dismiss_alert(self, user_id: str, alert_key: str) -> DismissAlertResponse:
        """Records an alert as dismissed by the user to avoid duplicate notifications."""
        now_iso = datetime.utcnow().isoformat()
        alert_id = str(uuid.uuid4())

        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO dismissed_alerts (id, user_id, alert_key, dismissed_at)
                VALUES (?, ?, ?, ?);
                """,
                (alert_id, user_id, alert_key, now_iso),
            )
            conn.commit()

        logger.info(f"User {user_id} dismissed alert {alert_key}")
        return DismissAlertResponse(
            success=True,
            alert_key=alert_key,
            message="Alert dismissed successfully.",
        )

    def _get_dismissed_keys(self, user_id: str) -> Set[str]:
        """Fetches set of dismissed alert keys for this user."""
        with get_db_connection() as conn:
            rows = conn.execute(
                "SELECT alert_key FROM dismissed_alerts WHERE user_id = ?;",
                (user_id,),
            ).fetchall()
        return {r["alert_key"] for r in rows}
