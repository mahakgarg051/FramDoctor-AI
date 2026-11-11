/**
 * FarmDoctor AI - API Client Service
 * Communicates directly with the FastAPI backend for ML prediction, live weather,
 * agricultural knowledge base, farmer authentication, personalized farm management,
 * persistent scan history, Hindi/Hinglish AI assistant, and personalized action plans.
 */

import {
  HealthResponse,
  DiseaseClassesResponse,
  PredictionResponse,
  WeatherResponse,
  KnowledgeDiseasesListResponse,
  DiseaseKnowledgeItem,
  AdvisoryRequest,
  AdvisoryResponse,
  User,
  AuthResponse,
  Farm,
  CreateFarmInput,
  UpdateFarmInput,
  PersonalizedActionPlan,
  PersistentScanRecord,
  AssistantMessage,
  AssistantChatResponse,
  FarmingTask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListResponse,
  CropAlert,
  AlertListResponse,
} from "@/types";


const DEFAULT_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("farmdoctor_api_url");
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
  }
  return DEFAULT_API_BASE.replace(/\/+$/, "");
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("farmdoctor_api_url", url.trim().replace(/\/+$/, ""));
  }
}

// ==========================================
// Auth Token Storage Helpers
// ==========================================
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("farmdoctor_token");
  }
  return null;
}

export function setAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("farmdoctor_token", token.trim());
  }
}

export function removeAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("farmdoctor_token");
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ==========================================
// 1. Health & Prediction
// ==========================================
export async function fetchHealth(): Promise<HealthResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/health`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Health check failed (${res.status}): ${errText || res.statusText}`);
  }

  return res.json();
}

export async function fetchDiseaseClasses(): Promise<DiseaseClassesResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/diseases/classes`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.detail || `Failed to fetch disease classes (${res.status})`
    );
  }

  return res.json();
}

export async function predictCropDisease(file: File): Promise<PredictionResponse> {
  const base = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${base}/api/v1/predict`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const detail =
      errData?.detail || `Inference server returned error (${res.status}: ${res.statusText})`;
    throw new Error(detail);
  }

  return res.json();
}

// ==========================================
// 2. Weather
// ==========================================
export async function fetchWeather(
  location?: string,
  lat?: number,
  lon?: number
): Promise<WeatherResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (location && location.trim()) {
    params.set("location", location.trim());
  }
  if (lat !== undefined && lon !== undefined) {
    params.set("lat", lat.toString());
    params.set("lon", lon.toString());
  }

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${base}/api/v1/weather${queryStr}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.detail || `Weather service error (${res.status}: ${res.statusText})`
    );
  }

  return res.json();
}

// ==========================================
// 3. Agricultural Knowledge Base & Advisory
// ==========================================
export async function fetchKnowledgeDiseases(
  crop?: string,
  search?: string
): Promise<KnowledgeDiseasesListResponse> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (crop && crop.trim()) params.set("crop", crop.trim());
  if (search && search.trim()) params.set("search", search.trim());

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${base}/api/v1/knowledge/diseases${queryStr}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.detail || `Failed to fetch knowledge base (${res.status})`
    );
  }

  return res.json();
}

export async function fetchKnowledgeDiseaseById(
  diseaseId: string
): Promise<DiseaseKnowledgeItem> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/knowledge/diseases/${encodeURIComponent(diseaseId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.detail || `Disease record not found (${res.status})`
    );
  }

  return res.json();
}

export async function generateCropAdvisory(
  request: AdvisoryRequest
): Promise<AdvisoryResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/advisory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(
      errData?.detail || `Advisory generation failed (${res.status})`
    );
  }

  return res.json();
}

// ==========================================
// 4. Farmer Authentication
// ==========================================
export async function registerFarmer(data: {
  username: string;
  email: string;
  password: string;
  full_name?: string;
}): Promise<AuthResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Registration failed. Please check inputs.");
  }

  const result: AuthResponse = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function loginFarmer(data: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Invalid username or password.");
  }

  const result: AuthResponse = await res.json();
  if (result.access_token) {
    setAuthToken(result.access_token);
  }
  return result;
}

export async function fetchCurrentUser(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  const base = getApiBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/auth/me`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      if (res.status === 401) {
        removeAuthToken();
      }
      return null;
    }
    return res.json();
  } catch {
    return null;
  }
}

export function logoutFarmer(): void {
  removeAuthToken();
}

// ==========================================
// 5. Personalized Farm Management
// ==========================================
export async function fetchMyFarms(): Promise<Farm[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/farms`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to load farm plots.");
  }

  const data = await res.json();
  return data.farms || [];
}

export async function createFarmPlot(data: CreateFarmInput): Promise<Farm> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/farms`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to create farm plot.");
  }

  return res.json();
}

export async function updateFarmPlot(farmId: string, data: UpdateFarmInput): Promise<Farm> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/farms/${encodeURIComponent(farmId)}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to update farm plot.");
  }

  return res.json();
}

export async function deleteFarmPlot(farmId: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/farms/${encodeURIComponent(farmId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to delete farm plot.");
  }
}

export async function fetchFarmActionPlan(farmId: string): Promise<PersonalizedActionPlan> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/farms/${encodeURIComponent(farmId)}/action-plan`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to generate crop action plan.");
  }

  return res.json();
}

// ==========================================
// 6. Persistent Scan History
// ==========================================
export async function savePersistentScan(data: {
  farm_id?: string;
  filename: string;
  crop: string;
  predicted_condition: string;
  confidence_percentage: number;
  raw_class: string;
  all_predictions: any[];
  disclaimers: string[];
  image_base64?: string;
}): Promise<PersistentScanRecord> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/scans`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to persist scan record.");
  }

  return res.json();
}

export async function fetchPersistentScans(filter?: {
  crop?: string;
  predicted_class?: string;
  farm_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<PersistentScanRecord[]> {
  const base = getApiBaseUrl();
  const params = new URLSearchParams();
  if (filter?.crop && filter.crop !== "all") params.set("crop", filter.crop);
  if (filter?.predicted_class) params.set("predicted_class", filter.predicted_class);
  if (filter?.farm_id) params.set("farm_id", filter.farm_id);
  if (filter?.date_from) params.set("date_from", filter.date_from);
  if (filter?.date_to) params.set("date_to", filter.date_to);

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${base}/api/v1/scans${queryStr}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to load scan history.");
  }

  const data = await res.json();
  return data.scans || [];
}

export async function deletePersistentScan(scanId: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/scans/${encodeURIComponent(scanId)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "Failed to delete scan record.");
  }
}

// ==========================================
// 7. Hindi/Hinglish AI Farming Assistant
// ==========================================
export async function sendAssistantMessage(data: {
  message: string;
  farm_id?: string;
  include_weather?: boolean;
  language_preference?: string;
}): Promise<AssistantChatResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/assistant/chat`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.detail || "AI Assistant could not process your query.");
  }

  return res.json();
}

export async function fetchAssistantHistory(): Promise<AssistantMessage[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/assistant/history`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data.messages || [];
}

export async function clearAssistantHistory(): Promise<void> {
  const base = getApiBaseUrl();
  await fetch(`${base}/api/v1/assistant/history`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
}

// ==========================================
// 10. Daily Farming Planner APIs
// ==========================================
export async function fetchTasks(params?: {
  farm_id?: string;
  status?: string;
  due_date?: string;
}): Promise<TaskListResponse> {
  const base = getApiBaseUrl();
  const query = new URLSearchParams();
  if (params?.farm_id) query.append("farm_id", params.farm_id);
  if (params?.status) query.append("status", params.status);
  if (params?.due_date) query.append("due_date", params.due_date);

  const qs = query.toString();
  const url = `${base}/api/v1/tasks${qs ? `?${qs}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) {
      return { total_tasks: 0, pending_count: 0, completed_count: 0, tasks: [] };
    }
    throw new Error("Failed to load farming tasks.");
  }

  return res.json();
}

export async function createTask(input: CreateTaskInput): Promise<FarmingTask> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/tasks`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Could not create farming task.");
  }

  return res.json();
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<FarmingTask> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Could not update task.");
  }

  return res.json();
}

export async function toggleTaskComplete(taskId: string, completed: boolean): Promise<FarmingTask> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/tasks/${taskId}/complete`, {
    method: "PATCH",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ completed }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Could not toggle task status.");
  }

  return res.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/tasks/${taskId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Could not delete task.");
  }
}

// ==========================================
// 11. Smart Crop Alerts APIs
// ==========================================
export async function fetchSmartAlerts(): Promise<CropAlert[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/alerts`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    return [];
  }

  const data: AlertListResponse = await res.json();
  return data.alerts || [];
}

export async function dismissSmartAlert(alertKey: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/v1/alerts/${encodeURIComponent(alertKey)}/dismiss`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || "Could not dismiss alert.");
  }
}
