import torch
import json
from pathlib import Path
from torchvision import transforms, models
from PIL import Image

tf = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

saved_names = json.load(open("models/class_names.json"))
ckpt = torch.load("models/farmdoctor_efficientnet_b0.pth", map_location="cpu")
ckpt_names = ckpt.get("class_names", [])

model = models.efficientnet_b0(weights=None)
model.classifier[1] = torch.nn.Linear(model.classifier[1].in_features, len(saved_names))
model.load_state_dict(ckpt.get("model_state_dict", ckpt))
model.eval()

test_folders = [
    "Apple___Apple_scab",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Tomato___Early_blight",
    "Tomato___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
]

base_dir = Path("dataset/PlantVillage/raw/color")

print(f"{'Folder Name':<38} | {'Argmax Idx':<10} | {'Saved Class at Idx':<38} | {'Prob':<6}")
print("-" * 105)

with torch.inference_mode():
    for fld in test_folders:
        dir_p = base_dir / fld
        if not dir_p.exists():
            continue
        imgs = list(dir_p.glob("*.JPG")) + list(dir_p.glob("*.jpg"))
        if not imgs:
            continue
        # Test first 3 images
        for img_p in imgs[:2]:
            im = Image.open(img_p).convert("RGB")
            t = tf(im).unsqueeze(0)
            out = model(t)
            probs = torch.softmax(out, dim=1)[0]
            top_prob, top_idx = torch.topk(probs, k=1)
            idx = top_idx.item()
            pred_class = saved_names[idx]
            match = "MATCH" if pred_class == fld else "MISMATCH"
            print(f"{fld:<38} | {idx:<10} | {pred_class:<38} | {top_prob.item()*100:.1f}% ({match})")
