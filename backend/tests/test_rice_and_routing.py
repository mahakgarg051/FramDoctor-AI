"""
FarmDoctor AI - Rice Leaf Disease Detection & Crop Routing Test Suite
Validates:
1. Rice leaf blast, brown spot, and bacterial blight recognition via dedicated Rice model.
2. Prevention of false mapping to Corn (Northern Leaf Blight).
3. Routing of supported PlantVillage crops to PlantVillage EfficientNet-B0.
4. Correct rejection of unsupported crops and out-of-domain images with required warning.
5. End-to-end integration with POST /api/v1/predict.
"""

from pathlib import Path
from starlette.testclient import TestClient
from PIL import Image
import io

from backend.app.main import app
from backend.app.services.prediction_service import PredictionService

client = TestClient(app)


def test_rice_model_is_loaded():
    service = PredictionService.get_instance()
    assert service.model_loaded is True, "PlantVillage model must be loaded"
    assert service.rice_model_loaded is True, "Rice model must be loaded"
    assert service.num_rice_classes == 4, "Rice model must support 4 classes"
    assert "Rice___Leaf_blast" in service.rice_class_names
    assert "Rice___Bacterial_leaf_blight" in service.rice_class_names
    assert "Rice___Brown_spot" in service.rice_class_names
    assert "Rice___healthy" in service.rice_class_names


def test_rice_leaf_blast_not_misidentified_as_corn():
    """Verify that rice leaf blast routes to Rice model and is NOT misidentified as Corn."""
    service = PredictionService.get_instance()
    img_path = Path("test_images/rice_leaf_blast.jpg")
    assert img_path.exists(), "test_images/rice_leaf_blast.jpg must exist"

    data = img_path.read_bytes()
    result = service.predict(data, filename="rice_blast.jpg")

    assert result["identified_crop"] == "Rice", f"Expected Rice, got {result['identified_crop']}"
    assert result["predicted_disease"] == "Leaf blast", f"Expected Leaf blast, got {result['predicted_disease']}"
    assert "Rice" in result["model_name"]
    assert result["is_uncertain"] is False
    assert result["confidence"] > 45.0

    # Ensure Corn is NOT in top prediction
    assert "corn" not in result["identified_crop"].lower()
    assert "corn" not in result["predicted_disease"].lower()


def test_rice_brown_spot_identification():
    """Verify that rice brown spot is properly recognized."""
    service = PredictionService.get_instance()
    img_path = Path("test_images/rice_brown_spot.jpg")
    assert img_path.exists(), "test_images/rice_brown_spot.jpg must exist"

    data = img_path.read_bytes()
    result = service.predict(data, filename="rice_brown_spot.jpg")

    assert result["identified_crop"] == "Rice"
    assert result["predicted_disease"] == "Brown spot"
    assert "Rice" in result["model_name"]
    assert result["is_uncertain"] is False


def test_supported_plantvillage_crop_routes_to_pv_engine():
    """Verify that standard PlantVillage crops continue to route to the 38-class engine."""
    service = PredictionService.get_instance()
    img_path = Path("test_images/supported_leaf.jpg")
    assert img_path.exists(), "test_images/supported_leaf.jpg must exist"

    data = img_path.read_bytes()
    result = service.predict(data, filename="apple_leaf.jpg")

    assert result["identified_crop"] == "Apple"
    assert result["predicted_disease"] == "Apple scab"
    assert "PlantVillage" in result["model_name"]
    assert result["is_uncertain"] is False


def test_unsupported_crop_or_noise_is_rejected():
    """Verify that blank or unsupported inputs trigger uncertainty rather than forcing a diagnosis."""
    service = PredictionService.get_instance()
    img_path = Path("test_images/blank_non_leaf.jpg")
    assert img_path.exists()

    data = img_path.read_bytes()
    result = service.predict(data, filename="blank.jpg")

    assert result["is_uncertain"] is True
    assert result["diagnostic_status"] in ["uncertain", "unsupported_crop"]
    assert result["uncertainty_warning"] is not None


def test_api_predict_rice_endpoint():
    """Verify POST /api/v1/predict with rice leaf image returns valid response with all new fields."""
    img_path = Path("test_images/rice_leaf_blast.jpg")
    data = img_path.read_bytes()

    response = client.post(
        "/api/v1/predict",
        files={"file": ("rice_leaf.jpg", data, "image/jpeg")}
    )

    assert response.status_code == 200
    res = response.json()

    assert res["success"] is True
    assert res["identified_crop"] == "Rice"
    assert res["predicted_disease"] == "Leaf blast"
    assert res["confidence"] > 45.0
    assert "Rice" in res["model_name"]
    assert len(res["top_predictions"]) >= 3
    assert len(res["predictions"]) >= 3
    assert res["is_uncertain"] is False
