"""
FarmDoctor AI - Automatic Multilingual AI Farming Assistant Service
Provides friendly, conversational agronomic guidance grounded in the verified
agricultural knowledge base and live microclimate observations.
Supports automatic language detection and seamless generation across:
1. English
2. Hindi (हिंदी) in Devanagari script
3. Hinglish (Hindi written using Roman/English characters)
"""

import re
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from backend.app.db.database import get_db_connection
from backend.app.schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    ReferenceSource,
    AssistantMessageItem,
    DiseaseKnowledgeItem,
)
from backend.app.services.knowledge_service import KnowledgeService
from backend.app.services.farm_service import FarmService
from backend.app.services.weather_service import WeatherService

logger = logging.getLogger("farmdoctor.assistant")

# Unicode regex matching any Devanagari character
DEV_REGEX = re.compile(r"[\u0900-\u097F]")

# Common Hinglish grammatical particles, pronouns, verbs, and agricultural terms
HINGLISH_WORDS = {
    # Pronouns & determiners
    "mera", "meri", "mere", "mujhe", "mujhko", "hum", "humein", "humara", "humari", "humare",
    "aap", "aapka", "aapki", "aapke", "aapko", "tu", "tera", "teri", "tere", "tujhe",
    "yeh", "ye", "woh", "wo", "iska", "iski", "iske", "usko", "unka", "unki", "unke",
    "kisi", "koi", "sab", "sabhi",

    # Postpositions & conjunctions
    "ka", "ki", "ke", "ko", "se", "me", "mein", "par", "pe", "ne", "tak",
    "aur", "ya", "lekin", "parantu", "magar", "bhi", "to", "toh", "kyunki", "isliye",

    # Question words
    "kya", "kyun", "kyu", "kaise", "kahan", "kab", "kitna", "kitni", "kitne", "kaun", "kaunsa", "kaunsi",

    # Verbs & auxiliaries
    "hai", "hain", "ho", "hoon", "hun", "tha", "the", "thi", "hoga", "hogi", "honge",
    "karein", "karo", "karna", "kare", "karta", "karti", "karte", "kiya", "kiye", "kar",
    "batao", "batayein", "batana", "samjhao", "samjhana", "samjhe",
    "aata", "aati", "aate", "aaye", "aaya", "aayi", "aa",
    "raha", "rahe", "rahi", "pada", "pade", "padi", "pad",
    "dikh", "dikhta", "dikhti", "dikhte", "laga", "lage", "lagi", "lag",
    "chahiye", "sakta", "sakte", "sakti", "dalna", "dalein", "dalo", "chhidkaav",
    "rokna", "rokne", "bachayein", "bachao", "upay",

    # Roman Hindi agricultural & general words
    "fasal", "khet", "patte", "patta", "patton", "patti", "paudhe", "paudha", "paudhon",
    "daag", "dhabba", "dhabbe", "dhabbo", "peele", "peela", "peelapan", "jhulsa", "sukha",
    "bhoora", "bhoore", "bhure", "bhura", "safed", "kaala", "kaale",
    "chawal", "dhaan", "gehun", "gehu", "tamatar", "aloo", "aalu", "makka", "bhutta",
    "khad", "gobar", "beej", "sinchai", "paani", "keeda", "keede", "kisaan", "kisan", "bhai",
    "namaste", "pranam", "rog", "lakshan", "dawai", "bimari"
}

ENGLISH_WORDS = {
    # Pronouns & determiners
    "i", "you", "he", "she", "it", "we", "they", "my", "your", "his", "her", "its", "our", "their",
    "this", "that", "these", "those", "all", "any", "some", "every",

    # Auxiliary verbs & modals
    "is", "are", "am", "was", "were", "be", "been", "being",
    "do", "does", "did", "have", "has", "had",
    "can", "could", "shall", "should", "will", "would", "may", "might", "must",

    # Prepositions & conjunctions
    "in", "on", "at", "to", "for", "with", "from", "by", "about", "against", "between",
    "and", "or", "but", "so", "because", "as", "until", "while", "of", "off", "through",

    # Question words
    "how", "what", "why", "where", "when", "which", "who", "whom", "whose",

    # Verbs
    "tell", "explain", "describe", "protect", "prevent", "control", "cure", "treat", "manage",
    "spray", "apply", "water", "grow", "plant", "identify", "help", "save", "inspect", "check",

    # Common English agriculture words
    "crop", "crops", "farm", "farmer", "field", "leaves", "leaf", "plant", "plants",
    "disease", "diseases", "pest", "pests", "yellow", "yellowing", "spot", "spots",
    "brown", "black", "white", "blight", "rust", "blast", "rot", "mildew", "symptoms",
    "hello", "hi", "hey"
}

def detect_language(text: str) -> str:
    """
    Deterministically detects whether query text is:
    - 'hindi' (Devanagari script)
    - 'hinglish' (Hindi written in Roman script)
    - 'english' (Standard English)
    """
    if not text or not text.strip():
        return "english"

    # 1. Any Devanagari characters directly imply Hindi
    if DEV_REGEX.search(text):
        return "hindi"

    # 2. Tokenize words for Roman script
    words = re.findall(r"[a-zA-Z]+", text.lower())
    if not words:
        return "english"

    hinglish_score = sum(1 for w in words if w in HINGLISH_WORDS)
    english_score = sum(1 for w in words if w in ENGLISH_WORDS)

    if hinglish_score > english_score:
        return "hinglish"
    elif english_score > hinglish_score:
        return "english"

    # In case of tie, check for key Hinglish grammatical markers
    strong_hinglish = {
        "hai", "hain", "ke", "ki", "ka", "ko", "me", "mein", "par", "se",
        "mere", "meri", "mera", "mujhe", "karein", "batao", "samjhao", "chahiye", "kya"
    }
    if any(w in strong_hinglish for w in words):
        return "hinglish"

    return "english"


# Multilingual term mappings for English, Hindi, and Hinglish
CROP_VOCABULARY = {
    # Tomato
    "tamatar": "Tomato",
    "tomato": "Tomato",
    "tamater": "Tomato",
    "टमाटर": "Tomato",
    # Potato
    "aloo": "Potato",
    "aalu": "Potato",
    "potato": "Potato",
    "आलू": "Potato",
    # Wheat
    "gehun": "Wheat",
    "gehu": "Wheat",
    "wheat": "Wheat",
    "गेहूँ": "Wheat",
    "गेहूं": "Wheat",
    # Rice
    "chawal": "Rice",
    "dhaan": "Rice",
    "dhan": "Rice",
    "rice": "Rice",
    "paddy": "Rice",
    "चावल": "Rice",
    "धान": "Rice",
    # Corn
    "makka": "Corn (maize)",
    "makai": "Corn (maize)",
    "bhutta": "Corn (maize)",
    "corn": "Corn (maize)",
    "maize": "Corn (maize)",
    "मक्का": "Corn (maize)",
    "भुट्टा": "Corn (maize)",
    # Apple
    "seb": "Apple",
    "saeb": "Apple",
    "apple": "Apple",
    "सेब": "Apple",
    # Grape
    "angoor": "Grape",
    "angur": "Grape",
    "grape": "Grape",
    "grapes": "Grape",
    "अंगूर": "Grape",
    # Pepper
    "mirch": "Pepper",
    "chilli": "Pepper",
    "chili": "Pepper",
    "pepper": "Pepper",
    "bell pepper": "Pepper",
    "मिर्च": "Pepper",
}

# Symptom keywords mapping
SYMPTOM_KEYS = {
    # Rust
    "ratuwa": "rust",
    "ratua": "rust",
    "रतुआ": "rust",
    "पीला रतुआ": "yellow_rust",
    "yellow rust": "yellow_rust",
    "stripe rust": "yellow_rust",
    "rust": "rust",
    "gerui": "rust",
    "गेरुई": "rust",
    # Blast
    "rice blast": "blast",
    "blast": "blast",
    "ब्लास्ट": "blast",
    "neck blast": "blast",
    # Brown Spot
    "bhure daag": "brown_spot",
    "bhura daag": "brown_spot",
    "bhoore daag": "brown_spot",
    "brown spot": "brown_spot",
    "brown spots": "brown_spot",
    "भूरे दाग": "brown_spot",
    "भूरे धब्बे": "brown_spot",
    # Blight
    "early blight": "early_blight",
    "late blight": "late_blight",
    "jhulsa": "blight",
    "blight": "blight",
    "झुलसा": "blight",
    "अगेती झुलसा": "early_blight",
    "पछेती झुलसा": "late_blight",
    # Yellowing / Chlorosis
    "peele daag": "yellowing",
    "peele": "yellowing",
    "peela": "yellowing",
    "peelapan": "yellowing",
    "yellowing": "yellowing",
    "yellow spots": "yellowing",
    "yellow": "yellowing",
    "chlorosis": "yellowing",
    "पीला": "yellowing",
    "पीले": "yellowing",
    "पीलापन": "yellowing",
    # General Spots
    "daag": "spots",
    "dhabbe": "spots",
    "dhabba": "spots",
    "spots": "spots",
    "spot": "spots",
    "lesions": "spots",
    "दाग": "spots",
    "धब्बे": "spots",
    # Powdery Mildew
    "safed chitte": "powdery_mildew",
    "chitte": "powdery_mildew",
    "safed": "powdery_mildew",
    "powdery mildew": "powdery_mildew",
    "mildew": "powdery_mildew",
    "सफेद": "powdery_mildew",
    "छाछिया": "powdery_mildew",
    # Leaf Curl
    "leaf curl": "leaf_curl",
    "muda": "leaf_curl",
    "curl": "leaf_curl",
    "मुड़": "leaf_curl",
    "पत्ती मरोड़": "leaf_curl",
    # Protection / Prevention
    "protect": "protection",
    "protection": "protection",
    "prevent": "protection",
    "prevention": "protection",
    "control": "protection",
    "cure": "protection",
    "rokne": "protection",
    "bachao": "protection",
    "upay": "protection",
    "बचाव": "protection",
    "रोकें": "protection",
    "रोकथाम": "protection",
}


class AIAssistantService:
    """Conversational agronomic agent with automatic multilingual support."""

    def __init__(
        self,
        knowledge_service: Optional[KnowledgeService] = None,
        weather_service: Optional[WeatherService] = None
    ):
        self.knowledge_service = knowledge_service or KnowledgeService.get_instance()
        self.weather_service = weather_service or WeatherService()

    def _extract_crop_and_symptoms(self, query: str) -> Tuple[Optional[str], List[str]]:
        """Identifies mentioned crop and symptoms from multilingual query text."""
        query_lower = query.lower()
        detected_crop = None
        detected_symptoms = []

        # Crop matching
        for word, crop_name in CROP_VOCABULARY.items():
            if word in query_lower or (word in query):
                detected_crop = crop_name
                break

        # Symptom matching
        for term, sym_id in SYMPTOM_KEYS.items():
            if term in query_lower or (term in query):
                if sym_id not in detected_symptoms:
                    detected_symptoms.append(sym_id)

        return detected_crop, detected_symptoms

    async def chat(
        self,
        user_id: str,
        request: AssistantChatRequest
    ) -> AssistantChatResponse:
        """
        Processes a farmer's conversational question with dynamic automatic language detection.
        Strictly generates consistent output across English, Hindi (Devanagari), or Hinglish.
        Grounds responses in verified agricultural knowledge base and real-time microclimate.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        message_id = f"msg_{uuid.uuid4().hex[:12]}"
        query_text = request.message.strip()

        # 1. Resolve Language: If 'auto' or unspecified, detect from latest user message
        pref = (request.language_preference or "auto").strip().lower()
        if pref in ["english", "hindi", "hinglish"]:
            resolved_lang = pref
        else:
            resolved_lang = detect_language(query_text)

        # 2. Identify crop and symptoms from text
        detected_crop, detected_symptoms = self._extract_crop_and_symptoms(query_text)

        # 3. Check and incorporate farm context if farm_id is provided
        farm_context_desc = None
        farm_crop = None
        farm_location = None
        farm_stage = None

        if request.farm_id:
            try:
                farm = FarmService.get_farm_by_id(user_id=user_id, farm_id=request.farm_id)
                farm_crop = farm.get("crop_name")
                farm_location = farm.get("location")
                farm_stage = farm.get("growth_stage")
                farm_variety = farm.get("crop_variety") or "Standard"

                if not detected_crop and farm_crop:
                    for word, c_name in CROP_VOCABULARY.items():
                        if word in farm_crop.lower():
                            detected_crop = c_name
                            break
                    if not detected_crop:
                        detected_crop = farm_crop

                farm_context_desc = (
                    f"Saved Farm '{farm['name']}': Crop: {farm_crop} ({farm_variety}), "
                    f"Stage: {farm_stage}, Location: {farm_location}"
                )
            except Exception as e:
                logger.warning(f"Could not load farm context for assistant: {e}")

        # 4. Incorporate real weather if requested
        weather_desc = None
        current_temp = None
        current_humidity = None
        if request.include_weather and self.weather_service.is_configured():
            loc_to_check = farm_location or "New Delhi"
            try:
                w_data = await self.weather_service.get_weather(location=loc_to_check)
                if w_data.configured and w_data.temperature_celsius is not None:
                    current_temp = w_data.temperature_celsius
                    current_humidity = w_data.relative_humidity
                    weather_desc = (
                        f"{w_data.location_name or loc_to_check}: {round(current_temp)}°C, "
                        f"Humidity {current_humidity}%, {w_data.weather_condition or 'Clear'}"
                    )
            except Exception as e:
                logger.info(f"Weather context skipped: {e}")

        # 5. Search verified knowledge base entries
        matching_entries: List[DiseaseKnowledgeItem] = []
        if detected_crop:
            matching_entries = self.knowledge_service.get_all(crop=detected_crop)

        # 6. Generate Response according to detected language
        reply_paragraphs, follow_ups, citations, disclaimer = self._synthesize_multilingual_response(
            language=resolved_lang,
            query_text=query_text,
            detected_crop=detected_crop,
            detected_symptoms=detected_symptoms,
            matching_entries=matching_entries,
            farm_context_desc=farm_context_desc,
            weather_desc=weather_desc,
            current_humidity=current_humidity,
        )

        full_reply = "\n\n".join(reply_paragraphs)

        # 7. Save messages to database for persistent conversation history
        with get_db_connection() as conn:
            cursor = conn.cursor()
            user_msg_id = f"msg_{uuid.uuid4().hex[:12]}"
            # Save user turn
            try:
                cursor.execute(
                    """
                    INSERT INTO assistant_messages (id, user_id, farm_id, role, content, citations_json, suggested_followups_json, created_at, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (user_msg_id, user_id, request.farm_id, "user", query_text, "[]", "[]", now_iso, resolved_lang)
                )
            except Exception:
                cursor.execute(
                    """
                    INSERT INTO assistant_messages (id, user_id, farm_id, role, content, citations_json, suggested_followups_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (user_msg_id, user_id, request.farm_id, "user", query_text, "[]", "[]", now_iso)
                )

            # Save assistant turn
            citations_json = json.dumps([c.model_dump() for c in citations])
            followups_json = json.dumps(follow_ups)
            try:
                cursor.execute(
                    """
                    INSERT INTO assistant_messages (id, user_id, farm_id, role, content, citations_json, suggested_followups_json, created_at, language)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (message_id, user_id, request.farm_id, "assistant", full_reply, citations_json, followups_json, now_iso, resolved_lang)
                )
            except Exception:
                cursor.execute(
                    """
                    INSERT INTO assistant_messages (id, user_id, farm_id, role, content, citations_json, suggested_followups_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (message_id, user_id, request.farm_id, "assistant", full_reply, citations_json, followups_json, now_iso)
                )

        logger.info(f"AI Assistant replied in '{resolved_lang}' to user {user_id} (Crop: {detected_crop})")

        return AssistantChatResponse(
            reply=full_reply,
            detected_crop=detected_crop,
            detected_symptoms=detected_symptoms if detected_symptoms else None,
            farm_context_used=farm_context_desc,
            weather_context_used=weather_desc,
            follow_up_questions=follow_ups,
            citations=citations,
            expert_advisory_disclaimer=disclaimer,
            message_id=message_id,
            timestamp=now_iso,
            detected_language=resolved_lang,
        )

    def _synthesize_multilingual_response(
        self,
        language: str,
        query_text: str,
        detected_crop: Optional[str],
        detected_symptoms: List[str],
        matching_entries: List[DiseaseKnowledgeItem],
        farm_context_desc: Optional[str],
        weather_desc: Optional[str],
        current_humidity: Optional[int],
    ) -> Tuple[List[str], List[str], List[ReferenceSource], str]:
        """
        Synthesizes a response where every component strictly uses the detected language:
        - Greeting
        - Explanation & Symptoms
        - Causes
        - Prevention & Management
        - Weather Context
        - Follow-up Questions
        - Disclaimer
        """
        paragraphs: List[str] = []
        follow_ups: List[str] = []
        citations: List[ReferenceSource] = []

        # Find best matching knowledge entry if crop is present
        target_entry = None
        if matching_entries:
            # Check if specific disease matches symptom
            if "blast" in detected_symptoms:
                target_entry = next((e for e in matching_entries if "blast" in e.disease_id), matching_entries[0])
            elif "brown_spot" in detected_symptoms:
                target_entry = next((e for e in matching_entries if "brown" in e.disease_id), matching_entries[0])
            elif "rust" in detected_symptoms or "yellow_rust" in detected_symptoms:
                target_entry = next((e for e in matching_entries if "rust" in e.disease_id), matching_entries[0])
            elif "early_blight" in detected_symptoms:
                target_entry = next((e for e in matching_entries if "early" in e.disease_id), matching_entries[0])
            elif "late_blight" in detected_symptoms:
                target_entry = next((e for e in matching_entries if "late" in e.disease_id), matching_entries[0])
            else:
                target_entry = matching_entries[0]

            citations.extend(target_entry.references[:2])

        # =========================================================================
        # BRANCH 1: ENGLISH RESPONSE GENERATION
        # =========================================================================
        if language == "english":
            paragraphs.append("Hello Farmer! Welcome to FarmDoctor AI.")

            if farm_context_desc:
                paragraphs.append(f"Linked farm context: **{farm_context_desc}**")

            # Scenario 1: Wheat protection or rust
            if detected_crop == "Wheat" and ("yellow_rust" in detected_symptoms or "rust" in detected_symptoms or "protection" in detected_symptoms or "protect" in query_text.lower()):
                paragraphs.append(
                    "**Wheat Crop Protection & Disease Management (ICAR-IIWBR Guidance):**\n"
                    "To safeguard your wheat crop throughout the season, an integrated management approach addressing both foliar diseases and cultural practices is recommended:\n\n"
                    "1. **Key Threat — Yellow Rust (Stripe Rust / *Puccinia striiformis*):**\n"
                    "   - **Symptoms:** Bright yellow to orange powdery pustules arranged in parallel linear stripes along leaf veins. When touched, yellow powdery spores rub off on fingertips.\n"
                    "   - **Favorable Weather:** Cool, moist winter conditions (10°C to 18°C) with morning fog and high relative humidity (>85%).\n\n"
                    "2. **Preventative Cultural Measures:**\n"
                    "   - Grow certified rust-resistant wheat varieties (such as HD 3086, DBW 187, or DBW 222).\n"
                    "   - Practice balanced fertilization: avoid single excessive doses of urea (nitrogen), as overly lush foliage is highly prone to fungal infection. Ensure adequate potassium.\n"
                    "   - Maintain timely irrigation at critical stages (Crown Root Initiation at 21 days, Tillering, Jointing, and Flowering) without letting water pool.\n\n"
                    "3. **Scouting & Immediate Action:**\n"
                    "   - Regularly scout field borders and shady areas where initial yellow patches (foci) usually start.\n"
                    "   - If yellow stripes appear, isolate the patch immediately to prevent airborne spore dispersal."
                )
                follow_ups.append("Does the yellow powder wipe off on your fingers when touching the leaf stripes?")
                follow_ups.append("What is the current growth stage of your wheat (tillering, jointing, or heading)?")
                follow_ups.append("Would you like to upload a leaf photograph to the Disease Scanner for verification?")

            # Scenario 2: Rice Blast
            elif detected_crop == "Rice" and ("blast" in detected_symptoms or "blast" in query_text.lower()):
                paragraphs.append(
                    "**Rice Blast Disease Identification & Control (*Magnaporthe oryzae*):**\n"
                    "Rice blast is one of the most widespread fungal diseases in paddy cultivation, affecting leaves, stems, and panicles:\n\n"
                    "1. **Characteristic Symptoms:**\n"
                    "   - **Leaf Blast:** Spindle-shaped or diamond-shaped lesions with gray-whitish centers and dark reddish-brown margins.\n"
                    "   - **Neck / Panicle Blast:** Dark brown to black lesions at the panicle base, leading to broken necks and empty, chalky grains.\n"
                    "   - **Node Blast:** Blackened stem nodes that easily snap under wind pressure.\n\n"
                    "2. **Causes & Optimal Conditions:**\n"
                    "   - Prolonged leaf wetness (>10 hours), high relative humidity (>90%), nighttime temperatures around 20°C–24°C, and heavy nitrogen application.\n\n"
                    "3. **Prevention & Field Management:**\n"
                    "   - Split nitrogen into 3 to 4 smaller applications combined with adequate potash.\n"
                    "   - Use certified blast-tolerant cultivars recommended by ICAR-NRRI or IRRI.\n"
                    "   - Apply bio-control seed treatments (such as *Trichoderma harzianum* or *Pseudomonas fluorescens*)."
                )
                follow_ups.append("Are the lesions on the leaves spindle-shaped with gray centers?")
                follow_ups.append("Have you observed any dark blackening at the panicle neck joints?")
                follow_ups.append("Are you currently top-dressing nitrogen (urea) on the crop?")

            # Scenario 3: Rice Brown Spot
            elif detected_crop == "Rice" and ("brown_spot" in detected_symptoms or "spot" in detected_symptoms or "daag" in query_text.lower()):
                paragraphs.append(
                    "**Rice Brown Spot Management (*Bipolaris oryzae*):**\n"
                    "Brown spot is a fungal pathology often linked to nutrient imbalance or soil moisture stress:\n\n"
                    "1. **Symptoms:** Small oval to circular dark reddish-brown spots distributed across the leaves, occasionally showing a lighter center with a bright yellow halo.\n"
                    "2. **Causes:** Sandy or nutrient-depleted soil (especially deficient in silicon and potassium), alternating drought and wet spells, and high humidity.\n"
                    "3. **Safe Cultural Management:**\n"
                    "   - Ensure continuous, controlled soil moisture; avoid letting the paddy field dry out and crack.\n"
                    "   - Apply balanced NPK along with potassium and micronutrient supplements (such as zinc).\n"
                    "   - Spray bio-fungicide formulations or neem-based solutions during early tillering."
                )
                follow_ups.append("Are the spots small and oval with a distinct yellow halo around them?")
                follow_ups.append("Has your field experienced water shortage or soil cracking recently?")

            # Scenario 4: Tomato Early Blight / Blight / Spots
            elif detected_crop == "Tomato" and ("early_blight" in detected_symptoms or "blight" in detected_symptoms or "spots" in detected_symptoms or "yellowing" in detected_symptoms or "blight" in query_text.lower()):
                paragraphs.append(
                    "**Tomato Early Blight Control & Prevention (*Alternaria solani*):**\n"
                    "Early Blight is a common fungal disease causing foliar lesions, stem collar rot, and fruit damage:\n\n"
                    "1. **Primary Symptoms:**\n"
                    "   - Circular dark brown to black spots with distinct concentric rings creating a 'target board' pattern.\n"
                    "   - Yellow chlorotic halos surrounding the lesions, appearing on older lower leaves first.\n"
                    "   - Premature leaf drop exposing green fruits to sunburn.\n\n"
                    "2. **Causes & Environmental Triggers:**\n"
                    "   - Warm temperatures (24°C to 29°C), heavy dew, splash irrigation, and high relative humidity (>80%).\n\n"
                    "3. **Safe Prevention & Field Care:**\n"
                    "   - Prune and safely remove infected lower foliage; never leave cuttings in the field.\n"
                    "   - Water at the base with drip irrigation or soaker hoses to keep foliage dry.\n"
                    "   - Apply clean organic mulch (straw or dried grass) to stop fungal spores from splashing up from the soil.\n"
                    "   - Apply preventative bio-controls such as *Trichoderma harzianum* or copper-based protective formulations."
                )
                follow_ups.append("Do the spots show concentric rings resembling a target board pattern?")
                follow_ups.append("Is the yellowing mostly on the lower older leaves or the top new leaves?")
                follow_ups.append("Would you like to scan a photo of the leaf using the Disease Scanner?")

            # Scenario 5: Potato Blight
            elif detected_crop == "Potato" and ("blight" in detected_symptoms or "early_blight" in detected_symptoms or "late_blight" in detected_symptoms or "spots" in detected_symptoms or "jhulsa" in query_text.lower()):
                paragraphs.append(
                    "**Potato Blight Identification & Management:**\n"
                    "Potato crops are susceptible to both Early Blight (*Alternaria solani*) and Late Blight (*Phytophthora infestans*):\n\n"
                    "1. **Identifying the Symptoms:**\n"
                    "   - **Early Blight:** Dark brown spots with concentric target-board rings on older foliage, surrounded by yellow halos.\n"
                    "   - **Late Blight:** Water-soaked irregular pale green to dark brown patches that enlarge rapidly during cool, misty weather, often showing a delicate white fungal mold on the leaf undersides.\n\n"
                    "2. **Cultural Management:**\n"
                    "   - Practice crop rotation avoiding tomato, eggplant, and pepper in the same field.\n"
                    "   - Hill up soil properly to shield developing potato tubers from wash-down spores.\n"
                    "   - Avoid overhead sprinkler irrigation; keep the canopy dry and well-aerated."
                )
                follow_ups.append("Do you notice white fungal down on the underside of the leaves in the morning?")
                follow_ups.append("Are the lesions dry with target rings, or rapidly spreading water-soaked blotches?")

            # Scenario 6: General Crop / Yellowing / Other
            elif detected_crop and target_entry:
                paragraphs.append(
                    f"**Agronomic Guidance for {detected_crop} ({target_entry.disease_name} Reference):**\n"
                    f"1. **Symptom Inspection:** Examine leaves for discoloration, dark lesions, or wilting. Early detection is critical.\n"
                    f"2. **Optimal Conditions:** Fungal pathogens thrive in warm, humid microclimates with extended leaf wetness.\n"
                    f"3. **Best Practices:**\n"
                    f"   - Rotate crops to break pathogen cycles.\n"
                    f"   - Ensure proper plant spacing for sunlight and air circulation.\n"
                    f"   - Utilize certified seeds and preventative bio-control agents."
                )
                follow_ups.append(f"What specific changes have you noticed on your {detected_crop} foliage?")
                follow_ups.append("Have you recently applied any fertilizer or foliar spray?")

            else:
                # Ambiguous or General Query
                paragraphs.append(
                    "To assist you accurately, please tell me the name of your crop (such as Wheat, Rice, Tomato, or Potato) "
                    "and describe the symptoms you are observing on the leaves or stems."
                )
                follow_ups.append("Which crop are you cultivating? (e.g., Wheat, Rice, Tomato, Potato)")
                follow_ups.append("What leaf symptoms are visible? (e.g., yellowing, brown spots, powdery patches)")
                follow_ups.append("Do you have a clear photo of the leaf to upload to the Disease Scanner?")

            # Weather Context
            if weather_desc:
                if current_humidity and current_humidity > 75:
                    paragraphs.append(
                        f"⚠️ **Microclimate Advisory ({weather_desc}):** Field humidity is elevated (>75%), which accelerates "
                        f"fungal spore germination. Avoid overhead irrigation and ensure good field drainage."
                    )
                else:
                    paragraphs.append(
                        f"ℹ️ **Current Weather Context:** {weather_desc}. Conditions are favorable for routine crop scouting and farm management."
                    )

            disclaimer = (
                "DISCLAIMER: This is preliminary AI-assisted agronomic advice grounded in verified agricultural research, "
                "not an official laboratory certificate. Do not apply chemical pesticides or fungicides without direct inspection "
                "by a local agricultural extension officer or Krishi Vigyan Kendra (KVK). Always follow certified product label guidelines."
            )

        # =========================================================================
        # BRANCH 2: HINDI (DEVANAGARI) RESPONSE GENERATION
        # =========================================================================
        elif language == "hindi":
            paragraphs.append("नमस्ते किसान भाई! FarmDoctor AI में आपका स्वागत है।")

            if farm_context_desc:
                paragraphs.append(f"आपके सेव किए गए खेत का विवरण: **{farm_context_desc}**")

            # Scenario 1: Wheat protection or rust
            if detected_crop == "Wheat" or "रतुआ" in query_text or "पीला रतुआ" in query_text or "गेहूँ" in query_text or "गेहूं" in query_text:
                paragraphs.append(
                    "**गेहूँ की फसल की सुरक्षा एवं पीला रतुआ नियंत्रण (ICAR-IIWBR वैज्ञानिक दिशानिर्देश):**\n"
                    "गेहूँ में पीला रतुआ (Yellow Rust / Stripe Rust / *Puccinia striiformis*) एक अत्यंत संवेदनशील फफूंद जनित रोग है। समय पर पहचान और वैज्ञानिक प्रबंधन से फसल को सुरक्षित रखा जा सकता है:\n\n"
                    "1. **प्रमुख लक्षण (Symptoms):**\n"
                    "   - पत्तियों पर शिराओं के समानांतर चमकीले पीले या नारंगी रंग की धारियों में उभरे हुए पाउडर जैसे दाने (pustules) बनते हैं।\n"
                    "   - उंगली या सफेद कपड़े से छूने पर पीला पाउडर हाथ पर लग जाता है।\n"
                    "   - गंभीर अवस्था में पत्तियां सूखने लगती हैं जिससे दाना कमजोर व सिकुड़ जाता है।\n\n"
                    "2. **रोग के अनुकूल कारक:**\n"
                    "   - ठंडा और अत्यधिक नम मौसम (10°C से 18°C तापमान), सुबह का घना कोहरा और 85% से अधिक हवा में नमी।\n\n"
                    "3. **सुरक्षित रोकथाम व प्रबंधन उपाय:**\n"
                    "   - ICAR-IIWBR द्वारा अनुशंसित पीला रतुआ प्रतिरोधी किस्मों (जैसे HD 3086, DBW 187, DBW 222) की समय पर बुवाई करें।\n"
                    "   - संतुलित उर्वरक उपयोग: यूरिया (नाइट्रोजन) की अधिक मात्रा से बचें; पोटाश का उचित प्रयोग करें।\n"
                    "   - खेत के निचले और छायादार हिस्सों का नियमित निरीक्षण करें जहां शुरुआती पीले घेरे (foci) बनते हैं।\n"
                    "   - प्राथमिक लक्षण दिखने पर उस हिस्से को चिह्नित करें और तुरंत कृषि विशेषज्ञ की सलाह लें।"
                )
                follow_ups.append("क्या पत्तियों को छूने पर उंगली में पीला पाउडर चिपक रहा है?")
                follow_ups.append("आपकी गेहूँ की फसल किस अवस्था में है (कल्ले फूटने या बाली निकलने की अवस्था)?")
                follow_ups.append("सटीक जांच के लिए पत्ती की फोटो Disease Scanner में अपलोड करें।")

            # Scenario 2: Rice Blast
            elif detected_crop == "Rice" and ("blast" in detected_symptoms or "ब्लास्ट" in query_text or "blast" in query_text.lower()):
                paragraphs.append(
                    "**धान का ब्लास्ट रोग पहचान एवं रोकथाम (*Magnaporthe oryzae*):**\n"
                    "धान का ब्लास्ट (Rice Blast) एक गंभीर फफूंद जनित रोग है जो पत्तियों, तनों की गांठों और बालियों को नुकसान पहुंचाता है:\n\n"
                    "1. **विशिष्ट लक्षण:**\n"
                    "   - **पत्ती ब्लास्ट:** पत्तियों पर आंख या तकुए के आकार (spindle-shaped) के धब्बे बनते हैं, जिनका मध्य भाग धूसर/सफेद और किनारे गहरे भूरे-लाल होते हैं।\n"
                    "   - **गर्दन ब्लास्ट (Neck Blast):** बाली के आधार पर काला-भूरा धब्बा बनता है जिससे बाली टूटकर लटक जाती है और दाने नहीं भरते।\n"
                    "   - **गांठ ब्लास्ट:** तने की गांठें काली पड़कर हवा चलने पर आसानी से टूट जाती हैं।\n\n"
                    "2. **अनुकूल परिस्थितियां:**\n"
                    "   - लगातार अधिक नमी (>90%), रात का ठंडा तापमान (20°C-24°C), और यूरिया का अत्यधिक उपयोग।\n\n"
                    "3. **रोकथाम और सुरक्षात्मक उपाय:**\n"
                    "   - नाइट्रोजन (यूरिया) को एक बार में न डालें, बल्कि 3-4 भागों में बांटकर पोटाश के साथ दें।\n"
                    "   - बुवाई से पहले बीजों का ट्राइकोडर्मा (Trichoderma) या स्यूडोमोनास से शोधन करें।\n"
                    "   - खेत में पानी का स्तर संतुलित रखें; अधिक समय तक सूखा न पड़ने दें।"
                )
                follow_ups.append("क्या पत्तियों पर आंख के आकार (spindle shape) के सफेद-भूरे धब्बे हैं?")
                follow_ups.append("क्या बाली की गर्दन या तने की गांठों पर कालापन दिख रहा है?")

            # Scenario 3: Rice Brown Spot
            elif detected_crop == "Rice" and ("brown_spot" in detected_symptoms or "भूरे" in query_text or "daag" in query_text.lower()):
                paragraphs.append(
                    "**धान का भूरा धब्बा रोग (Brown Spot / *Bipolaris oryzae*):**\n"
                    "धान में भूरे धब्बे का रोग अक्सर मिट्टी में पोषक तत्वों की कमी या नमी के तनाव के कारण फैलता है:\n\n"
                    "1. **लक्षण:** पत्तियों पर छोटे, गोल या अंडाकार गहरे भूरे रंग के धब्बे दिखते हैं जिनके चारों तरफ पीला घेरा (halo) होता है।\n"
                    "2. **कारण:** मिट्टी में पोटाश, सिलिकॉन या सूक्ष्म पोषक तत्वों की कमी और खेत में अनियमित सिंचाई।\n"
                    "3. **रोकथाम:** संतुलित NPK खाद दें, पोटाश की कमी पूरी करें और कल्ले निकलते समय खेत में उचित नमी बनाए रखें।"
                )
                follow_ups.append("क्या धब्बों के चारों ओर स्पष्ट पीला घेरा बना हुआ है?")
                follow_ups.append("क्या पिछले दिनों खेत में पानी की कमी या दरारें पड़ी थीं?")

            # Scenario 4: Potato Blight / Alloo
            elif detected_crop == "Potato" or "आलू" in query_text or "झुलसा" in query_text:
                paragraphs.append(
                    "**आलू में झुलसा रोग (Early & Late Blight) की पहचान व वैज्ञानिक प्रबंधन:**\n"
                    "आलू में मुख्य रूप से दो प्रकार का झुलसा रोग आता है:\n\n"
                    "1. **अगेती झुलसा (Early Blight / *Alternaria solani*):** पत्तियों पर गहरे भूरे या काले गोल छल्लेदार (Target board rings) धब्बे बनते हैं।\n"
                    "2. **पछेती झुलसा (Late Blight / *Phytophthora infestans*):** ठंडे और बादलों वाले मौसम में पत्तियों के किनारों पर तेजी से फैलने वाले पानी से भीगे जैसे काले-भूरे धब्बे बनते हैं, जिनके नीचे सफेद फफूंद दिखती है।\n\n"
                    "3. **सुरक्षित प्रबंधन:**\n"
                    "   - पौधों की जड़ों पर मिट्टी अच्छी तरह चढ़ाएं ताकि आलू के कंद सुरक्षित रहें।\n"
                    "   - ऊपर से छिड़काव सिंचाई (sprinkler) से बचें और पत्तियों को सूखा रखें।\n"
                    "   - रोगग्रस्त पत्तियों को तोड़कर खेत से दूर नष्ट करें।"
                )
                follow_ups.append("क्या पत्तियों के नीचे सुबह के समय सफेद रुई जैसी फफूंद दिखाई देती है?")
                follow_ups.append("क्या धब्बों में गोल चक्र (concentric rings) बने हुए हैं?")

            # Scenario 5: Tomato Early Blight / Blight / Tamatar
            elif detected_crop == "Tomato" or "टमाटर" in query_text:
                paragraphs.append(
                    "**टमाटर में अगेती झुलसा (Early Blight) रोग की रोकथाम:**\n"
                    "टमाटर में *Alternaria solani* फफूंद के कारण अगेती झुलसा फैलता है:\n\n"
                    "1. **लक्षण:** पुरानी निचली पत्तियों पर भूरे-काले संकेंद्रित छल्लों (target board rings) वाले धब्बे और पीलापन।\n"
                    "2. **सावधानियां:** निचली संक्रमित पत्तियों को छांटकर नष्ट करें, ड्रिप सिंचाई का प्रयोग करें और मिट्टी पर पुआल की मल्चिंग करें ताकि मिट्टी के कीटाणु पत्तियों पर न उछलें।"
                )
                follow_ups.append("क्या पत्तियों पर चक्राकार गोल छल्ले दिखाई दे रहे हैं?")
                follow_ups.append("क्या यह पीलापन पौधे के सबसे निचले पत्तों पर शुरू हुआ है?")

            else:
                paragraphs.append(
                    "आपकी सटीक सहायता के लिए कृपया अपनी फसल का नाम (जैसे गेहूँ, चावल, आलू, या टमाटर) "
                    "और पत्तियों पर दिखने वाले लक्षणों का थोड़ा विवरण दें।"
                )
                follow_ups.append("आपकी फसल कौन सी है? (जैसे गेहूँ, चावल, आलू, या टमाटर)")
                follow_ups.append("पत्तियों पर क्या दिख रहा है? (पीले पत्ते, भूरे/काले दाग, या सूखापन)")
                follow_ups.append("क्या आपके पास पत्ती की फोटो है Disease Scanner में जांच के लिए?")

            # Weather Context
            if weather_desc:
                if current_humidity and current_humidity > 75:
                    paragraphs.append(
                        f"⚠️ **मौसम चेतावनी ({weather_desc}):** आपके क्षेत्र में हवा में नमी अधिक है (>75%), जो फफूंद जनित रोगों "
                        f"के फैलने के लिए अनुकूल है। सिंचाई संतुलित रखें और खेत में जल निकासी सुनिश्चित करें।"
                    )
                else:
                    paragraphs.append(
                        f"ℹ️ **वर्तमान मौसम स्थिति:** {weather_desc}। सामान्य निरीक्षण, खाद और सुरक्षात्मक प्रबंधन के लिए मौसम अनुकूल है।"
                    )

            disclaimer = (
                "महत्वपूर्ण सूचना: यह AI आधारित वैज्ञानिक प्राथमिक कृषि मार्गदर्शन है, कोई अंतिम प्रयोगशाला प्रमाण पत्र नहीं। "
                "किसी भी रासायनिक कीटनाशक या फफूंदनाशक का छिड़काव करने से पहले अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से "
                "प्रत्यक्ष सलाह अवश्य लें। हमेशा सुरक्षित लेबल निर्देशों और सुरक्षा अवधि का पालन करें।"
            )

        # =========================================================================
        # BRANCH 3: HINGLISH (ROMAN SCRIPT) RESPONSE GENERATION
        # =========================================================================
        else:
            paragraphs.append("Namaste Kisan Bhai! FarmDoctor AI me aapka swagat hai.")

            if farm_context_desc:
                paragraphs.append(f"Aapke saved farm details ke anusar: **{farm_context_desc}**")

            # Scenario 1: Wheat protection or rust
            if detected_crop == "Wheat" or "gehun" in query_text.lower() or "gehu" in query_text.lower() or "wheat" in query_text.lower() or "ratuwa" in query_text.lower():
                paragraphs.append(
                    "**Gehun ki Fasal ki Suraksha aur Peela Ratuwa (Yellow Rust) Niyantran:**\n"
                    "Gehun ki fasal ko bimariyon se bachane aur achhi upaj lene ke liye ICAR-IIWBR ke anusar integrated management apnana chahiye:\n\n"
                    "1. **Mukhya Bimari — Peela Ratuwa (Stripe Rust / *Puccinia striiformis*):**\n"
                    "   - **Lakshan:** Patton par shiraon ke parallel chamkile peele ya narangi rang ki dharidar lakeerein banti hain jinme powder jaise pustules hote hain. Ungli se chhoone par peela rang haath par lag jata hai.\n"
                    "   - **Anukool Mausam:** Thanda aur nami bhara mausam (10°C-18°C), subah ka kohra aur hawa me jyada nami (>85%).\n\n"
                    "2. **Khet me Bachav ke Upay:**\n"
                    "   - ICAR-IIWBR dwara pramanit rust-resistant kismein (jaise HD 3086, DBW 187, DBW 222) hi boyein.\n"
                    "   - Santulit Urea (Nitrogen) dalein; hadd se jyada urea se patte komal ho jaate hain aur bimari tezi se lagti hai. Potash zaroor dein.\n"
                    "   - Sinchai samay par karein (CRI stage 21 din par, tillering, aur baali nikalne ke samay).\n\n"
                    "3. **Nireekshan aur Karyawahi:**\n"
                    "   - Khet ke nichle aur chhaya wale hisson ki jaanch karein jahan peele dhabbe pehle shuru hote hain.\n"
                    "   - Agar kahin bhi peela powder dikhe to turant us jagah ko mark karein aur kheti visheshagya se contact karein."
                )
                follow_ups.append("Kya patton ko chhoone par ungli me peela powder lag raha hai?")
                follow_ups.append("Aapke gehun ki fasal abhi kaunsi stage par hai (kalle nikalne ya baali aane par)?")
                follow_ups.append("Patte ki saaf photo Disease Scanner me scan karke check karein.")

            # Scenario 2: Rice Blast
            elif detected_crop == "Rice" and ("blast" in detected_symptoms or "blast" in query_text.lower()):
                paragraphs.append(
                    "**Rice Blast (Dhaan ka Blast Rog) ke Lakshan aur Roktham (*Magnaporthe oryzae*):**\n"
                    "Rice blast ek fungal bimari hai jo chawal ki fasal me patton, gaanton aur baaliyon ko prabhavit karti hai:\n\n"
                    "1. **Mukhya Lakshan (Symptoms):**\n"
                    "   - **Leaf Blast (Patton par daag):** Patton par spindle ya aankh ke aakar (diamond/spindle shape) ke daag bante hain, jinka beech ka hissa safed/gray hota hai aur kinare bhoore (reddish-brown) hote hain.\n"
                    "   - **Neck Blast (Gardan ka blast):** Baali ke jod par kaala/bhoora daag banta hai jisse baali gir jati hai aur daane khali (chaffy) reh jaate hain.\n"
                    "   - **Node Blast:** Tane ki gaanthein kaali padkar tootne lagti hain.\n\n"
                    "2. **Karan aur Anukool Mausam:**\n"
                    "   - Jyada nami (>90%), lagatar rimjhim barish ya kohra, 20°C-28°C taapman aur khet me hadd se jyada nitrogen (urea) ka upyog.\n\n"
                    "3. **Bachav aur Prabandhan:**\n"
                    "   - Urea ko ek baar me na dalein, 3-4 kiston me baant kar potash ke sath dein.\n"
                    "   - Beej shodhan Trichoderma ya Pseudomonas bio-agent se karein.\n"
                    "   - Khet me paani ka santulan banaye rakhein aur zyada din tak sookhne na dein."
                )
                follow_ups.append("Kya daag ke beech ka bhaag gray/safed hai aur dono sire nokile (spindle shape) hain?")
                follow_ups.append("Kya baaliyon ke jod (neck) par bhi kala-pan dikh raha hai?")

            # Scenario 3: Rice Brown Spot
            elif detected_crop == "Rice" and ("brown_spot" in detected_symptoms or "bhure" in query_text.lower() or "bhoore" in query_text.lower() or "spot" in query_text.lower()):
                paragraphs.append(
                    "**Chawal me Bhure Daag (Brown Spot / *Bipolaris oryzae*) ka Samadhan:**\n"
                    "Chawal ke patton par bhure daag aana aam taur par poshak tatvon ki kami ya nami ke tanav se judaa hota hai:\n\n"
                    "1. **Lakshan:** Patton par gol ya oval aakar ke laal-bhoore daag dikhte hain jinke charon taraf peela ghera (halo) hota hai.\n"
                    "2. **Karan:** Mitti me potash, zinc ya silicon ki kami aur khet me paani ka asantulan.\n"
                    "3. **Sujhav:**\n"
                    "   - Mitti me santulit NPK khad dein aur potash ki matra puri karein.\n"
                    "   - Khet ko poori tarah sookhne aur dararein padne se bachayein.\n"
                    "   - Shuruati lakshan par bio-fungicide (Trichoderma) ya safe neem formulation ka chhidkaav karein."
                )
                follow_ups.append("Kya bhure daagon ke charon taraf peela ghera (halo) dikh raha hai?")
                follow_ups.append("Kya khet me paani ki kami ya darar aayi thi?")

            # Scenario 4: Tomato Early Blight / Blight / Tamatar
            elif detected_crop == "Tomato" or "tamatar" in query_text.lower() or "tomato" in query_text.lower():
                paragraphs.append(
                    "**Tamatar me Ageti Jhulsa (Early Blight / *Alternaria solani*) ki Roktham:**\n"
                    "Tamatar ke patton par peele daag aur jhulsa aana fafundi ka sanket hota hai:\n\n"
                    "1. **Lakshan:** Niche ke purane patton par kaale-bhoore gol chakr jaise (Target-board rings) daag aur unke charon taraf peelapan.\n"
                    "2. **Karan:** Garm aur nam mausam (24°C-29°C), hawa me nami aur upar se paani chhidakne se yeh tezi se failta hai.\n\n"
                    "3. **Khet me Surakshit Upay:**\n"
                    "   - Rog-grast niche ke patton ko todkar khet se bahar mitti me daba dein ya jala dein.\n"
                    "   - Patton par upar se paani na dalein; drip sinchai ka upyog karein.\n"
                    "   - Mitti par ghaas-foos ki mulch bichhayein taaki mitti ke fungal spores patton par na chhitkein.\n"
                    "   - Trichoderma harzianum ya safe bio-formulation ka prayog karein."
                )
                follow_ups.append("Kya daagon me gol chakr jaise concentric rings bane hue hain?")
                follow_ups.append("Kya peelapan sabse niche wale patton par hai ya upar wale nayi patton par?")

            # Scenario 5: Potato Blight / Aloo
            elif detected_crop == "Potato" or "aloo" in query_text.lower() or "aalu" in query_text.lower() or "potato" in query_text.lower():
                paragraphs.append(
                    "**Aloo me Jhulsa Rog (Early & Late Blight) ki Pehchan aur Bachav:**\n"
                    "Aloo me do mukhya prakar ka jhulsa hota hai:\n\n"
                    "1. **Ageti Jhulsa (Early Blight):** Patton par concentric target-board rings wale sukhe kaale-bhoore daag bante hain.\n"
                    "2. **Pashcheti Jhulsa (Late Blight):** Thande aur kankani wale mausam me paani se bheege jaise tezi se phailne wale daag bante hain jinke pichhe safed fafund dikhti hai.\n\n"
                    "3. **Bachav:**\n"
                    "   - Paudhon ki jadon par mitti theek se chadhayein taaki kandon tak fafund na pahuche.\n"
                    "   - Sprinkler se sinchai na karein aur fasal me hawa aane dein.\n"
                    "   - Rogi patton ko samay par nikal dein."
                )
                follow_ups.append("Kya subah ke samay patton ke piche safed fafund dikh rahi hai?")
                follow_ups.append("Kya daag gol target rings jaise hain ya tezi se galne wale bheege daag hain?")

            else:
                paragraphs.append(
                    "Aapki satik sahayata ke liye kripya apni fasal ka naam (jaise Gehun, Chawal, Tamatar, ya Aloo) "
                    "aur patton par dikhne wale lakshan thoda vistar se batayein."
                )
                follow_ups.append("Aapki fasal kaun si hai? (Jaise Gehun, Chawal, Tamatar, ya Aloo)")
                follow_ups.append("Patton par kya dikh raha hai? (Peele patte, kaale/bhoore daag, ya sukha-pan)")
                follow_ups.append("Kya aapke paas inspection ke liye patte ki photo hai?")

            # Weather Context
            if weather_desc:
                if current_humidity and current_humidity > 75:
                    paragraphs.append(
                        f"⚠️ **Mausam Alert ({weather_desc}):** Field me nami (humidity) jyada hai (>75%), jo fafundi (fungal diseases) "
                        f"ke phailne ke liye anukool hai. Sinchai ko santulit karein aur geelapan kam rakhein."
                    )
                else:
                    paragraphs.append(
                        f"ℹ️ **Current Weather Context:** {weather_desc}. Sinchai aur spray ke liye mausam anukool hai."
                    )

            disclaimer = (
                "DHYAN DEIN: Yeh AI dwara verified scientific research aadharit prathmik sujhav hai, pukkha lab certificate nahi. "
                "Bina Krishi Vigyan Kendra (KVK) ya agriculture officer ki direct salah ke kisi bhi chemical pesticide ya fungicide "
                "ka spray na karein. Hamesha product label ke safe guidelines ka palan karein."
            )

        return paragraphs, follow_ups, citations, disclaimer

    @staticmethod
    def get_conversation_history(user_id: str, limit: int = 50) -> List[AssistantMessageItem]:
        """Retrieves chronological conversation history for the authenticated farmer."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Try reading with language column
            try:
                cursor.execute(
                    """
                    SELECT id, role, content, citations_json, suggested_followups_json, created_at, language
                    FROM assistant_messages
                    WHERE user_id = ?
                    ORDER BY created_at ASC
                    LIMIT ?
                    """,
                    (user_id, limit)
                )
                rows = cursor.fetchall()
            except Exception:
                cursor.execute(
                    """
                    SELECT id, role, content, citations_json, suggested_followups_json, created_at
                    FROM assistant_messages
                    WHERE user_id = ?
                    ORDER BY created_at ASC
                    LIMIT ?
                    """,
                    (user_id, limit)
                )
                rows = cursor.fetchall()

        messages = []
        for r in rows:
            cits = None
            if r["citations_json"]:
                try:
                    cits = [ReferenceSource(**item) for item in json.loads(r["citations_json"])]
                except Exception:
                    pass
            followups = None
            if r["suggested_followups_json"]:
                try:
                    followups = json.loads(r["suggested_followups_json"])
                except Exception:
                    pass

            lang = None
            if "language" in r.keys() and r["language"]:
                lang = r["language"]

            messages.append(
                AssistantMessageItem(
                    id=r["id"],
                    role=r["role"],
                    content=r["content"],
                    citations=cits,
                    suggested_followups=followups,
                    created_at=r["created_at"],
                    detected_language=lang,
                )
            )
        return messages

    @staticmethod
    def clear_conversation_history(user_id: str) -> bool:
        """Clears all conversation history for the authenticated farmer."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM assistant_messages WHERE user_id = ?", (user_id,))
            cleared = cursor.rowcount > 0
        logger.info(f"Cleared assistant conversation history for user {user_id}")
        return cleared
