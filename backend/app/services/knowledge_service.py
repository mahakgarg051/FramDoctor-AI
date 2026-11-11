"""
FarmDoctor AI - Agricultural Knowledge Base Service
Loads, searches, and serves verified scientific agronomic reference entries.
"""

import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any

from backend.app.schemas import DiseaseKnowledgeItem, ReferenceSource, EnvironmentalConditions

logger = logging.getLogger("farmdoctor.knowledge_service")


class KnowledgeService:
    """
    Manages access to the verified agricultural knowledge base.
    """
    _instance: Optional["KnowledgeService"] = None

    def __init__(self, data_file: Optional[Path] = None):
        self.data_file = data_file or Path(__file__).resolve().parent.parent / "data" / "knowledge_base.json"
        self.diseases: Dict[str, DiseaseKnowledgeItem] = {}
        self._load_knowledge_base()

    @classmethod
    def get_instance(cls) -> "KnowledgeService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _load_knowledge_base(self):
        """Loads and parses knowledge_base.json into typed schemas."""
        if not self.data_file.exists():
            logger.error(f"[KnowledgeService] Knowledge base file not found: {self.data_file}")
            return

        try:
            with open(self.data_file, "r", encoding="utf-8") as f:
                records = json.load(f)

            for rec in records:
                item = DiseaseKnowledgeItem(**rec)
                self.diseases[item.disease_id] = item

            logger.info(f"[KnowledgeService] Loaded {len(self.diseases)} verified disease records from {self.data_file.name}.")
        except Exception as e:
            logger.error(f"[KnowledgeService] Error loading knowledge base: {e}", exc_info=True)

    def get_all(self, crop: Optional[str] = None, search: Optional[str] = None) -> List[DiseaseKnowledgeItem]:
        """Returns all knowledge items, optionally filtered by crop or search query."""
        results = list(self.diseases.values())

        if crop and crop.lower() != "all":
            crop_term = crop.lower().strip()
            results = [d for d in results if crop_term in d.crop.lower()]

        if search and search.strip():
            query = search.lower().strip()
            results = [
                d for d in results
                if (
                    query in d.disease_name.lower()
                    or query in d.crop.lower()
                    or query in d.scientific_name.lower()
                    or query in d.raw_class.lower()
                )
            ]

        return results

    def get_by_id(self, disease_id: str) -> Optional[DiseaseKnowledgeItem]:
        """Retrieves a single disease entry by its unique ID."""
        return self.diseases.get(disease_id.strip().lower())

    def find_for_prediction(
        self,
        crop: str,
        condition: str,
        raw_class: Optional[str] = None
    ) -> Optional[DiseaseKnowledgeItem]:
        """
        Locates the best matching knowledge base entry for a predicted crop condition.
        Matches by raw_class first, then disease_id / condition name.
        """
        # 1. Match by raw_class if provided
        if raw_class:
            for item in self.diseases.values():
                if item.raw_class.lower() == raw_class.lower():
                    return item

        # 2. Match by crop and condition keywords
        crop_clean = crop.lower().strip()
        cond_clean = condition.lower().strip()

        for item in self.diseases.values():
            if item.crop.lower() in crop_clean or crop_clean in item.crop.lower():
                if (
                    cond_clean in item.disease_name.lower()
                    or item.disease_name.lower() in cond_clean
                    or (item.is_healthy and "healthy" in cond_clean)
                ):
                    return item

        # 3. Fallback partial match on condition only
        for item in self.diseases.values():
            if cond_clean in item.disease_name.lower() or item.disease_name.lower() in cond_clean:
                return item

        return None
