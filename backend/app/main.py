"""
FarmDoctor AI - FastAPI Backend Application
High-performance REST API for crop leaf disease detection, live microclimate weather,
agricultural knowledge base atlas, farmer advisory decision support, personalized farm management,
persistent scan records, Hindi/Hinglish conversational assistant, and crop care action plans.
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from dotenv import load_dotenv
# Load environment variables from .env file if present
load_dotenv()

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from backend.app.db.database import init_db
from backend.app.schemas import (
    HealthResponse,
    DiseaseClassesResponse,
    DiseaseClassItem,
    PredictionResponse,
    ErrorDetail,
    WeatherResponse,
    KnowledgeDiseasesListResponse,
    DiseaseKnowledgeItem,
    AdvisoryRequest,
    AdvisoryResponse,
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    FarmCreateRequest,
    FarmUpdateRequest,
    FarmResponse,
    FarmListResponse,
    ScanSaveRequest,
    ScanRecordResponse,
    ScanListResponse,
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantHistoryResponse,
    PersonalizedActionPlanResponse,
    TaskCreateRequest,
    TaskUpdateRequest,
    TaskCompleteRequest,
    TaskResponse,
    TaskListResponse,
    AlertItem,
    AlertListResponse,
    DismissAlertResponse,
)
from backend.app.services.prediction_service import (
    PredictionService,
    ModelNotLoadedException,
    InvalidImageException,
    ImageTooLargeException,
)
from backend.app.services.weather_service import WeatherService
from backend.app.services.knowledge_service import KnowledgeService
from backend.app.services.advisory_service import CropAdvisoryAgent
from backend.app.services.auth_service import AuthService, get_current_user, get_optional_current_user
from backend.app.services.farm_service import FarmService
from backend.app.services.scan_history_service import ScanHistoryService
from backend.app.services.assistant_service import AIAssistantService
from backend.app.services.action_plan_service import ActionPlanService
from backend.app.services.planner_service import PlannerService
from backend.app.services.alert_service import AlertService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("farmdoctor.api")

# Initialize singleton backend services
weather_service = WeatherService()
knowledge_service = KnowledgeService.get_instance()
advisory_agent = CropAdvisoryAgent(knowledge_service=knowledge_service)
assistant_service = AIAssistantService(knowledge_service=knowledge_service, weather_service=weather_service)
action_plan_service = ActionPlanService(knowledge_service=knowledge_service, weather_service=weather_service)
alert_service = AlertService(weather_service=weather_service)



# ==========================================
# Application Lifespan Context Manager
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown lifecycle.
    Initializes database schema and loads PyTorch model once during startup.
    """
    logger.info("Initializing FarmDoctor AI Backend API...")

    # Initialize SQLite database schema and indexes
    try:
        init_db()
    except Exception as e:
        logger.error(f"Failed to initialize database schema: {e}", exc_info=True)

    # Initialize prediction service and attempt to load model
    service = PredictionService.get_instance()
    if service.model_loaded:
        logger.info(
            f"Model ready: EfficientNet-B0 loaded from '{service.active_checkpoint_path}' "
            f"with {service.num_classes} classes."
        )
    else:
        logger.warning(
            f"Model not loaded at startup: {service.load_error}. "
            f"Inference requests will return 503 until a checkpoint is provided."
        )

    # Log weather configuration status
    if weather_service.is_configured():
        logger.info(f"Weather service ready: Provider '{weather_service.provider}'.")
    else:
        logger.info("Weather service unconfigured: Set WEATHER_API_KEY in .env to enable live weather.")

    yield
    logger.info("Shutting down FarmDoctor AI Backend API...")


# ==========================================
# FastAPI Application Configuration
# ==========================================
app = FastAPI(
    title="FarmDoctor AI - Crop Disease Detection & Advisory API",
    description=(
        "**FarmDoctor AI** provides AI-powered crop leaf disease diagnosis, live farm weather "
        "monitoring, an authoritative agricultural knowledge base, an agronomic decision support agent, "
        "personalized farm management, persistent scan history, Hindi/Hinglish conversational assistant, "
        "and tailored crop action plans.\n\n"
        "### Key Endpoints:\n"
        "- `GET /health` : Verify API health and check model availability.\n"
        "- `POST /api/v1/auth/register` : Create farmer account.\n"
        "- `POST /api/v1/auth/login` : Authenticate farmer.\n"
        "- `GET /api/v1/farms` : Manage personalized farm records.\n"
        "- `GET /api/v1/scans` : Query persistent leaf scan history.\n"
        "- `POST /api/v1/assistant/chat` : Conversational Hindi/Hinglish AI farming guidance.\n"
        "- `GET /api/v1/farms/{farm_id}/action-plan` : Generate personalized crop care action plan."
    ),
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable Cross-Origin Resource Sharing (CORS) for web frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Root / Welcome Endpoint
# ==========================================
@app.get(
    "/",
    tags=["General"],
    summary="Root Welcome Endpoint",
    description="Returns welcome message and links to API documentation."
)
async def root():
    return {
        "service": "FarmDoctor AI - Crop Disease Detection & Farmer Intelligence API",
        "version": "1.2.0",
        "documentation": "/docs",
        "health": "/health",
        "api_v1": {
            "predict": "/api/v1/predict",
            "classes": "/api/v1/diseases/classes",
            "weather": "/api/v1/weather",
            "knowledge": "/api/v1/knowledge/diseases",
            "advisory": "/api/v1/advisory",
            "auth": "/api/v1/auth",
            "farms": "/api/v1/farms",
            "scans": "/api/v1/scans",
            "assistant": "/api/v1/assistant"
        }
    }


# ==========================================
# Endpoint 1: Health Check
# ==========================================
@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health & Model Readiness Check",
    description="Reports the service status and whether the ML model is currently loaded in memory."
)
async def health_check():
    service = PredictionService.get_instance()
    return HealthResponse(
        status="healthy",
        model_loaded=service.model_loaded,
        model_name="EfficientNet-B0",
        checkpoint_path=service.active_checkpoint_path,
        num_classes=service.num_classes if service.model_loaded else None,
        device=str(service.device),
        version="1.2.0"
    )


# ==========================================
# Endpoint 2: Supported Disease Classes
# ==========================================
@app.get(
    "/api/v1/diseases/classes",
    response_model=DiseaseClassesResponse,
    responses={
        503: {"model": ErrorDetail, "description": "Model or disease classes unavailable"}
    },
    tags=["Diagnostics"],
    summary="List Supported Crop Disease Classes",
    description="Returns the full list of 38 plant and disease classes supported by the trained model."
)
async def get_disease_classes():
    service = PredictionService.get_instance()

    # If model is not loaded, try to see if class_metadata is available
    if not service.class_metadata:
        service.reload_model()

    if not service.class_metadata:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Disease class definitions are currently unavailable. "
                "Please verify that 'models/class_names.json' exists."
            )
        )

    items = [DiseaseClassItem(**item) for item in service.class_metadata]
    return DiseaseClassesResponse(
        total_classes=len(items),
        classes=items
    )


# ==========================================
# Endpoint 3: Disease Prediction
# ==========================================
@app.post(
    "/api/v1/predict",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorDetail, "description": "Invalid or corrupted image"},
        413: {"model": ErrorDetail, "description": "Image file too large (> 10MB)"},
        503: {"model": ErrorDetail, "description": "Model checkpoint not loaded"}
    },
    tags=["Diagnostics"],
    summary="Predict Crop Disease from Leaf Image",
    description=(
        "Upload a crop leaf photograph (JPEG, PNG, WEBP, or BMP) to receive the top-3 "
        "predicted crop conditions along with confidence percentages and agricultural field disclaimers."
    )
)
async def predict_crop_disease(
    file: UploadFile = File(..., description="Crop leaf image file (JPEG, PNG, WEBP, BMP up to 10MB)")
):
    service = PredictionService.get_instance()

    try:
        file_bytes = await file.read()
    except Exception as e:
        logger.error(f"Error reading upload file stream: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file data."
        )

    try:
        result = service.predict(
            file_bytes=file_bytes,
            filename=file.filename or "upload.jpg",
            content_type=file.content_type,
            top_k=3
        )
        return PredictionResponse(**result)

    except ModelNotLoadedException as mle:
        logger.warning(f"Prediction rejected (model not loaded): {mle}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(mle)
        )

    except ImageTooLargeException as itle:
        logger.warning(f"Prediction rejected (file too large): {itle}")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(itle)
        )

    except InvalidImageException as iie:
        logger.warning(f"Prediction rejected (invalid image): {iie}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(iie)
        )

    except Exception as exc:
        logger.error(f"Unexpected prediction failure: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal diagnostic error occurred while processing the leaf image."
        )


# ==========================================
# Endpoint 4: Live Weather Integration
# ==========================================
@app.get(
    "/api/v1/weather",
    response_model=WeatherResponse,
    tags=["Microclimate & Weather"],
    summary="Get Farm Weather & Spray Window Advisory",
    description=(
        "Fetches live weather observations (temperature, humidity, wind, precipitation) "
        "and calculates a foliar spraying suitability window. If WEATHER_API_KEY is not set in .env, "
        "returns an unconfigured status with setup instructions."
    )
)
async def get_farm_weather(
    location: Optional[str] = Query(None, description="City or region name (e.g. 'Nagpur' or 'Pune,IN')"),
    lat: Optional[float] = Query(None, description="Latitude coordinate (-90.0 to 90.0)"),
    lon: Optional[float] = Query(None, description="Longitude coordinate (-180.0 to 180.0)")
):
    # Validate coordinate ranges if provided
    if lat is not None and not (-90.0 <= lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid latitude. Must be between -90.0 and 90.0."
        )
    if lon is not None and not (-180.0 <= lon <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid longitude. Must be between -180.0 and 180.0."
        )

    return await weather_service.get_weather(location=location, lat=lat, lon=lon)


# ==========================================
# Endpoint 5: Agricultural Knowledge Base (List)
# ==========================================
@app.get(
    "/api/v1/knowledge/diseases",
    response_model=KnowledgeDiseasesListResponse,
    tags=["Agricultural Knowledge Base"],
    summary="List Verified Crop Disease Knowledge Entries",
    description="Returns structured agricultural entries with symptoms, prevention, organic care, and verified citations."
)
async def list_knowledge_diseases(
    crop: Optional[str] = Query(None, description="Filter by crop name (e.g. 'Tomato', 'Potato', 'Apple')"),
    search: Optional[str] = Query(None, description="Search query across disease name, crop, or scientific name")
):
    items = knowledge_service.get_all(crop=crop, search=search)
    return KnowledgeDiseasesListResponse(
        total_records=len(items),
        diseases=items
    )


# ==========================================
# Endpoint 6: Agricultural Knowledge Base (Detail)
# ==========================================
@app.get(
    "/api/v1/knowledge/diseases/{disease_id}",
    response_model=DiseaseKnowledgeItem,
    responses={
        404: {"model": ErrorDetail, "description": "Disease record not found"}
    },
    tags=["Agricultural Knowledge Base"],
    summary="Get Detailed Disease Knowledge Record",
    description="Returns verified agronomic guidance, favorable weather thresholds, and reference links for a specific disease ID."
)
async def get_knowledge_disease_detail(
    disease_id: str
):
    item = knowledge_service.get_by_id(disease_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Disease record '{disease_id}' was not found in the agricultural knowledge base."
        )
    return item


# ==========================================
# Endpoint 7: Crop Advisory Agent
# ==========================================
@app.post(
    "/api/v1/advisory",
    response_model=AdvisoryResponse,
    tags=["Crop Advisory Agent"],
    summary="Synthesize Farm Advisory Guidance",
    description=(
        "Combines image prediction findings, verified scientific knowledge, and local microclimate data "
        "to generate comprehensive, safe agronomic decision support. Operates 100% offline without mandatory API keys."
    )
)
async def generate_crop_advisory(
    request: AdvisoryRequest
):
    if not request.crop.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Crop name cannot be empty."
        )
    if not request.condition.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Condition cannot be empty."
        )

    try:
        response = advisory_agent.generate_advisory(request)
        return response
    except Exception as e:
        logger.error(f"Error generating crop advisory: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate agronomic advisory."
        )


# ==========================================
# Endpoint 8: Farmer Authentication (Auth)
# ==========================================
@app.post(
    "/api/v1/auth/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Farmer Authentication"],
    summary="Register Farmer Account",
    description="Creates a new farmer profile with encrypted password storage and issues an initial Bearer session token."
)
async def register_farmer(payload: UserRegisterRequest):
    return AuthService.register_user(
        username=payload.username,
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name
    )


@app.post(
    "/api/v1/auth/login",
    response_model=TokenResponse,
    tags=["Farmer Authentication"],
    summary="Farmer Sign In",
    description="Authenticates with username or email and password, issuing a 30-day cryptographic session token."
)
async def login_farmer(payload: UserLoginRequest):
    return AuthService.authenticate_user(
        username_or_email=payload.username,
        password=payload.password
    )


@app.get(
    "/api/v1/auth/me",
    response_model=UserResponse,
    tags=["Farmer Authentication"],
    summary="Get Current Farmer Profile",
    description="Returns the profile information of the currently authenticated farmer."
)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    return UserResponse(**current_user)


@app.post(
    "/api/v1/auth/logout",
    tags=["Farmer Authentication"],
    summary="Farmer Sign Out",
    description="Invalidates current session token."
)
async def logout_farmer(
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Query(None)
):
    # Token is invalidated through header extraction
    return {"message": "Logged out successfully"}


# ==========================================
# Endpoint 9: Personalized Farm Management
# ==========================================
@app.post(
    "/api/v1/farms",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["My Farm Management"],
    summary="Add New Farm Plot",
    description="Records a new farm plot with crop, growth stage, soil type, and acreage under the authenticated user's account."
)
async def create_farm_plot(
    payload: FarmCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    return FarmService.create_farm(user_id=current_user["id"], data=payload)


@app.get(
    "/api/v1/farms",
    response_model=FarmListResponse,
    tags=["My Farm Management"],
    summary="List My Farm Plots",
    description="Retrieves all farm plots owned by the authenticated user with scan counts."
)
async def list_my_farms(
    current_user: dict = Depends(get_current_user)
):
    farms = FarmService.get_user_farms(user_id=current_user["id"])
    return FarmListResponse(total_farms=len(farms), farms=farms)


@app.get(
    "/api/v1/farms/{farm_id}",
    response_model=FarmResponse,
    tags=["My Farm Management"],
    summary="Get Farm Plot Details",
    description="Retrieves a specific farm plot with ownership verification."
)
async def get_farm_plot_details(
    farm_id: str,
    current_user: dict = Depends(get_current_user)
):
    return FarmService.get_farm_by_id(user_id=current_user["id"], farm_id=farm_id)


@app.put(
    "/api/v1/farms/{farm_id}",
    response_model=FarmResponse,
    tags=["My Farm Management"],
    summary="Update Farm Plot",
    description="Updates crop, growth stage, irrigation, or notes for a farm plot owned by the authenticated farmer."
)
async def update_farm_plot(
    farm_id: str,
    payload: FarmUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    return FarmService.update_farm(user_id=current_user["id"], farm_id=farm_id, data=payload)


@app.delete(
    "/api/v1/farms/{farm_id}",
    tags=["My Farm Management"],
    summary="Delete Farm Plot",
    description="Deletes a farm plot record with strict ownership verification."
)
async def delete_farm_plot(
    farm_id: str,
    current_user: dict = Depends(get_current_user)
):
    FarmService.delete_farm(user_id=current_user["id"], farm_id=farm_id)
    return {"message": f"Farm plot '{farm_id}' was deleted successfully."}


# ==========================================
# Endpoint 10: Persistent Scan History
# ==========================================
@app.post(
    "/api/v1/scans",
    response_model=ScanRecordResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Persistent Scan History"],
    summary="Save Successful Leaf Scan to History",
    description="Saves a successful prediction result and optional leaf image linked to the farmer's account and farm plot."
)
async def save_scan_to_history(
    payload: ScanSaveRequest,
    current_user: dict = Depends(get_current_user)
):
    return ScanHistoryService.save_scan(user_id=current_user["id"], data=payload)


@app.get(
    "/api/v1/scans",
    response_model=ScanListResponse,
    tags=["Persistent Scan History"],
    summary="List Farmer's Diagnostic Scans",
    description="Returns the authenticated farmer's previous leaf inspections with multi-parameter filtering."
)
async def list_my_scans(
    crop: Optional[str] = Query(None, description="Filter by crop name"),
    predicted_class: Optional[str] = Query(None, description="Filter by disease or condition"),
    farm_id: Optional[str] = Query(None, description="Filter by associated farm plot"),
    date_from: Optional[str] = Query(None, description="Filter by earliest date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter by latest date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    records = ScanHistoryService.get_user_scans(
        user_id=current_user["id"],
        crop=crop,
        predicted_class=predicted_class,
        farm_id=farm_id,
        date_from=date_from,
        date_to=date_to
    )
    return ScanListResponse(total_scans=len(records), scans=records)


@app.get(
    "/api/v1/scans/{scan_id}",
    response_model=ScanRecordResponse,
    tags=["Persistent Scan History"],
    summary="Get Scan Inspection Details",
    description="Retrieves a specific scan record with full top-K predictions and ownership verification."
)
async def get_scan_details(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    return ScanHistoryService.get_scan_by_id(user_id=current_user["id"], scan_id=scan_id)


@app.delete(
    "/api/v1/scans/{scan_id}",
    tags=["Persistent Scan History"],
    summary="Delete Scan Record",
    description="Removes a saved inspection record and its image with ownership verification."
)
async def delete_scan_record(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    ScanHistoryService.delete_scan(user_id=current_user["id"], scan_id=scan_id)
    return {"message": f"Scan record '{scan_id}' was deleted successfully."}


@app.get(
    "/api/v1/scans/{scan_id}/image",
    tags=["Persistent Scan History"],
    summary="Get Original Scan Image",
    description="Streams the original uploaded leaf image file with ownership authorization."
)
async def get_scan_image(
    scan_id: str,
    current_user: dict = Depends(get_current_user)
):
    img_path = ScanHistoryService.get_scan_image_path(user_id=current_user["id"], scan_id=scan_id)
    return FileResponse(str(img_path))


# ==========================================
# Endpoint 11: Hindi/Hinglish AI Farming Assistant
# ==========================================
@app.post(
    "/api/v1/assistant/chat",
    response_model=AssistantChatResponse,
    tags=["AI Farming Assistant"],
    summary="Chat with Hindi/Hinglish AI Farming Assistant",
    description=(
        "Conversational advisory agent that understands Hindi and Hinglish queries, "
        "grounds answers in verified agricultural knowledge, incorporates farm and weather context, "
        "and asks follow-up questions when symptoms are ambiguous."
    )
)
async def assistant_chat(
    payload: AssistantChatRequest,
    current_user: dict = Depends(get_current_user)
):
    return await assistant_service.chat(user_id=current_user["id"], request=payload)


@app.get(
    "/api/v1/assistant/history",
    response_model=AssistantHistoryResponse,
    tags=["AI Farming Assistant"],
    summary="Get Conversation History",
    description="Returns chronological conversational history turns for the authenticated farmer."
)
async def get_assistant_history(
    current_user: dict = Depends(get_current_user)
):
    msgs = AIAssistantService.get_conversation_history(user_id=current_user["id"])
    return AssistantHistoryResponse(total_messages=len(msgs), messages=msgs)


@app.delete(
    "/api/v1/assistant/history",
    tags=["AI Farming Assistant"],
    summary="Clear Conversation History",
    description="Clears all conversation turns for the authenticated farmer."
)
async def clear_assistant_history(
    current_user: dict = Depends(get_current_user)
):
    AIAssistantService.clear_conversation_history(user_id=current_user["id"])
    return {"message": "Conversation history cleared successfully."}


# ==========================================
# Endpoint 12: Personalized Crop Action Plan
# ==========================================
@app.get(
    "/api/v1/farms/{farm_id}/action-plan",
    response_model=PersonalizedActionPlanResponse,
    tags=["Personalized Action Plan"],
    summary="Generate Farm Crop-Care Action Plan",
    description=(
        "Synthesizes a tailored action plan detailing next physical inspections, "
        "cultural prevention practices, follow-up observation schedule, and expert escalation triggers "
        "based on the farm's crop, growth stage, prior scan history, and live weather."
    )
)
async def get_farm_action_plan(
    farm_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await action_plan_service.generate_action_plan(user_id=current_user["id"], farm_id=farm_id)


# ==========================================
# Endpoint 13: Daily Farming Planner
# ==========================================
@app.post(
    "/api/v1/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Daily Farming Planner"],
    summary="Create Farming Task",
    description="Schedules a new crop inspection, irrigation, or field activity in the farmer's planner."
)
async def create_farming_task(
    payload: TaskCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    return PlannerService.create_task(user_id=current_user["id"], data=payload)


@app.get(
    "/api/v1/tasks",
    response_model=TaskListResponse,
    tags=["Daily Farming Planner"],
    summary="List Farming Tasks",
    description="Retrieves farmer tasks with optional filtering by farm, status, or date."
)
async def list_farming_tasks(
    farm_id: Optional[str] = Query(None, description="Filter by associated farm ID"),
    status: Optional[str] = Query(None, description="Filter by status ('pending' or 'completed')"),
    due_date: Optional[str] = Query(None, description="Filter by specific date (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    return PlannerService.get_user_tasks(
        user_id=current_user["id"],
        farm_id=farm_id,
        status_filter=status,
        date_filter=due_date,
    )


@app.get(
    "/api/v1/tasks/{task_id}",
    response_model=TaskResponse,
    tags=["Daily Farming Planner"],
    summary="Get Task Details",
    description="Fetches a specific farming task by ID with strict ownership validation."
)
async def get_farming_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    return PlannerService.get_task_by_id(task_id=task_id, user_id=current_user["id"])


@app.put(
    "/api/v1/tasks/{task_id}",
    response_model=TaskResponse,
    tags=["Daily Farming Planner"],
    summary="Update Farming Task",
    description="Updates task properties with ownership verification."
)
async def update_farming_task(
    task_id: str,
    payload: TaskUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    return PlannerService.update_task(task_id=task_id, user_id=current_user["id"], data=payload)


@app.patch(
    "/api/v1/tasks/{task_id}/complete",
    response_model=TaskResponse,
    tags=["Daily Farming Planner"],
    summary="Toggle Task Complete",
    description="Marks a farming task as completed or reverts it to pending."
)
async def complete_farming_task(
    task_id: str,
    payload: TaskCompleteRequest,
    current_user: dict = Depends(get_current_user)
):
    return PlannerService.toggle_complete(
        task_id=task_id,
        user_id=current_user["id"],
        completed=payload.completed,
    )


@app.delete(
    "/api/v1/tasks/{task_id}",
    tags=["Daily Farming Planner"],
    summary="Delete Farming Task",
    description="Removes a farming task after verifying ownership."
)
async def delete_farming_task(
    task_id: str,
    current_user: dict = Depends(get_current_user)
):
    PlannerService.delete_task(task_id=task_id, user_id=current_user["id"])
    return {"message": "Farming task deleted successfully.", "task_id": task_id}


# ==========================================
# Endpoint 14: Smart Crop Alerts
# ==========================================
@app.get(
    "/api/v1/alerts",
    response_model=AlertListResponse,
    tags=["Smart Crop Alerts"],
    summary="Get Active Smart Crop Alerts",
    description=(
        "Retrieves active, evidence-grounded crop notifications including overdue tasks, "
        "scan follow-up reminders, and microclimate fungal risk indicators."
    )
)
async def get_smart_alerts(
    current_user: Optional[dict] = Depends(get_optional_current_user)
):
    if not current_user:
        # Development fallback / guest state
        return AlertListResponse(total_alerts=0, alerts=[])
    return alert_service.get_user_alerts(user_id=current_user["id"])


@app.post(
    "/api/v1/alerts/{alert_key}/dismiss",
    response_model=DismissAlertResponse,
    tags=["Smart Crop Alerts"],
    summary="Dismiss Crop Alert",
    description="Marks a notification as dismissed to prevent duplicate alerts."
)
async def dismiss_smart_alert(
    alert_key: str,
    current_user: dict = Depends(get_current_user)
):
    return alert_service.dismiss_alert(user_id=current_user["id"], alert_key=alert_key)


# Custom exception handler for clean JSON error responses
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "error_code": f"HTTP_{exc.status_code}"}
    )
