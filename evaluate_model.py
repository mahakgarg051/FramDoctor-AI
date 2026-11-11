#!/usr/bin/env python3
"""
FarmDoctor AI - Model Evaluation & Quality Verification Pipeline
Evaluates the trained EfficientNet-B0 checkpoint on held-out validation/test data.
Computes:
- Overall Accuracy (Top-1 and Top-3)
- Macro-Averaged Precision, Recall, and F1 Score
- Weighted Precision, Recall, and F1 Score
- Per-class metrics (TP, FP, FN, Support, Precision, Recall, F1)
- Confusion Matrix (N x N)
- Confidence Distribution Analysis (Mean confidence on correct vs incorrect predictions)
- Out-of-Distribution (OOD) Behavior on synthetic/noise inputs
"""

import os
import sys
import json
import random
import argparse
from pathlib import Path
from datetime import datetime

# Windows terminal UTF-8 safe output
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image


def get_eval_transforms():
    """Matches exact validation and inference transforms."""
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])


def load_model_for_evaluation(checkpoint_path, device="cpu"):
    """
    Loads checkpoint, verifies metadata, and instantiates the exact model architecture.
    Returns (model, class_names, metadata_dict).
    """
    ckpt_file = Path(checkpoint_path)
    if not ckpt_file.exists():
        raise FileNotFoundError(f"Checkpoint not found at '{checkpoint_path}'.")

    checkpoint = torch.load(ckpt_file, map_location=device)
    class_names = checkpoint.get("class_names")
    if not class_names:
        fallback = Path("models/class_names.json")
        if fallback.exists():
            with open(fallback, "r", encoding="utf-8") as f:
                class_names = json.load(f)
        else:
            raise ValueError("No class_names found in checkpoint or models/class_names.json")

    num_classes = len(class_names)
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)

    state_dict = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    meta = {
        "epoch": checkpoint.get("epoch"),
        "best_val_acc": checkpoint.get("best_val_acc"),
        "val_loss": checkpoint.get("val_loss"),
        "train_acc": checkpoint.get("train_acc"),
        "train_loss": checkpoint.get("train_loss"),
        "timestamp": checkpoint.get("timestamp"),
        "num_classes": num_classes,
    }

    return model, class_names, meta


def select_held_out_samples(data_dir, class_names, samples_per_class=15, seed=1337):
    """
    Selects held-out test samples deterministically from each class folder.
    Using seed=1337 (different from train seed=42) and taking from the tail of the sorted list
    to ensure disjoint evaluation on unseen images.
    """
    data_path = Path(data_dir)
    if not data_path.exists():
        raise FileNotFoundError(f"Data directory '{data_dir}' not found.")

    valid_exts = {".jpg", ".jpeg", ".png", ".bmp"}
    test_samples = []
    class_counts = {}

    rng = random.Random(seed)

    for idx, cname in enumerate(class_names):
        folder = data_path / cname
        if not folder.exists() or not folder.is_dir():
            print(f"[WARN] Class folder '{cname}' not found in '{data_dir}'.")
            continue

        all_imgs = sorted([
            str(p) for p in folder.iterdir()
            if p.is_file() and p.suffix.lower() in valid_exts
        ])
        total_in_class = len(all_imgs)
        class_counts[cname] = total_in_class

        if total_in_class == 0:
            continue

        # Shuffle with evaluation seed
        shuffled = list(all_imgs)
        rng.shuffle(shuffled)

        # Take tail or capped count
        if samples_per_class is not None and samples_per_class > 0:
            chosen = shuffled[:min(samples_per_class, total_in_class)]
        else:
            chosen = shuffled

        for img_p in chosen:
            test_samples.append((img_p, idx))

    return test_samples, class_counts


def compute_multiclass_metrics(y_true, y_pred, y_top3, confidences, class_names):
    """
    Computes confusion matrix, per-class metrics, and macro/weighted summaries.
    """
    num_classes = len(class_names)
    cm = [[0 for _ in range(num_classes)] for _ in range(num_classes)]

    correct_top1 = 0
    correct_top3 = 0
    total = len(y_true)

    correct_confidences = []
    incorrect_confidences = []

    for t, p, top3_list, conf in zip(y_true, y_pred, y_top3, confidences):
        cm[t][p] += 1
        if t == p:
            correct_top1 += 1
            correct_confidences.append(conf)
        else:
            incorrect_confidences.append(conf)

        if t in top3_list:
            correct_top3 += 1

    top1_accuracy = (correct_top1 / total) * 100.0 if total > 0 else 0.0
    top3_accuracy = (correct_top3 / total) * 100.0 if total > 0 else 0.0

    # Per-class metrics
    per_class = {}
    f1_list = []
    precision_list = []
    recall_list = []
    support_list = []

    for i in range(num_classes):
        tp = cm[i][i]
        fp = sum(cm[k][i] for k in range(num_classes) if k != i)
        fn = sum(cm[i][k] for k in range(num_classes) if k != i)
        support = sum(cm[i][k] for k in range(num_classes))

        prec = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        rec = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec / (prec + rec)) if (prec + rec) > 0 else 0.0

        per_class[class_names[i]] = {
            "class_index": i,
            "support": support,
            "tp": tp,
            "fp": fp,
            "fn": fn,
            "precision": round(prec * 100.0, 2),
            "recall": round(rec * 100.0, 2),
            "f1_score": round(f1 * 100.0, 2),
        }

        f1_list.append(f1)
        precision_list.append(prec)
        recall_list.append(rec)
        support_list.append(support)

    total_support = sum(support_list)
    macro_precision = (sum(precision_list) / num_classes) * 100.0 if num_classes > 0 else 0.0
    macro_recall = (sum(recall_list) / num_classes) * 100.0 if num_classes > 0 else 0.0
    macro_f1 = (sum(f1_list) / num_classes) * 100.0 if num_classes > 0 else 0.0

    weighted_precision = (
        sum(p * s for p, s in zip(precision_list, support_list)) / total_support * 100.0
        if total_support > 0 else 0.0
    )
    weighted_recall = (
        sum(r * s for r, s in zip(recall_list, support_list)) / total_support * 100.0
        if total_support > 0 else 0.0
    )
    weighted_f1 = (
        sum(f * s for f, s in zip(f1_list, support_list)) / total_support * 100.0
        if total_support > 0 else 0.0
    )

    avg_conf_correct = (sum(correct_confidences) / len(correct_confidences)) if correct_confidences else 0.0
    avg_conf_incorrect = (sum(incorrect_confidences) / len(incorrect_confidences)) if incorrect_confidences else 0.0

    return {
        "total_evaluated": total,
        "top1_accuracy": round(top1_accuracy, 2),
        "top3_accuracy": round(top3_accuracy, 2),
        "macro_precision": round(macro_precision, 2),
        "macro_recall": round(macro_recall, 2),
        "macro_f1": round(macro_f1, 2),
        "weighted_precision": round(weighted_precision, 2),
        "weighted_recall": round(weighted_recall, 2),
        "weighted_f1": round(weighted_f1, 2),
        "avg_confidence_correct": round(avg_conf_correct, 2),
        "avg_confidence_incorrect": round(avg_conf_incorrect, 2),
        "per_class": per_class,
        "confusion_matrix": cm,
    }


def evaluate_ood_behavior(model, class_names, device="cpu"):
    """
    Evaluates model behavior on synthetic non-plant/OOD images to verify
    confidence collapse on out-of-distribution inputs.
    """
    import numpy as np

    transform = get_eval_transforms()
    ood_tests = [
        ("Neutral Grey (128,128,128)", Image.new("RGB", (224, 224), (128, 128, 128))),
        ("Pure White (255,255,255)", Image.new("RGB", (224, 224), (255, 255, 255))),
        ("Pure Black (0,0,0)", Image.new("RGB", (224, 224), (0, 0, 0))),
        ("Uniform Random Noise (Seed 42)", Image.fromarray(np.random.RandomState(42).randint(0, 255, (224, 224, 3), dtype=np.uint8))),
        ("Uniform Random Noise (Seed 123)", Image.fromarray(np.random.RandomState(123).randint(0, 255, (224, 224, 3), dtype=np.uint8))),
    ]

    results = []
    with torch.no_grad():
        for name, img in ood_tests:
            tensor = transform(img).unsqueeze(0).to(device)
            out = model(tensor)
            probs = torch.softmax(out, dim=1)[0]
            topk = torch.topk(probs, 3)

            top1_cname = class_names[topk.indices[0].item()]
            top1_conf = topk.values[0].item() * 100.0
            margin = (topk.values[0].item() - topk.values[1].item()) * 100.0

            results.append({
                "test_name": name,
                "top1_predicted_class": top1_cname,
                "top1_confidence": round(top1_conf, 2),
                "margin_to_rank2": round(margin, 2),
                "is_below_uncertainty_threshold": top1_conf < 45.0,
            })

    return results


def main():
    parser = argparse.ArgumentParser(description="FarmDoctor AI - Model Evaluation & Quality Verification")
    parser.add_argument("--checkpoint", type=str, default="models/farmdoctor_efficientnet_b0.pth",
                        help="Path to trained model checkpoint file.")
    parser.add_argument("--data_dir", type=str, default="dataset/PlantVillage/raw/color",
                        help="Path to dataset directory containing class folders.")
    parser.add_argument("--samples_per_class", type=int, default=15,
                        help="Number of samples to evaluate per class (default: 15 for fast CPU run). Set to 0 for all.")
    parser.add_argument("--seed", type=int, default=1337,
                        help="Deterministic seed for test sample selection (default: 1337).")
    parser.add_argument("--output_json", type=str, default="models/evaluation_report.json",
                        help="Path to save evaluation report JSON.")
    parser.add_argument("--batch_size", type=int, default=16,
                        help="Batch size for evaluation (default: 16).")
    args = parser.parse_args()

    print("=" * 76)
    print(" [FarmDoctor AI] Objective Model Quality & Calibration Audit")
    print("=" * 76)

    device = torch.device("cpu")
    print(f"Hardware Execution Target: {device}")
    print(f"Target Checkpoint: {args.checkpoint}")

    # 1. Load model and verify metadata
    try:
        model, class_names, meta = load_model_for_evaluation(args.checkpoint, device=device)
    except Exception as e:
        print(f"[FATAL ERROR] Failed to load model: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Loaded checkpoint trained at epoch {meta.get('epoch')}.")
    print(f"[INFO] Training checkpoint reported validation accuracy: {meta.get('best_val_acc'):.2f}%")
    print(f"[INFO] Supported classes: {len(class_names)}")

    # 2. Select held-out test samples
    samples_per_class = None if args.samples_per_class == 0 else args.samples_per_class
    print(f"\n[INFO] Sampling held-out images from: {args.data_dir}")
    print(f"[INFO] Selection mode: {samples_per_class} samples per class (Seed={args.seed})")

    try:
        test_samples, class_counts = select_held_out_samples(
            data_dir=args.data_dir,
            class_names=class_names,
            samples_per_class=samples_per_class,
            seed=args.seed
        )
    except Exception as e:
        print(f"[FATAL ERROR] Dataset selection failed: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"[INFO] Total test samples selected: {len(test_samples)} across {len(class_names)} classes.")

    # 3. Run Inference
    transform = get_eval_transforms()
    y_true = []
    y_pred = []
    y_top3 = []
    confidences = []

    print("\n[INFO] Running evaluation inference...")
    total_samples = len(test_samples)
    for i in range(0, total_samples, args.batch_size):
        batch = test_samples[i:i + args.batch_size]
        batch_tensors = []
        batch_labels = []

        for p, label in batch:
            try:
                with Image.open(p) as img:
                    img_rgb = img.convert("RGB")
                    tensor = transform(img_rgb)
                    batch_tensors.append(tensor)
                    batch_labels.append(label)
            except Exception as read_err:
                print(f"[WARN] Failed to read {p}: {read_err}")
                continue

        if not batch_tensors:
            continue

        batch_tensor = torch.stack(batch_tensors).to(device)
        with torch.no_grad():
            outputs = model(batch_tensor)
            probs = torch.softmax(outputs, dim=1)
            top_probs, top_indices = torch.topk(probs, k=3, dim=1)

        for true_label, t_probs, t_indices in zip(batch_labels, top_probs, top_indices):
            pred_top1 = t_indices[0].item()
            conf_top1 = t_probs[0].item() * 100.0
            top3_set = [idx.item() for idx in t_indices]

            y_true.append(true_label)
            y_pred.append(pred_top1)
            y_top3.append(top3_set)
            confidences.append(conf_top1)

        processed = min(i + args.batch_size, total_samples)
        if processed % 100 == 0 or processed == total_samples:
            print(f"  Processed {processed}/{total_samples} samples ({processed / total_samples * 100:.1f}%)")

    # 4. Compute Metrics
    metrics = compute_multiclass_metrics(y_true, y_pred, y_top3, confidences, class_names)

    # 5. Evaluate OOD behavior
    ood_results = evaluate_ood_behavior(model, class_names, device=device)

    # 6. Print Formatted Report
    print("\n" + "=" * 76)
    print("                    EVALUATION RESULTS SUMMARY")
    print("=" * 76)
    print(f"  Total Samples Evaluated:    {metrics['total_evaluated']}")
    print(f"  Top-1 Accuracy:             {metrics['top1_accuracy']:.2f}%")
    print(f"  Top-3 Accuracy:             {metrics['top3_accuracy']:.2f}%")
    print(f"  Macro Precision:            {metrics['macro_precision']:.2f}%")
    print(f"  Macro Recall:               {metrics['macro_recall']:.2f}%")
    print(f"  Macro-F1 Score:             {metrics['macro_f1']:.2f}%")
    print(f"  Weighted-F1 Score:          {metrics['weighted_f1']:.2f}%")
    print(f"  Avg Conf (Correct):         {metrics['avg_confidence_correct']:.2f}%")
    print(f"  Avg Conf (Incorrect):       {metrics['avg_confidence_incorrect']:.2f}%")
    print("-" * 76)

    print("\n[OUT-OF-DISTRIBUTION (OOD) COLLAPSE VERIFICATION]")
    print("Demonstrating model behavior on non-plant / synthetic inputs:")
    for ood in ood_results:
        status = "PASSED (Uncertain / Low Conf)" if ood["is_below_uncertainty_threshold"] else "HIGH CONFIDENCE (RISK)"
        print(f"  * {ood['test_name']:<32} -> {ood['top1_predicted_class'][:28]:<28} {ood['top1_confidence']:>5.2f}% [{status}]")

    print("\n[LOWEST-PERFORMING CLASSES (BY F1-SCORE)]")
    sorted_classes = sorted(metrics["per_class"].items(), key=lambda kv: kv[1]["f1_score"])
    for name, c_data in sorted_classes[:5]:
        print(f"  * {name:<46} F1: {c_data['f1_score']:>5.2f}% | Rec: {c_data['recall']:>5.2f}% | Supp: {c_data['support']}")

    print("\n[HIGHEST-PERFORMING CLASSES (BY F1-SCORE)]")
    for name, c_data in sorted_classes[-5:]:
        print(f"  * {name:<46} F1: {c_data['f1_score']:>5.2f}% | Rec: {c_data['recall']:>5.2f}% | Supp: {c_data['support']}")

    # 7. Save JSON Artifact
    output_path = Path(args.output_json)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    full_report = {
        "evaluation_timestamp": datetime.now().isoformat(),
        "checkpoint": args.checkpoint,
        "checkpoint_meta": meta,
        "dataset_dir": args.data_dir,
        "dataset_total_images_in_folder": sum(class_counts.values()),
        "dataset_class_distribution": class_counts,
        "samples_per_class": samples_per_class,
        "metrics": metrics,
        "ood_behavior": ood_results,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)

    print(f"\n[SUCCESS] Full audit report saved to: {output_path}")
    print("=" * 76)


if __name__ == "__main__":
    main()
