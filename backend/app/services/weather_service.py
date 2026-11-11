"""
FarmDoctor AI - Live Weather Service
Integrates real microclimate and weather observations from weather providers (OpenWeatherMap or WeatherAPI).
Protects API keys in backend environment and handles unconfigured states safely.
"""

import os
import logging
from datetime import datetime
from typing import Optional, Tuple
import httpx

from backend.app.schemas import WeatherResponse, SprayAdvisory

logger = logging.getLogger("farmdoctor.weather_service")


class WeatherService:
    """
    Manages live weather queries, provider integrations, and agricultural spray advisories.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        provider: Optional[str] = None,
        default_city: Optional[str] = None
    ):
        self.api_key = api_key or os.environ.get("WEATHER_API_KEY", "").strip()
        self.provider = (provider or os.environ.get("WEATHER_PROVIDER", "openweathermap")).lower().strip()
        self.default_city = default_city or os.environ.get("WEATHER_DEFAULT_CITY", "Nagpur,IN").strip()

    def is_configured(self) -> bool:
        """Checks if a valid non-placeholder API key is configured."""
        if not self.api_key:
            return False
        # Check against common placeholder values
        placeholders = {"your_weather_api_key_here", "none", "null", "undefined", "xxx"}
        return self.api_key.lower() not in placeholders and len(self.api_key) > 5

    def _compute_spray_advisory(
        self,
        wind_speed_kmh: Optional[float],
        relative_humidity: Optional[int],
        rainfall_mm: Optional[float]
    ) -> SprayAdvisory:
        """
        Calculates whether current microclimate conditions are suitable for foliar spray.
        Foliar spray best practices:
        - Wind speed < 15 km/h to prevent spray drift.
        - No imminent rainfall (< 0.5 mm) to avoid chemical or bio-agent wash-off.
        - Relative humidity 40% - 75% for optimal droplet drying.
        """
        wind = wind_speed_kmh if wind_speed_kmh is not None else 10.0
        rain = rainfall_mm if rainfall_mm is not None else 0.0
        humidity = relative_humidity if relative_humidity is not None else 50

        # Unfavorable cases
        if rain > 0.5:
            return SprayAdvisory(
                is_favorable=False,
                headline="Unfavorable: Active or Imminent Rain",
                details="Active rainfall or precipitation will wash off foliar bio-fungicides or protective sprays before leaf absorption. Delay spraying until foliage has fully dried."
            )
        if wind > 18.0:
            return SprayAdvisory(
                is_favorable=False,
                headline="Unfavorable: High Wind Drift Risk",
                details=f"Current wind speed of {wind:.1f} km/h exceeds the 15 km/h safety threshold, causing significant droplet drift away from target leaf canopies and risking non-target exposure."
            )
        if humidity > 85:
            return SprayAdvisory(
                is_favorable=True,
                headline="Caution: Elevated Humidity & Spore Germination",
                details="Wind conditions are calm, but ambient humidity (>85%) strongly promotes fungal spore germination. If applying protective bio-fungicide, do so promptly on dry leaves."
            )

        # Favorable case
        return SprayAdvisory(
            is_favorable=True,
            headline="Favorable Foliar Spraying Window",
            details=f"Wind speed ({wind:.1f} km/h) is calm, rainfall risk is low, and ambient humidity ({humidity}%) allows uniform droplet adherence and drying on crop foliage."
        )

    async def get_weather(
        self,
        location: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None
    ) -> WeatherResponse:
        """
        Fetches real-time weather from the configured weather provider.
        If unconfigured, returns a clear unconfigured status without fabricating data.
        """
        if not self.is_configured():
            logger.info("[WeatherService] Live weather requested but WEATHER_API_KEY is not configured.")
            return WeatherResponse(
                configured=False,
                status="unconfigured",
                message=(
                    "Live weather API key is not configured. Add 'WEATHER_API_KEY=your_key' to your "
                    "'.env' file (e.g. from OpenWeatherMap or WeatherAPI free tier) to enable live farm weather."
                )
            )

        query_location = location or self.default_city

        try:
            if self.provider == "weatherapi":
                return await self._fetch_from_weatherapi(query_location, lat, lon)
            else:
                return await self._fetch_from_openweathermap(query_location, lat, lon)

        except httpx.HTTPStatusError as http_err:
            status_code = http_err.response.status_code
            logger.error(f"[WeatherService] Provider HTTP error {status_code}: {http_err.response.text}")
            if status_code == 401:
                return WeatherResponse(
                    configured=True,
                    status="error",
                    message="Weather provider authentication failed: Invalid WEATHER_API_KEY. Please verify your API key."
                )
            elif status_code == 404:
                return WeatherResponse(
                    configured=True,
                    status="error",
                    message=f"Location '{query_location}' was not found by the weather provider."
                )
            elif status_code == 429:
                return WeatherResponse(
                    configured=True,
                    status="error",
                    message="Weather provider rate limit exceeded. Please try again later."
                )
            else:
                return WeatherResponse(
                    configured=True,
                    status="error",
                    message=f"Weather provider error (HTTP {status_code})."
                )

        except httpx.RequestError as req_err:
            logger.error(f"[WeatherService] Network error reaching weather provider: {req_err}")
            return WeatherResponse(
                configured=True,
                status="error",
                message=f"Network error: Unable to reach weather provider ({type(req_err).__name__})."
            )
        except Exception as exc:
            logger.error(f"[WeatherService] Unexpected error: {exc}", exc_info=True)
            return WeatherResponse(
                configured=True,
                status="error",
                message="An unexpected error occurred while retrieving weather data."
            )

    async def _fetch_from_openweathermap(
        self,
        location: str,
        lat: Optional[float],
        lon: Optional[float]
    ) -> WeatherResponse:
        """Fetches from OpenWeatherMap API."""
        base_url = "https://api.openweathermap.org/data/2.5/weather"
        params = {
            "appid": self.api_key,
            "units": "metric"
        }
        if lat is not None and lon is not None:
            params["lat"] = str(lat)
            params["lon"] = str(lon)
        else:
            params["q"] = location

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(base_url, params=params)
            resp.raise_for_status()
            data = resp.json()

        # Parse OpenWeatherMap response
        city_name = data.get("name", location)
        sys_country = data.get("sys", {}).get("country", "")
        full_location = f"{city_name}, {sys_country}".strip(", ")

        coord = data.get("coord", {})
        main = data.get("main", {})
        wind = data.get("wind", {})
        rain = data.get("rain", {})
        weather_list = data.get("weather", [{}])

        temp_c = float(main.get("temp", 0.0))
        humidity = int(main.get("humidity", 0))
        wind_speed_kmh = round(float(wind.get("speed", 0.0)) * 3.6, 1)  # m/s to km/h
        rain_1h = float(rain.get("1h", 0.0)) if isinstance(rain, dict) else 0.0

        cond_desc = weather_list[0].get("description", "Unknown").capitalize()
        icon = weather_list[0].get("icon", "")

        spray_adv = self._compute_spray_advisory(wind_speed_kmh, humidity, rain_1h)

        return WeatherResponse(
            configured=True,
            status="live",
            message="Live weather retrieved successfully.",
            location_name=full_location,
            latitude=coord.get("lat"),
            longitude=coord.get("lon"),
            temperature_celsius=round(temp_c, 1),
            relative_humidity=humidity,
            wind_speed_kmh=wind_speed_kmh,
            rainfall_mm=round(rain_1h, 1),
            weather_condition=cond_desc,
            weather_icon=icon,
            observation_time=datetime.now().isoformat(),
            provider="OpenWeatherMap",
            spray_advisory=spray_adv
        )

    async def _fetch_from_weatherapi(
        self,
        location: str,
        lat: Optional[float],
        lon: Optional[float]
    ) -> WeatherResponse:
        """Fetches from WeatherAPI."""
        base_url = "https://api.weatherapi.com/v1/current.json"
        query = f"{lat},{lon}" if (lat is not None and lon is not None) else location
        params = {
            "key": self.api_key,
            "q": query
        }

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(base_url, params=params)
            resp.raise_for_status()
            data = resp.json()

        loc = data.get("location", {})
        current = data.get("current", {})

        full_location = f"{loc.get('name', '')}, {loc.get('region', '')}, {loc.get('country', '')}".strip(", ")
        temp_c = float(current.get("temp_c", 0.0))
        humidity = int(current.get("humidity", 0))
        wind_kmh = float(current.get("wind_kph", 0.0))
        precip_mm = float(current.get("precip_mm", 0.0))

        cond_text = current.get("condition", {}).get("text", "Clear")
        icon = current.get("condition", {}).get("icon", "")

        spray_adv = self._compute_spray_advisory(wind_kmh, humidity, precip_mm)

        return WeatherResponse(
            configured=True,
            status="live",
            message="Live weather retrieved successfully.",
            location_name=full_location,
            latitude=loc.get("lat"),
            longitude=loc.get("lon"),
            temperature_celsius=round(temp_c, 1),
            relative_humidity=humidity,
            wind_speed_kmh=round(wind_kmh, 1),
            rainfall_mm=round(precip_mm, 1),
            weather_condition=cond_text,
            weather_icon=icon,
            observation_time=datetime.now().isoformat(),
            provider="WeatherAPI",
            spray_advisory=spray_adv
        )
