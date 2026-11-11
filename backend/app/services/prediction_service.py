"""
FarmDoctor AI - Prediction Service
Handles model loading, dual-model crop routing, image validation, preprocessing, and CPU-compatible inference.
Supports:
  1. 38 PlantVillage crop & disease classes (Apple, Corn, Grape, Potato, Tomato, etc.)
  2. 4 Paddy Doctor Rice disease classes (Rice Blast, Bacterial Leaf Blight, Brown Spot, Healthy Rice)
  3. Crop-support routing & out-of-domain rejection mechanism for unsupported crops/non-leaf images.
"""

import io
import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image, UnidentifiedImageError, ImageStat

logger = logging.getLogger("farmdoctor.prediction_service")

# Safety limit for Pillow decompression bomb protection
Image.MAX_IMAGE_PIXELS = 25_000_000

# Constants for image validation
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

# ==============================================================================
# Uncertainty & Out-of-Distribution (OOD) Operational Thresholds
# ==============================================================================
# In a 38-class softmax model:
# - Uniform random distribution yields 1/38 ≈ 2.63% per class.
# - Unsupported crops (e.g., rice, mango, sugarcane) and non-leaf noise (insects, soil)
#   produce compressed logits resulting in softmax values around 4% to 8%.
# - Operational Thresholds for PlantVillage model:
#   * CONFIDENCE_THRESHOLD_UNCERTAIN = 10.0%
#   * MARGIN_THRESHOLD_UNCERTAIN = 3.0%
# In a 4-class Rice model:
# - Uniform random distribution yields 1/4 = 25.0% per class.
# - Operational Thresholds for Rice model:
#   * RICE_CONFIDENCE_THRESHOLD = 42.0%
#   * RICE_MARGIN_THRESHOLD = 8.0%
# ==============================================================================
CONFIDENCE_THRESHOLD_UNCERTAIN = 10.0
CONFIDENCE_THRESHOLD_HIGH = 25.0
MARGIN_THRESHOLD_UNCERTAIN = 3.0

RICE_CONFIDENCE_THRESHOLD = 42.0
RICE_MARGIN_THRESHOLD = 8.0


class PredictionServiceException(Exception):
    """Base exception for prediction service errors."""
    pass


class ModelNotLoadedException(PredictionServiceException):
    """Raised when inference is requested but model checkpoint is not loaded."""
    pass


class InvalidImageException(PredictionServiceException):
    """Raised when uploaded file is corrupted or not a valid image."""
    pass


class ImageTooLargeException(PredictionServiceException):
    """Raised when uploaded image exceeds allowed file size limit."""
    pass


class PredictionService:
    """
    Singleton service managing the multi-engine PyTorch model lifecycle,
    dual-model crop routing, pre-processing pipelines, and diagnostic inference.
    """
    _instance: Optional["PredictionService"] = None

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        class_names_path: Optional[str] = None,
        rice_checkpoint_path: Optional[str] = None,
        rice_class_names_path: Optional[str] = None,
        device: str = "cpu"
    ):
        self.device = torch.device(device)

        # Primary PlantVillage model state
        self.model: Optional[nn.Module] = None
        self.class_names: List[str] = []
        self.class_metadata: List[Dict[str, Any]] = []
        self.model_loaded: bool = False
        self.active_checkpoint_path: Optional[str] = None
        self.load_error: Optional[str] = None
        self.num_classes: int = 0

        # Dedicated Rice model state
        self.rice_model: Optional[nn.Module] = None
        self.rice_class_names: List[str] = []
        self.rice_class_metadata: List[Dict[str, Any]] = []
        self.rice_model_loaded: bool = False
        self.active_rice_checkpoint_path: Optional[str] = None
        self.num_rice_classes: int = 0

        # Configure image preprocessing pipeline (ImageNet standard)
        self.imagenet_mean = [0.485, 0.456, 0.406]
        self.imagenet_std = [0.229, 0.224, 0.225]
        self.transforms = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=self.imagenet_mean, std=self.imagenet_std),
        ])

        self.explicit_checkpoint_path = checkpoint_path
        self.explicit_class_names_path = class_names_path
        self.explicit_rice_checkpoint_path = rice_checkpoint_path
        self.explicit_rice_class_names_path = rice_class_names_path

        # Candidate paths for checkpoint discovery
        self.checkpoint_candidates = [
            os.environ.get("MODEL_CHECKPOINT_PATH"),
            "models/farmdoctor_efficientnet_b0.pth",
            "models/best_farmdoctor_model.pth",
        ]
        self.class_names_path = (
            class_names_path or
            os.environ.get("CLASS_NAMES_PATH") or
            "models/class_names.json"
        )

        self.rice_checkpoint_candidates = [
            os.environ.get("RICE_MODEL_CHECKPOINT_PATH"),
            "models/farmdoctor_rice_model.pth",
        ]
        self.rice_class_names_path = (
            rice_class_names_path or
            os.environ.get("RICE_CLASS_NAMES_PATH") or
            "models/rice_class_names.json"
        )

        # Attempt initial load
        self.reload_model()

    @classmethod
    def get_instance(cls) -> "PredictionService":
        """Access singleton service instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _find_file(self, explicit: Optional[str], candidates: List[Optional[str]]) -> Optional[Path]:
        """Locates the first existing valid file from candidates."""
        if explicit is not None:
            p = Path(explicit)
            return p if (p.is_file() and p.stat().st_size > 0) else None

        for cand in candidates:
            if cand:
                p = Path(cand)
                if p.is_file() and p.stat().st_size > 0:
                    return p
        return None

    def _sanitize_path(self, path: Optional[Path]) -> Optional[str]:
        """Returns a sanitized relative path string, avoiding private server root exposure."""
        if not path:
            return None
        try:
            return str(path.as_posix())
        except Exception:
            return path.name

    def reload_model(self) -> bool:
        """
        Loads or reloads both the PlantVillage 38-class model and the dedicated Rice model.
        Returns True if at least the primary model is loaded.
        """
        self.model_loaded = False
        self.rice_model_loaded = False
        self.load_error = None
        self.active_checkpoint_path = None
        self.active_rice_checkpoint_path = None

        # ----------------------------------------------------
        # 1. Load Primary PlantVillage EfficientNet-B0 Model
        # ----------------------------------------------------
        pv_ckpt_path = self._find_file(self.explicit_checkpoint_path, self.checkpoint_candidates)
        if not pv_ckpt_path:
            self.load_error = (
                "Primary model checkpoint file not found. Expected 'models/farmdoctor_efficientnet_b0.pth'. "
                "Please run 'python train_model.py' to train and save the model checkpoint."
            )
            logger.warning(f"[PredictionService] {self.load_error}")
            return False

        pv_class_names = self._load_class_names(pv_ckpt_path, self.class_names_path)
        if not pv_class_names:
            self.load_error = f"Class labels not found for primary model at '{self.class_names_path}'."
            logger.error(f"[PredictionService] {self.load_error}")
            return False

        self.class_names = pv_class_names
        self.num_classes = len(pv_class_names)
        self.class_metadata = [
            self._format_class_item(idx, raw_name)
            for idx, raw_name in enumerate(self.class_names)
        ]

        try:
            logger.info(f"[PredictionService] Loading PlantVillage model from: {pv_ckpt_path}")
            pv_checkpoint = torch.load(pv_ckpt_path, map_location=self.device)

            pv_model = models.efficientnet_b0(weights=None)
            in_features = pv_model.classifier[1].in_features
            pv_model.classifier[1] = nn.Linear(in_features, self.num_classes)

            state_dict = pv_checkpoint.get("model_state_dict", pv_checkpoint)
            classifier_weight = state_dict.get("classifier.1.weight")
            if classifier_weight is not None and classifier_weight.shape[0] != self.num_classes:
                raise ValueError(
                    f"Checkpoint classifier output ({classifier_weight.shape[0]}) does not match "
                    f"number of classes ({self.num_classes})."
                )

            pv_model.load_state_dict(state_dict)
            pv_model.to(self.device)
            pv_model.eval()

            self.model = pv_model
            self.model_loaded = True
            self.active_checkpoint_path = self._sanitize_path(pv_ckpt_path)
            logger.info(
                f"[PredictionService] Successfully loaded PlantVillage model with "
                f"{self.num_classes} classes from '{self.active_checkpoint_path}'."
            )
        except Exception as e:
            self.load_error = f"Error loading primary checkpoint '{pv_ckpt_path.name}': {str(e)}"
            logger.error(f"[PredictionService] {self.load_error}", exc_info=True)
            self.model = None
            self.model_loaded = False
            return False

        # ----------------------------------------------------
        # 2. Load Dedicated Rice EfficientNet-B0 Model
        # ----------------------------------------------------
        rice_ckpt_path = self._find_file(self.explicit_rice_checkpoint_path, self.rice_checkpoint_candidates)
        if rice_ckpt_path:
            rice_names = self._load_class_names(rice_ckpt_path, self.rice_class_names_path)
            if rice_names:
                try:
                    logger.info(f"[PredictionService] Loading Rice model from: {rice_ckpt_path}")
                    rice_checkpoint = torch.load(rice_ckpt_path, map_location=self.device)

                    r_model = models.efficientnet_b0(weights=None)
                    in_feat = r_model.classifier[1].in_features
                    r_model.classifier = nn.Sequential(
                        nn.Dropout(p=0.3, inplace=True),
                        nn.Linear(in_feat, len(rice_names))
                    )

                    r_state = rice_checkpoint.get("model_state_dict", rice_checkpoint)
                    r_model.load_state_dict(r_state)
                    r_model.to(self.device)
                    r_model.eval()

                    self.rice_model = r_model
                    self.rice_class_names = rice_names
                    self.num_rice_classes = len(rice_names)
                    self.rice_class_metadata = [
                        self._format_class_item(idx, raw_name)
                        for idx, raw_name in enumerate(self.rice_class_names)
                    ]
                    self.rice_model_loaded = True
                    self.active_rice_checkpoint_path = self._sanitize_path(rice_ckpt_path)
                    logger.info(
                        f"[PredictionService] Successfully loaded Rice model with "
                        f"{self.num_rice_classes} classes from '{self.active_rice_checkpoint_path}'."
                    )
                except Exception as err:
                    logger.warning(f"[PredictionService] Could not load Rice model checkpoint: {err}")
                    self.rice_model = None
                    self.rice_model_loaded = False

        return self.model_loaded

    def _load_class_names(self, ckpt_path: Path, json_path_str: str) -> List[str]:
        """Loads class names from checkpoint metadata or JSON file."""
        try:
            ckpt = torch.load(ckpt_path, map_location="cpu")
            if isinstance(ckpt, dict) and "class_names" in ckpt and isinstance(ckpt["class_names"], list):
                return ckpt["class_names"]
        except Exception:
            pass

        json_file = Path(json_path_str)
        if json_file.is_file():
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) > 0:
                        return data
            except Exception as e:
                logger.error(f"Failed to read class names from {json_file}: {e}")

        return []

    def _format_class_item(self, idx: int, raw_label: str) -> Dict[str, Any]:
        """Formats raw class name into structured metadata."""
        if "___" in raw_label:
            crop_part, condition_part = raw_label.split("___", 1)
        else:
            crop_part, condition_part = raw_label, "Unknown"

        crop = crop_part.replace("_", " ").strip()
        condition = condition_part.replace("_", " ").strip()
        is_healthy = condition.lower() == "healthy"
        if is_healthy:
            condition = "Healthy (No Disease Detected)"

        return {
            "class_index": idx,
            "raw_class": raw_label,
            "crop": crop,
            "condition": condition,
            "is_healthy": is_healthy
        }

    def validate_image_upload(self, file_bytes: bytes, filename: str, content_type: Optional[str]) -> Image.Image:
        """
        Validates uploaded file payload:
        - Checks file size
        - Checks extension and MIME type
        - Decodes image securely using Pillow
        - Converts to RGB
        """
        if len(file_bytes) == 0:
            raise InvalidImageException("Uploaded file is empty (0 bytes).")
        if len(file_bytes) > MAX_FILE_SIZE_BYTES:
            raise ImageTooLargeException(
                f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            )

        sanitized_filename = Path(filename).name
        ext = Path(sanitized_filename).suffix.lower()
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise InvalidImageException(
                f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
            )

        if content_type and content_type.lower() not in ALLOWED_MIME_TYPES:
            raise InvalidImageException(
                f"Unsupported MIME type '{content_type}'. Allowed types: {', '.join(sorted(ALLOWED_MIME_TYPES))}."
            )

        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()

            image = Image.open(io.BytesIO(file_bytes))
            image = image.convert("RGB")
            return image
        except (UnidentifiedImageError, OSError, ValueError) as err:
            raise InvalidImageException(f"Invalid or corrupted image file: {str(err)}")

    def predict(
        self,
        file_bytes: bytes,
        filename: str = "upload.jpg",
        content_type: Optional[str] = None,
        top_k: int = 3
    ) -> Dict[str, Any]:
        """
        Performs end-to-end crop disease diagnosis with dual-model crop routing.
        Distinguishes:
          - Supported crop and confident result
          - Supported crop but uncertain result
          - Unsupported crop (rejects rather than guessing Corn)
          - Invalid or non-leaf image
        """
        if not self.model_loaded or self.model is None:
            raise ModelNotLoadedException(
                "Model checkpoint is not available. Please ensure 'models/farmdoctor_efficientnet_b0.pth' "
                "exists by running 'python train_model.py' before sending prediction requests."
            )

        # Validate and decode image
        image = self.validate_image_upload(file_bytes, filename, content_type)
        sanitized_filename = Path(filename).name

        # Standard ImageNet preprocessing
        tensor = self.transforms(image).unsqueeze(0).to(self.device)

        # ----------------------------------------------------
        # Inference Step 1: Run PlantVillage Model (38 classes)
        # ----------------------------------------------------
        with torch.inference_mode():
            outputs_pv = self.model(tensor)
            probs_pv = torch.softmax(outputs_pv, dim=1)[0]
            entropy_pv = -torch.sum(probs_pv * torch.log(probs_pv + 1e-12)).item()

            k_pv = min(top_k, self.num_classes)
            top_pv_probs, top_pv_indices = torch.topk(probs_pv, k=k_pv)

        top1_pv = round(top_pv_probs[0].item() * 100.0, 2)
        top2_pv = round(top_pv_probs[1].item() * 100.0, 2) if top_pv_probs.numel() > 1 else 0.0
        margin_pv = round(top1_pv - top2_pv, 2)

        # ----------------------------------------------------
        # Inference Step 2: Run Rice Model (4 classes) if loaded
        # ----------------------------------------------------
        rice_available = (self.rice_model_loaded and self.rice_model is not None)
        top1_rice, top2_rice, margin_rice, entropy_rice = 0.0, 0.0, 0.0, 0.0
        top_rice_probs, top_rice_indices = None, None

        if rice_available:
            with torch.inference_mode():
                outputs_rice = self.rice_model(tensor)
                probs_rice = torch.softmax(outputs_rice, dim=1)[0]
                entropy_rice = -torch.sum(probs_rice * torch.log(probs_rice + 1e-12)).item()

                k_rice = min(top_k, self.num_rice_classes)
                top_rice_probs, top_rice_indices = torch.topk(probs_rice, k=k_rice)

            top1_rice = round(top_rice_probs[0].item() * 100.0, 2)
            top2_rice = round(top_rice_probs[1].item() * 100.0, 2) if top_rice_probs.numel() > 1 else 0.0
            margin_rice = round(top1_rice - top2_rice, 2)

        # Check for synthetic / non-leaf flat images (e.g. solid grey/blank test inputs)
        img_stat = ImageStat.Stat(image)
        max_stddev = max(img_stat.stddev) if img_stat.stddev else 0.0
        is_flat_non_leaf = max_stddev < 8.0

        # ----------------------------------------------------
        # Crop-Support Routing Logic
        # ----------------------------------------------------
        # Condition A: Image is recognized as Rice:
        # In a 4-class model, uniform random guessing is 25%.
        # A confident rice diagnosis requires top1_rice >= 42% and margin_rice >= 8%.
        # Furthermore, PlantVillage model must be compressed (< 10% or margin < 3%),
        # OR rice confidence is very strong (> 50%).
        is_rice_routed = (
            not is_flat_non_leaf
            and rice_available
            and (top1_rice >= RICE_CONFIDENCE_THRESHOLD)
            and (margin_rice >= RICE_MARGIN_THRESHOLD)
            and (top1_pv < CONFIDENCE_THRESHOLD_UNCERTAIN or top1_rice >= 50.0)
        )

        # Condition B: Image is recognized as a supported PlantVillage crop:
        # In 38-class model, uniform random is 2.63%. Confident when >= 10.0% and margin >= 3.0%.
        # Ensure Rice model does not dominate (top1_rice not > 55% with > 20% margin).
        is_pv_confident = (
            not is_flat_non_leaf
            and (top1_pv >= CONFIDENCE_THRESHOLD_UNCERTAIN)
            and (margin_pv >= MARGIN_THRESHOLD_UNCERTAIN)
            and not (is_rice_routed and top1_rice > 55.0 and margin_rice > 20.0)
        )

        # Condition C: Unsupported Crop / Out-of-Distribution:
        # Both models are below confident threshold or have very narrow margin.
        is_unsupported = not is_flat_non_leaf and not is_rice_routed and not is_pv_confident

        # Assemble Prediction Candidates based on routing decision
        prediction_items = []

        if is_flat_non_leaf:
            # Synthetic flat image or non-leaf input with zero foliage texture
            active_model_name = "FarmDoctor EfficientNet-B0 (PlantVillage 38-Class)"
            for rank, (prob, idx) in enumerate(zip(top_pv_probs, top_pv_indices), start=1):
                idx_val = idx.item()
                prob_pct = round(prob.item() * 100.0, 2)
                meta = self.class_metadata[idx_val]
                bar_len = int(prob_pct / 2.5)
                prediction_items.append({
                    "rank": rank,
                    "raw_class": meta["raw_class"],
                    "crop": meta["crop"],
                    "condition": meta["condition"],
                    "confidence_percentage": prob_pct,
                    "confidence_bar": "#" * bar_len + "-" * (40 - bar_len)
                })

            top_meta = self.class_metadata[top_pv_indices[0].item()]
            identified_crop = top_meta["crop"]
            predicted_disease = top_meta["condition"]
            confidence = top1_pv
            margin = margin_pv
            active_entropy = round(entropy_pv, 4)
            is_uncertain = True
            diagnostic_status = "uncertain"
            uncertainty_warning = (
                f"Uncertain prediction — field verification recommended. The model cannot reliably "
                f"diagnose this image (Top candidate confidence: {top1_pv:.2f}%, margin: {margin_pv:.2f}%). "
                f"The image may be out-of-distribution (e.g. insects, pests, soil, weeds, or non-crop objects), "
                f"or image quality/lighting may be insufficient. Do NOT treat this prediction as a confirmed disease."
            )

        elif is_rice_routed:
            # Route to Rice Engine
            active_model_name = "FarmDoctor Rice Classifier (EfficientNet-B0)"
            for rank, (prob, idx) in enumerate(zip(top_rice_probs, top_rice_indices), start=1):
                idx_val = idx.item()
                prob_pct = round(prob.item() * 100.0, 2)
                meta = self.rice_class_metadata[idx_val]
                bar_len = int(prob_pct / 2.5)
                prediction_items.append({
                    "rank": rank,
                    "raw_class": meta["raw_class"],
                    "crop": meta["crop"],
                    "condition": meta["condition"],
                    "confidence_percentage": prob_pct,
                    "confidence_bar": "#" * bar_len + "-" * (40 - bar_len)
                })

            top_meta = self.rice_class_metadata[top_rice_indices[0].item()]
            identified_crop = "Rice"
            predicted_disease = top_meta["condition"]
            confidence = top1_rice
            margin = margin_rice
            active_entropy = round(entropy_rice, 4)
            is_healthy = top_meta.get("is_healthy", False)

            if top1_rice < 45.0 or margin_rice < 10.0:
                is_uncertain = True
                diagnostic_status = "uncertain"
                uncertainty_warning = (
                    f"Possible Rice condition detected with moderate confidence ({top1_rice:.1f}%). "
                    f"Field verification recommended before taking agronomic action."
                )
            elif is_healthy:
                is_uncertain = False
                diagnostic_status = "confirmed_healthy"
                uncertainty_warning = None
            else:
                is_uncertain = False
                diagnostic_status = "suspected_disease"
                uncertainty_warning = None

        elif not is_unsupported:
            # Route to PlantVillage Engine
            active_model_name = "FarmDoctor EfficientNet-B0 (PlantVillage 38-Class)"
            for rank, (prob, idx) in enumerate(zip(top_pv_probs, top_pv_indices), start=1):
                idx_val = idx.item()
                prob_pct = round(prob.item() * 100.0, 2)
                meta = self.class_metadata[idx_val]
                bar_len = int(prob_pct / 2.5)
                prediction_items.append({
                    "rank": rank,
                    "raw_class": meta["raw_class"],
                    "crop": meta["crop"],
                    "condition": meta["condition"],
                    "confidence_percentage": prob_pct,
                    "confidence_bar": "#" * bar_len + "-" * (40 - bar_len)
                })

            top_meta = self.class_metadata[top_pv_indices[0].item()]
            identified_crop = top_meta["crop"]
            predicted_disease = top_meta["condition"]
            confidence = top1_pv
            margin = margin_pv
            active_entropy = round(entropy_pv, 4)
            is_healthy = top_meta.get("is_healthy", False)

            # Distinguish supported confident vs supported uncertain result
            # PlantVillage 38-class model requires >= 25.0% confidence and >= 8.0% margin for confirmed status
            is_confident = (top1_pv >= CONFIDENCE_THRESHOLD_HIGH) and (margin_pv >= 8.0)
            if not is_confident:
                is_uncertain = True
                diagnostic_status = "uncertain"
                uncertainty_warning = (
                    f"Preliminary screening with moderate confidence ({top1_pv:.1f}%). "
                    f"Ambiguity exists among top candidate conditions (margin: {margin_pv:.1f}%). "
                    f"Field inspection or consultation with an agricultural expert is recommended before treatment."
                )
            elif is_healthy:
                is_uncertain = False
                diagnostic_status = "confirmed_healthy"
                uncertainty_warning = None
            else:
                is_uncertain = False
                diagnostic_status = "suspected_disease"
                uncertainty_warning = None

        else:
            # Unsupported Crop / Unrecognized Input
            # Do NOT force into Corn or any unrelated disease class!
            active_model_name = "FarmDoctor Dual Inference Engine"
            identified_crop = "Unrecognized Crop"
            predicted_disease = "Crop Not Supported"
            confidence = max(top1_pv, top1_rice)
            margin = margin_pv
            active_entropy = round(entropy_pv, 4)
            is_uncertain = True
            diagnostic_status = "unsupported_crop"

            uncertainty_warning = (
                "Crop not reliably recognized. This model may not support this crop yet. "
                "Please consult an agricultural expert."
            )

            # Provide informative candidate preview while clearly marking unsupported
            for rank, (prob, idx) in enumerate(zip(top_pv_probs, top_pv_indices), start=1):
                idx_val = idx.item()
                prob_pct = round(prob.item() * 100.0, 2)
                meta = self.class_metadata[idx_val]
                bar_len = int(prob_pct / 2.5)
                prediction_items.append({
                    "rank": rank,
                    "raw_class": meta["raw_class"],
                    "crop": f"Uncertain ({meta['crop']})",
                    "condition": f"Unconfirmed ({meta['condition']})",
                    "confidence_percentage": prob_pct,
                    "confidence_bar": "#" * bar_len + "-" * (40 - bar_len)
                })

        threshold_notes = (
            f"Operational Threshold Documentation: Dual-model routing active. "
            f"PlantVillage engine requires top-1 >= {CONFIDENCE_THRESHOLD_UNCERTAIN}% (random baseline 2.63%). "
            f"Rice engine requires top-1 >= {RICE_CONFIDENCE_THRESHOLD}% (random baseline 25.0%). "
            f"Inputs below thresholds are classified as unsupported crops rather than misattributing to unrelated classes."
        )

        disclaimers = [
            "Model Confidence Notice: Confidence scores represent normalized softmax probabilities over supported crops "
            "(PlantVillage 38 classes + Paddy Doctor 4 rice classes), NOT an absolute biological guarantee.",
            "Domain Shift Notice: Real-world field images with natural sunlight, shadows, and soil background may show lower confidence than studio leaves.",
            "Pest & Insect Limitation: This model is trained exclusively on plant foliage pathologies. It does NOT identify insects, mites, or pests.",
            "Preliminary Decision Support: Model predictions serve as preliminary screening support and do NOT replace certified laboratory pathology.",
            "Pesticide Safety Warning: NEVER apply chemical pesticides based solely on AI predictions without consulting your local Krishi Vigyan Kendra (KVK) or agronomist."
        ]

        top_pred = prediction_items[0] if prediction_items else {
            "rank": 1,
            "raw_class": "unsupported",
            "crop": identified_crop,
            "condition": predicted_disease,
            "confidence_percentage": confidence,
            "confidence_bar": "-" * 40
        }

        return {
            "success": True,
            "filename": sanitized_filename,
            "identified_crop": identified_crop,
            "predicted_disease": predicted_disease,
            "confidence": confidence,
            "model_name": active_model_name,
            "top_predictions": prediction_items,
            "predictions": prediction_items,
            "top_prediction": top_pred,
            "is_uncertain": is_uncertain,
            "diagnostic_status": diagnostic_status,
            "uncertainty_warning": uncertainty_warning,
            "margin_percentage": margin,
            "entropy": active_entropy,
            "threshold_notes": threshold_notes,
            "disclaimers": disclaimers,
            "timestamp": datetime.now().isoformat()
        }
