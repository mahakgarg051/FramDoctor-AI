# 🌾 FarmDoctor AI - Crop Disease Detection & Agricultural Advisory Platform

FarmDoctor AI ek modern, production-grade deep learning aur agronomic decision-support platform hai. Yeh **PyTorch (EfficientNet-B0)**, **FastAPI backend**, **Live Weather Integration**, **Verified Agricultural Knowledge Base**, **Agronomic Crop Advisory Agent**, aur **Next.js 16 + Tailwind CSS** frontend ka upayog karke kisanon (farmers) ko accurate crop disease screening aur science-backed farming guidance provide karta hai.

---

## 📌 Core Platform Features

1. **🎙️ Hindi/Hinglish Voice Assistant (Phase 5):**
   - Native Web Speech API integration (`SpeechRecognition` & `SpeechSynthesis`).
   - Kisan mic dabakar Hindi (`hi-IN`) ya Hinglish (`en-IN`) me bolkar sawaal pooch sakte hain.
   - Spoken words ka real-time preview milta hai jise farmer edit karke submit kar sakta hai.
   - Assistant answers ko bol kar sunne ke liye Text-to-Speech audio support aur Stop-Speaking button.
   - Zero background audio recording; microphone permission explicit consent ke baad hi activate hoti hai.

2. **🔔 Smart Crop Alerts (Phase 5):**
   - Evidence-grounded notifications based on farm tasks, previous disease scans, and microclimate.
   - Fungal germination microclimate indicators: jab humidity ≥ 80% aur temperature 18-28°C ho.
   - **Important Safety Distinction:** Atmospheric risk indicator ko confirmed disease diagnosis se hamesha alag rakha jata hai.
   - Alert dismissal tracking (`dismissed_alerts` SQLite table) aur duplicate notification prevention.

3. **📅 Daily Farming Planner (Phase 5):**
   - Personalized crop-care planner for Today, Overdue, Upcoming, and Completed tasks.
   - Category tags: Crop Inspection, Irrigation, Organic Nutrition, Field Protection, Harvest, Scan Follow-up.
   - One-click completion checkbox with persistence in `farming_tasks` database table.
   - Chemical pesticide dosages schedule karne se sakht mana karta hai (safety first policy).

4. **🌾 My Farm & Persistent Scan History (Phase 4):**
   - Personalized farm plot management (Crop variety, sowing date, growth stage, soil type, acreage).
   - Secure SQLite persistence for disease scans with sanitized uploaded image storage (`backend/uploads/`).
   - Strict ownership isolation (`user_id`): ek farmer kisi doosre farmer ke farm ya scan data ko access nahi kar sakta.

5. **⛅ Live Weather & Foliar Spray Advisory:**
   - Real-time temperature, humidity, wind speed, rainfall and safe spraying windows.
   - Transparent fallback: agar API key configured nahi hai, fake data fabricate nahi hota.

6. **📚 Verified Agricultural Knowledge Base & Advisory Agent:**
   - ICAR, TNAU, UC IPM verified pathology atlas across 38 crop disease classes.
   - Scientific pathogen name, symptoms, cultural sanitation, and external citations.


---

## 📋 System Setup & Environment

- **Operating System:** Windows 11
- **Python Version:** 3.11.x
- **Node.js Version:** v24.21.0 | **npm:** 11.19.0
- **Hardware Mode:** CPU-Compatible (`torchvision`, `num_workers=0`, optimized inference)
- **Dataset:** PlantVillage (38 crop disease classes, 54,305 color images)
- **Deep Learning Model:** EfficientNet-B0 (ImageNet Pretrained)
- **Backend Framework:** FastAPI + Uvicorn + Pydantic v2 + python-dotenv
- **Frontend Framework:** Next.js 16 (App Router + Turbopack) + TypeScript + Tailwind CSS

---

## 📁 Project Directory Structure

```text
FarmDoctor-AI/
├── .env.example                       <-- Environment variables template
├── .gitignore                         <-- Protects secrets (.env, checkpoints, node_modules)
├── README.md                          <-- Complete documentation & Hinglish guide
├── requirements.txt                   <-- Root ML dependencies
├── train_model.py                     <-- Model training pipeline
├── predict.py                         <-- CLI leaf disease prediction script
├── backend/
│   ├── requirements.txt               <-- FastAPI & agronomic dependencies
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    <-- FastAPI application & REST endpoints
│   │   ├── schemas.py                 <-- Pydantic schemas (Weather, Knowledge, Advisory)
│   │   ├── data/
│   │   │   └── knowledge_base.json    <-- Verified agronomic knowledge records
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── prediction_service.py  <-- EfficientNet-B0 singleton inference service
│   │       ├── weather_service.py     <-- Live weather service & spray window calculation
│   │       ├── knowledge_service.py   <-- Plant pathology lookup & fuzzy query service
│   │       └── advisory_service.py    <-- Crop Advisory Agent (offline agronomic reasoning)
│   └── tests/
│       ├── __init__.py
│       └── test_api.py                <-- Automated test suite (18/18 tests passing)
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             <-- Root layout with dark emerald aesthetic
│   │   │   ├── page.tsx               <-- Interactive dashboard router
│   │   │   └── globals.css            <-- Modern styles
│   │   ├── components/
│   │   │   ├── Header.tsx             <-- Live backend status & navigation
│   │   │   ├── Sidebar.tsx            <-- Desktop menu & model telemetry
│   │   │   ├── MobileNav.tsx          <-- Mobile responsive drawer
│   │   │   ├── Scanner.tsx            <-- Drag & drop leaf scan & test samples
│   │   │   ├── PredictionResult.tsx   <-- Diagnosis, spray window & Crop Advisory trigger
│   │   │   ├── ScanHistory.tsx        <-- LocalStorage scan history viewer
│   │   │   ├── CropCatalog.tsx        <-- 38 PlantVillage categories pathology atlas
│   │   │   ├── WeatherWidget.tsx      <-- Live weather observations & foliar spray advisor
│   │   │   ├── AdvisoryHub.tsx        <-- Advisory Studio, Knowledge Directory & KVK support
│   │   │   └── SettingsModal.tsx      <-- Backend URL & diagnostics modal
│   │   ├── services/
│   │   │   └── api.ts                 <-- Typed frontend API client (fetchWeather, generateAdvisory, etc.)
│   │   └── types/
│   │       └── index.ts               <-- TypeScript interfaces matching Pydantic schemas
├── dataset/
│   └── PlantVillage/raw/color/        <-- 38 Crop & disease folders (54,305 images)
└── models/
    ├── class_names.json               <-- 38 classes ordered list
    ├── farmdoctor_efficientnet_b0.pth <-- Active model checkpoint
    └── best_farmdoctor_model.pth      <-- Checkpoint backup
```

---

## 🔑 Environment Variables Setup (`.env`)

Backend configuration ke liye root ya backend folder me `.env` file banayein. (Refer: `.env.example`):

| Variable Name | Required? | Default Value | Description |
|---|---|---|---|
| `WEATHER_API_KEY` | **Optional** | *Empty* | Live weather fetch karne ke liye API key |
| `WEATHER_PROVIDER` | **Optional** | `openweathermap` | `openweathermap` ya `weatherapi` |
| `DEFAULT_WEATHER_CITY` | **Optional** | `New Delhi` | Default location agar query me city na ho |
| `LLM_API_KEY` | **Optional** | *Empty* | Optional AI assistant key (Google Gemini / OpenAI) |
| `BACKEND_PORT` | **Optional** | `8000` | FastAPI server port |
| `NEXT_PUBLIC_API_URL` | **Optional** | `http://127.0.0.1:8000` | Frontend backend target URL |

### 🌐 Free Weather API Key Kaise Lein?
1. **OpenWeatherMap (Free Tier):**
   - Website par jayein: [https://openweathermap.org/api](https://openweathermap.org/api)
   - Free account sign up karein aur **"Current Weather Data"** key copy karein.
   - Apni `.env` file me add karein:
     ```env
     WEATHER_API_KEY=your_openweather_key_here
     WEATHER_PROVIDER=openweathermap
     ```
2. **WeatherAPI (Alternative Free Tier):**
   - Website: [https://www.weatherapi.com/](https://www.weatherapi.com/)
   - Sign up karke API key copy karein:
     ```env
     WEATHER_API_KEY=your_weatherapi_key_here
     WEATHER_PROVIDER=weatherapi
     ```

> **Note:** Agar aap `WEATHER_API_KEY` configure **nahi** karte, tab bhi FarmDoctor AI bina crash huye chalega! Frontend par clean card show hoga ki weather key unconfigured hai, aur advisory agent safe standard baseline assumption ke sath advice generate karega.

---

## 🚀 How to Run the Application on Windows

### Step 1: Start FastAPI Backend Server
Open **Command Prompt (CMD)**:
```cmd
cd C:\Users\ASUS\Desktop\FarmDoctor-AI
uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
```
- **Backend API URL:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Step 2: Start Next.js Frontend Dashboard
Open a **Second Command Prompt (CMD)** window:
```cmd
cd C:\Users\ASUS\Desktop\FarmDoctor-AI\frontend
npm run dev
```
- **Farmer Dashboard URL:** [http://localhost:3000](http://localhost:3000)

Apne browser me **http://localhost:3000** open kijiye!

---

## 🧪 Automated Testing & Verification

Har phase ka code rigorously automated test suite dwara verify kiya gaya hai.

### 1. Backend Automated PyTest Suite (18 Tests)
Run command in CMD:
```cmd
cd C:\Users\ASUS\Desktop\FarmDoctor-AI
python -m pytest backend/tests/test_api.py -v
```

**Actual Verified Output:**
```text
backend/tests/test_api.py::test_health_check_endpoint PASSED             [  5%]
backend/tests/test_api.py::test_get_disease_classes PASSED               [ 11%]
backend/tests/test_api.py::test_predict_with_real_leaf_image PASSED      [ 16%]
backend/tests/test_api.py::test_predict_with_synthetic_pil_image PASSED  [ 22%]
backend/tests/test_api.py::test_predict_corrupted_image_data PASSED      [ 27%]
backend/tests/test_api.py::test_predict_unsupported_extension PASSED     [ 33%]
backend/tests/test_api.py::test_predict_empty_file PASSED                [ 38%]
backend/tests/test_api.py::test_missing_model_behavior PASSED            [ 44%]
backend/tests/test_api.py::test_weather_endpoint_unconfigured PASSED     [ 50%]
backend/tests/test_api.py::test_weather_endpoint_invalid_coordinates PASSED [ 55%]
backend/tests/test_api.py::test_weather_service_parsing_and_spray_advisory[asyncio] PASSED [ 61%]
backend/tests/test_api.py::test_get_knowledge_diseases_list PASSED       [ 66%]
backend/tests/test_api.py::test_get_knowledge_diseases_filter_crop PASSED [ 72%]
backend/tests/test_api.py::test_get_knowledge_disease_detail_valid PASSED [ 77%]
backend/tests/test_api.py::test_get_knowledge_disease_detail_not_found PASSED [ 83%]
backend/tests/test_api.py::test_crop_advisory_endpoint_with_weather_and_prediction PASSED [ 88%]
backend/tests/test_api.py::test_crop_advisory_endpoint_healthy_crop PASSED [ 94%]
backend/tests/test_api.py::test_crop_advisory_endpoint_validation PASSED [100%]

============================= 18 passed in 4.95s ==============================
```

### 2. Frontend Production Build Check
Run command in CMD:
```cmd
cd C:\Users\ASUS\Desktop\FarmDoctor-AI\frontend
npm run build
```
**Actual Verified Output:**
```text
✓ Compiled successfully in 706ms
  Running TypeScript ...
  Finished TypeScript in 2.6s ...
✓ Generating static pages using 5 workers (4/4) in 723ms
Route (app)
┌ ○ /
└ ○ /_not-found
```
*(Zero TypeScript errors, zero build warnings!)*

---

## 📡 REST API Endpoints & Example Requests

### 1. Health & Status
```bash
curl -X GET "http://127.0.0.1:8000/health"
```

### 2. Live Weather & Foliar Spray Advisory
```bash
# Query by city name
curl -X GET "http://127.0.0.1:8000/api/v1/weather?location=Pune"

# Query by latitude/longitude
curl -X GET "http://127.0.0.1:8000/api/v1/weather?lat=18.5204&lon=73.8567"
```

### 3. Agricultural Knowledge Base Query
```bash
# List all disease records or filter by crop
curl -X GET "http://127.0.0.1:8000/api/v1/knowledge/diseases?crop=Tomato"

# Get specific disease record by ID
curl -X GET "http://127.0.0.1:8000/api/v1/knowledge/diseases/tomato-early-blight"
```

### 4. Crop Disease Image Prediction
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/predict" \
  -F "file=@dataset/PlantVillage/raw/color/Tomato___Early_blight/0012b9d2-2130-4a06-a834-b1f3af34f57e___RS_Erly.B 8389.JPG"
```

### 5. Synthesize Crop Advisory Guidance
```bash
curl -X POST "http://127.0.0.1:8000/api/v1/advisory" \
  -H "Content-Type: application/json" \
  -d '{
    "crop": "Tomato",
    "condition": "Early Blight",
    "confidence_percentage": 94.5,
    "growth_stage": "Vegetative Canopy",
    "farm_notes": "Concentric dark spots noticed on lower leaves after rain",
    "weather_context": {
      "temperature_celsius": 26.5,
      "relative_humidity": 82.0,
      "rainfall_mm": 2.5,
      "wind_speed_kmh": 8.0,
      "condition": "Rain"
    }
  }'
```

### 6. Daily Farming Planner & Smart Alerts Endpoints (Phase 5)
```bash
# List tasks
curl -X GET "http://127.0.0.1:8000/api/v1/tasks" -H "Authorization: Bearer <TOKEN>"

# Create task
curl -X POST "http://127.0.0.1:8000/api/v1/tasks" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Inspect lower canopies", "due_date": "2026-10-22", "crop": "Tomato", "priority": "high"}'

# Toggle task complete
curl -X PATCH "http://127.0.0.1:8000/api/v1/tasks/<TASK_ID>/complete" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'

# Get smart crop alerts
curl -X GET "http://127.0.0.1:8000/api/v1/alerts" -H "Authorization: Bearer <TOKEN>"

# Dismiss an alert
curl -X POST "http://127.0.0.1:8000/api/v1/alerts/<ALERT_KEY>/dismiss" -H "Authorization: Bearer <TOKEN>"
```

---

## 🎙️ Browser Voice Compatibility Notes

- **Voice Recognition (Speech-to-Text):**
  - **Google Chrome** (Desktop & Android): Full native support via `webkitSpeechRecognition`.
  - **Microsoft Edge** (Desktop & Android): Full native support via `SpeechRecognition`.
  - **Mozilla Firefox & Apple Safari:** Partial or limited Web Speech API support. When speech recognition is unavailable in the browser, FarmDoctor AI displays an informative browser notice and smoothly falls back to text-based interaction without crashing.
- **Voice Output (Speech Synthesis):**
  - Works across modern Chromium, Gecko, and WebKit browsers using `window.speechSynthesis`.
  - Supports Hindi (`hi-IN`) and Indian English / Hinglish (`en-IN`) voices.
- **Microphone Privacy:**
  - Audio is **never recorded or streamed in the background**.
  - Microphone access is only activated when the farmer explicitly taps the microphone button.
  - A prominent pulsing indicator and transcript preview display while listening.

---

## 🔔 How Reminders and Risk Indicators Work

1. **Daily Planner Overdue & Today Reminders:**
   - Tasks due today or in the past that are still marked `pending` trigger priority notifications.
2. **Scan Follow-up Observations:**
   - If a disease scan was performed in the last 7 days that identified pathology (e.g. Early Blight, Late Blight, Scab), the system prompts the farmer to inspect for lesion stabilization or spread.
3. **Microclimate Environmental Risk Indicators:**
   - Calculated **only when live weather is configured and active**.
   - If relative humidity is ≥ 80% and temperature is 18–28°C, an alert notes favorable microclimate conditions for fungal spore germination.
   - **Crucial Distinction:** Environmental risk indicators are based strictly on atmospheric parameters, **never on automated disease diagnosis**. Farmers are advised to physically verify foliage and never apply chemical sprays without physical symptoms.
4. **Duplicate Prevention & Dismissal:**
   - Each alert is assigned a deterministic key. When a farmer dismisses an alert, it is stored in the `dismissed_alerts` SQLite table and will not re-trigger.

---

## 🚀 Running FarmDoctor AI on Windows (Step-by-Step)

### Terminal 1: FastAPI Backend
```cmd
cd /d C:\Users\ASUS\Desktop\FarmDoctor-AI
C:\Users\ASUS\AppData\Local\Programs\Python\Python311\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs (Swagger): `http://127.0.0.1:8000/docs`

### Terminal 2: Next.js Frontend
```cmd
cd /d C:\Users\ASUS\Desktop\FarmDoctor-AI\frontend
npm run dev
```
- Web Application: `http://localhost:3000`

---

## ✅ Verified Automated Test Results

### Backend Pytest Suite:
```cmd
python -m pytest backend/tests/ -v
```
**29 out of 29 tests PASSED (100% Success in 7.90s)**:
- 18 ML Prediction, Weather, Knowledge, and Advisory tests: **PASSED**
- 6 Farmer Authentication, My Farm CRUD, Scan Persistence, and AI Assistant tests: **PASSED**
- 5 Daily Farming Planner, Ownership Isolation, Date Validation, and Smart Alerts tests: **PASSED**

### Frontend Next.js Build:
```cmd
npm run build
```
**Compiled successfully in 247ms, TypeScript type-checked in 1.7s with 0 errors!**

---

## 🛡️ Agricultural Safety & Expert Support (KVK)

- **Official Kisan Call Centre Helpline (India - Toll Free):** `1800-180-1551` (Subah 6 baje se raat 10 baje tak upalabdha).
- **ICAR Krishi Portal:** [https://icar.org.in](https://icar.org.in) aur [https://kvk.icar.gov.in](https://kvk.icar.gov.in) par apne zille ka KVK centre search karein.
- **Pesticide Caution:** Bina extension officer se consult kiye bina kisi bhi synthetic chemical ki matra ya spraying schedule tay na karein. Hamesha product label ke Pre-Harvest Interval (PHI) aur PPE safety guidelines follow karein.
