"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Sprout,
  ScanLine,
  ArrowRight,
  UploadCloud,
  Clock,
  Sun,
  CloudSun,
  Droplets,
  Wind,
  Umbrella,
  BookOpen,
  FileText,
  Calendar,
  PhoneCall,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Leaf,
  Bug,
  ShieldCheck,
  ShieldAlert,
  Search,
  CalendarDays,
  Mic,
  Circle,
} from "lucide-react";
import {
  ActiveTab,
  WeatherResponse,
  ScanRecord,
  PredictionResponse,
  FarmingTask,
  CropAlert,
} from "@/types";
import { predictCropDisease } from "@/services/api";

interface OverviewDashboardProps {
  onSelectTab: (tab: ActiveTab) => void;
  weather: WeatherResponse | null;
  weatherLoading: boolean;
  currentLocation: string;
  onChangeLocationClick: () => void;
  recentScans: ScanRecord[];
  onSelectScan: (record: ScanRecord) => void;
  onSaveNewScan: (record: ScanRecord) => void;
  tasks?: FarmingTask[];
  alerts?: CropAlert[];
  onToggleTask?: (task: FarmingTask) => void;
  onOpenAlerts?: () => void;
}

export default function OverviewDashboard({
  onSelectTab,
  weather,
  weatherLoading,
  currentLocation,
  onChangeLocationClick,
  recentScans,
  onSelectScan,
  onSaveNewScan,
  tasks = [],
  alerts = [],
  onToggleTask,
  onOpenAlerts,
}: OverviewDashboardProps) {

  // Quick Scan inline state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [quickScanResult, setQuickScanResult] = useState<PredictionResponse | null>(null);
  const [quickScanError, setQuickScanError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Crop Library search state
  const [cropSearchQuery, setCropSearchQuery] = useState("");

  // Tips for Healthier Crops carousel state
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const agronomyTips = [
    {
      title: "Crop Rotation Strategy",
      category: "Soil Health & Pathogen Control",
      text: "Rotate nightshades (tomatoes, potatoes) with legumes or brassicas each season to disrupt soil-borne fungal spores and nematode reproduction cycles.",
      action: "Browse Crop Library",
      tab: "crops" as ActiveTab,
    },
    {
      title: "Morning Drip Irrigation",
      category: "Moisture & Mildew Prevention",
      text: "Irrigate early in the morning directly at root level. Ensuring foliage dries quickly under daylight drastically reduces powdery mildew and blight risk.",
      action: "Check Spray Windows",
      tab: "weather" as ActiveTab,
    },
    {
      title: "Optimal Canopy Aeration",
      category: "Airflow & Microclimate",
      text: "Adhere to recommended spacing and prune dense lower foliage to enhance air circulation and eliminate micro-humidity pockets that harbor fungal spores.",
      action: "Run Leaf Diagnostic",
      tab: "scanner" as ActiveTab,
    },
    {
      title: "Balanced Organic Nutrition",
      category: "Immunity & Resilience",
      text: "Incorporate well-cured compost and avoid excessive synthetic nitrogen, which creates tender succulent leaves vulnerable to bacterial spot pathogens.",
      action: "Consult Advisory Hub",
      tab: "advisory" as ActiveTab,
    },
  ];

  const handlePrevTip = () => {
    setCurrentTipIndex((prev) => (prev === 0 ? agronomyTips.length - 1 : prev - 1));
  };

  const handleNextTip = () => {
    setCurrentTipIndex((prev) => (prev === agronomyTips.length - 1 ? 0 : prev + 1));
  };

  const handleFileChange = (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setQuickScanError("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setQuickScanError("File exceeds the 10 MB size limit.");
      return;
    }

    setQuickScanError(null);
    setQuickScanResult(null);
    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setQuickScanError(null);

    try {
      const response = await predictCropDisease(selectedFile);
      setQuickScanResult(response);

      const newRecord: ScanRecord = {
        id: `scan_${Date.now()}`,
        timestamp: new Date().toISOString(),
        filename: selectedFile.name,
        imagePreviewUrl: previewUrl || "",
        topPrediction: response.top_prediction,
        allPredictions: response.predictions,
        disclaimers: response.disclaimers,
      };
      onSaveNewScan(newRecord);
    } catch (err: any) {
      setQuickScanError(
        err.message || "Failed to analyze leaf. Please verify that the backend is running."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetQuickScan = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setQuickScanResult(null);
    setQuickScanError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatRelativeTime = (timestamp: string) => {
    try {
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${diffMins <= 1 ? "Just now" : `${diffMins}m ago`}`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return `${Math.floor(diffDays / 7)}w ago`;
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HERO BANNER (Full-width agricultural photograph matching Approved Target) */}
      {/* ========================================================================= */}
      <div className="relative w-full h-[290px] md:h-[305px] rounded-[22px] overflow-hidden border border-[#E5EAE2] shadow-xs">
        {/* Full-width Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/crop_hero_field.jpg"
            alt="Lush agricultural field with farmer inspecting crop leaf"
            fill
            className="object-cover object-right-top md:object-right"
            priority
          />
          {/* Subtle Left-to-Right Gradient Overlay for crystal clear readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#EFF6ED]/98 via-[#F3FAF2]/92 via-55% to-[#F3FAF2]/25" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center justify-between px-6 sm:px-10 lg:px-12">
          {/* Left Text & CTA */}
          <div className="max-w-xl">
            {/* Tag text */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#174D36] shadow-xs backdrop-blur-xs">
              <Sprout className="h-3.5 w-3.5 text-[#16834A]" />
              <span>Smart AI for Sustainable Farming</span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-3 text-2xl sm:text-[34px] lg:text-[38px] font-extrabold tracking-tight text-[#174D36] leading-[1.18]">
              Grow healthier crops<br className="hidden sm:inline" /> with confidence
            </h1>

            {/* Supporting text */}
            <p className="mt-2 text-xs sm:text-sm text-[#55695E] leading-relaxed max-w-md">
              Upload a leaf photo to get AI-powered disease insights, practical advice, and weather-aware recommendations.
            </p>

            {/* Primary Action Button */}
            <div className="mt-5">
              <button
                onClick={() => onSelectTab("scanner")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#16834A] hover:bg-[#137240] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all"
              >
                <ScanLine className="h-4 w-4" />
                <span>Scan a Leaf</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>

          {/* Right Translucent Feature Chips */}
          <div className="hidden xl:flex flex-col gap-2.5 mr-6 self-center">
            <button
              onClick={() => onSelectTab("scanner")}
              className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#174D36] shadow-xs backdrop-blur-md transition hover:bg-white hover:shadow-sm text-left"
            >
              <Sprout className="h-4 w-4 text-[#16834A] shrink-0" />
              <span>Detect crop diseases</span>
            </button>
            <button
              onClick={() => onSelectTab("assistant")}
              className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#174D36] shadow-xs backdrop-blur-md transition hover:bg-white hover:shadow-sm text-left"
            >
              <Mic className="h-4 w-4 text-[#16834A] shrink-0" />
              <span>Voice AI farmer assistant</span>
            </button>
            <button
              onClick={() => onSelectTab("planner")}
              className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#174D36] shadow-xs backdrop-blur-md transition hover:bg-white hover:shadow-sm text-left"
            >
              <CalendarDays className="h-4 w-4 text-[#16834A] shrink-0" />
              <span>Daily farming planner</span>
            </button>
            <button
              onClick={() => onSelectTab("weather")}
              className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#174D36] shadow-xs backdrop-blur-md transition hover:bg-white hover:shadow-sm text-left"
            >
              <CloudSun className="h-4 w-4 text-[#16834A] shrink-0" />
              <span>Check weather & spray</span>
            </button>
          </div>
        </div>
      </div>

      {/* Smart Alerts Banner (Evidence-Grounded Microclimate & Tasks) */}
      {alerts && alerts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-950">{alerts[0].title}</span>
                <span className="rounded-md bg-amber-200/80 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                  {alerts[0].evidence_source}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-amber-800 line-clamp-1">{alerts[0].message}</p>
            </div>
          </div>
          <button
            onClick={onOpenAlerts}
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
          >
            View All Alerts ({alerts.length})
          </button>
        </div>
      )}

      {/* Today's Farming Tasks Strip (Daily Planner Integration) */}
      {tasks && tasks.length > 0 && (
        <div className="rounded-[22px] border border-[#D1E7D1] bg-[#F8FDF8] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE2]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#174D36]">Today&apos;s Farming Tasks</h3>
                <p className="text-[11px] text-[#55695E]">Personalized crop care & inspection routine</p>
              </div>
            </div>
            <button
              onClick={() => onSelectTab("planner")}
              className="flex items-center gap-1 text-xs font-bold text-[#16834A] hover:underline"
            >
              <span>Open Planner</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {tasks.slice(0, 3).map((t) => {
              const isCompleted = t.status === "completed";
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-[#E5EAE2] bg-white p-2.5 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => onToggleTask && onToggleTask(t)}
                      className="shrink-0 text-[#7A8E81] hover:text-[#16834A]"
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4 text-[#16834A]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[#A5B3A5]" />
                      )}
                    </button>
                    <span className={`truncate font-medium ${isCompleted ? "line-through text-[#7A8E81]" : "text-[#174D36]"}`}>
                      {t.title}
                    </span>
                  </div>
                  {t.crop && (
                    <span className="shrink-0 rounded-md bg-[#E5EFE5] px-1.5 py-0.5 text-[10px] font-semibold text-[#16834A]">
                      {t.crop}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FIRST DASHBOARD ROW (Three-Column Grid: Quick Scan, Recent Scans, Weather) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">

        {/* Card A: Quick Scan */}
        <div className="h-full rounded-[22px] border border-[#E5EAE2] bg-white p-5 lg:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 pb-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#142F28]">Quick Scan</h3>
                <p className="text-xs text-[#68756B]">
                  Upload a clear leaf photo for disease detection
                </p>
              </div>
            </div>

            {/* Upload Area / Active State */}
            <div className="mt-2">
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex min-h-[210px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
                    isDragOver
                      ? "border-[#16834A] bg-[#E5EFE5]/50"
                      : "border-[#C5D7C5] bg-[#F4F8F4] hover:bg-[#EBF3EB]"
                  }`}
                >
                  <UploadCloud className="h-9 w-9 text-[#40564A]" />
                  <p className="mt-2 text-xs font-semibold text-[#142F28]">
                    Drag and drop an image here
                  </p>
                  <span className="my-1 text-xs text-[#68756B]">or</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl bg-[#16834A] px-4 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#137240]"
                  >
                    Choose Photo
                  </button>
                  <p className="mt-2.5 text-[10.5px] text-[#78887E]">
                    Supports JPG, PNG, WEBP (max 10 MB)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2.5 flex items-center gap-3">
                    {previewUrl && (
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[#E5EAE2]">
                        <img
                          src={previewUrl}
                          alt="Leaf preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-bold text-[#142F28]">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-[#68756B]">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={resetQuickScan}
                      disabled={isAnalyzing}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-[#55695E] hover:bg-[#E5EFE5] hover:text-[#174D36]"
                    >
                      Change
                    </button>
                  </div>

                  {!quickScanResult ? (
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16834A] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#137240] disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Running Deep Learning Inference...</span>
                        </>
                      ) : (
                        <>
                          <ScanLine className="h-4 w-4" />
                          <span>Analyze Leaf Now</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className={`rounded-xl border p-3 space-y-2 ${
                      quickScanResult.is_uncertain
                        ? "border-amber-300 bg-amber-50/80"
                        : "border-[#D1E7D1] bg-[#E5EFE5]/60"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold ${quickScanResult.is_uncertain ? "text-amber-800" : "text-[#16834A]"}`}>
                          {quickScanResult.is_uncertain ? "Uncertain Prediction" : "Model Prediction"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            quickScanResult.is_uncertain
                              ? "bg-amber-100 text-amber-800"
                              : quickScanResult.top_prediction.condition.toLowerCase().includes("healthy")
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : "bg-[#FEE2E2] text-[#B91C1C]"
                          }`}
                        >
                          {quickScanResult.is_uncertain
                            ? "Field Check Advised"
                            : quickScanResult.top_prediction.condition.toLowerCase().includes("healthy")
                            ? "Healthy"
                            : "Diseased"}
                        </span>
                      </div>
                      <div className="text-xs font-black text-[#174D36] truncate">
                        {quickScanResult.top_prediction.crop} • {quickScanResult.top_prediction.condition}
                      </div>
                      <div className="text-[11px] text-[#55695E]">
                        Confidence: <strong>{quickScanResult.top_prediction.confidence_percentage}%</strong>
                        {quickScanResult.is_uncertain && (
                          <div className="text-[10px] text-amber-800 mt-0.5 font-medium">
                            ⚠️ Low confidence — possible out-of-domain image (e.g. insects, soil, weeds).
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => onSelectTab("scanner")}
                          className="flex-1 rounded-lg bg-[#174D36] py-1.5 text-center text-[11px] font-bold text-white hover:bg-[#123E2B]"
                        >
                          View Full Diagnostic
                        </button>
                        <button
                          onClick={resetQuickScan}
                          className="rounded-lg border border-[#E5EAE2] bg-white px-3 py-1.5 text-[11px] font-medium text-[#55695E] hover:bg-[#FAFBF9]"
                        >
                          New
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {quickScanError && (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                  {quickScanError}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#78887E] pt-2 border-t border-[#F0F4EF]">
            <span>FastAPI EfficientNet-B0 Engine</span>
            <span className="font-semibold text-[#16834A]">38 Crop Pathogens</span>
          </div>
        </div>

        {/* Card B: Recent Scans */}
        <div className="h-full rounded-[22px] border border-[#E5EAE2] bg-white p-5 lg:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142F28]">Recent Scans</h3>
                  <p className="text-xs text-[#68756B]">
                    Inspected leaf records saved in history
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectTab("history")}
                className="flex items-center gap-1 text-xs font-bold text-[#16834A] transition hover:text-[#174D36]"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Scans List / Refined Botanical Empty State */}
            <div className="mt-2">
              {recentScans.length > 0 ? (
                <div className="space-y-2.5">
                  {recentScans.slice(0, 3).map((scan) => {
                    const isHealthy = scan.topPrediction.condition
                      .toLowerCase()
                      .includes("healthy");
                    return (
                      <div
                        key={scan.id}
                        onClick={() => onSelectScan(scan)}
                        className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2.5 transition hover:border-[#16834A] hover:bg-white hover:shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#EAEFEA] border border-[#E5EAE2]">
                            <img
                              src={scan.imagePreviewUrl}
                              alt={scan.topPrediction.raw_class}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-xs font-bold text-[#142F28]">
                              {scan.topPrediction.crop}
                            </h4>
                            <p className="truncate text-[11px] text-[#55695E]">
                              {scan.topPrediction.condition}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              isHealthy
                                ? "bg-[#DCFCE7] text-[#15803D]"
                                : "bg-[#FEE2E2] text-[#B91C1C]"
                            }`}
                          >
                            {isHealthy ? "Healthy" : "Diseased"}
                          </span>
                          <span className="text-[10px] text-[#78887E]">
                            {formatRelativeTime(scan.timestamp)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Refined Botanical Empty State */
                <div className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-[#E5EAE2] bg-[#F6FAF6] p-5 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A] shadow-xs">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <h4 className="mt-2.5 text-xs font-bold text-[#142F28]">
                    No Recent Scans Yet
                  </h4>
                  <p className="mt-1 max-w-[210px] text-[11px] text-[#68756B] leading-relaxed">
                    Upload an infected or healthy leaf in Quick Scan to start building your diagnostic history.
                  </p>
                  <button
                    onClick={() => onSelectTab("scanner")}
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[#16834A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] transition"
                  >
                    <span>Open Disease Scanner</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-[#78887E] pt-2 border-t border-[#F0F4EF]">
            <span>Local Browser Storage</span>
            <span>{recentScans.length} Record{recentScans.length === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* Card C: Weather */}
        <div className="h-full rounded-[22px] border border-[#E5EAE2] bg-white p-5 lg:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#0284C7]">
                  <CloudSun className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142F28]">
                    Weather at {currentLocation}
                  </h3>
                  <p className="text-xs text-[#68756B]">
                    Field microclimate & spray safety
                  </p>
                </div>
              </div>
              <button
                onClick={onChangeLocationClick}
                className="flex items-center gap-1 text-xs font-bold text-[#16834A] hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Change</span>
              </button>
            </div>

            {/* Metric Display */}
            <div className="mt-2">
              {weather && weather.configured && weather.temperature_celsius !== null && weather.temperature_celsius !== undefined ? (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <Sun className="h-10 w-10 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-2xl font-black text-[#142F28]">
                        {Math.round(weather.temperature_celsius)}°C
                      </div>
                      <div className="text-xs text-[#55695E]">
                        {weather.weather_condition || "Clear Sky"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center">
                      <Droplets className="mx-auto h-3.5 w-3.5 text-sky-600" />
                      <div className="mt-1 text-[10px] text-[#78887E]">Humidity</div>
                      <div className="text-xs font-bold text-[#142F28]">
                        {weather.relative_humidity ?? "--"}%
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center">
                      <Wind className="mx-auto h-3.5 w-3.5 text-teal-600" />
                      <div className="mt-1 text-[10px] text-[#78887E]">Wind Speed</div>
                      <div className="text-xs font-bold text-[#142F28]">
                        {weather.wind_speed_kmh ?? "--"} km/h
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center">
                      <Umbrella className="mx-auto h-3.5 w-3.5 text-indigo-600" />
                      <div className="mt-1 text-[10px] text-[#78887E]">Rainfall</div>
                      <div className="text-xs font-bold text-[#142F28]">
                        {weather.rainfall_mm !== null && weather.rainfall_mm !== undefined
                          ? `${weather.rainfall_mm} mm`
                          : "0 mm"}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="min-h-[160px] flex flex-col justify-center rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-[#55695E]">
                  <p className="font-bold text-amber-900">
                    Weather Service Integration
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                    Set <code className="rounded bg-white px-1 font-mono">WEATHER_API_KEY</code> in backend .env to display live temperature, humidity, wind, and disease spray advisories.
                  </p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10.5px] text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>Real-time observations require active API key</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action */}
          <button
            onClick={() => onSelectTab("weather")}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-[#FAFBF9] py-2 text-xs font-bold text-[#16834A] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:text-[#174D36] transition"
          >
            <span>View 5-Day Forecast & Spray Windows</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECOND DASHBOARD ROW (Three-Column Grid: Crop Library, Advisory Hub, Tips) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {/* Card 1: Crop Health Library */}
        <div className="h-full rounded-[22px] border border-[#E5EAE2] bg-white p-5 lg:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142F28]">
                    Crop Health Library
                  </h3>
                  <p className="text-xs text-[#68756B]">
                    Searchable crop & pathogen atlas
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectTab("crops")}
                className="flex items-center gap-1 text-xs font-bold text-[#16834A] transition hover:text-[#174D36]"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Quick Search Bar */}
            <div className="relative my-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78887E]" />
              <input
                type="text"
                value={cropSearchQuery}
                onChange={(e) => setCropSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onSelectTab("crops");
                }}
                placeholder="Search crops or diseases..."
                className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] py-1.5 pl-9 pr-3 text-xs text-[#142F28] placeholder-[#78887E] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
            </div>

            {/* 4 Crop Produce Cards */}
            <div className="grid grid-cols-4 gap-2 my-2">
              <div
                onClick={() => onSelectTab("crops")}
                className="group cursor-pointer rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center transition hover:border-[#16834A] hover:bg-white hover:shadow-xs"
              >
                <div className="relative mx-auto h-11 w-11 overflow-hidden rounded-full border border-[#E5EAE2]">
                  <Image
                    src="/images/crops/tomato.jpg"
                    alt="Tomato produce"
                    width={44}
                    height={44}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="mt-1.5 text-xs font-bold text-[#142F28]">Tomato</div>
                <div className="text-[10px] text-[#78887E]">10 diseases</div>
              </div>

              <div
                onClick={() => onSelectTab("crops")}
                className="group cursor-pointer rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center transition hover:border-[#16834A] hover:bg-white hover:shadow-xs"
              >
                <div className="relative mx-auto h-11 w-11 overflow-hidden rounded-full border border-[#E5EAE2]">
                  <Image
                    src="/images/crops/potato.jpg"
                    alt="Potato produce"
                    width={44}
                    height={44}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="mt-1.5 text-xs font-bold text-[#142F28]">Potato</div>
                <div className="text-[10px] text-[#78887E]">3 diseases</div>
              </div>

              <div
                onClick={() => onSelectTab("crops")}
                className="group cursor-pointer rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center transition hover:border-[#16834A] hover:bg-white hover:shadow-xs"
              >
                <div className="relative mx-auto h-11 w-11 overflow-hidden rounded-full border border-[#E5EAE2]">
                  <Image
                    src="/images/crops/corn.jpg"
                    alt="Corn produce"
                    width={44}
                    height={44}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="mt-1.5 text-xs font-bold text-[#142F28]">Corn</div>
                <div className="text-[10px] text-[#78887E]">4 diseases</div>
              </div>

              <div
                onClick={() => onSelectTab("crops")}
                className="group cursor-pointer rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] p-2 text-center transition hover:border-[#16834A] hover:bg-white hover:shadow-xs"
              >
                <div className="relative mx-auto h-11 w-11 overflow-hidden rounded-full border border-[#E5EAE2]">
                  <Image
                    src="/images/crops/apple.jpg"
                    alt="Apple produce"
                    width={44}
                    height={44}
                    className="h-full w-full object-cover transition-transform group-hover:scale-110"
                  />
                </div>
                <div className="mt-1.5 text-xs font-bold text-[#142F28]">Apple</div>
                <div className="text-[10px] text-[#78887E]">4 diseases</div>
              </div>
            </div>
          </div>

          {/* Bottom Action */}
          <button
            onClick={() => onSelectTab("crops")}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-[#FAFBF9] py-2 text-xs font-bold text-[#16834A] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:text-[#174D36] transition"
          >
            <span>View Full Crop Atlas</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card 2: Advisory Hub */}
        <div className="h-full rounded-[22px] border border-[#E5EAE2] bg-white p-5 lg:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142F28]">Advisory Hub</h3>
                  <p className="text-xs text-[#68756B]">
                    Disease guidance & expert practices
                  </p>
                </div>
              </div>
              <button
                onClick={() => onSelectTab("advisory")}
                className="flex items-center gap-1 text-xs font-bold text-[#16834A] transition hover:text-[#174D36]"
              >
                <span>Open</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 4 Feature Action Pills */}
            <div className="space-y-1.5 my-2">
              <div
                onClick={() => onSelectTab("advisory")}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#FAFBF9] px-3 py-2 text-xs font-medium text-[#142F28] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:border-[#16834A] transition"
              >
                <Bug className="h-3.5 w-3.5 text-[#16834A] shrink-0" />
                <span className="truncate">Disease-specific guidance</span>
              </div>
              <div
                onClick={() => onSelectTab("advisory")}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#FAFBF9] px-3 py-2 text-xs font-medium text-[#142F28] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:border-[#16834A] transition"
              >
                <FileText className="h-3.5 w-3.5 text-[#16834A] shrink-0" />
                <span className="truncate">Prevention practices</span>
              </div>
              <div
                onClick={() => onSelectTab("advisory")}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#FAFBF9] px-3 py-2 text-xs font-medium text-[#142F28] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:border-[#16834A] transition"
              >
                <Calendar className="h-3.5 w-3.5 text-[#16834A] shrink-0" />
                <span className="truncate">Seasonal recommendations</span>
              </div>
              <div
                onClick={() => onSelectTab("advisory")}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#FAFBF9] px-3 py-2 text-xs font-medium text-[#142F28] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:border-[#16834A] transition"
              >
                <PhoneCall className="h-3.5 w-3.5 text-[#16834A] shrink-0" />
                <span className="truncate">When to consult an agricultural expert</span>
              </div>
            </div>
          </div>

          {/* Bottom Action & Source Note */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] text-[#78887E]">
              <ShieldAlert className="h-3 w-3 shrink-0 text-[#16834A]" />
              <span className="truncate">Preliminary support • Verify with extension officers</span>
            </div>
            <button
              onClick={() => onSelectTab("advisory")}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#FAFBF9] py-2 text-xs font-bold text-[#16834A] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:text-[#174D36] transition"
            >
              <span>Get Agronomic Advisory</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card 3: Tips for Healthier Crops */}
        <div className="h-full rounded-[22px] border border-[#E5EAE2] bg-white p-5 lg:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                  <Sprout className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142F28]">
                    Tips for Healthier Crops
                  </h3>
                  <p className="text-xs text-[#68756B]">
                    Grounded in agronomic science
                  </p>
                </div>
              </div>

              {/* Carousel Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevTip}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5EAE2] bg-[#FAFBF9] text-[#55695E] hover:bg-[#E5EFE5] hover:text-[#174D36] transition"
                  aria-label="Previous agronomy tip"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextTip}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5EAE2] bg-[#FAFBF9] text-[#55695E] hover:bg-[#E5EFE5] hover:text-[#174D36] transition"
                  aria-label="Next agronomy tip"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Seedling Photograph & Category Tag */}
            <div className="relative h-[105px] w-full overflow-hidden rounded-xl border border-[#E5EAE2] my-2">
              <Image
                src="/images/seedling_tip.jpg"
                alt="Healthy green seedling sprout emerging from dark fertile soil"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
              <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
                <span className="rounded-md bg-white/25 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-xs">
                  {agronomyTips[currentTipIndex].category}
                </span>
                <span className="text-[10px] font-medium text-white/90">
                  Tip {currentTipIndex + 1} of {agronomyTips.length}
                </span>
              </div>
            </div>

            {/* Tip Title & Description */}
            <div className="mt-2 space-y-1">
              <h4 className="text-xs font-bold text-[#142F28]">
                {agronomyTips[currentTipIndex].title}
              </h4>
              <p className="text-[11px] text-[#55695E] leading-relaxed line-clamp-3">
                {agronomyTips[currentTipIndex].text}
              </p>
            </div>
          </div>

          {/* Carousel Indicator Dots & Action */}
          <div className="mt-3 pt-2 border-t border-[#F0F4EF]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {agronomyTips.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTipIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === currentTipIndex
                        ? "w-4 bg-[#16834A]"
                        : "w-1.5 bg-[#D1E0D1] hover:bg-[#A3C2A3]"
                    }`}
                    aria-label={`Jump to tip ${idx + 1}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-[#78887E]">Interactive guide</span>
            </div>

            <button
              onClick={() => onSelectTab(agronomyTips[currentTipIndex].tab)}
              className="flex w-full items-center justify-center gap-1 rounded-xl bg-[#FAFBF9] py-2 text-xs font-bold text-[#16834A] border border-[#E5EAE2] hover:bg-[#E5EFE5] hover:text-[#174D36] transition"
            >
              <span>{agronomyTips[currentTipIndex].action}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
