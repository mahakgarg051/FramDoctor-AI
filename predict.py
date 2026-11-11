#!/usr/bin/env python3
"""
FarmDoctor AI - Leaf Disease Prediction CLI
Loads trained EfficientNet-B0 checkpoint and predicts top crop disease conditions.
"""

import os
import sys
import json
import argparse
from pathlib import Path

# Configure UTF-8 safe output for Windows terminals (CMD / PowerShell)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image, UnidentifiedImageError


# ==========================================
# 1. Image Preprocessing (Matches Training)
# ==========================================
def get_inference_transforms():
    """
    Returns exactly the same preprocessing pipeline as used during validation:
    - Resize to 224x224
    - Convert to Tensor
    - Normalize using standard ImageNet mean and std
    """
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])


# ==========================================
# 2. Checkpoint & Model Loading
# ==========================================
def load_model(checkpoint_path, class_names_path=None, device="cpu"):
    """
    Loads model checkpoint, reconstructs EfficientNet-B0 architecture,
    and sets model to evaluation mode.
    """
    ckpt_file = Path(checkpoint_path)
    if not ckpt_file.exists():
        raise FileNotFoundError(
            f"Checkpoint file '{checkpoint_path}' does not exist.\n"
            f"Please run 'python train_model.py' first to train and save the model."
        )

    print(f"[INFO] Loading checkpoint from: {checkpoint_path}")
    checkpoint = torch.load(ckpt_file, map_location=torch.device(device))

    # Retrieve class names from checkpoint metadata or fallback to json
    class_names = checkpoint.get("class_names")
    if not class_names:
        fallback_path = Path(class_names_path or "models/class_names.json")
        if fallback_path.exists():
            with open(fallback_path, "r", encoding="utf-8") as f:
                class_names = json.load(f)
        else:
            raise ValueError(
                "Could not find class names inside checkpoint and fallback "
                f"'{fallback_path}' does not exist."
            )

    num_classes = len(class_names)

    # Reconstruct EfficientNet-B0
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)

    # Load weights
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    best_acc = checkpoint.get("best_val_acc", None)
    epoch = checkpoint.get("epoch", None)
    acc_str = f" (Val Acc: {best_acc:.2f}% | Epoch: {epoch})" if best_acc is not None else ""
    print(f"[SUCCESS] Model loaded successfully: EfficientNet-B0 for {num_classes} classes{acc_str}")

    return model, class_names


# ==========================================
# 3. Label Formatter
# ==========================================
def format_class_label(raw_label):
    """
    Formats raw PlantVillage class names into human-readable crop and condition.
    Example:
      'Tomato___Early_blight' -> Crop: 'Tomato', Condition: 'Early blight'
      'Apple___healthy' -> Crop: 'Apple', Condition: 'Healthy'
    """
    if "___" in raw_label:
        crop_part, condition_part = raw_label.split("___", 1)
    else:
        crop_part, condition_part = raw_label, "Unknown"

    crop = crop_part.replace("_", " ").strip()
    condition = condition_part.replace("_", " ").strip()
    if condition.lower() == "healthy":
        condition = "Healthy (No Disease Detected)"

    return crop, condition


# ==========================================
# 4. Inference & Top-K Prediction
# ==========================================
def predict_image(image_path, model, class_names, top_k=3, device="cpu"):
    """
    Loads leaf image, validates it, applies transformations,
    and returns top-K predictions with confidence scores.
    """
    img_file = Path(image_path)
    if not img_file.exists() or not img_file.is_file():
        raise FileNotFoundError(f"Image file not found: '{image_path}'")

    try:
        with Image.open(img_file) as raw_img:
            image = raw_img.convert("RGB")
    except UnidentifiedImageError:
        raise ValueError(f"Cannot identify image file '{image_path}'. Ensure it is a valid JPG/PNG image.")
    except Exception as e:
        raise RuntimeError(f"Error opening image file '{image_path}': {e}")

    transform = get_inference_transforms()
    tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(tensor)
        probabilities = torch.softmax(outputs, dim=1)[0]
        k = min(top_k, len(class_names))
        top_probs, top_indices = torch.topk(probabilities, k=k)

    results = []
    for prob, idx in zip(top_probs, top_indices):
        idx_val = idx.item()
        prob_val = prob.item() * 100.0
        raw_name = class_names[idx_val]
        crop, condition = format_class_label(raw_name)
        results.append({
            "rank": len(results) + 1,
            "raw_class": raw_name,
            "crop": crop,
            "condition": condition,
            "confidence": prob_val
        })

    return results


# ==========================================
# 5. CLI Execution
# ==========================================
def main():
    parser = argparse.ArgumentParser(
        description="FarmDoctor AI - Crop Leaf Disease Prediction CLI"
    )
    parser.add_argument("image_path", nargs="?", default=None,
                        help="Path to the crop leaf image file.")
    parser.add_argument("--image", "-i", type=str, default=None,
                        help="Alternative flag to specify crop leaf image path.")
    parser.add_argument("--model", "-m", type=str, default="models/best_farmdoctor_model.pth",
                        help="Path to trained model checkpoint (.pth).")
    parser.add_argument("--class_names", "-c", type=str, default="models/class_names.json",
                        help="Path to class_names.json file.")
    parser.add_argument("--top_k", "-k", type=int, default=3,
                        help="Number of top predictions to display (default: 3).")
    args = parser.parse_args()

    image_path = args.image or args.image_path
    if not image_path:
        print("[ERROR] No image path provided.", file=sys.stderr)
        print("Usage: python predict.py <path_to_leaf_image> [--model models/best_farmdoctor_model.pth]", file=sys.stderr)
        sys.exit(1)

    print("=" * 70)
    print(" [FarmDoctor AI] Leaf Disease Prediction Engine")
    print("=" * 70)

    device = "cpu"  # CPU compatible

    # Load model and class names
    try:
        model, class_names = load_model(
            checkpoint_path=args.model,
            class_names_path=args.class_names,
            device=device
        )
    except Exception as e:
        print(f"[ERROR] Model loading error: {e}", file=sys.stderr)
        sys.exit(1)

    # Predict image
    try:
        predictions = predict_image(
            image_path=image_path,
            model=model,
            class_names=class_names,
            top_k=args.top_k,
            device=device
        )
    except Exception as e:
        print(f"[ERROR] Prediction error: {e}", file=sys.stderr)
        sys.exit(1)

    # Display results
    print(f"\n[TARGET IMAGE] {image_path}")
    print(f"\n[DIAGNOSTIC PREDICTIONS] Top {len(predictions)} Results:")
    print("-" * 70)
    for p in predictions:
        bar_len = int(p['confidence'] / 2.5)  # 40 chars max
        bar = "#" * bar_len + "-" * (40 - bar_len)
        print(f" Rank #{p['rank']}: {p['crop']} -- {p['condition']}")
        print(f"   Confidence: {p['confidence']:.2f}% [{bar}]")
        print(f"   Class Tag : {p['raw_class']}")
        print("-" * 70)

    # Scientific and Agricultural Reliability Disclaimers
    print("\n" + "!" * 70)
    print(" [CRITICAL SCIENTIFIC & AGRICULTURAL SAFETY NOTICE]")
    print("!" * 70)
    print(" 1. Model Confidence is NOT a Diagnosis Guarantee:")
    print("    A high confidence score reflects visual similarity to training patterns,")
    print("    not a certified biological or laboratory pathology test.")
    print(" 2. Real-World Field Domain Shift:")
    print("    This model was trained on the PlantVillage dataset (controlled studio lighting,")
    print("    isolated single leaves). Field conditions with direct sunlight, strong shadows,")
    print("    dirt, insect feeding, or complex outdoor backgrounds can affect predictions.")
    print(" 3. Pesticide & Treatment Safety:")
    print("    NEVER purchase, spray, or calculate chemical pesticide dosages based solely")
    print("    on AI model predictions. Over-application or wrong chemicals can destroy crops")
    print("    and pollute soil/water.")
    print(" 4. Next Step for Farmers:")
    print("    Use this result as preliminary decision support. Always consult your local")
    print("    Krishi Vigyan Kendra (KVK), certified agricultural extension officer, or")
    print("    qualified agronomist before taking field action.")
    print("!" * 70 + "\n")


if __name__ == "__main__":
    main()
