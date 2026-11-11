"""
FarmDoctor AI - Backend API Integration Tests
Tests /health, /api/v1/diseases/classes, /api/v1/predict, /api/v1/weather,
/api/v1/knowledge/diseases, and /api/v1/advisory endpoints with error and edge scenarios.
"""

import io
from pathlib import Path
from unittest.mock import patch, AsyncMock
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app
from backend.app.services.prediction_service import (
    PredictionService,
    ModelNotLoadedException,
)
from backend.app.services.weather_service import WeatherService
from backend.app.services.knowledge_service import KnowledgeService
from backend.app.services.advisory_service import CropAdvisoryAgent
from backend.app.schemas import AdvisoryRequest, AdvisoryWeatherContext

client = TestClient(app)


# ==========================================
# 1. Health Endpoint Tests
# ==========================================
def test_health_check_endpoint():
    """Verify GET /health returns 200 OK and model status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_name"] == "EfficientNet-B0"
    assert data["device"] == "cpu"
    assert "model_loaded" in data
    if data["model_loaded"]:
        assert data["num_classes"] == 38
        assert data["checkpoint_path"] is not None


# ==========================================
# 2. Disease Classes Endpoint Tests
# ==========================================
def test_get_disease_classes():
    """Verify GET /api/v1/diseases/classes returns all 38 classes."""
    response = client.get("/api/v1/diseases/classes")
    assert response.status_code == 200
    data = response.json()
    assert "total_classes" in data
    assert data["total_classes"] == 38
    assert len(data["classes"]) == 38

    first = data["classes"][0]
    assert first["class_index"] == 0
    assert "raw_class" in first
    assert "crop" in first
    assert "condition" in first
    assert "is_healthy" in first


# ==========================================
# 3. Prediction Endpoint Tests (Valid Leaf)
# ==========================================
def test_predict_with_real_leaf_image():
    """Verify POST /api/v1/predict returns top-3 predictions for a real leaf image."""
    dataset_dir = Path("dataset/PlantVillage/raw/color/Tomato___Early_blight")
    sample_imgs = list(dataset_dir.glob("*.JPG")) or list(dataset_dir.glob("*.*"))
    assert len(sample_imgs) > 0, "No sample image found in dataset directory"

    sample_img_path = sample_imgs[0]
    with open(sample_img_path, "rb") as f:
        file_bytes = f.read()

    response = client.post(
        "/api/v1/predict",
        files={"file": (sample_img_path.name, file_bytes, "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["filename"] == sample_img_path.name
    assert "predictions" in data
    assert len(data["predictions"]) == 3
    assert "top_prediction" in data
    assert data["top_prediction"]["rank"] == 1
    assert 0.0 <= data["top_prediction"]["confidence_percentage"] <= 100.0

    # Verify disclaimers are present
    assert "disclaimers" in data
    assert len(data["disclaimers"]) >= 3
    disclaimers_text = " ".join(data["disclaimers"])
    assert "Domain Shift" in disclaimers_text
    assert "Preliminary" in disclaimers_text
    assert "Pesticide" in disclaimers_text


def test_predict_with_synthetic_pil_image():
    """Verify POST /api/v1/predict works with an in-memory generated RGB leaf image."""
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    response = client.post(
        "/api/v1/predict",
        files={"file": ("test_leaf.jpg", buf.getvalue(), "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["predictions"]) == 3


# ==========================================
# 4. Error Handling Tests
# ==========================================
def test_predict_corrupted_image_data():
    """Verify POST /api/v1/predict rejects corrupted image bytes with 400 Bad Request."""
    corrupted_bytes = b"This is plain text and definitely not a valid JPEG/PNG image."
    response = client.post(
        "/api/v1/predict",
        files={"file": ("fake_leaf.jpg", corrupted_bytes, "image/jpeg")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "Invalid or corrupted image" in data["detail"]


def test_predict_unsupported_extension():
    """Verify POST /api/v1/predict rejects disallowed file extensions with 400."""
    dummy_bytes = b"sample text content"
    response = client.post(
        "/api/v1/predict",
        files={"file": ("malicious_script.sh", dummy_bytes, "text/plain")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "Unsupported file extension" in data["detail"] or "Unsupported MIME type" in data["detail"]


def test_predict_empty_file():
    """Verify POST /api/v1/predict rejects 0-byte file uploads with 400."""
    response = client.post(
        "/api/v1/predict",
        files={"file": ("empty.jpg", b"", "image/jpeg")}
    )
    assert response.status_code == 400
    data = response.json()
    assert "empty" in data["detail"].lower()


# ==========================================
# 5. Missing Model Error Behavior Test
# ==========================================
def test_missing_model_behavior():
    """Verify PredictionService raises ModelNotLoadedException when checkpoint is missing."""
    service = PredictionService(
        checkpoint_path="models/non_existent_model_file.pth",
        class_names_path="models/non_existent_classes.json"
    )
    assert service.model_loaded is False
    assert service.model is None

    with pytest.raises(ModelNotLoadedException) as exc_info:
        service.predict(file_bytes=b"any_bytes", filename="test.jpg")

    assert "Model checkpoint is not available" in str(exc_info.value)


# ==========================================
# 6. Live Weather Endpoint Tests
# ==========================================
def test_weather_endpoint_unconfigured():
    """Verify GET /api/v1/weather returns configured=False when key is empty."""
    with patch.dict("os.environ", {"WEATHER_API_KEY": ""}, clear=True):
        svc = WeatherService(api_key="")
        assert svc.is_configured() is False

    response = client.get("/api/v1/weather")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data
    assert "status" in data
    if not data["configured"]:
        assert data["status"] == "unconfigured"
        assert "WEATHER_API_KEY" in data["message"]


def test_weather_endpoint_invalid_coordinates():
    """Verify GET /api/v1/weather rejects out-of-range coordinates with 400 Bad Request."""
    response = client.get("/api/v1/weather?lat=95.0&lon=20.0")
    assert response.status_code == 400
    assert "latitude" in response.json()["detail"].lower()

    response2 = client.get("/api/v1/weather?lat=20.0&lon=195.0")
    assert response2.status_code == 400
    assert "longitude" in response2.json()["detail"].lower()


@pytest.mark.anyio
async def test_weather_service_parsing_and_spray_advisory():
    """Verify WeatherService properly parses OpenWeatherMap mock data and calculates spray window."""
    mock_payload = {
        "name": "Pune",
        "sys": {"country": "IN"},
        "coord": {"lat": 18.52, "lon": 73.85},
        "main": {"temp": 28.5, "humidity": 62},
        "wind": {"speed": 2.5},  # 2.5 m/s = 9.0 km/h
        "rain": {},
        "weather": [{"description": "clear sky", "icon": "01d"}]
    }

    svc = WeatherService(api_key="mock_test_key_12345", provider="openweathermap")
    assert svc.is_configured() is True

    # Mock the internal HTTP call
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = AsyncMock()
        mock_resp.raise_for_status = lambda: None
        mock_resp.json = lambda: mock_payload
        mock_get.return_value = mock_resp

        result = await svc.get_weather(location="Pune,IN")
        assert result.configured is True
        assert result.status == "live"
        assert result.location_name == "Pune, IN"
        assert result.temperature_celsius == 28.5
        assert result.relative_humidity == 62
        assert result.wind_speed_kmh == 9.0
        assert result.spray_advisory is not None
        assert result.spray_advisory.is_favorable is True
        assert "Favorable" in result.spray_advisory.headline


# ==========================================
# 7. Agricultural Knowledge Base Tests
# ==========================================
def test_get_knowledge_diseases_list():
    """Verify GET /api/v1/knowledge/diseases returns full verified list."""
    response = client.get("/api/v1/knowledge/diseases")
    assert response.status_code == 200
    data = response.json()
    assert "total_records" in data
    assert data["total_records"] >= 10
    assert len(data["diseases"]) >= 10

    # Validate first entry
    first = data["diseases"][0]
    assert "disease_id" in first
    assert "crop" in first
    assert "disease_name" in first
    assert "scientific_name" in first
    assert "common_symptoms" in first
    assert len(first["common_symptoms"]) > 0
    assert "references" in first
    assert len(first["references"]) > 0
    assert "source_url" in first["references"][0]


def test_get_knowledge_diseases_filter_crop():
    """Verify GET /api/v1/knowledge/diseases?crop=Tomato filters exclusively for Tomato."""
    response = client.get("/api/v1/knowledge/diseases?crop=Tomato")
    assert response.status_code == 200
    data = response.json()
    assert data["total_records"] > 0
    for item in data["diseases"]:
        assert "tomato" in item["crop"].lower()


def test_get_knowledge_disease_detail_valid():
    """Verify GET /api/v1/knowledge/diseases/{id} returns verified record with references."""
    response = client.get("/api/v1/knowledge/diseases/tomato_early_blight")
    assert response.status_code == 200
    item = response.json()
    assert item["disease_id"] == "tomato_early_blight"
    assert item["crop"] == "Tomato"
    assert item["disease_name"] == "Early Blight"
    assert "Alternaria solani" in item["scientific_name"]
    assert len(item["prevention_practices"]) > 0
    assert len(item["safe_management_guidance"]) > 0
    assert len(item["references"]) >= 2
    # Verify citations are from official publishers
    publishers = [r["publisher"] for r in item["references"]]
    assert any("TNAU" in p or "UC" in p or "ICAR" in p for p in publishers)


def test_get_knowledge_disease_detail_not_found():
    """Verify GET /api/v1/knowledge/diseases/{id} returns 404 for unknown disease ID."""
    response = client.get("/api/v1/knowledge/diseases/unknown_fake_disease_123")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# ==========================================
# 8. Crop Advisory Agent Tests
# ==========================================
def test_crop_advisory_endpoint_with_weather_and_prediction():
    """Verify POST /api/v1/advisory generates synthesized guidance combining vision and weather."""
    payload = {
        "crop": "Tomato",
        "condition": "Early blight",
        "raw_class": "Tomato___Early_blight",
        "confidence_percentage": 94.2,
        "weather_context": {
            "temperature_celsius": 27.5,
            "relative_humidity": 86,
            "rainfall_mm": 0.0,
            "wind_speed_kmh": 8.0,
            "condition": "Humid Overcast"
        },
        "farm_notes": "Concentric rings observed on lower leaves after heavy morning dew.",
        "growth_stage": "fruiting"
    }

    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["crop"] == "Tomato"
    assert "Early Blight" in data["suspected_condition"]
    assert "94.2%" in data["confidence_assessment"]
    assert len(data["symptoms_to_verify"]) > 0
    assert len(data["immediate_safe_actions"]) > 0
    assert len(data["preventative_measures"]) > 0
    assert len(data["expert_consultation_triggers"]) > 0

    # Verify weather interaction analysis accounts for 86% humidity
    assert "humidity" in data["weather_interaction_analysis"].lower()
    assert "INFECTION RISK" in data["weather_interaction_analysis"] or "humidity" in data["weather_interaction_analysis"]

    # Verify mandatory chemical safety warning
    assert "CRITICAL SAFETY WARNING" in data["chemical_safety_warning"]
    assert "NEVER purchase, apply, or calculate chemical pesticide" in data["chemical_safety_warning"]

    # Verify verified references from knowledge base
    assert len(data["references"]) >= 2
    assert "source_url" in data["references"][0]


def test_crop_advisory_endpoint_healthy_crop():
    """Verify POST /api/v1/advisory correctly assesses healthy foliar status."""
    payload = {
        "crop": "Tomato",
        "condition": "healthy",
        "raw_class": "Tomato___healthy",
        "confidence_percentage": 98.5
    }

    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "clean, asymptomatic" in data["confidence_assessment"] or "Healthy" in data["suspected_condition"]
    assert "CRITICAL SAFETY WARNING" in data["chemical_safety_warning"]


def test_crop_advisory_endpoint_validation():
    """Verify POST /api/v1/advisory rejects empty crop or condition strings with 400."""
    response = client.post("/api/v1/advisory", json={"crop": "", "condition": "Early blight"})
    assert response.status_code == 400

    response2 = client.post("/api/v1/advisory", json={"crop": "Tomato", "condition": ""})
    assert response2.status_code == 400
