"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import OverviewDashboard from "@/components/OverviewDashboard";
import Scanner from "@/components/Scanner";
import ScanHistory from "@/components/ScanHistory";
import CropCatalog from "@/components/CropCatalog";
import WeatherWidget from "@/components/WeatherWidget";
import AdvisoryHub from "@/components/AdvisoryHub";
import MyFarms from "@/components/MyFarms";
import AIAssistant from "@/components/AIAssistant";
import FarmingPlanner from "@/components/FarmingPlanner";
import SmartAlertsModal from "@/components/SmartAlertsModal";
import AuthModal from "@/components/AuthModal";
import SettingsModal from "@/components/SettingsModal";
import PredictionResult from "@/components/PredictionResult";

import {
  ActiveTab,
  HealthResponse,
  ScanRecord,
  WeatherResponse,
  User,
  FarmingTask,
  CropAlert,
} from "@/types";
import {
  fetchHealth,
  fetchWeather,
  fetchCurrentUser,
  logoutFarmer,
  fetchPersistentScans,
  savePersistentScan,
  deletePersistentScan,
  fetchTasks,
  toggleTaskComplete,
  fetchSmartAlerts,
} from "@/services/api";


function DashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ActiveTab;
  const initialTab =
    tabParam &&
    [
      "overview",
      "scanner",
      "history",
      "crops",
      "advisory",
      "weather",
      "farms",
      "assistant",
      "planner",
      "settings",
    ].includes(tabParam)
      ? tabParam
      : "overview";

  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [selectedHistoricalScan, setSelectedHistoricalScan] = useState<ScanRecord | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Weather state & location modal
  const [currentLocation, setCurrentLocation] = useState("New Delhi");
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [tempLocationInput, setTempLocationInput] = useState(currentLocation);

  // Daily Farming Planner & Smart Crop Alerts
  const [tasks, setTasks] = useState<FarmingTask[]>([]);
  const [alerts, setAlerts] = useState<CropAlert[]>([]);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);


  // Load scan history: from backend if authenticated, otherwise localStorage
  const loadBackendScans = async () => {
    try {
      const scans = await fetchPersistentScans();
      if (scans && scans.length > 0) {
        const mapped: ScanRecord[] = scans.map((s) => ({
          id: s.id,
          timestamp: s.created_at,
          filename: s.filename,
          imagePreviewUrl: s.image_url || "/images/crops/tomato.jpg",
          topPrediction: s.all_predictions[0] || {
            rank: 1,
            raw_class: s.raw_class,
            crop: s.crop,
            condition: s.predicted_condition,
            confidence_percentage: s.confidence_percentage,
            confidence_bar: "████████  ",
          },
          allPredictions: s.all_predictions,
          disclaimers: s.disclaimers,
          farm_id: s.farm_id,
          farm_name: s.farm_name,
        }));
        setScanRecords(mapped);
        return;
      }
    } catch (e) {
      console.warn("Backend scans notice:", e);
    }

    // Fallback to localStorage if no backend scans
    loadLocalStorageScans();
  };

  const loadLocalStorageScans = () => {
    try {
      const saved = localStorage.getItem("farmdoctor_scan_history");
      if (saved) {
        setScanRecords(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error loading scan history:", e);
    }
  };

  // Poll / check backend health & user profile on mount
  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const data = await fetchHealth();
      setHealth(data);
    } catch (err) {
      console.warn("Backend not reached:", err);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  const loadWeather = async (loc: string) => {
    setWeatherLoading(true);
    try {
      const data = await fetchWeather(loc);
      setWeather(data);
    } catch (err) {
      console.warn("Weather fetch notice:", err);
    } finally {
      setWeatherLoading(false);
    }
  };

  const loadTasksAndAlerts = async () => {
    try {
      const [tasksRes, alertsRes] = await Promise.all([
        fetchTasks().catch(() => ({ total_tasks: 0, pending_count: 0, completed_count: 0, tasks: [] })),
        fetchSmartAlerts().catch(() => []),
      ]);
      setTasks(tasksRes.tasks || []);
      setAlerts(alertsRes || []);
    } catch {
      // Ignored
    }
  };

  const handleToggleTask = async (task: FarmingTask) => {
    const isCompleted = task.status === "completed";
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: isCompleted ? "pending" : "completed" } : t
      )
    );
    try {
      await toggleTaskComplete(task.id, !isCompleted);
      loadTasksAndAlerts();
    } catch {
      loadTasksAndAlerts();
    }
  };

  useEffect(() => {
    checkHealth();
    loadWeather(currentLocation);
    loadTasksAndAlerts();

    // Check user auth
    fetchCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        loadBackendScans();
        loadTasksAndAlerts();
      } else {
        loadLocalStorageScans();
      }
    });
  }, []);

  const handleChangeLocation = (newLoc: string) => {
    setCurrentLocation(newLoc);
    loadWeather(newLoc);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempLocationInput.trim()) {
      handleChangeLocation(tempLocationInput.trim());
      setLocationModalOpen(false);
    }
  };

  const handleLogout = () => {
    logoutFarmer();
    setCurrentUser(null);
    setTasks([]);
    setAlerts([]);
    loadLocalStorageScans();
  };


  // Save new scan to history (both persistent DB if logged in and localStorage)
  const handleSaveScan = async (record: ScanRecord) => {
    setScanRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== record.id);
      const updated = [record, ...filtered].slice(0, 50);
      try {
        localStorage.setItem("farmdoctor_scan_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Storage save failed:", e);
      }
      return updated;
    });

    // If authenticated, persist to SQLite backend
    if (currentUser) {
      try {
        await savePersistentScan({
          farm_id: record.farm_id || undefined,
          filename: record.filename,
          crop: record.topPrediction.crop,
          predicted_condition: record.topPrediction.condition,
          confidence_percentage: record.topPrediction.confidence_percentage,
          raw_class: record.topPrediction.raw_class,
          all_predictions: record.allPredictions,
          disclaimers: record.disclaimers,
          image_base64: record.imagePreviewUrl?.startsWith("data:") ? record.imagePreviewUrl : undefined,
        });
      } catch (err) {
        console.warn("Failed to persist scan to cloud backend:", err);
      }
    }
  };

  // Delete a single scan record
  const handleDeleteScan = async (scanId: string) => {
    setScanRecords((prev) => {
      const updated = prev.filter((r) => r.id !== scanId);
      try {
        localStorage.setItem("farmdoctor_scan_history", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (currentUser) {
      try {
        await deletePersistentScan(scanId);
      } catch (err) {
        console.warn("Could not delete from backend:", err);
      }
    }
  };

  // Clear all history
  const handleClearHistory = () => {
    setScanRecords([]);
    try {
      localStorage.removeItem("farmdoctor_scan_history");
    } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-[#F8F8F2] text-[#142F28] flex flex-col font-sans selection:bg-[#E5EFE5] selection:text-[#174D36]">
      {/* Top Application Header */}
      <Header
        health={health}
        healthLoading={healthLoading}
        onRefreshHealth={checkHealth}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenSettings={() => setSettingsOpen(true)}
        weather={weather}
        currentLocation={currentLocation}
        onChangeLocation={handleChangeLocation}
        onOpenLocationModal={() => {
          setTempLocationInput(currentLocation);
          setLocationModalOpen(true);
        }}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        alertsCount={alerts.length}
        onOpenAlerts={() => setAlertsModalOpen(true)}
      />


      {/* Mobile Navigation Drawer */}
      <MobileNav
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        scanCount={scanRecords.length}
        health={health}
      />

      {/* Main Workspace with Sidebar - Target 1536px Desktop Viewport */}
      <div className="flex flex-1 mx-auto w-full max-w-[1536px]">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === "settings") {
              setSettingsOpen(true);
            } else {
              setActiveTab(tab);
              setSelectedHistoricalScan(null);
            }
          }}
          scanCount={scanRecords.length}
          health={health}
        />

        {/* Dynamic Main Content Area */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 overflow-y-auto">
          {/* If inspecting a saved historical scan */}
          {selectedHistoricalScan ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-[#E5E8E1] bg-white p-3.5 text-xs text-[#5C7367] shadow-xs">
                <span>
                  Inspecting scan from{" "}
                  <strong>{new Date(selectedHistoricalScan.timestamp).toLocaleString()}</strong>
                </span>
                <button
                  onClick={() => setSelectedHistoricalScan(null)}
                  className="font-bold text-[#16834A] hover:text-[#174D36]"
                >
                  ← Back to Previous View
                </button>
              </div>

              <PredictionResult
                result={{
                  success: true,
                  filename: selectedHistoricalScan.filename,
                  predictions: selectedHistoricalScan.allPredictions,
                  top_prediction: selectedHistoricalScan.topPrediction,
                  disclaimers: selectedHistoricalScan.disclaimers,
                  timestamp: selectedHistoricalScan.timestamp,
                }}
                imagePreviewUrl={selectedHistoricalScan.imagePreviewUrl}
                onReset={() => setSelectedHistoricalScan(null)}
                onSaveToHistory={() => {}}
                isSaved={true}
              />
            </div>
          ) : (
            <>
              {/* Tab 1: Overview Dashboard (Matches Approved Reference) */}
              {activeTab === "overview" && (
                <OverviewDashboard
                  onSelectTab={setActiveTab}
                  weather={weather}
                  weatherLoading={weatherLoading}
                  currentLocation={currentLocation}
                  onChangeLocationClick={() => {
                    setTempLocationInput(currentLocation);
                    setLocationModalOpen(true);
                  }}
                  recentScans={scanRecords}
                  onSelectScan={(record) => setSelectedHistoricalScan(record)}
                  onSaveNewScan={handleSaveScan}
                  tasks={tasks}
                  alerts={alerts}
                  onToggleTask={handleToggleTask}
                  onOpenAlerts={() => setAlertsModalOpen(true)}
                />
              )}

              {/* Tab 2: Disease Scanner */}
              {activeTab === "scanner" && (
                <Scanner
                  onScanSaved={handleSaveScan}
                  isBackendOnline={health?.model_loaded === true}
                  onSelectTab={setActiveTab}
                />
              )}

              {/* Tab 3: Scan History */}
              {activeTab === "history" && (
                <ScanHistory
                  records={scanRecords}
                  onClearHistory={handleClearHistory}
                  onSelectRecord={(rec) => setSelectedHistoricalScan(rec)}
                  onStartNewScan={() => setActiveTab("scanner")}
                  onDeleteRecord={handleDeleteScan}
                  currentUser={currentUser}
                />
              )}

              {/* Tab 4: My Farms (Feature 1) */}
              {activeTab === "farms" && (
                <MyFarms
                  onSelectTab={setActiveTab}
                  currentUser={currentUser}
                  onOpenAuth={() => setAuthModalOpen(true)}
                />
              )}

              {/* Tab 5: Daily Farming Planner (Phase 5) */}
              {activeTab === "planner" && (
                <FarmingPlanner
                  onSelectTab={setActiveTab}
                  currentUser={currentUser}
                  onOpenAuth={() => setAuthModalOpen(true)}
                />
              )}

              {/* Tab 6: Hindi/Hinglish AI Farming Assistant (Feature 3 & Phase 5 Voice) */}
              {activeTab === "assistant" && (
                <AIAssistant
                  onSelectTab={setActiveTab}
                  currentUser={currentUser}
                  onOpenAuth={() => setAuthModalOpen(true)}
                />
              )}

              {/* Tab 7: Crop Health Library */}
              {activeTab === "crops" && <CropCatalog />}

              {/* Tab 8: Advisory Hub */}
              {activeTab === "advisory" && <AdvisoryHub />}

              {/* Tab 9: Weather & Spraying */}
              {activeTab === "weather" && <WeatherWidget />}
            </>
          )}
        </main>
      </div>

      {/* Settings & Diagnostics Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        health={health}
        onRefreshHealth={checkHealth}
        onClearHistory={handleClearHistory}
      />

      {/* Global Farmer Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          loadBackendScans();
          loadTasksAndAlerts();
        }}
      />

      {/* Global Smart Alerts Modal */}
      <SmartAlertsModal
        isOpen={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
        alerts={alerts}
        onAlertDismissed={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onSelectTab={setActiveTab}
      />


      {/* Global Location Selection Modal */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5EAE2] bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-[#174D36]">Select Field Location</h3>
            <p className="mt-1 text-xs text-[#55695E]">
              Enter your town or district name to fetch localized weather observations and spray windows.
            </p>
            <form onSubmit={handleLocationSubmit} className="mt-4">
              <input
                type="text"
                value={tempLocationInput}
                onChange={(e) => setTempLocationInput(e.target.value)}
                placeholder="e.g. New Delhi, Pune, Nashik, Ludhiana..."
                autoFocus
                className="w-full rounded-xl border border-[#E5EAE2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#55695E] hover:bg-[#F4F8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#16834A] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#137240]"
                >
                  Update Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAF2] flex items-center justify-center text-[#17251C]">
          <div className="flex items-center gap-3 text-[#16803C] font-semibold">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#16803C] border-t-transparent" />
            <span>Loading FarmDoctor AI...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
