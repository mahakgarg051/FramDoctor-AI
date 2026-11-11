#!/usr/bin/env python3
"""
FarmDoctor AI - Model Training Pipeline
Crop Disease Detection using EfficientNet-B0 and Transfer Learning.
"""

import os
import sys
import json
import random
import argparse
from pathlib import Path
from datetime import datetime

# Configure UTF-8 safe output for Windows terminals (CMD / PowerShell)
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
from tqdm import tqdm


# ==========================================
# 1. Custom Dataset with Disjoint Transforms
# ==========================================
class LeafDataset(Dataset):
    """
    Dataset wrapper holding a list of (image_path, class_idx) tuples.
    Enforces that training and validation receive their own specific transforms
    with zero risk of data leakage.
    """
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
# 2. Data Scanning & Stratified Split
# ==========================================
def scan_and_split_dataset(data_dir, val_split=0.2, samples_per_class=None, subset_fraction=None, seed=42):
    """
    Scans the dataset folder, detects all classes, and performs a stratified,
    reproducible train/validation split per class to avoid data leakage.
    """
    data_path = Path(data_dir)
    if not data_path.exists() or not data_path.is_dir():
        raise FileNotFoundError(
            f"Dataset directory not found: '{data_dir}'.\n"
            f"Please verify that the dataset path exists."
        )

    # Detect class folders (subdirectories)
    # Use case-insensitive sorting to match the established models/class_names.json alignment
    class_folders = sorted([d for d in data_path.iterdir() if d.is_dir()], key=lambda d: d.name.lower())
    if not class_folders:
        raise ValueError(f"No class subfolders found inside '{data_dir}'.")

    # If models/class_names.json exists, verify strict alignment
    class_names = [d.name for d in class_folders]
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}

    rng = random.Random(seed)
    valid_extensions = {".jpg", ".jpeg", ".png", ".bmp"}

    train_samples = []
    val_samples = []
    class_distribution = {}

    print("\n[INFO] Scanning dataset and preparing stratified splits...")
    total_images_found = 0

    for class_folder in class_folders:
        c_name = class_folder.name
        c_idx = class_to_idx[c_name]

        # Collect valid image files
        all_imgs = [
            str(p) for p in class_folder.iterdir()
            if p.is_file() and p.suffix.lower() in valid_extensions
        ]
        total_images_found += len(all_imgs)

        if not all_imgs:
            print(f"[WARNING] No images found in folder '{c_name}'. Skipping.")
            continue

        # Shuffle deterministically
        rng.shuffle(all_imgs)

        # Apply subsetting if requested
        if samples_per_class is not None and samples_per_class > 0:
            selected_imgs = all_imgs[:samples_per_class]
        elif subset_fraction is not None and 0.0 < subset_fraction < 1.0:
            count = max(2, int(len(all_imgs) * subset_fraction))
            selected_imgs = all_imgs[:count]
        else:
            selected_imgs = all_imgs

        # Stratified train/val split for this class
        n_total = len(selected_imgs)
        n_val = max(1, int(n_total * val_split)) if n_total > 1 else 0
        n_train = n_total - n_val

        val_part = selected_imgs[:n_val]
        train_part = selected_imgs[n_val:]

        for img_path in train_part:
            train_samples.append((img_path, c_idx))
        for img_path in val_part:
            val_samples.append((img_path, c_idx))

        class_distribution[c_name] = {
            "total_available": len(all_imgs),
            "used_train": len(train_part),
            "used_val": len(val_part)
        }

    return class_names, class_to_idx, train_samples, val_samples, class_distribution, total_images_found


# ==========================================
# 3. Model Architecture Construction
# ==========================================
def build_efficientnet_model(num_classes, fine_tune=False):
    """
    Builds an EfficientNet-B0 model with ImageNet pretrained weights.
    - Transfer Learning (default): Backbone is frozen; only classifier head is trained.
    - Fine-tuning: All parameters are unfreezable.
    """
    print("\n[INFO] Initializing EfficientNet-B0...")
    try:
        weights = models.EfficientNet_B0_Weights.DEFAULT
        model = models.efficientnet_b0(weights=weights)
        print("[SUCCESS] Successfully loaded ImageNet pretrained weights (EfficientNet_B0_Weights.DEFAULT).")
    except Exception as e:
        print(f"[NOTICE] Pretrained weights could not be loaded automatically ({e}). Initializing random weights.")
        model = models.efficientnet_b0(weights=None)

    # Freeze backbone if not fine-tuning
    if not fine_tune:
        print("[INFO] Transfer Learning Mode: Freezing backbone feature extractor (training head only).")
        for param in model.features.parameters():
            param.requires_grad = False
    else:
        print("[INFO] Fine-Tuning Mode: All backbone and classifier layers will be updated.")

    # Replace classifier head for crop disease classes
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Linear(in_features, num_classes)
    print(f"[SUCCESS] Replaced classifier head: Linear(in_features={in_features}, out_features={num_classes})")

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[INFO] Total Parameters: {total_params:,} | Trainable Parameters: {trainable_params:,}")

    return model


# ==========================================
# 4. Training & Validation Loop
# ==========================================
def train_one_epoch(model, dataloader, criterion, optimizer, device, epoch, total_epochs):
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    progress_bar = tqdm(dataloader, desc=f"Epoch {epoch}/{total_epochs} [Train]", unit="batch", leave=False)
    for images, labels in progress_bar:
        images = images.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels.data).item()
        total += labels.size(0)

        current_acc = (correct / total) * 100.0
        current_loss = running_loss / total
        progress_bar.set_postfix({"loss": f"{current_loss:.4f}", "acc": f"{current_acc:.2f}%"})

    epoch_loss = running_loss / total if total > 0 else 0.0
    epoch_acc = (correct / total) * 100.0 if total > 0 else 0.0
    return epoch_loss, epoch_acc


def validate(model, dataloader, criterion, device, epoch, total_epochs):
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    progress_bar = tqdm(dataloader, desc=f"Epoch {epoch}/{total_epochs} [Val]  ", unit="batch", leave=False)
    with torch.no_grad():
        for images, labels in progress_bar:
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

            current_acc = (correct / total) * 100.0
            current_loss = running_loss / total
            progress_bar.set_postfix({"loss": f"{current_loss:.4f}", "acc": f"{current_acc:.2f}%"})

    val_loss = running_loss / total if total > 0 else 0.0
    val_acc = (correct / total) * 100.0 if total > 0 else 0.0
    return val_loss, val_acc


# ==========================================
# 5. Main Execution Function
# ==========================================
def main():
    parser = argparse.ArgumentParser(
        description="FarmDoctor AI - Train Crop Disease Detection Model (EfficientNet-B0)"
    )
    parser.add_argument("--data_dir", type=str, default="dataset/PlantVillage/raw/color",
                        help="Path to PlantVillage color dataset folder containing class subdirectories.")
    parser.add_argument("--models_dir", type=str, default="models",
                        help="Directory to save model checkpoints and class_names.json.")
    parser.add_argument("--epochs", type=int, default=5,
                        help="Number of training epochs (default: 5).")
    parser.add_argument("--batch_size", type=int, default=16,
                        help="Batch size for training/validation (default: 16, optimized for CPU).")
    parser.add_argument("--lr", type=float, default=1e-3,
                        help="Learning rate for Adam optimizer (default: 0.001).")
    parser.add_argument("--samples_per_class", type=int, default=None,
                        help="Max samples per class for quick CPU testing/smoke runs (e.g., 15 or 30).")
    parser.add_argument("--subset_fraction", type=float, default=None,
                        help="Fraction of dataset to use (e.g., 0.05 for 5%%).")
    parser.add_argument("--val_split", type=float, default=0.2,
                        help="Validation fraction (default: 0.2 = 20%%).")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for reproducibility (default: 42).")
    parser.add_argument("--fine_tune", action="store_true",
                        help="Unfreeze all backbone layers (default: False, transfer learning).")
    parser.add_argument("--checkpoint_name", type=str, default="best_farmdoctor_model.pth",
                        help="Checkpoint filename to save best model.")
    parser.add_argument("--num_workers", type=int, default=0,
                        help="DataLoader worker processes (default: 0 for reliable Windows execution).")
    args = parser.parse_args()

    print("=" * 70)
    print(" [FarmDoctor AI] Crop Disease Classification Training Pipeline")
    print("=" * 70)

    # 1. Device check
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"[CONFIG] Target Device: {device} (CPU-compatible execution)")

    # 2. Scan dataset and build splits
    try:
        (
            class_names,
            class_to_idx,
            train_samples,
            val_samples,
            class_distribution,
            total_detected
        ) = scan_and_split_dataset(
            data_dir=args.data_dir,
            val_split=args.val_split,
            samples_per_class=args.samples_per_class,
            subset_fraction=args.subset_fraction,
            seed=args.seed
        )
    except Exception as e:
        print(f"[ERROR] Dataset error: {e}", file=sys.stderr)
        sys.exit(1)

    num_classes = len(class_names)
    print(f"\n[DATASET SUMMARY]")
    print(f"  * Source Directory: {args.data_dir}")
    print(f"  * Total Images Available: {total_detected:,}")
    print(f"  * Total Classes Detected: {num_classes}")
    print(f"  * Training Samples Selected: {len(train_samples):,}")
    print(f"  * Validation Samples Selected: {len(val_samples):,}")

    print(f"\n[CLASSES] Detected Crop/Disease Classes ({num_classes} total):")
    for idx, cname in enumerate(class_names):
        print(f"  [{idx:02d}] {cname}")

    if len(train_samples) == 0:
        print("[ERROR] No training samples available. Please verify the dataset path.", file=sys.stderr)
        sys.exit(1)

    # 3. Create models directory and save class_names.json
    models_dir = Path(args.models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)
    class_names_path = models_dir / "class_names.json"
    try:
        with open(class_names_path, "w", encoding="utf-8") as f:
            json.dump(class_names, f, indent=2)
        print(f"\n[SUCCESS] Saved class mapping to: {class_names_path}")
    except Exception as e:
        print(f"[ERROR] Error saving class names JSON: {e}", file=sys.stderr)
        sys.exit(1)

    # 4. Setup Data Transforms (ImageNet standard)
    imagenet_mean = [0.485, 0.456, 0.406]
    imagenet_std = [0.229, 0.224, 0.225]
    image_size = (224, 224)

    train_transforms = transforms.Compose([
        transforms.Resize(image_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])

    val_transforms = transforms.Compose([
        transforms.Resize(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=imagenet_mean, std=imagenet_std),
    ])

    # 5. DataLoaders
    train_dataset = LeafDataset(train_samples, transform=train_transforms)
    val_dataset = LeafDataset(val_samples, transform=val_transforms)

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=False
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=False
    )

    # 6. Model, Criterion, Optimizer
    model = build_efficientnet_model(num_classes=num_classes, fine_tune=args.fine_tune)
    model = model.to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.lr
    )

    # 7. Training Execution
    checkpoint_path = models_dir / args.checkpoint_name
    best_val_acc = 0.0
    start_time = datetime.now()

    print("\n" + "=" * 70)
    print(f" [TRAINING START] {args.epochs} Epochs | Batch Size: {args.batch_size} | LR: {args.lr}")
    print("=" * 70)

    for epoch in range(1, args.epochs + 1):
        epoch_start = datetime.now()

        train_loss, train_acc = train_one_epoch(
            model=model,
            dataloader=train_loader,
            criterion=criterion,
            optimizer=optimizer,
            device=device,
            epoch=epoch,
            total_epochs=args.epochs
        )

        val_loss, val_acc = validate(
            model=model,
            dataloader=val_loader,
            criterion=criterion,
            device=device,
            epoch=epoch,
            total_epochs=args.epochs
        )

        epoch_duration = (datetime.now() - epoch_start).total_seconds()

        print(
            f"Epoch [{epoch:02d}/{args.epochs:02d}] "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.2f}% | "
            f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.2f}% | "
            f"Time: {epoch_duration:.1f}s"
        )

        # Check and save best model checkpoint
        if val_acc >= best_val_acc:
            best_val_acc = val_acc
            print(f"  [*] New best validation accuracy: {best_val_acc:.2f}%. Saving checkpoint...")

            checkpoint = {
                "epoch": epoch,
                "architecture": "efficientnet_b0",
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "best_val_acc": best_val_acc,
                "val_loss": val_loss,
                "train_acc": train_acc,
                "train_loss": train_loss,
                "class_names": class_names,
                "num_classes": num_classes,
                "image_size": [224, 224],
                "normalization": {
                    "mean": imagenet_mean,
                    "std": imagenet_std
                },
                "fine_tuned": args.fine_tune,
                "timestamp": datetime.now().isoformat()
            }

            try:
                torch.save(checkpoint, checkpoint_path)
                if not checkpoint_path.exists() or checkpoint_path.stat().st_size == 0:
                    raise IOError(f"File was not written correctly to {checkpoint_path}")
                print(f"  [SUCCESS] Best checkpoint successfully saved to: {checkpoint_path} ({checkpoint_path.stat().st_size / 1024 / 1024:.2f} MB)")
            except Exception as save_err:
                print(f"[ERROR] Error saving checkpoint: {save_err}", file=sys.stderr)
                sys.exit(1)

    total_training_time = (datetime.now() - start_time).total_seconds()
    print("\n" + "=" * 70)
    print(f" [TRAINING COMPLETE] Total Duration: {total_training_time:.1f}s")
    print(f" Best Validation Accuracy: {best_val_acc:.2f}%")
    print(f" Checkpoint Location: {checkpoint_path}")
    print("=" * 70)

    # 8. Agricultural & Scientific Reliability Disclaimers
    print("\n" + "!" * 70)
    print(" [CRITICAL SCIENTIFIC & AGRICULTURAL SAFETY NOTICE]")
    print("!" * 70)
    print(" 1. Laboratory vs. Real Field Domain Shift:")
    print("    PlantVillage images were taken under controlled studio lighting on")
    print("    plain/detached leaves. Real-world farm photographs with sunlight, shadows,")
    print("    complex soil/weeds backgrounds, and camera differences may yield lower confidence.")
    print(" 2. Preliminary Decision Support Only:")
    print("    This model provides preliminary advisory suggestions, NOT a certified diagnosis.")
    print(" 3. Chemical & Pesticide Safety:")
    print("    DO NOT apply chemical treatments or change pesticide dosages based solely on")
    print("    this AI prediction. Always inspect the crop and consult certified agricultural")
    print("    officers or extension specialists before making agronomic decisions.")
    print("!" * 70 + "\n")


if __name__ == "__main__":
    main()
