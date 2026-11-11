"""
Tests for Automatic Multilingual Kisan AI Farming Assistant.
Verifies language detection, response consistency, domain citations,
and dynamic turn-by-turn language switching across English, Hindi, and Hinglish.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.assistant_service import detect_language, AIAssistantService
from backend.app.schemas import AssistantChatRequest
from backend.app.services.auth_service import AuthService
from backend.app.db.database import get_db_connection

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    """Provides valid JWT authorization headers for testing."""
    test_user = "multilingual_tester"
    test_email = "multi@example.com"
    test_pass = "test_mock_password_123"

    # Ensure user exists
    with get_db_connection() as conn:
        conn.execute("DELETE FROM users WHERE username = ?", (test_user,))

    res = client.post(
        "/api/v1/auth/register",
        json={"username": test_user, "email": test_email, "password": test_pass, "full_name": "Multi Tester"}
    )
    if res.status_code == 201:
        token = res.json()["access_token"]
    else:
        login_res = client.post(
            "/api/v1/auth/login",
            json={"username": test_user, "password": test_pass}
        )
        token = login_res.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}


class TestLanguageDetection:
    """Unit tests for the deterministic language detector."""

    def test_english_queries(self):
        assert detect_language("How can I protect my wheat crop?") == "english"
        assert detect_language("Tell me how to control tomato early blight.") == "english"
        assert detect_language("How can I prevent tomato early blight?") == "english"
        assert detect_language("What is the best fertilizer for corn?") == "english"
        assert detect_language("What causes yellow spots on crop leaves?") == "english"

    def test_hindi_devanagari_queries(self):
        assert detect_language("मेरे आलू के पौधों में झुलसा रोग के लक्षण हैं।") == "hindi"
        assert detect_language("गेहूँ में पीला रतुआ कैसे रोकें?") == "hindi"
        assert detect_language("मेरे टमाटर के पत्तों पर पीले दाग आ रहे हैं।") == "hindi"
        assert detect_language("धान में ब्लास्ट रोग के क्या लक्षण हैं?") == "hindi"

    def test_hinglish_roman_queries(self):
        assert detect_language("Mere chawal ke patton par bhure daag hain.") == "hinglish"
        assert detect_language("Mujhe rice blast ke symptoms samjhao.") == "hinglish"
        assert detect_language("Mere tamatar ke patton par peele daag aa rahe hain.") == "hinglish"
        assert detect_language("Gehun me peela ratuwa rokne ke upay batao.") == "hinglish"
        assert detect_language("Aaloo me kaunsa spray karein?") == "hinglish"


class TestAssistantEndpoints:
    """Integration tests for the 7 specific test queries from user specifications."""

    def test_query_1_wheat_protect_english(self, auth_headers):
        """Query 1: 'How can I protect my wheat crop?' -> English response."""
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "How can I protect my wheat crop?", "language_preference": "auto"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "english"
        assert data["detected_crop"] == "Wheat"
        assert "Hello Farmer! Welcome to FarmDoctor AI." in data["reply"]
        assert "Yellow Rust" in data["reply"]
        assert len(data["follow_up_questions"]) > 0
        assert len(data["citations"]) > 0
        assert "DISCLAIMER" in data["expert_advisory_disclaimer"]

    def test_query_2_rice_brown_spot_hinglish(self, auth_headers):
        """Query 2: 'Mere chawal ke patton par bhure daag hain.' -> Hinglish response."""
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "Mere chawal ke patton par bhure daag hain.", "language_preference": "auto"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "hinglish"
        assert data["detected_crop"] == "Rice"
        assert "Namaste Kisan Bhai!" in data["reply"]
        assert "Chawal me Bhure Daag" in data["reply"]
        assert len(data["follow_up_questions"]) > 0
        assert len(data["citations"]) > 0
        assert "DHYAN DEIN" in data["expert_advisory_disclaimer"]

    def test_query_3_potato_blight_hindi(self, auth_headers):
        """Query 3: 'मेरे आलू के पौधों में झुलसा रोग के लक्षण हैं।' -> Hindi response."""
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "मेरे आलू के पौधों में झुलसा रोग के लक्षण हैं।", "language_preference": "auto"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "hindi"
        assert data["detected_crop"] == "Potato"
        assert "नमस्ते किसान भाई!" in data["reply"]
        assert "झुलसा रोग" in data["reply"]
        assert len(data["follow_up_questions"]) > 0
        assert len(data["citations"]) > 0
        assert "महत्वपूर्ण सूचना" in data["expert_advisory_disclaimer"]

    def test_query_4_tomato_early_blight_english(self, auth_headers):
        """Query 4: 'Tell me how to control tomato early blight.' -> English response."""
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "Tell me how to control tomato early blight.", "language_preference": "auto"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "english"
        assert data["detected_crop"] == "Tomato"
        assert "Tomato Early Blight" in data["reply"]
        assert "target board" in data["reply"].lower()

    def test_query_5_wheat_yellow_rust_hindi(self, auth_headers):
        """Query 5: 'गेहूँ में पीला रतुआ कैसे रोकें?' -> Hindi response."""
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "गेहूँ में पीला रतुआ कैसे रोकें?", "language_preference": "auto"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "hindi"
        assert data["detected_crop"] == "Wheat"
        assert "पीला रतुआ" in data["reply"]
        assert "ICAR-IIWBR" in data["reply"]

    def test_query_6_rice_blast_hinglish(self, auth_headers):
        """Query 6: 'Mujhe rice blast ke symptoms samjhao.' -> Hinglish response."""
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "Mujhe rice blast ke symptoms samjhao.", "language_preference": "auto"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "hinglish"
        assert data["detected_crop"] == "Rice"
        assert "Rice Blast" in data["reply"]
        assert "spindle" in data["reply"].lower()

    def test_query_7_multi_turn_language_switch(self, auth_headers):
        """Query 7: English message followed immediately by Hindi message switches language automatically."""
        # Turn 1: English
        res1 = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "How can I protect my wheat crop?", "language_preference": "auto"}
        )
        assert res1.status_code == 200
        assert res1.json()["detected_language"] == "english"

        # Turn 2: Hindi (immediate dynamic switch!)
        res2 = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "मेरे आलू के पौधों में झुलसा रोग के लक्षण हैं।", "language_preference": "auto"}
        )
        assert res2.status_code == 200
        assert res2.json()["detected_language"] == "hindi"

        # Turn 3: Hinglish (immediate dynamic switch!)
        res3 = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "Mujhe rice blast ke symptoms samjhao.", "language_preference": "auto"}
        )
        assert res3.status_code == 200
        assert res3.json()["detected_language"] == "hinglish"

    def test_manual_language_override(self, auth_headers):
        """Verifies that selecting an explicit language overrides auto-detection."""
        # Query in English, but user explicitly selected 'hindi'
        res = client.post(
            "/api/v1/assistant/chat",
            headers=auth_headers,
            json={"message": "How can I protect my wheat crop?", "language_preference": "hindi"}
        )
        assert res.status_code == 200
        assert res.json()["detected_language"] == "hindi"
        assert "नमस्ते किसान भाई!" in res.json()["reply"]
