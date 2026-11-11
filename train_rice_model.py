#!/usr/bin/env python3
"""
FarmDoctor AI - Rice Leaf Disease Model Training Pipeline
EfficientNet-B0 Transfer Learning with Data Augmentation, Early Stopping, and Comprehensive Evaluation.

Supports 4 Rice Categories:
  - Rice___Bacterial_leaf_blight
  - Rice___Brown_spot
  - Rice___Leaf_blast
  - Rice___healthy
"""

import os
import sys
import json
import random
import argparse
import time
from pathlib import Path
from datetime import datetime

# Windows terminal UTF-8 safety
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from PIL import Image

# ==========================================
# 1. Custom Dataset Wrapper
# ==========================================
class RiceLeafDataset(Dataset):
    def __init__(self, samples, transform=None):
        self.samples = samples
        self.transform = transform

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            with Image.open(path) as img:
                img = img.convert("RGB")
        except Exception as e:
            raise RuntimeError(f"Corrupt or unreadable image file: {path}. Error: {e}")

        if self.transform is not None:
            img = self.transform(img)

        return img, label


# ==========================================
# 2. Dataset Loader from Directory Splits
# ==========================================
def load_split_samples(split_dir: Path, class_names: list):
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}
    samples = []
    valid_extensions = {".jpg", ".jpeg", ".png", ".bmp"}

    for c_name in class_names:
        c_folder = split_dir / c_name
        if not c_folder.exists():
            continue
        c_idx = class_to_idx[c_name]
        for img_p in c_folder.iterdir():
            if img_p.is_file() and img_p.suffix.lower() in valid_extensions:
                samples.append((str(img_p), c_idx))

    return samples


# ==========================================
# 3. Model Construction (EfficientNet-B0)
# ==========================================
def build_rice_model(num_classes: int, fine_tune: bool = False):
    print("\n[INFO] Initializing EfficientNet-B0 for Rice Disease Classification...")
    try:
        weights = models.EfficientNet_B0_Weights.DEFAULT
        model = models.efficientnet_b0(weights=weights)
        print("[SUCCESS] Loaded ImageNet pretrained weights (EfficientNet_B0_Weights.DEFAULT).")
    except Exception as e:
        print(f"[NOTICE] Pretrained weights fallback ({e}). Initializing random weights.")
        model = models.efficientnet_b0(weights=None)

    # Freeze backbone feature extractor
    if not fine_tune:
        print("[INFO] Transfer Learning Mode: Feature extraction with frozen backbone.")
        for param in model.features.parameters():
            param.requires_grad = False
    else:
        print("[INFO] Fine-Tuning Mode: All backbone layers trainable.")

    # Custom classification head for rice diseases
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.3, inplace=True),
        nn.Linear(in_features, num_classes)
    )
    print(f"[SUCCESS] Custom Classifier Head: Dropout(0.3) -> Linear({in_features} -> {num_classes})")

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[INFO] Total Params: {total_params:,} | Trainable: {trainable_params:,}")

    return model


# ==========================================
# 4. Evaluation Metrics Calculation
# ==========================================
def calculate_metrics(y_true, y_pred, class_names):
    num_classes = len(class_names)
    matrix = [[0] * num_classes for _ in range(num_classes)]
    for t, p in zip(y_true, y_pred):
        matrix[t][p] += 1

    total_samples = len(y_true)
    correct = sum(matrix[i][i] for i in range(num_classes))
    accuracy = correct / total_samples if total_samples > 0 else 0.0

    per_class = {}
    precisions = []
    recalls = []
    f1s = []

    for i, c_name in enumerate(class_names):
        tp = matrix[i][i]
        fp = sum(matrix[row][i] for row in range(num_classes) if row != i)
        fn = sum(matrix[i][col] for col in range(num_classes) if col != i)
        total_class = tp + fn

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        precisions.append(prec)
        recalls.append(rec)
        f1s.append(f1)

        per_class[c_name] = {
            "samples": total_class,
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
        }

    macro_precision = sum(precisions) / num_classes if num_classes > 0 else 0.0
    macro_recall = sum(recalls) / num_classes if num_classes > 0 else 0.0
    macro_f1 = sum(f1s) / num_classes if num_classes > 0 else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "macro_f1": round(macro_f1, 4),
        "per_class": per_class,
        "confusion_matrix": matrix,
        "class_names": class_names,
    }


# ==========================================
# 5. Training & Validation Execution
# ==========================================
def train_rice_model(
    data_dir: Path,
    models_dir: Path,
    epochs: int = 10,
    batch_size: int = 16,
    lr: float = 1e-3,
    patience: int = 3,
    seed: int = 42,
    fine_tune: bool = False,
):
    print("=" * 70)
    print(" [FarmDoctor AI] Rice Disease Classifier - Training Pipeline")
    print("=" * 70)

    # Determinism
    random.seed(seed)
    torch.manual_seed(seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[DEVICE] Hardware execution device: {device}")

    # Discover classes from train directory
    train_dir = data_dir / "train"
    val_dir = data_dir / "val"
    test_dir = data_dir / "test"

    if not train_dir.exists():
        raise FileNotFoundError(f"Train directory not found: {train_dir}")

    class_names = sorted([d.name for d in train_dir.iterdir() if d.is_dir()])
    num_classes = len(class_names)
    print(f"[DATASET] Detected {num_classes} rice categories:")
    for idx, name in enumerate(class_names):
        print(f"  [{idx}] {name}")

    train_samples = load_split_samples(train_dir, class_names)
    val_samples = load_split_samples(val_dir, class_names)
    test_samples = load_split_samples(test_dir, class_names) if test_dir.exists() else []

    print(f"\n[SAMPLES] Train: {len(train_samples)} | Val: {len(val_samples)} | Test: {len(test_samples)}")

    # Transforms
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]
    image_size = (224, 224)

    train_transform = transforms.Compose([
        transforms.Resize(image_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])

    val_transform = transforms.Compose([
        transforms.Resize(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])

    train_dataset = RiceLeafDataset(train_samples, transform=train_transform)
    val_dataset = RiceLeafDataset(val_samples, transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Build model
    model = build_rice_model(num_classes=num_classes, fine_tune=fine_tune)
    model.to(device)

    # Loss function with class balance check
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=lr, weight_decay=1e-4)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)

    # Models directory & metadata saving
    models_dir.mkdir(parents=True, exist_ok=True)
    rice_class_names_path = models_dir / "rice_class_names.json"
    with open(rice_class_names_path, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)
    print(f"[CONFIG] Saved rice class names to: {rice_class_names_path}")

    best_val_loss = float("inf")
    best_val_acc = 0.0
    best_model_weights = None
    epochs_no_improve = 0

    checkpoint_save_path = models_dir / "farmdoctor_rice_model.pth"

    start_time = time.time()
    print("\n[TRAINING] Beginning training epochs...")

    for epoch in range(1, epochs + 1):
        epoch_t0 = time.time()

        # Train phase
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            train_correct += torch.sum(preds == labels.data).item()
            train_total += labels.size(0)

        epoch_train_loss = train_loss / train_total if train_total > 0 else 0.0
        epoch_train_acc = (train_correct / train_total) * 100.0 if train_total > 0 else 0.0

        # Validation phase
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)

                val_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                val_correct += torch.sum(preds == labels.data).item()
                val_total += labels.size(0)

        epoch_val_loss = val_loss / val_total if val_total > 0 else 0.0
        epoch_val_acc = (val_correct / val_total) * 100.0 if val_total > 0 else 0.0
        epoch_sec = time.time() - epoch_t0

        scheduler.step(epoch_val_loss)

        print(
            f"Epoch {epoch:02d}/{epochs:02d} [{epoch_sec:.1f}s] - "
            f"Train Loss: {epoch_train_loss:.4f}, Train Acc: {epoch_train_acc:.2f}% | "
            f"Val Loss: {epoch_val_loss:.4f}, Val Acc: {epoch_val_acc:.2f}%",
            end=""
        )

        # Early stopping and checkpointing
        if epoch_val_loss < best_val_loss:
            best_val_loss = epoch_val_loss
            best_val_acc = epoch_val_acc
            epochs_no_improve = 0
            best_model_weights = model.state_dict().copy()

            torch.save({
                "model_state_dict": best_model_weights,
                "class_names": class_names,
                "architecture": "efficientnet_b0",
                "val_acc": best_val_acc,
                "val_loss": best_val_loss,
                "epoch": epoch,
                "timestamp": datetime.now().isoformat(),
            }, checkpoint_save_path)
            print(" -> [SAVED BEST CHECKPOINT]")
        else:
            epochs_no_improve += 1
            print(f" -> (Patience: {epochs_no_improve}/{patience})")
            if epochs_no_improve >= patience:
                print(f"[EARLY STOPPING] Validation loss did not improve for {patience} epochs. Stopping.")
                break

    total_training_sec = time.time() - start_time
    print(f"\n[DONE] Training complete in {total_training_sec:.1f} seconds. Best Val Acc: {best_val_acc:.2f}%.")

    # Load best checkpoint for independent evaluation
    if best_model_weights is not None:
        model.load_state_dict(best_model_weights)

    # Evaluate on holdout test set (or validation if test empty)
    eval_samples = test_samples if len(test_samples) > 0 else val_samples
    eval_name = "Holdout Test Set" if len(test_samples) > 0 else "Validation Set"
    print(f"\n[EVALUATION] Computing unbiased classification metrics on {eval_name} ({len(eval_samples)} samples)...")

    eval_dataset = RiceLeafDataset(eval_samples, transform=val_transform)
    eval_loader = DataLoader(eval_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    model.eval()
    y_true = []
    y_pred = []
    with torch.no_grad():
        for images, labels in eval_loader:
            images = images.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, 1)
            y_true.extend(labels.cpu().numpy().tolist())
            y_pred.extend(preds.cpu().numpy().tolist())

    metrics = calculate_metrics(y_true, y_pred, class_names)
    metrics["eval_set"] = eval_name
    metrics["eval_sample_count"] = len(eval_samples)
    metrics["training_duration_seconds"] = round(total_training_sec, 2)
    metrics["best_val_accuracy"] = round(best_val_acc, 2)

    # Save metrics report JSON
    report_path = models_dir / "rice_evaluation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\n" + "=" * 70)
    print(f" Rice Classification Performance Summary ({eval_name}):")
    print(f"  * Accuracy:        {metrics['accuracy'] * 100:.2f}%")
    print(f"  * Macro Precision: {metrics['macro_precision'] * 100:.2f}%")
    print(f"  * Macro Recall:    {metrics['macro_recall'] * 100:.2f}%")
    print(f"  * Macro F1-Score:  {metrics['macro_f1'] * 100:.2f}%")
    print("-" * 70)
    print(f"{'Category':<32} | {'Samples':<8} | {'Precision':<10} | {'Recall':<8} | {'F1':<8}")
    print("-" * 70)
    for c_name, c_data in metrics["per_class"].items():
        print(f"{c_name:<32} | {c_data['samples']:<8} | {c_data['precision']*100:>8.2f}% | {c_data['recall']*100:>6.2f}% | {c_data['f1_score']*100:>6.2f}%")
    print("-" * 70)

    print("\nConfusion Matrix:")
    matrix = metrics["confusion_matrix"]
    header = "       " + " ".join([f"[{i}]" for i in range(num_classes)])
    print(header)
    for i, row in enumerate(matrix):
        print(f"[{i}]    " + " ".join([f"{v:3d}" for v in row]) + f"  ({class_names[i]})")

    print(f"\n[SUCCESS] Checkpoint saved to: {checkpoint_save_path}")
    print(f"[SUCCESS] Metrics report saved to: {report_path}")

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Rice Leaf Disease Model")
    parser.add_argument("--data_dir", type=str, default="dataset/rice", help="Path to prepared rice dataset")
    parser.add_argument("--models_dir", type=str, default="models", help="Directory to save checkpoints")
    parser.add_argument("--epochs", type=int, default=10, help="Training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate")
    parser.add_argument("--patience", type=int, default=3, help="Early stopping patience")
    parser.add_argument("--fine_tune", action="store_true", help="Fine-tune all backbone layers")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    train_rice_model(
        data_dir=Path(args.data_dir),
        models_dir=Path(args.models_dir),
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        patience=args.patience,
        fine_tune=args.fine_tune,
        seed=args.seed,
    )
