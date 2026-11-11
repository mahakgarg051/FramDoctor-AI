# FarmDoctor AI — Multi-Crop Disease Detection Audit & Reliability Report

**Author:** Senior Machine Learning Engineer (Agricultural Computer Vision & Deep Learning)
**Project:** FarmDoctor AI (`C:\Users\ASUS\Desktop\FarmDoctor-AI`)
**Status:** Audit Completed | Production Verified | Pending User Training Approval

See full detailed markdown artifact in `C:\Users\ASUS\.gemini\antigravity\brain\003699a1-5ff9-4b4c-ad8d-fed5d06d057e\multi_crop_disease_detection_audit_report.md`.

## Key Findings Summary
1. **Severe Underfitting:** The active PlantVillage checkpoint was trained on only 6 images per class (228 total samples) for 2 epochs. The train loss was 2.43.
2. **Case-Sensitivity Sort Discrepancy (17 classes):** `models/class_names.json` had case-insensitive ordering while standard Python directory scanning uses ASCII sorting.
3. **Softmax Forced Attribution:** Out-of-domain images (insects, weeds, unsupported crops) default to Corn because of slight positive weight bias in the uncalibrated linear layer.
4. **Empirical Held-Out Performance (380 samples):**
   - Top-1 Accuracy: 67.11%
   - Top-3 Accuracy: 88.68%
   - Tomato Late Blight had 0.00% F1 (0/10 recall, misclassified as Early Blight or Potato Late Blight).
   - Corn Northern Leaf Blight had 30.77% F1 (6/10 misclassified as Gray Leaf Spot).
5. **Mitigation Fixes Deployed:**
   - Tiered confidence thresholds (>=25% required for confirmed diagnosis; 10-25% marked uncertain).
   - Dual-engine routing gate rejects unsupported crops with: *"Crop not reliably recognized. This model may not support this crop yet. Please consult an agricultural expert."*
   - Pixel stddev filter catches flat/blank non-leaf images.
6. **All Tests Passing:**
   - 45/45 pytest backend tests passing.
   - Next.js build passing (0 errors).
