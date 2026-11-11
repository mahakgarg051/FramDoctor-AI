"""
FarmDoctor AI - Personalized Crop-Care Action Plan Service
Synthesizes tailor-made agronomic action plans based on farmer's crop, growth stage,
historical scan records, verified scientific knowledge base entries, and live weather.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from backend.app.schemas import (
    PersonalizedActionPlanResponse,
    ReferenceSource,
)
from backend.app.services.farm_service import FarmService
from backend.app.services.scan_history_service import ScanHistoryService
from backend.app.services.knowledge_service import KnowledgeService
from backend.app.services.weather_service import WeatherService

logger = logging.getLogger("farmdoctor.action_plan")

# Growth-stage tailored physical inspection checklists
STAGE_INSPECTION_CHECKLISTS = {
    "seedling": [
        "Inspect seedling stem collars at the soil line for dark lesions or damping-off water-soaking.",
        "Check lower cotyledons and emerging true leaves for chlorotic yellowing or leaf-miner tracks.",
        "Verify seedling nursery tray soil drainage to prevent Pythium root-rot conditions."
    ],
    "vegetative": [
        "Turn over lower canopy leaves to inspect for early chlorotic halos and fungal target-board spots.",
        "Examine leaf undersides for aphid colonies, whiteflies, or early mite webbing.",
        "Assess inter-row air circulation; ensure foliage does not form an impenetrable micro-humidity pocket."
    ],
    "flowering": [
        "Inspect blossom clusters for petal blight, gray mold (Botrytis), or premature flower drop.",
        "Monitor morning leaf wetness duration; foliage remaining wet beyond 10:00 AM requires canopy pruning.",
        "Check mid-level leaves for upward progression of fungal or bacterial foliar spots."
    ],
    "fruiting": [
        "Inspect green fruit calyx and shoulders for concentric black spots or sunscald lesions.",
        "Verify that lower fruit clusters are mulched and do not touch wet soil.",
        "Check for localized fruit rot or cracking following alternating rain and dry spells."
    ],
    "harvest": [
        "Inspect harvested produce immediately for post-harvest latent anthracnose or soft rot.",
        "Assess post-season crop residue; infected plant debris must be removed, not tilled into soil.",
        "Plan next season's crop rotation; avoid planting related family crops in this plot."
    ]
}


class ActionPlanService:
    """Generates personalized, evidence-based agronomic action plans for farm plots."""

    def __init__(
        self,
        knowledge_service: Optional[KnowledgeService] = None,
        weather_service: Optional[WeatherService] = None
    ):
        self.knowledge_service = knowledge_service or KnowledgeService.get_instance()
        self.weather_service = weather_service or WeatherService()

    async def generate_action_plan(
        self,
        user_id: str,
        farm_id: str
    ) -> PersonalizedActionPlanResponse:
        """
        Synthesizes a personalized action plan for the farmer's plot.
        Enforces user ownership on the target farm.
        """
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Retrieve farm details (enforces user ownership)
        farm = FarmService.get_farm_by_id(user_id=user_id, farm_id=farm_id)

        crop_name = farm.get("crop_name", "Tomato")
        crop_variety = farm.get("crop_variety")
        growth_stage = farm.get("growth_stage", "Vegetative")
        location = farm.get("location", "Field Location")

        # 2. Retrieve recent scan history for this specific farm
        recent_scans = ScanHistoryService.get_user_scans(user_id=user_id, farm_id=farm_id)

        recent_diagnoses = [s["predicted_condition"] for s in recent_scans[:5]]
        diseased_scans = [s for s in recent_scans if not "healthy" in s["predicted_condition"].lower()]

        if diseased_scans:
            last_diseased = diseased_scans[0]
            recent_health_summary = (
                f"Previous inspections identified '{last_diseased['predicted_condition']}' "
                f"({last_diseased['confidence_percentage']}% confidence). Active pathogen vigilance recommended."
            )
        elif recent_scans:
            recent_health_summary = "Recent leaf scans indicate predominantly healthy foliar tissue. Maintain preventative routine."
        else:
            recent_health_summary = "No previous digital leaf scans recorded for this plot yet. Conducting baseline inspection recommended."

        # 3. Retrieve verified knowledge base entries for this crop
        matching_entries = self.knowledge_service.get_all(crop=crop_name)
        primary_knowledge = matching_entries[0] if matching_entries else None

        # 4. Fetch live microclimate weather for this location
        weather_summary = None
        weather_risk_note = None
        if self.weather_service.is_configured():
            try:
                w_resp = await self.weather_service.get_weather(location=location)
                if w_resp.configured and w_resp.temperature_celsius is not None:
                    weather_summary = (
                        f"{w_resp.location_name or location}: {round(w_resp.temperature_celsius)}°C, "
                        f"Relative Humidity {w_resp.relative_humidity}%, Wind {w_resp.wind_speed_kmh} km/h, "
                        f"Conditions: {w_resp.weather_condition or 'Clear'}"
                    )
                    if w_resp.relative_humidity and w_resp.relative_humidity >= 75:
                        weather_risk_note = (
                            f"High ambient humidity ({w_resp.relative_humidity}%) creates favorable conditions "
                            f"for foliar fungal sporulation. Avoid overhead irrigation."
                        )
            except Exception as e:
                logger.info(f"Weather lookup skipped in action plan: {e}")

        # 5. Synthesize What to Inspect Next
        stage_key = growth_stage.lower()
        matched_stage = "vegetative"
        for key in STAGE_INSPECTION_CHECKLISTS:
            if key in stage_key:
                matched_stage = key
                break

        what_to_inspect = list(STAGE_INSPECTION_CHECKLISTS[matched_stage])

        if diseased_scans:
            what_to_inspect.insert(
                0,
                f"Inspect foliage specifically for recurrence of '{diseased_scans[0]['predicted_condition']}'; "
                f"look for spreading necrotic lesions on older bottom leaves first."
            )

        if weather_risk_note:
            what_to_inspect.append(weather_risk_note)

        # 6. General Prevention Practices
        prevention_practices = []
        if primary_knowledge and primary_knowledge.prevention_practices:
            prevention_practices = list(primary_knowledge.prevention_practices)
        else:
            prevention_practices = [
                "Practice 3 to 4 year crop rotation avoiding related Solanaceous species.",
                "Install drip or root-zone irrigation to keep leaf surfaces dry during watering.",
                "Apply 2 to 3 inches of clean organic straw mulch to prevent soil-borne spore splashing.",
                "Prune lower suckers to maintain vertical airflow and daylight penetration through canopy."
            ]

        # 7. Suggested Follow-Up Observations
        follow_up_observations = [
            "Perform physical field walk-through inspections 2 to 3 times per week, ideally during mid-morning.",
            "Record new symptoms (leaf spots, stem cankers, or wilting) with photos in the Disease Scanner.",
            "Inspect field borders and wild nightshade weeds which can serve as alternate virus and blight reservoirs.",
            "Monitor soil moisture at 2-3 inches depth before scheduling the next irrigation cycle."
        ]

        # 8. When to Seek Expert Assistance
        expert_triggers = []
        if primary_knowledge and primary_knowledge.when_to_seek_expert:
            expert_triggers = list(primary_knowledge.when_to_seek_expert)
        else:
            expert_triggers = [
                "When foliar necrotic lesions spread across more than 15-20% of plants in a single block.",
                "If dark stem cankers girdle the main vine causing sudden daytime wilting and collapse.",
                "When cultural sanitation and organic bio-fungicides fail to arrest disease spread during rain spells.",
                "Before purchasing or applying any schedule chemical fungicide or restricted synthetic pesticide."
            ]

        # 9. Relevant Scientific References
        citations = []
        if primary_knowledge and primary_knowledge.references:
            citations = list(primary_knowledge.references[:3])
        else:
            citations = [
                ReferenceSource(
                    source_name="ICAR Agricultural Extension Disease Management Guidelines",
                    publisher="Indian Council of Agricultural Research (ICAR)",
                    source_url="https://icar.org.in"
                ),
                ReferenceSource(
                    source_name="TNAU Agritech Portal: Crop Protection Guidelines",
                    publisher="Tamil Nadu Agricultural University (TNAU)",
                    source_url="https://agritech.tnau.ac.in"
                )
            ]

        uncertainty_warning = (
            "This personalized action plan is generated as agronomic decision support based on recorded farm parameters "
            "and verified scientific knowledge. It does not replace field physical diagnosis by certified agricultural officers. "
            "Always consult your local Krishi Vigyan Kendra (KVK) before applying chemical inputs."
        )

        return PersonalizedActionPlanResponse(
            farm_id=farm_id,
            farm_name=farm["name"],
            crop_name=crop_name,
            crop_variety=crop_variety,
            growth_stage=growth_stage,
            location=location,
            weather_summary=weather_summary,
            recent_health_status=recent_health_summary,
            what_to_inspect_next=what_to_inspect,
            general_prevention_practices=prevention_practices,
            suggested_follow_up_observations=follow_up_observations,
            when_to_seek_expert=expert_triggers,
            relevant_sources=citations,
            uncertainty_warning=uncertainty_warning,
            generated_at=now_iso
        )
