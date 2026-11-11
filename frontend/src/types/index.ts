/**
 * FarmDoctor AI - Frontend Type Definitions
 * Directly corresponds with FastAPI backend Pydantic schemas.
 */

// ==========================================
// 1. Health & Prediction
// ==========================================
export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model_name: string;
  checkpoint_path?: string | null;
  num_classes?: number | null;
  device: string;
  version: string;
}

export interface DiseaseClassItem {
  class_index: number;
  raw_class: string;
  crop: string;
  condition: string;
  is_healthy: boolean;
}

export interface DiseaseClassesResponse {
  total_classes: number;
  classes: DiseaseClassItem[];
}

export interface PredictionItem {
  rank: number;
  raw_class: string;
  crop: string;
  condition: string;
  confidence_percentage: number;
  confidence_bar: string;
}

export interface PredictionResponse {
  success: boolean;
  filename: string;
  identified_crop?: string | null;
  predicted_disease?: string | null;
  confidence?: number | null;
  model_name?: string | null;
  top_predictions?: PredictionItem[];
  predictions: PredictionItem[];
  top_prediction: PredictionItem;
  is_uncertain?: boolean;
  diagnostic_status?: string;
  uncertainty_warning?: string | null;
  margin_percentage?: number | null;
  entropy?: number | null;
  threshold_notes?: string | null;
  disclaimers: string[];
  timestamp: string;
}

export interface ScanRecord {
  id: string;
  timestamp: string;
  filename: string;
  imagePreviewUrl: string;
  topPrediction: PredictionItem;
  allPredictions: PredictionItem[];
  is_uncertain?: boolean;
  diagnostic_status?: string;
  uncertainty_warning?: string | null;
  disclaimers: string[];
  farm_id?: string | null;
  farm_name?: string | null;
}

export type ActiveTab =
  | "overview"
  | "scanner"
  | "history"
  | "crops"
  | "advisory"
  | "weather"
  | "farms"
  | "assistant"
  | "planner"
  | "settings";


// ==========================================
// 2. Weather & Spray Advisory
// ==========================================
export interface SprayAdvisory {
  is_favorable: boolean;
  headline: string;
  details: string;
}

export interface WeatherResponse {
  configured: boolean;
  status: string; // 'live' | 'unconfigured' | 'error'
  message?: string | null;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  temperature_celsius?: number | null;
  relative_humidity?: number | null;
  wind_speed_kmh?: number | null;
  rainfall_mm?: number | null;
  weather_condition?: string | null;
  weather_icon?: string | null;
  observation_time?: string | null;
  provider?: string | null;
  spray_advisory?: SprayAdvisory | null;
}

// ==========================================
// 3. Agricultural Knowledge Base
// ==========================================
export interface ReferenceSource {
  source_name: string;
  publisher: string;
  source_url: string;
}

export interface EnvironmentalConditions {
  optimal_temp_celsius: string;
  humidity_threshold: string;
  leaf_wetness_hours: string;
  risk_factors?: string | null;
}

export interface DiseaseKnowledgeItem {
  disease_id: string;
  crop: string;
  disease_name: string;
  raw_class: string;
  scientific_name: string;
  pathogen_type: string;
  is_healthy: boolean;
  common_symptoms: string[];
  favorable_environmental_conditions: EnvironmentalConditions;
  prevention_practices: string[];
  safe_management_guidance: string[];
  when_to_seek_expert: string[];
  chemical_disclaimer: string;
  references: ReferenceSource[];
}

export interface KnowledgeDiseasesListResponse {
  total_records: number;
  diseases: DiseaseKnowledgeItem[];
}

// ==========================================
// 4. Crop Advisory Agent
// ==========================================
export interface AdvisoryWeatherContext {
  temperature_celsius?: number;
  relative_humidity?: number;
  rainfall_mm?: number;
  wind_speed_kmh?: number;
  condition?: string;
}

export interface AdvisoryRequest {
  crop: string;
  condition: string;
  raw_class?: string;
  confidence_percentage?: number;
  weather_context?: AdvisoryWeatherContext;
  farm_notes?: string;
  growth_stage?: string;
}

export interface AdvisoryResponse {
  crop: string;
  suspected_condition: string;
  confidence_assessment: string;
  summary: string;
  weather_interaction_analysis: string;
  symptoms_to_verify: string[];
  immediate_safe_actions: string[];
  preventative_measures: string[];
  expert_consultation_triggers: string[];
  chemical_safety_warning: string;
  references: ReferenceSource[];
  evidence_level: string;
  timestamp: string;
}

// ==========================================
// 5. Farmer Authentication
// ==========================================
export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ==========================================
// 6. Personalized Farm Management
// ==========================================
export interface Farm {
  id: string;
  user_id: string;
  name: string;
  location: string;
  crop_name: string;
  crop_variety?: string | null;
  sowing_date?: string | null;
  growth_stage: string;
  soil_type?: string | null;
  irrigation_notes?: string | null;
  area_acres: number;
  created_at: string;
  updated_at: string;
  scan_count?: number;
}

export interface CreateFarmInput {
  name: string;
  location: string;
  crop_name: string;
  crop_variety?: string;
  sowing_date?: string;
  growth_stage?: string;
  soil_type?: string;
  irrigation_notes?: string;
  area_acres?: number;
}

export interface UpdateFarmInput {
  name?: string;
  location?: string;
  crop_name?: string;
  crop_variety?: string;
  sowing_date?: string;
  growth_stage?: string;
  soil_type?: string;
  irrigation_notes?: string;
  area_acres?: number;
}

// ==========================================
// 7. Persistent Scan Records
// ==========================================
export interface PersistentScanRecord {
  id: string;
  user_id: string;
  farm_id?: string | null;
  farm_name?: string | null;
  filename: string;
  image_url?: string | null;
  crop: string;
  predicted_condition: string;
  confidence_percentage: number;
  raw_class: string;
  all_predictions: PredictionItem[];
  disclaimers: string[];
  created_at: string;
}

// ==========================================
// 8. Hindi/Hinglish AI Farming Assistant
// ==========================================
export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ReferenceSource[] | null;
  suggested_followups?: string[] | null;
  created_at: string;
  detected_language?: "english" | "hindi" | "hinglish" | string;
}

export interface AssistantChatResponse {
  reply: string;
  detected_crop?: string | null;
  detected_symptoms?: string[] | null;
  farm_context_used?: string | null;
  weather_context_used?: string | null;
  follow_up_questions: string[];
  citations: ReferenceSource[];
  expert_advisory_disclaimer: string;
  message_id: string;
  timestamp: string;
  detected_language?: "english" | "hindi" | "hinglish" | string;
}

// ==========================================
// 9. Personalized Action Plan
// ==========================================
export interface PersonalizedActionPlan {
  farm_id: string;
  farm_name: string;
  crop_name: string;
  crop_variety?: string | null;
  growth_stage: string;
  location: string;
  weather_summary?: string | null;
  recent_health_status: string;
  what_to_inspect_next: string[];
  general_prevention_practices: string[];
  suggested_follow_up_observations: string[];
  when_to_seek_expert: string[];
  relevant_sources: ReferenceSource[];
  uncertainty_warning: string;
  generated_at: string;
}

// ==========================================
// 10. Daily Farming Planner
// ==========================================
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory =
  | "inspection"
  | "irrigation"
  | "nutrition"
  | "protection"
  | "harvest"
  | "follow_up"
  | "general";

export interface FarmingTask {
  id: string;
  user_id: string;
  farm_id?: string | null;
  farm_name?: string | null;
  title: string;
  description?: string | null;
  crop?: string | null;
  due_date: string;
  priority: TaskPriority;
  category: TaskCategory;
  status: "pending" | "completed" | "cancelled";
  notes?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  farm_id?: string;
  crop?: string;
  due_date: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  notes?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  farm_id?: string;
  crop?: string;
  due_date?: string;
  priority?: TaskPriority;
  category?: TaskCategory;
  status?: "pending" | "completed" | "cancelled";
  notes?: string;
}

export interface TaskListResponse {
  total_tasks: number;
  pending_count: number;
  completed_count: number;
  tasks: FarmingTask[];
}

// ==========================================
// 11. Smart Crop Alerts
// ==========================================
export type AlertSeverity = "info" | "warning" | "critical";

export interface CropAlert {
  id: string;
  type: "weather_risk" | "task_overdue" | "inspection_due" | "scan_followup" | "upcoming_reminder";
  severity: AlertSeverity;
  title: string;
  message: string;
  crop?: string | null;
  farm_id?: string | null;
  farm_name?: string | null;
  action_tab?: ActiveTab | null;
  evidence_source: string;
  is_weather_risk_indicator: boolean;
  disclaimer: string;
  created_at: string;
}

export interface AlertListResponse {
  total_alerts: number;
  alerts: CropAlert[];
}
