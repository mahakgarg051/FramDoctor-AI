"""
FarmDoctor AI - Critical ML Prediction Audit and Correctness Test Suite
Validates:
1. Checkpoint loading failure handling (corrupt file, non-existent path, dimension mismatch)
2. Class-name and index alignment between checkpoint, class_names.json, and metadata
3. Top-3 prediction ordering (strict descending confidence order)
4. Probability normalization (softmax sums to 1.0, percentages sum to 100%)
5. Low-confidence warning and Out-of-Distribution uncertainty handling
6. API response consistency and schema integrity across endpoints
"""

import io
import json
import tempfile
from pathlib import Path
import pytest
import torch
import torch.nn as nn
from PIL import Image
from starlette.testclient import TestClient

from backend.app.main import app
from backend.app.services.prediction_service import (
    PredictionService,
    ModelNotLoadedException,
    CONFIDENCE_THRESHOLD_UNCERTAIN,
    MARGIN_THRESHOLD_UNCERTAIN
)

client = TestClient(app)


# ==============================================================================
# 1. Checkpoint Loading Failure Tests
# ==============================================================================
def test_checkpoint_non_existent_path_fails_gracefully():
    """Verify PredictionService records load error and marks model_loaded=False on missing file."""
    service = PredictionService(checkpoint_path="models/non_existent_checkpoint_file.pth")
    assert service.model_loaded is False
    assert service.model is None
    assert "not found" in service.load_error.lower()

    # Inference attempt should raise ModelNotLoadedException
    dummy_img = Image.new("RGB", (224, 224), (100, 150, 100))
    buf = io.BytesIO()
    dummy_img.save(buf, format="JPEG")
    with pytest.raises(ModelNotLoadedException):
        service.predict(buf.getvalue(), filename="test.jpg")


def test_checkpoint_corrupted_file_fails_gracefully():
    """Verify PredictionService handles corrupted/invalid checkpoint bytes without crashing."""
    with tempfile.NamedTemporaryFile(suffix=".pth", delete=False) as tmp:
        tmp.write(b"NOT_A_VALID_PYTORCH_CHECKPOINT_HEADER_CORRUPTED_BYTES")
        tmp_path = tmp.name

    try:
        service = PredictionService(checkpoint_path=tmp_path)
        assert service.model_loaded is False
        assert service.model is None
        assert service.load_error is not None
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def test_checkpoint_classifier_dimension_mismatch():
    """Verify that a checkpoint with mismatched class count raises an error during load."""
    with tempfile.NamedTemporaryFile(suffix=".pth", delete=False) as tmp:
        # Create a checkpoint with 10 classes instead of 38
        fake_state = {
            "model_state_dict": {
                "classifier.1.weight": torch.randn(10, 1280),
                "classifier.1.bias": torch.randn(10),
            },
            "class_names": [f"class_{i}" for i in range(38)]  # expects 38, but weights have 10
        }
        torch.save(fake_state, tmp.name)
        tmp_path = tmp.name

    try:
        service = PredictionService(checkpoint_path=tmp_path)
        assert service.model_loaded is False
        assert "does not match" in service.load_error.lower()
    finally:
        Path(tmp_path).unlink(missing_ok=True)


# ==============================================================================
# 2. Class-Name and Index Alignment Tests
# ==============================================================================
def test_class_names_alignment_checkpoint_and_json():
    """Verify checkpoint metadata class_names match models/class_names.json exactly."""
    json_path = Path("models/class_names.json")
    assert json_path.exists(), "models/class_names.json must exist"

    with open(json_path, "r", encoding="utf-8") as f:
        json_classes = json.load(f)

    assert len(json_classes) == 38, f"Expected 38 classes, got {len(json_classes)}"

    ckpt_path = Path("models/farmdoctor_efficientnet_b0.pth")
    assert ckpt_path.exists(), "models/farmdoctor_efficientnet_b0.pth must exist"

    ckpt = torch.load(ckpt_path, map_location="cpu")
    ckpt_classes = ckpt.get("class_names")
    assert ckpt_classes is not None, "class_names must be present in checkpoint dictionary"

    # Strict 1-to-1 index alignment
    assert len(ckpt_classes) == len(json_classes)
    for idx, (c_name, j_name) in enumerate(zip(ckpt_classes, json_classes)):
        assert c_name == j_name, f"Index {idx} mismatch: checkpoint='{c_name}' vs json='{j_name}'"


def test_service_class_metadata_integrity():
    """Verify singleton service class metadata has 38 well-formed classes."""
    service = PredictionService.get_instance()
    assert service.model_loaded is True
    assert service.num_classes == 38
    assert len(service.class_metadata) == 38

    for idx, item in enumerate(service.class_metadata):
        assert item["class_index"] == idx
        assert "raw_class" in item
        assert "crop" in item
        assert "condition" in item
        assert isinstance(item["is_healthy"], bool)
        assert len(item["crop"]) > 0
        assert len(item["condition"]) > 0


# ==============================================================================
# 3. Top-3 Prediction Ordering Tests
# ==============================================================================
def test_top3_strict_descending_order():
    """Verify that predictions are strictly sorted by confidence score in descending order."""
    service = PredictionService.get_instance()

    img = Image.new("RGB", (224, 224), (50, 120, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    result = service.predict(buf.getvalue(), filename="green_sample.jpg", top_k=3)
    preds = result["predictions"]
    assert len(preds) == 3

    scores = [p["confidence_percentage"] for p in preds]
    ranks = [p["rank"] for p in preds]

    # Verify rank identifiers
    assert ranks == [1, 2, 3]

    # Verify monotonic descending scores
    assert scores[0] >= scores[1] >= scores[2], f"Scores not monotonically non-increasing: {scores}"


# ==============================================================================
# 4. Probability Normalization Tests
# ==============================================================================
def test_probability_normalization():
    """Verify that raw model outputs are valid probabilities that sum to 100% across all classes."""
    service = PredictionService.get_instance()

    img = Image.new("RGB", (224, 224), (200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    # Predict top_k = 38 (all classes) to check complete probability sum
    result = service.predict(buf.getvalue(), filename="test_prob.jpg", top_k=38)
    preds = result["predictions"]
    assert len(preds) == 38

    total_prob = sum(p["confidence_percentage"] for p in preds)
    # Sum should be approximately 100.0% within rounding tolerance
    assert 99.5 <= total_prob <= 100.5, f"Total probability percentage sum ({total_prob}) outside [99.5, 100.5]"

    # Verify individual probabilities are valid
    for p in preds:
        assert 0.0 <= p["confidence_percentage"] <= 100.0, f"Invalid confidence: {p['confidence_percentage']}"


# ==============================================================================
# 5. Low-Confidence & Uncertainty Warning Tests
# ==============================================================================
def test_low_confidence_synthetic_noise_triggers_uncertainty():
    """Verify that uniform noise or neutral grey triggers is_uncertain=True and diagnostic_status='uncertain'."""
    service = PredictionService.get_instance()

    # Neutral grey image (OOD input with no leaf features)
    grey_img = Image.new("RGB", (224, 224), (128, 128, 128))
    buf = io.BytesIO()
    grey_img.save(buf, format="JPEG")

    result = service.predict(buf.getvalue(), filename="grey_ood.jpg", top_k=3)

    assert result["is_uncertain"] is True
    assert result["diagnostic_status"] == "uncertain"
    assert result["uncertainty_warning"] is not None
    assert "Uncertain prediction — field verification recommended" in result["uncertainty_warning"]
    assert "out-of-distribution" in result["uncertainty_warning"]

    # Verify top prediction confidence is below uncertain threshold
    top_conf = result["top_prediction"]["confidence_percentage"]
    assert top_conf < CONFIDENCE_THRESHOLD_UNCERTAIN, (
        f"Grey image produced unexpectedly high confidence: {top_conf}%"
    )


def test_disclaimers_include_domain_shift_and_pest_notices():
    """Verify disclaimers inform user about PlantVillage leaf focus and pest/insect limitations."""
    service = PredictionService.get_instance()

    img = Image.new("RGB", (224, 224), (30, 80, 30))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    result = service.predict(buf.getvalue(), filename="test.jpg")
    disclaimers_text = " ".join(result["disclaimers"])

    assert "Model Confidence Notice" in disclaimers_text
    assert "Domain Shift" in disclaimers_text
    assert "Pest & Insect Limitation" in disclaimers_text
    assert "Preliminary" in disclaimers_text
    assert "Pesticide Safety Warning" in disclaimers_text


# ==============================================================================
# 6. API Response Consistency & Integration Tests
# ==============================================================================
def test_predict_api_response_schema_consistency():
    """Verify POST /api/v1/predict returns consistent schema adhering to PredictionResponse."""
    img = Image.new("RGB", (224, 224), (40, 160, 40))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    response = client.post(
        "/api/v1/predict",
        files={"file": ("farm_leaf.jpg", buf.getvalue(), "image/jpeg")}
    )

    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["filename"] == "farm_leaf.jpg"
    assert "predictions" in data
    assert len(data["predictions"]) == 3
    assert "top_prediction" in data
    assert "is_uncertain" in data
    assert "diagnostic_status" in data
    assert data["diagnostic_status"] in ["confirmed_healthy", "suspected_disease", "uncertain"]
    assert "margin_percentage" in data
    assert "entropy" in data
    assert "threshold_notes" in data
    assert "disclaimers" in data
    assert "timestamp" in data
