
from pathlib import Path
from zipfile import ZipFile
from huggingface_hub import hf_hub_download

base_dir = Path(__file__).resolve().parent
download_dir = base_dir / "dataset_download"
extract_dir = base_dir / "dataset" / "PlantVillage"

download_dir.mkdir(parents=True, exist_ok=True)
extract_dir.mkdir(parents=True, exist_ok=True)

print("Downloading PlantVillage data.zip...")
print("Please wait; the archive may be large.")

zip_path = hf_hub_download(
    repo_id="mohanty/PlantVillage",
    repo_type="dataset",
    filename="data.zip",
    local_dir=str(download_dir),
)

print("Download complete!")
print("Extracting dataset...")

with ZipFile(zip_path, "r") as archive:
    archive.extractall(extract_dir)

extensions = {".jpg", ".jpeg", ".png", ".bmp"}
image_count = sum(
    1 for p in extract_dir.rglob("*")
    if p.is_file() and p.suffix.lower() in extensions
)

print(f"Images found: {image_count}")
print(f"Dataset location: {extract_dir}")
