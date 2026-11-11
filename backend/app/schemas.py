"""
FarmDoctor AI - Backend Pydantic Schemas
Defines request and response data contracts for API endpoints.
Includes ML predictions, Live Weather, Agricultural Knowledge Base, and Crop Advisory Agent.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


# ==========================================
# 1. System & ML Prediction Schemas
# ==========================================
class HealthResponse(BaseModel):
    """Schema for GET /health endpoint."""
    status: str = Field(..., description="Overall API service health status (e.g. 'healthy')")
    model_loaded: bool = Field(..., description="Whether the PyTorch disease classification model is currently loaded in memory")
    model_name: str = Field("EfficientNet-B0", description="Model architecture name")
    checkpoint_path: Optional[str] = Field(None, description="Sanitized relative path to active checkpoint file")
    num_classes: Optional[int] = Field(None, description="Number of crop/disease classes supported")
    device: str = Field("cpu", description="Hardware execution device")
    version: str = Field("1.0.0", description="API version")


class DiseaseClassItem(BaseModel):
    """Schema for individual disease class metadata."""
    class_index: int = Field(..., description="Internal index of the class (0-37)")
    raw_class: str = Field(..., description="Exact dataset folder / class identifier tag")
    crop: str = Field(..., description="Human-readable plant or crop name")
    condition: str = Field(..., description="Disease name or healthy status")
    is_healthy: bool = Field(..., description="True if leaf represents healthy condition")


class DiseaseClassesResponse(BaseModel):
    """Schema for GET /api/v1/diseases/classes endpoint."""
    total_classes: int = Field(..., description="Total number of supported crop/disease classes")
    classes: List[DiseaseClassItem] = Field(..., description="List of supported disease class metadata items")


class PredictionItem(BaseModel):
    """Schema for a single diagnostic prediction candidate."""
    rank: int = Field(..., description="Prediction rank (1 = highest confidence)")
    raw_class: str = Field(..., description="Raw model class identifier")
    crop: str = Field(..., description="Plant/crop species identified")
    condition: str = Field(..., description="Pathology or healthy condition identified")
    confidence_percentage: float = Field(..., description="Model confidence score formatted as percentage (0.0 to 100.0)")
    confidence_bar: str = Field(..., description="Visual ASCII confidence representation")


class PredictionResponse(BaseModel):
    """Schema for POST /api/v1/predict endpoint."""
    success: bool = Field(True, description="Whether prediction inference succeeded")
    filename: str = Field(..., description="Sanitized name of uploaded image file")
    identified_crop: Optional[str] = Field(None, description="Identified plant/crop species (e.g. 'Rice', 'Corn (maize)') or 'Unrecognized Crop'")
    predicted_disease: Optional[str] = Field(None, description="Diagnosed condition or 'Crop Not Supported'")
    confidence: Optional[float] = Field(None, description="Primary diagnostic confidence percentage (0.0 to 100.0)")
    model_name: Optional[str] = Field("FarmDoctor Dual Engine", description="Active inference model architecture")
    top_predictions: Optional[List[PredictionItem]] = Field(None, description="Top prediction candidates")
    predictions: List[PredictionItem] = Field(..., description="Top-K prediction candidates ordered by confidence")
    top_prediction: PredictionItem = Field(..., description="Highest-confidence diagnostic prediction")
    is_uncertain: bool = Field(False, description="True if top prediction confidence is below threshold or margin between top-2 candidates is narrow")
    diagnostic_status: str = Field("suspected_disease", description="Diagnostic classification status: 'confirmed_healthy', 'suspected_disease', 'uncertain', or 'unsupported_crop'")
    uncertainty_warning: Optional[str] = Field(None, description="Prominent warning displayed when prediction is uncertain or potentially out-of-distribution")
    margin_percentage: Optional[float] = Field(None, description="Confidence percentage gap between rank #1 and rank #2 candidates")
    entropy: Optional[float] = Field(None, description="Shannon entropy of softmax probability distribution in nats")
    threshold_notes: Optional[str] = Field(None, description="Scientific documentation on confidence threshold derivation and calibration limitations")
    disclaimers: List[str] = Field(..., description="Agricultural reliability and field safety notices")
    timestamp: str = Field(..., description="ISO 8601 inference timestamp")


class ErrorDetail(BaseModel):
    """Standardized error response schema."""
    detail: str = Field(..., description="Human-readable explanation of error")
    error_code: str = Field(..., description="Machine-readable error code")


# ==========================================
# 2. Live Weather Schemas
# ==========================================
class SprayAdvisory(BaseModel):
    """Foliar spray window recommendation based on live microclimate."""
    is_favorable: bool = Field(..., description="Whether current wind and rain conditions are favorable for spraying")
    headline: str = Field(..., description="Short advisory title (e.g. 'Favorable Spraying Window')")
    details: str = Field(..., description="Detailed agronomic explanation of spray conditions")


class WeatherResponse(BaseModel):
    """Schema for GET /api/v1/weather endpoint."""
    configured: bool = Field(..., description="Whether live weather API key is configured")
    status: str = Field(..., description="Weather status: 'live', 'unconfigured', or 'error'")
    message: Optional[str] = Field(None, description="Status or setup instructions message")
    location_name: Optional[str] = Field(None, description="Observed city and region name")
    latitude: Optional[float] = Field(None, description="Observed latitude coordinate")
    longitude: Optional[float] = Field(None, description="Observed longitude coordinate")
    temperature_celsius: Optional[float] = Field(None, description="Ambient temperature in degrees Celsius")
    relative_humidity: Optional[int] = Field(None, description="Relative humidity percentage (0-100)")
    wind_speed_kmh: Optional[float] = Field(None, description="Wind speed in km/h")
    rainfall_mm: Optional[float] = Field(None, description="Precipitation/rainfall in mm if reported")
    weather_condition: Optional[str] = Field(None, description="Weather condition description (e.g. 'Scattered clouds')")
    weather_icon: Optional[str] = Field(None, description="Weather icon code")
    observation_time: Optional[str] = Field(None, description="ISO timestamp of weather observation")
    provider: Optional[str] = Field(None, description="Weather data provider name")
    spray_advisory: Optional[SprayAdvisory] = Field(None, description="Microclimate spray advisory")


# ==========================================
# 3. Agricultural Knowledge Base Schemas
# ==========================================
class ReferenceSource(BaseModel):
    """Authoritative scientific or extension reference source."""
    source_name: str = Field(..., description="Title of agricultural publication or advisory")
    publisher: str = Field(..., description="Publishing institute (e.g. ICAR, UC IPM, Cornell Extension)")
    source_url: str = Field(..., description="Verified reference URL")


class EnvironmentalConditions(BaseModel):
    """Pathogen-favorable environmental conditions."""
    optimal_temp_celsius: str = Field(..., description="Favorable temperature range for disease spread")
    humidity_threshold: str = Field(..., description="Relative humidity threshold")
    leaf_wetness_hours: str = Field(..., description="Required leaf wetness duration")
    risk_factors: Optional[str] = Field(None, description="Additional field risk factors")


class DiseaseKnowledgeItem(BaseModel):
    """Comprehensive agricultural reference entry for a crop disease."""
    disease_id: str = Field(..., description="Unique slug identifier (e.g. 'tomato_early_blight')")
    crop: str = Field(..., description="Plant or crop name")
    disease_name: str = Field(..., description="Common disease name")
    raw_class: str = Field(..., description="Matching PlantVillage class name")
    scientific_name: str = Field(..., description="Pathogen scientific binomial name")
    pathogen_type: str = Field(..., description="Pathogen classification: fungal, bacterial, viral, oomycete, pest, none")
    is_healthy: bool = Field(False, description="True if entry describes healthy condition")
    common_symptoms: List[str] = Field(..., description="Field symptoms for farmer physical verification")
    favorable_environmental_conditions: EnvironmentalConditions = Field(..., description="Weather parameters that accelerate infection")
    prevention_practices: List[str] = Field(..., description="Good agricultural cultural prevention practices")
    safe_management_guidance: List[str] = Field(..., description="Safe, non-prescriptive organic and sanitation management steps")
    when_to_seek_expert: List[str] = Field(..., description="Specific triggers indicating when to consult local agronomists")
    chemical_disclaimer: str = Field(..., description="Strict chemical dosage warning")
    references: List[ReferenceSource] = Field(..., description="Verified references from universities or ICAR")


class KnowledgeDiseasesListResponse(BaseModel):
    """Schema for GET /api/v1/knowledge/diseases endpoint."""
    total_records: int = Field(..., description="Number of knowledge base entries returned")
    diseases: List[DiseaseKnowledgeItem] = Field(..., description="List of disease knowledge items")


# ==========================================
# 4. Crop Advisory Agent Schemas
# ==========================================
class AdvisoryWeatherContext(BaseModel):
    """Farmer's local weather data passed into the advisory agent."""
    temperature_celsius: Optional[float] = None
    relative_humidity: Optional[int] = None
    rainfall_mm: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    condition: Optional[str] = None


class AdvisoryRequest(BaseModel):
    """Schema for POST /api/v1/advisory endpoint."""
    crop: str = Field(..., description="Crop name (e.g. 'Tomato')")
    condition: str = Field(..., description="Diagnosed condition or symptom name (e.g. 'Early blight')")
    raw_class: Optional[str] = Field(None, description="Optional raw model class tag")
    confidence_percentage: Optional[float] = Field(None, description="Optional model confidence score")
    weather_context: Optional[AdvisoryWeatherContext] = Field(None, description="Optional current weather parameters")
    farm_notes: Optional[str] = Field(None, description="Optional farmer observations or field notes")
    growth_stage: Optional[str] = Field(None, description="Crop growth stage (seedling, vegetative, flowering, fruiting, harvest)")


class AdvisoryResponse(BaseModel):
    """Schema returned by Crop Advisory Agent."""
    crop: str = Field(..., description="Target crop")
    suspected_condition: str = Field(..., description="Assessed crop condition")
    confidence_assessment: str = Field(..., description="Scientific plain-language assessment of model confidence")
    summary: str = Field(..., description="Overall executive summary of agronomic situation")
    weather_interaction_analysis: str = Field(..., description="Analysis of current weather impact on pathogen risk")
    symptoms_to_verify: List[str] = Field(..., description="Checklist of physical symptoms for farmer inspection")
    immediate_safe_actions: List[str] = Field(..., description="Safe non-chemical sanitation and cultural next steps")
    preventative_measures: List[str] = Field(..., description="Long-term cultural and rotation strategies")
    expert_consultation_triggers: List[str] = Field(..., description="Clear criteria when to contact KVK / local agronomist")
    chemical_safety_warning: str = Field(..., description="Mandatory chemical dosage & pesticide safety warning")
    references: List[ReferenceSource] = Field(..., description="Authoritative citations from ICAR or universities")
    evidence_level: str = Field("verified_knowledge_base", description="Source of advisory synthesis")
    timestamp: str = Field(..., description="Advisory generation timestamp")


# ==========================================
# 5. Farmer Authentication Schemas
# ==========================================
class UserRegisterRequest(BaseModel):
    """Schema for POST /api/v1/auth/register endpoint."""
    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: str = Field(..., min_length=5, max_length=100, description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="Secure password")
    full_name: Optional[str] = Field(None, max_length=100, description="Farmer full name")


class UserLoginRequest(BaseModel):
    """Schema for POST /api/v1/auth/login endpoint."""
    username: str = Field(..., description="Username or email address")
    password: str = Field(..., description="Password")


class UserResponse(BaseModel):
    """Schema representing an authenticated farmer profile."""
    id: str = Field(..., description="Unique user identifier")
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    full_name: Optional[str] = Field(None, description="Farmer full name")
    created_at: str = Field(..., description="Account creation timestamp")


class TokenResponse(BaseModel):
    """Schema returned upon successful authentication."""
    access_token: str = Field(..., description="Cryptographic bearer token")
    token_type: str = Field("bearer", description="Token type")
    user: UserResponse = Field(..., description="Authenticated user details")


# ==========================================
# 6. Personalized Farm Management Schemas
# ==========================================
class FarmCreateRequest(BaseModel):
    """Schema for POST /api/v1/farms endpoint."""
    name: str = Field(..., min_length=2, max_length=100, description="Farm or field plot name")
    location: str = Field(..., min_length=2, max_length=100, description="District, village, or coordinates")
    crop_name: str = Field(..., min_length=2, max_length=100, description="Primary crop cultivated")
    crop_variety: Optional[str] = Field(None, max_length=100, description="Crop variety or cultivar")
    sowing_date: Optional[str] = Field(None, description="Sowing or planting date (YYYY-MM-DD)")
    growth_stage: str = Field("Vegetative", description="Seedling, Vegetative, Flowering, Fruiting, Harvest")
    soil_type: Optional[str] = Field(None, max_length=100, description="Soil classification or texture")
    irrigation_notes: Optional[str] = Field(None, max_length=250, description="Irrigation method and frequency")
    area_acres: Optional[float] = Field(1.0, ge=0.01, le=10000.0, description="Plot size in acres")


class FarmUpdateRequest(BaseModel):
    """Schema for PUT /api/v1/farms/{farm_id} endpoint."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    location: Optional[str] = Field(None, min_length=2, max_length=100)
    crop_name: Optional[str] = Field(None, min_length=2, max_length=100)
    crop_variety: Optional[str] = None
    sowing_date: Optional[str] = None
    growth_stage: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_notes: Optional[str] = None
    area_acres: Optional[float] = Field(None, ge=0.01, le=10000.0)


class FarmResponse(BaseModel):
    """Schema representing a saved farm plot record."""
    id: str = Field(..., description="Unique farm ID")
    user_id: str = Field(..., description="Owner user ID")
    name: str = Field(..., description="Farm name")
    location: str = Field(..., description="Location")
    crop_name: str = Field(..., description="Crop name")
    crop_variety: Optional[str] = None
    sowing_date: Optional[str] = None
    growth_stage: str = Field(..., description="Current growth stage")
    soil_type: Optional[str] = None
    irrigation_notes: Optional[str] = None
    area_acres: float = Field(..., description="Area in acres")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    scan_count: Optional[int] = Field(0, description="Number of linked leaf scans")


class FarmListResponse(BaseModel):
    """Schema for GET /api/v1/farms endpoint."""
    total_farms: int = Field(..., description="Total count of owned farms")
    farms: List[FarmResponse] = Field(..., description="List of owned farm records")


# ==========================================
# 7. Persistent Scan History Schemas
# ==========================================
class ScanSaveRequest(BaseModel):
    """Schema for saving a successful prediction to persistent history."""
    farm_id: Optional[str] = Field(None, description="Optional farm ID to associate scan with")
    filename: str = Field(..., description="Image filename")
    crop: str = Field(..., description="Crop identified")
    predicted_condition: str = Field(..., description="Diagnosed condition")
    confidence_percentage: float = Field(..., description="Confidence percentage")
    raw_class: str = Field(..., description="Model raw class")
    all_predictions: List[PredictionItem] = Field(..., description="Top prediction candidates")
    disclaimers: List[str] = Field(..., description="Safety disclaimers")
    image_base64: Optional[str] = Field(None, description="Optional base64 image data for local persistence")


class ScanRecordResponse(BaseModel):
    """Schema representing a persistent scan record."""
    id: str = Field(..., description="Unique scan ID")
    user_id: str = Field(..., description="Owner user ID")
    farm_id: Optional[str] = Field(None, description="Associated farm ID")
    farm_name: Optional[str] = Field(None, description="Associated farm name if linked")
    filename: str = Field(..., description="Uploaded filename")
    image_url: Optional[str] = Field(None, description="API URL to download or view original image")
    crop: str = Field(..., description="Diagnosed crop")
    predicted_condition: str = Field(..., description="Diagnosed condition")
    confidence_percentage: float = Field(..., description="Confidence percentage")
    raw_class: str = Field(..., description="Raw model class")
    all_predictions: List[PredictionItem] = Field(..., description="Full top-K prediction list")
    disclaimers: List[str] = Field(..., description="Safety disclaimers")
    created_at: str = Field(..., description="Scan timestamp")


class ScanListResponse(BaseModel):
    """Schema for GET /api/v1/scans endpoint."""
    total_scans: int = Field(..., description="Total scans matching filter criteria")
    scans: List[ScanRecordResponse] = Field(..., description="List of scan records")


# ==========================================
# 8. Hindi/Hinglish AI Farming Assistant Schemas
# ==========================================
class AssistantChatRequest(BaseModel):
    """Schema for POST /api/v1/assistant/chat endpoint."""
    message: str = Field(..., min_length=1, max_length=2000, description="Farmer query in Hindi, Hinglish, or English")
    farm_id: Optional[str] = Field(None, description="Optional farm ID to provide personalized context")
    include_weather: bool = Field(True, description="Whether to ground response in live farm weather")
    language_preference: str = Field("auto", description="Preferred output dialect: 'auto', 'hinglish', 'hindi', 'english'")


class AssistantMessageItem(BaseModel):
    """Single message in the conversational history."""
    id: str = Field(..., description="Message ID")
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")
    citations: Optional[List[ReferenceSource]] = None
    suggested_followups: Optional[List[str]] = None
    created_at: str = Field(..., description="Timestamp")
    detected_language: Optional[str] = Field(None, description="Resolved language: 'english', 'hindi', 'hinglish'")


class AssistantChatResponse(BaseModel):
    """Structured response from the AI Farming Assistant."""
    reply: str = Field(..., description="Helpful, friendly answer in requested dialect")
    detected_crop: Optional[str] = Field(None, description="Crop identified from query or farm context")
    detected_symptoms: Optional[List[str]] = Field(None, description="Symptoms identified from query")
    farm_context_used: Optional[str] = Field(None, description="Description of farm context used")
    weather_context_used: Optional[str] = Field(None, description="Weather parameters integrated")
    follow_up_questions: List[str] = Field([], description="Questions to clarify ambiguous symptoms")
    citations: List[ReferenceSource] = Field([], description="Authoritative university or ICAR references")
    expert_advisory_disclaimer: str = Field(..., description="Clear advisory disclaimer distinguishing predictions from confirmed diagnoses")
    message_id: str = Field(..., description="Saved assistant message ID")
    timestamp: str = Field(..., description="ISO response timestamp")
    detected_language: str = Field("english", description="Detected or resolved language: 'english', 'hindi', 'hinglish'")


class AssistantHistoryResponse(BaseModel):
    """Schema for GET /api/v1/assistant/history endpoint."""
    total_messages: int = Field(..., description="Total conversation messages")
    messages: List[AssistantMessageItem] = Field(..., description="Chronological conversation turns")


# ==========================================
# 9. Personalized Action Plan Schemas
# ==========================================
class PersonalizedActionPlanResponse(BaseModel):
    """Schema for GET /api/v1/farms/{farm_id}/action-plan endpoint."""
    farm_id: str = Field(..., description="Target farm ID")
    farm_name: str = Field(..., description="Target farm name")
    crop_name: str = Field(..., description="Crop cultivated")
    crop_variety: Optional[str] = None
    growth_stage: str = Field(..., description="Current growth stage")
    location: str = Field(..., description="Farm location")
    weather_summary: Optional[str] = Field(None, description="Current field microclimate conditions")
    recent_health_status: str = Field(..., description="Summary of recent scan findings for this plot")
    what_to_inspect_next: List[str] = Field(..., description="Specific physical leaf and soil checks to conduct")
    general_prevention_practices: List[str] = Field(..., description="Cultural and biological preventative practices")
    suggested_follow_up_observations: List[str] = Field(..., description="Observational markers and schedule")
    when_to_seek_expert: List[str] = Field(..., description="Escalation triggers for local agronomist consultation")
    relevant_sources: List[ReferenceSource] = Field(..., description="Authoritative scientific references")
    uncertainty_warning: str = Field(..., description="Clear uncertainty disclosure")
    generated_at: str = Field(..., description="Action plan generation timestamp")


# ==========================================
# 10. Daily Farming Planner Schemas
# ==========================================
class TaskCreateRequest(BaseModel):
    """Schema for POST /api/v1/tasks endpoint."""
    title: str = Field(..., min_length=2, max_length=150, description="Task headline or activity name")
    description: Optional[str] = Field(None, max_length=1000, description="Detailed instructions or steps")
    farm_id: Optional[str] = Field(None, description="Associated farm ID")
    crop: Optional[str] = Field(None, max_length=80, description="Crop name (e.g. Tomato, Potato)")
    due_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="Task due date in YYYY-MM-DD format")
    priority: str = Field("medium", description="Priority level: 'low', 'medium', 'high', 'urgent'")
    category: str = Field("inspection", description="Category: 'inspection', 'irrigation', 'nutrition', 'protection', 'harvest', 'follow_up', 'general'")
    notes: Optional[str] = Field(None, max_length=1000, description="Farmer notes or field observations")


class TaskUpdateRequest(BaseModel):
    """Schema for PUT /api/v1/tasks/{id} endpoint."""
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = None
    farm_id: Optional[str] = None
    crop: Optional[str] = None
    due_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    priority: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = Field(None, description="'pending', 'completed', 'cancelled'")
    notes: Optional[str] = None


class TaskCompleteRequest(BaseModel):
    """Schema for PATCH /api/v1/tasks/{id}/complete endpoint."""
    completed: bool = Field(True, description="Whether task is marked completed")


class TaskResponse(BaseModel):
    """Schema for individual farming task object."""
    id: str = Field(..., description="Unique task identifier")
    user_id: str = Field(..., description="Owner farmer user ID")
    farm_id: Optional[str] = None
    farm_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    crop: Optional[str] = None
    due_date: str
    priority: str
    category: str
    status: str
    notes: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: str
    updated_at: str


class TaskListResponse(BaseModel):
    """Schema for GET /api/v1/tasks endpoint."""
    total_tasks: int = Field(..., description="Total tasks found")
    pending_count: int = Field(0, description="Pending tasks count")
    completed_count: int = Field(0, description="Completed tasks count")
    tasks: List[TaskResponse] = Field(..., description="List of tasks")


# ==========================================
# 11. Smart Crop Alert Schemas
# ==========================================
class AlertItem(BaseModel):
    """Schema for an individual evidence-based crop notification/alert."""
    id: str = Field(..., description="Unique deterministic alert key")
    type: str = Field(..., description="Alert category: 'weather_risk', 'task_overdue', 'inspection_due', 'scan_followup', 'upcoming_reminder'")
    severity: str = Field(..., description="Severity level: 'info', 'warning', 'critical'")
    title: str = Field(..., description="Short clear headline")
    message: str = Field(..., description="Actionable explanation grounded in farm, task, or weather evidence")
    crop: Optional[str] = None
    farm_id: Optional[str] = None
    farm_name: Optional[str] = None
    action_tab: Optional[str] = Field(None, description="Recommended dashboard tab to open ('planner', 'weather', 'scanner', 'farms')")
    evidence_source: str = Field(..., description="Source of evidence ('Daily Planner Task', 'Microclimate Weather Observation', 'Recent Scan Pathology', 'Farm Schedule')")
    is_weather_risk_indicator: bool = Field(False, description="True if alert is an environmental microclimate indicator rather than a confirmed disease diagnosis")
    disclaimer: str = Field(..., description="Safety and scientific disclaimer")
    created_at: str = Field(..., description="Generation timestamp")


class AlertListResponse(BaseModel):
    """Schema for GET /api/v1/alerts endpoint."""
    total_alerts: int = Field(..., description="Number of active unread alerts")
    alerts: List[AlertItem] = Field(..., description="List of active crop alerts")


class DismissAlertResponse(BaseModel):
    """Schema for POST /api/v1/alerts/{alert_key}/dismiss endpoint."""
    success: bool = True
    alert_key: str
    message: str
