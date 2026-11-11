"""
FarmDoctor AI - Crop Advisory Agent Service
Synthesizes ML vision outputs, verified agricultural knowledge, and real-time microclimate weather data
into plain-language farmer guidance while adhering strictly to agricultural safety rules.
"""

import os
import logging
from datetime import datetime
from typing import Optional, List

from backend.app.schemas import (
    AdvisoryRequest,
    AdvisoryResponse,
    ReferenceSource,
    DiseaseKnowledgeItem,
)
from backend.app.services.knowledge_service import KnowledgeService

logger = logging.getLogger("farmdoctor.advisory_service")


class CropAdvisoryAgent:
    """
    Expert agricultural reasoning agent combining prediction results,
    scientific knowledge base records, and field weather interactions.
    """
    def __init__(self, knowledge_service: Optional[KnowledgeService] = None):
        self.knowledge_service = knowledge_service or KnowledgeService.get_instance()
        self.llm_provider = os.environ.get("LLM_PROVIDER", "").strip().lower()
        self.llm_api_key = os.environ.get("LLM_API_KEY", "").strip()

    def is_llm_enabled(self) -> bool:
        """Checks if an external LLM is configured."""
        return bool(self.llm_api_key and len(self.llm_api_key) > 5)

    def generate_advisory(self, req: AdvisoryRequest) -> AdvisoryResponse:
        """
        Synthesizes agronomic advisory based on target crop, suspected condition,
        verified knowledge base, and live weather metrics.
        """
        # 1. Query verified knowledge base
        kb_item: Optional[DiseaseKnowledgeItem] = self.knowledge_service.find_for_prediction(
            crop=req.crop,
            condition=req.condition,
            raw_class=req.raw_class
        )

        # 2. Evaluate model confidence in plain language
        conf = req.confidence_percentage or 0.0
        if "healthy" in req.condition.lower() or (kb_item and kb_item.is_healthy):
            confidence_assessment = (
                f"The AI model identified clean, asymptomatic foliar tissue with {conf:.1f}% pattern match. "
                "No severe chlorotic halos, fungal spots, or necrosis were detected."
            )
        elif conf >= 80.0:
            confidence_assessment = (
                f"The model detected high visual similarity ({conf:.1f}%) to verified {req.crop} {req.condition} "
                "patterns in the PlantVillage reference dataset. However, computer vision outputs represent visual screening, "
                "not a certified laboratory pathology test."
            )
        elif conf >= 50.0:
            confidence_assessment = (
                f"The model detected moderate visual similarity ({conf:.1f}%) to {req.crop} {req.condition}. "
                "Because field lighting, shadows, or multiple concurrent stresses can affect accuracy, "
                "thorough manual scouting of leaf undersides and stems is strongly recommended."
            )
        else:
            confidence_assessment = (
                f"Low confidence ({conf:.1f}%). The visual features are inconclusive. Physical field inspection "
                "or consultation with an agricultural extension officer is advised."
            )

        # 3. Analyze weather interaction with suspected disease
        weather_analysis = self._analyze_weather_interaction(req, kb_item)

        # 4. Synthesize verified guidance
        if kb_item:
            symptoms = kb_item.common_symptoms
            immediate_actions = kb_item.safe_management_guidance
            preventative = kb_item.prevention_practices
            expert_triggers = kb_item.when_to_seek_expert
            references = kb_item.references
            condition_name = kb_item.disease_name
            scientific_name = f" ({kb_item.scientific_name})" if kb_item.scientific_name else ""
        else:
            # Fallback general agronomic guidance when not in predefined dictionary
            symptoms = [
                f"Inspect upper and lower {req.crop} leaf surfaces for lesions, chlorotic yellowing, or fungal down.",
                "Check stems and crown for dark cankers or water-soaked rotting.",
                "Inspect neighboring plants in the same row to observe if spots are localized or spreading."
            ]
            immediate_actions = [
                "Prune and safely discard visibly blighted or damaged foliage away from the field perimeter.",
                "Avoid overhead irrigation; water exclusively at the root zone to keep leaves dry.",
                "Disinfect pruning shears with 70% isopropyl alcohol between crop rows."
            ]
            preventative = [
                "Practice 3-year crop rotation avoiding botanically related host species.",
                "Ensure generous plant-to-plant spacing to facilitate cross-canopy air circulation.",
                "Mulch soil around plants to prevent splash dispersal of soilborne pathogens."
            ]
            expert_triggers = [
                "If more than 15% of plants exhibit rapidly expanding lesions across the plot.",
                "When unexplained sudden wilting or vascular stem browning occurs."
            ]
            references = [
                ReferenceSource(
                    source_name="ICAR Agricultural Crop Advisory",
                    publisher="Indian Council of Agricultural Research",
                    source_url="https://www.icar.org.in"
                ),
                ReferenceSource(
                    source_name="FAO Integrated Pest Management Guidelines",
                    publisher="Food and Agriculture Organization",
                    source_url="https://www.fao.org"
                )
            ]
            condition_name = req.condition
            scientific_name = ""

        # 5. Formulate plain-language executive summary
        growth_context = f" during the {req.growth_stage} phase" if req.growth_stage else ""
        notes_context = f" Farmer notes: '{req.farm_notes}'." if req.farm_notes else ""
        summary = (
            f"Advisory assessment for {req.crop}{growth_context}. Preliminary screening indicates suspected "
            f"{condition_name}{scientific_name}.{notes_context} {confidence_assessment} {weather_analysis}"
        )

        chemical_warning = (
            "CRITICAL SAFETY WARNING: NEVER purchase, apply, or calculate chemical pesticide or fungicide dosages "
            "based solely on AI vision screening. Over-application can cause severe phytotoxic crop scorch, destroy "
            "beneficial soil microbiology, and contaminate drinking water. Always verify with locally registered "
            "product labels and consult a certified agricultural officer or your local Krishi Vigyan Kendra (KVK)."
        )

        return AdvisoryResponse(
            crop=req.crop,
            suspected_condition=condition_name,
            confidence_assessment=confidence_assessment,
            summary=summary,
            weather_interaction_analysis=weather_analysis,
            symptoms_to_verify=symptoms,
            immediate_safe_actions=immediate_actions,
            preventative_measures=preventative,
            expert_consultation_triggers=expert_triggers,
            chemical_safety_warning=chemical_warning,
            references=references,
            evidence_level="verified_knowledge_base",
            timestamp=datetime.now().isoformat()
        )

    def _analyze_weather_interaction(
        self,
        req: AdvisoryRequest,
        kb_item: Optional[DiseaseKnowledgeItem]
    ) -> str:
        """
        Correlates live or provided weather metrics with pathogen environmental thresholds.
        """
        w = req.weather_context
        if not w or (w.temperature_celsius is None and w.relative_humidity is None):
            return (
                "Field microclimate data was not provided. Because fungal and bacterial diseases accelerate "
                "under warm, wet foliage, monitor morning dew duration and avoid overhead evening watering."
            )

        temp = w.temperature_celsius
        humidity = w.relative_humidity
        rain = w.rainfall_mm or 0.0
        wind = w.wind_speed_kmh or 0.0

        conditions_summary = []
        if temp is not None:
            conditions_summary.append(f"{temp:.1f}°C")
        if humidity is not None:
            conditions_summary.append(f"{humidity}% humidity")
        if rain > 0:
            conditions_summary.append(f"{rain:.1f}mm rain")

        weather_str = ", ".join(conditions_summary)

        # High risk fungal conditions
        if humidity is not None and humidity >= 80:
            if rain > 0.5:
                return (
                    f"Current microclimate ({weather_str}) poses ELEVATED INFECTION RISK. Active rainfall and high humidity "
                    "accelerate spore germination and splash dispersal. Avoid entering wet fields to prevent mechanical transmission. "
                    "Delay foliar sprays until leaves dry."
                )
            else:
                return (
                    f"Current high humidity ({weather_str}) favors fungal incubation and spore release. "
                    "Ensure maximum canopy airflow by weeding and trellising. Scout lower leaves closely for rapid expansion."
                )

        # Favorable dry weather conditions
        elif humidity is not None and humidity < 60:
            return (
                f"Current microclimate ({weather_str}) is relatively dry. Low foliar humidity slows pathogen germination. "
                "This provides a favorable window for cultural pruning and canopy sanitation without immediate risk of rapid reinfection."
            )

        # Moderate conditions
        return (
            f"Current microclimate conditions ({weather_str}) are moderate. Maintain regular twice-weekly scouting "
            "and ensure drip irrigation lines do not wet leaf surfaces."
        )
