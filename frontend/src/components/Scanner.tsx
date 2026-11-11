"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  UploadCloud,
  X,
  Sparkles,
  AlertCircle,
  Loader2,
  ScanLine,
  Sprout,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Download,
  Bot,
  RotateCcw,
  Clock,
  Maximize2,
  Info,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Sun,
  FileCheck,
} from "lucide-react";
import { PredictionResponse, ScanRecord, ActiveTab } from "@/types";
import { predictCropDisease } from "@/services/api";
import { getScannerTabKnowledge, DiseaseTabInfo } from "@/data/scannerKnowledge";

interface ScannerProps {
  onScanSaved: (record: ScanRecord) => void;
  isBackendOnline: boolean;
  onSelectTab?: (tab: ActiveTab) => void;
}

type TabType = "about" | "symptoms" | "causes" | "prevention" | "management" | "nextSteps";

export default function Scanner({
  onScanSaved,
  isBackendOnline,
  onSelectTab,
}: ScannerProps) {
  // File & Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeInfoTab, setActiveInfoTab] = useState<TabType>("about");
  const [isSaved, setIsSaved] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default demonstration prediction matching the reference image
  const defaultSamplePrediction: PredictionResponse = {
    success: true,
    filename: "corn_leaf_sample.jpg",
    timestamp: new Date().toISOString(),
    top_prediction: {
      rank: 1,
      crop: "Corn (Maize)",
      condition: "Common Rust",
      raw_class: "Corn_(maize)___Common_rust_",
      confidence_percentage: 92.4,
      confidence_bar: "█████████ ",
    },
    predictions: [
      {
        rank: 1,
        crop: "Corn (Maize)",
        condition: "Common Rust",
        raw_class: "Corn_(maize)___Common_rust_",
        confidence_percentage: 92.4,
        confidence_bar: "█████████ ",
      },
      {
        rank: 2,
        crop: "Corn (Maize)",
        condition: "Northern Leaf Blight",
        raw_class: "Corn_(maize)___Northern_Leaf_Blight",
        confidence_percentage: 5.1,
        confidence_bar: "█         ",
      },
      {
        rank: 3,
        crop: "Corn (Maize)",
        condition: "Healthy",
        raw_class: "Corn_(maize)___healthy",
        confidence_percentage: 2.5,
        confidence_bar: "          ",
      },
    ],
    is_uncertain: false,
    diagnostic_status: "High Confidence Match",
    disclaimers: [
      "AI screening is for decision-support purposes only.",
      "Verify symptoms with your local agricultural extension officer.",
    ],
  };

  // Prediction state (initialized to reference image sample so users immediately see the full layout)
  const [prediction, setPrediction] = useState<PredictionResponse>(defaultSamplePrediction);
  const [activePreviewImage, setActivePreviewImage] = useState<string>("/images/scanner/corn_rust_sample.jpg");

  const steps = [
    "Preparing leaf image...",
    "Analyzing visual symptoms...",
    "Identifying possible crop diseases...",
    "Preparing diagnostic report...",
  ];

  const handleFile = (file: File) => {
    setErrorMsg(null);
    setIsSaved(false);

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("File is too large. Maximum allowed image size is 10 MB.");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase()) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp)$/i)) {
      setErrorMsg("Unsupported file format. Please upload a JPG, JPEG, PNG, or WEBP image.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setErrorMsg(null);
    setIsSaved(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Run Real AI Model Prediction
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisStep(0);

    const stepInterval = setInterval(() => {
      setAnalysisStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const response = await predictCropDisease(selectedFile);
      setPrediction(response);
      if (previewUrl) {
        setActivePreviewImage(previewUrl);
      }
      setIsSaved(false);
    } catch (err: any) {
      console.error("Diagnosis failure:", err);
      setErrorMsg(
        err.message ||
          "Could not complete diagnosis. Please ensure the FastAPI backend is running on http://127.0.0.1:8000."
      );
    } finally {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
    }
  };

  // Quick Sample Leaf Loader (fetches real PlantVillage samples from /images/samples/)
  const loadSampleLeaf = async (samplePath: string, fileName: string) => {
    try {
      setErrorMsg(null);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/jpeg" });
      handleFile(file);
    } catch (e) {
      console.warn("Could not load sample file:", e);
    }
  };

  // Save to Database and Scan History
  const handleSaveToHistory = () => {
    if (isSaved) return;

    const record: ScanRecord = {
      id: `scan_${Date.now()}`,
      timestamp: prediction.timestamp || new Date().toISOString(),
      filename: selectedFile?.name || prediction.filename || "leaf_scan.jpg",
      imagePreviewUrl: activePreviewImage,
      topPrediction: prediction.top_prediction,
      allPredictions: prediction.predictions,
      is_uncertain: prediction.is_uncertain,
      diagnostic_status: prediction.diagnostic_status,
      uncertainty_warning: prediction.uncertainty_warning,
      disclaimers: prediction.disclaimers || [],
    };

    onScanSaved(record);
    setIsSaved(true);
  };

  // Download Comprehensive Diagnostic Report as HTML
  const handleDownloadReport = () => {
    const top = prediction.top_prediction;
    const tabData = getScannerTabKnowledge(top.raw_class, top.crop, top.condition, prediction.is_uncertain);
    const dateFormatted = new Date(prediction.timestamp).toLocaleString();

    const reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FarmDoctor AI — Diagnostic Report: ${top.crop} - ${top.condition}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #17251C; background: #FAFAF2; margin: 0; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; padding: 36px; border: 1px solid #E5EAE2; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #E7F4DF; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 24px; font-weight: 800; color: #14532D; }
    .brand span { color: #16803C; }
    .date { font-size: 12px; color: #55695E; }
    .section { margin-top: 24px; }
    .title { font-size: 16px; font-weight: bold; color: #14532D; border-bottom: 1px solid #E7F4DF; padding-bottom: 6px; margin-bottom: 10px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; background: #E7F4DF; color: #16803C; }
    .warning { background: #FEF2F2; color: #991B1B; border: 1px solid #F87171; padding: 12px; border-radius: 12px; font-size: 13px; margin: 16px 0; }
    ul { padding-left: 20px; font-size: 13px; line-height: 1.6; color: #3E5345; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
    th, td { border: 1px solid #E5EAE2; padding: 8px 12px; text-align: left; }
    th { background: #F8F8F2; color: #17251C; }
    .disclaimer { margin-top: 30px; font-size: 11px; color: #78887E; border-top: 1px solid #E5EAE2; padding-top: 14px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">FarmDoctor <span>AI</span> Diagnostic Report</div>
      <div class="date">Generated on: ${dateFormatted}</div>
    </div>

    ${prediction.is_uncertain ? `
    <div class="warning">
      <strong>⚠ Warning: Uncertain Prediction</strong><br/>
      ${prediction.uncertainty_warning || "The AI model encountered high diagnostic entropy. Field physical verification with local agricultural authorities is strongly recommended."}
    </div>` : ""}

    <div class="section">
      <div class="title">Diagnostic Summary</div>
      <table>
        <tr><th>Identified Crop</th><td><strong>${top.crop}</strong></td></tr>
        <tr><th>Condition / Pathology</th><td><strong>${top.condition}</strong></td></tr>
        <tr><th>Confidence Score</th><td><span class="badge">${top.confidence_percentage.toFixed(2)}%</span></td></tr>
        <tr><th>Scientific Name</th><td><em>${tabData.scientificName || "N/A"}</em></td></tr>
        <tr><th>Pathogen Type</th><td>${tabData.pathogenType || "N/A"}</td></tr>
      </table>
    </div>

    <div class="section">
      <div class="title">Top Evaluated Candidates</div>
      <table>
        <tr><th>Rank</th><th>Candidate Condition</th><th>Model Probability</th></tr>
        ${prediction.predictions.slice(0, 3).map(p => `
          <tr><td>#${p.rank}</td><td>${p.crop} — ${p.condition}</td><td>${p.confidence_percentage.toFixed(2)}%</td></tr>
        `).join("")}
      </table>
    </div>

    <div class="section">
      <div class="title">About the Condition</div>
      <p style="font-size: 13px; line-height: 1.6; color: #3E5345;">${tabData.about}</p>
    </div>

    <div class="section">
      <div class="title">Observed Symptoms</div>
      <ul>${tabData.symptoms.map(s => `<li>${s}</li>`).join("")}</ul>
    </div>

    <div class="section">
      <div class="title">Causes & Environmental Conditions</div>
      <ul>${tabData.causes.map(c => `<li>${c}</li>`).join("")}</ul>
    </div>

    <div class="section">
      <div class="title">Prevention Practices</div>
      <ul>${tabData.prevention.map(p => `<li>${p}</li>`).join("")}</ul>
    </div>

    <div class="section">
      <div class="title">Safe Management Guidance</div>
      <ul>${tabData.management.map(m => `<li>${m}</li>`).join("")}</ul>
    </div>

    <div class="section">
      <div class="title">Recommended Next Steps</div>
      <ul>${tabData.nextSteps.map(n => `<li>${n}</li>`).join("")}</ul>
    </div>

    <div class="disclaimer">
      FarmDoctor AI is an intelligent agricultural screening tool trained on the 38-class PlantVillage dataset.<br/>
      Always consult certified local agronomists or Krishi Vigyan Kendra (KVK) officers before executing chemical controls.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FarmDoctor_Report_${top.crop.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const top = prediction.top_prediction;
  const identifiedCrop = prediction.identified_crop || top.crop;
  const predictedCondition = prediction.predicted_disease || top.condition;
  const confidenceScore = prediction.confidence !== undefined && prediction.confidence !== null ? prediction.confidence : top.confidence_percentage;
  const isUnsupportedCrop = prediction.diagnostic_status === "unsupported_crop";
  const isUncertain = prediction.is_uncertain || isUnsupportedCrop;
  const isHealthy = !isUncertain && (predictedCondition.toLowerCase().includes("healthy") || top.condition.toLowerCase().includes("healthy"));
  const tabKnowledge = getScannerTabKnowledge(top.raw_class, identifiedCrop, predictedCondition, isUncertain);

  // Crop Icon Helper
  const getCropEmoji = (crop: string) => {
    const c = crop.toLowerCase();
    if (c.includes("rice") || c.includes("paddy")) return "🌾";
    if (c.includes("corn") || c.includes("maize")) return "🌽";
    if (c.includes("tomato")) return "🍅";
    if (c.includes("potato")) return "🥔";
    if (c.includes("apple")) return "🍎";
    if (c.includes("grape")) return "🍇";
    if (c.includes("peach")) return "🍑";
    if (c.includes("pepper")) return "🫑";
    if (c.includes("strawberry")) return "🍓";
    if (c.includes("unrecognized") || c.includes("unsupported")) return "⚠️";
    return "🌱";
  };

  return (
    <div className="space-y-6">

      {/* 1. SCANNER HERO BANNER matching the reference image */}
      <div className="relative overflow-hidden rounded-3xl border border-[#D5E5CE] bg-gradient-to-r from-[#EBF5EA] via-[#F4FAF2] to-[#E7F4DF] p-6 sm:p-8 shadow-sm">
        {/* Background Field Panorama */}
        <div className="absolute inset-0 opacity-15 mix-blend-multiply pointer-events-none">
          <Image
            src="/images/scanner/scanner_banner_bg.jpg"
            alt="Lush green crop field"
            fill
            className="object-cover"
          />
        </div>

        <div className="relative z-10 grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          {/* Banner Left Info */}
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#16803C] shadow-sm border border-[#D5E5CE]">
                <Sprout className="h-6 w-6 fill-[#16803C]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#17251C]">
                AI Crop Disease Scanner
              </h1>
            </div>

            <p className="mt-3 text-xs sm:text-sm text-[#3E5345] leading-relaxed max-w-2xl font-medium">
              Upload a clear photograph of your crop leaf to identify the crop, screen for possible
              diseases, and receive practical farming guidance.
            </p>

            {/* 3 Benefit Pills */}
            <div className="mt-5 flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#17251C] shadow-2xs border border-[#D5E5CE]">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#16803C] text-white">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span>Identify Crop</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#17251C] shadow-2xs border border-[#D5E5CE]">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#16803C] text-white">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span>Detect Disease</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#17251C] shadow-2xs border border-[#D5E5CE]">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#16803C] text-white">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
                <span>Get Expert Guidance</span>
              </div>
            </div>
          </div>

          {/* Banner Right: Smartphone Leaf Scan Illustration & ECG Leaf */}
          <div className="lg:col-span-4 hidden lg:flex items-center justify-end gap-3">
            {/* Phone Scan Mockup */}
            <div className="relative h-44 w-28 overflow-hidden rounded-2xl border-4 border-white bg-black shadow-xl shrink-0">
              <Image
                src="/images/landing/leaf_scanner_preview.jpg"
                alt="Smartphone scanning leaf"
                fill
                className="object-cover"
              />
              <div className="absolute inset-2 rounded-lg border border-dashed border-[#22c55e] flex flex-col justify-between p-1 pointer-events-none">
                <div className="flex justify-between">
                  <div className="h-2 w-2 border-t-2 border-l-2 border-[#22c55e]" />
                  <div className="h-2 w-2 border-t-2 border-r-2 border-[#22c55e]" />
                </div>
                <div className="h-0.5 w-full bg-[#22c55e] animate-pulse" />
                <div className="flex justify-between">
                  <div className="h-2 w-2 border-b-2 border-l-2 border-[#22c55e]" />
                  <div className="h-2 w-2 border-b-2 border-r-2 border-[#22c55e]" />
                </div>
              </div>
            </div>

            {/* Glowing ECG Leaf Card */}
            <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/80 bg-white/70 backdrop-blur-md p-3.5 shadow-lg w-32 text-center">
              <div className="relative h-16 w-16 text-[#16803C]">
                <Sprout className="h-full w-full stroke-[1.5]" />
                <div className="absolute inset-x-0 bottom-2 flex items-center justify-center">
                  <div className="h-1 w-12 bg-gradient-to-r from-transparent via-[#16803C] to-transparent rounded-full shadow-[0_0_6px_#16803C]" />
                </div>
              </div>
              <span className="text-[10px] font-black tracking-wider text-[#14532D] uppercase mt-1">
                AI Vision Health
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Offline Warning Banner */}
      {!isBackendOnline && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <strong className="font-semibold text-rose-900">
              AI Prediction Engine Offline:
            </strong>{" "}
            The FastAPI backend at <code>http://127.0.0.1:8000</code> is not connected.
            Sample previews will function, but live uploads require the server.
          </div>
        </div>
      )}

      {/* Error Alert Message */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN WORKSPACE matching the reference image layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

        {/* ======================================================== */}
        {/* LEFT COLUMN: Upload Card + Leaf Photography Guide (~40%) */}
        {/* ======================================================== */}
        <div className="space-y-6 lg:col-span-5">

          {/* CARD A: Upload Your Crop Image */}
          <div className="relative overflow-hidden rounded-3xl border border-[#E5EAE2] bg-white p-5 sm:p-6 shadow-xs">
            {/* Soft leaf watermark at top-right */}
            <div className="absolute top-2 right-2 text-[#E7F4DF] pointer-events-none">
              <Sprout className="h-20 w-20 opacity-40" />
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 relative z-10">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F4DF] text-[#16803C]">
                <Sprout className="h-4 w-4" />
              </div>
              <h2 className="text-base font-extrabold text-[#17251C]">
                Upload Your Crop Image
              </h2>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-[#16803C] bg-[#E7F4DF]/50 scale-[1.01]"
                  : "border-[#16803C]/35 bg-[#F4F8F3] hover:border-[#16803C] hover:bg-[#EBF5EA]/40"
              }`}
            >
              {previewUrl ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative h-44 w-full max-w-xs overflow-hidden rounded-xl border-2 border-white shadow-md bg-black">
                    <img
                      src={previewUrl}
                      alt="Selected leaf preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="mt-2 text-xs font-semibold text-[#17251C] truncate max-w-xs">
                    {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 : 0).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] shadow-2xs mb-2.5">
                    <UploadCloud className="h-6 w-6 stroke-[2.2]" />
                  </div>

                  <p className="text-sm font-extrabold text-[#17251C]">
                    Drag & drop a leaf photo here
                  </p>
                  <span className="text-xs text-[#55695E] my-1 font-medium">or</span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-[#16803C] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#14532D] transition-colors"
                  >
                    <ScanLine className="h-3.5 w-3.5" />
                    <span>Choose Photo</span>
                  </button>

                  <p className="mt-3 text-[11px] text-[#78887E]">
                    Supports: JPG, JPEG, PNG, WEBP (Max 10 MB)
                  </p>
                </>
              )}
            </div>

            {/* Action Bar when a file is selected */}
            {selectedFile && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 rounded-xl border border-[#D5E5CE] bg-white py-2 text-xs font-semibold text-[#17251C] hover:bg-[#FAFAF2] transition-colors"
                  >
                    Replace Image
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#16803C] py-3 text-sm font-bold text-white shadow-md hover:bg-[#14532D] transition-all disabled:opacity-60"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{steps[analysisStep]}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Analyze Image with AI</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Quick Test Sample Buttons */}
            <div className="mt-4 pt-4 border-t border-[#F0F4EC]">
              <span className="text-[11px] font-bold text-[#55695E] uppercase tracking-wider block mb-2">
                Quick Test Samples (Field & Lab Datasets):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/rice_leaf_blast.jpg", "rice_leaf_blast.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🌾 Rice Blast
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/rice_brown_spot.jpg", "rice_brown_spot.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🌾 Rice Brown Spot
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/rice_bacterial_blight.jpg", "rice_bacterial_blight.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🌾 Rice Bacterial Blight
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/rice_healthy.jpg", "rice_healthy.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🌾 Healthy Rice
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/corn_common_rust.jpg", "corn_common_rust.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🌽 Corn Common Rust
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/tomato_early_blight.jpg", "tomato_early_blight.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🍅 Tomato Early Blight
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleLeaf("/images/samples/tomato_healthy.jpg", "tomato_healthy.jpg")}
                  className="rounded-lg border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:border-[#16803C] transition-colors"
                >
                  🌱 Healthy Tomato
                </button>
              </div>
            </div>
          </div>

          {/* CARD B: How to Take a Good Leaf Photo */}
          <div className="rounded-3xl border border-[#E5EAE2] bg-white p-5 sm:p-6 shadow-xs">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F4DF] text-[#16803C]">
                <ScanLine className="h-4 w-4" />
              </div>
              <h3 className="text-base font-extrabold text-[#17251C]">
                How to Take a Good Leaf Photo
              </h3>
            </div>

            {/* 4 Photo Guide Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* 1. Single leaf */}
              <div className="flex flex-col items-center text-center">
                <div className="relative h-20 w-full overflow-hidden rounded-xl border border-[#E5EAE2] bg-[#FAFAF2]">
                  <Image
                    src="/images/guide/single_leaf.jpg"
                    alt="Single leaf with symptoms"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#17251C]">
                  <CheckCircle2 className="h-3 w-3 text-[#16803C] shrink-0" />
                  <span>Single leaf with symptoms</span>
                </div>
              </div>

              {/* 2. Daylight */}
              <div className="flex flex-col items-center text-center">
                <div className="relative h-20 w-full overflow-hidden rounded-xl border border-[#E5EAE2] bg-[#FAFAF2]">
                  <Image
                    src="/images/guide/daylight_leaf.jpg"
                    alt="Use natural daylight"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#17251C]">
                  <CheckCircle2 className="h-3 w-3 text-[#16803C] shrink-0" />
                  <span>Use natural daylight</span>
                </div>
              </div>

              {/* 3. In focus */}
              <div className="flex flex-col items-center text-center">
                <div className="relative h-20 w-full overflow-hidden rounded-xl border border-[#E5EAE2] bg-[#FAFAF2]">
                  <Image
                    src="/images/guide/focus_leaf.jpg"
                    alt="Keep image in focus"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#17251C]">
                  <CheckCircle2 className="h-3 w-3 text-[#16803C] shrink-0" />
                  <span>Keep image in focus</span>
                </div>
              </div>

              {/* 4. Avoid blurry */}
              <div className="flex flex-col items-center text-center">
                <div className="relative h-20 w-full overflow-hidden rounded-xl border border-red-200 bg-red-50">
                  <Image
                    src="/images/guide/blurry_leaf.jpg"
                    alt="Avoid blurry photos"
                    fill
                    className="object-cover opacity-80"
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-red-600">
                  <X className="h-3 w-3 text-red-600 shrink-0" />
                  <span>Avoid blurry photos</span>
                </div>
              </div>
            </div>

            {/* PlantVillage Limitation Note Callout */}
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[#CDE1F8] bg-[#EBF3FC] p-3.5 text-xs text-[#1E3A8A]">
              <Info className="h-4 w-4 shrink-0 text-[#2563EB] mt-0.5" />
              <p className="leading-relaxed">
                <strong>Note:</strong> This AI model is mainly designed for leaf diseases (PlantVillage-based, 38 categories).
                It may not reliably identify insects, pests, or non-leaf images.
              </p>
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: Diagnostic Result & 6 Disease Tabs (~60%) */}
        {/* ======================================================== */}
        <div className="space-y-6 lg:col-span-7">

          {/* MAIN RESULT CARD */}
          <div className="rounded-3xl border border-[#E5EAE2] bg-white p-5 sm:p-7 shadow-xs">

            {/* Result Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F4EC] pb-4">
              <h2 className="text-xl font-extrabold text-[#17251C]">
                Scan Result
              </h2>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#55695E]">
                <Calendar className="h-3.5 w-3.5 text-[#16803C]" />
                <span>
                  Scanned on: {new Date(prediction.timestamp).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}, {new Date(prediction.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* SECTION A & B & C & D: Horizontal Diagnosis Strip matching reference image */}
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-12 items-center rounded-2xl bg-[#FAFAF2] p-4 border border-[#E7F4DF]">

              {/* Thumbnail with expand button */}
              <div className="sm:col-span-3 relative h-28 w-full sm:w-28 overflow-hidden rounded-2xl border-2 border-white shadow-xs bg-black mx-auto">
                <img
                  src={activePreviewImage}
                  alt={top.condition}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFullscreenImage(activePreviewImage)}
                  className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur-xs hover:bg-black transition-colors"
                  title="Expand Full Resolution"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Identified Crop */}
              <div className="sm:col-span-3 flex flex-col justify-center">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#55695E]">
                  <Sprout className="h-3.5 w-3.5 text-[#16803C]" />
                  Identified Crop
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xl">{getCropEmoji(identifiedCrop)}</span>
                  <span className="text-base font-black text-[#17251C]">
                    {identifiedCrop}
                  </span>
                </div>
              </div>

              {/* AI Diagnostic Result */}
              <div className="sm:col-span-4 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-[#55695E]">
                    <ShieldAlert className="h-3.5 w-3.5 text-[#16803C]" />
                    AI Diagnostic Result
                  </span>
                  {prediction.model_name && (
                    <span className="text-[10px] font-medium text-[#55695E] bg-white border border-[#D5E5CE] rounded-md px-1.5 py-0.5">
                      {prediction.model_name.includes("Rice") ? "🌾 Rice Classifier" : "🌿 PlantVillage"}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-500" : isUnsupportedCrop ? "bg-amber-500" : "bg-red-500"} animate-ping`} />
                  <h3 className="text-lg font-black text-[#17251C] leading-snug">
                    {predictedCondition}
                  </h3>
                </div>

                <div className="mt-1">
                  {isUnsupportedCrop ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-900 border border-amber-300">
                      <AlertTriangle className="h-3 w-3 text-amber-700" />
                      Unsupported Crop
                    </span>
                  ) : isUncertain ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      Uncertain Prediction
                    </span>
                  ) : isHealthy ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" />
                      Optimal Health
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F4DF] px-2.5 py-0.5 text-[10px] font-extrabold text-[#16803C]">
                      <CheckCircle2 className="h-3 w-3" />
                      Likely Match
                    </span>
                  )}
                </div>
              </div>

              {/* Confidence Box matching reference */}
              <div className="sm:col-span-2 flex flex-col items-center justify-center rounded-xl bg-white border border-[#D5E5CE] p-2.5 shadow-2xs text-center">
                <span className="text-[10px] font-bold text-[#55695E] uppercase tracking-wider">
                  Confidence
                </span>
                <span className="text-xl font-black text-[#16803C] mt-0.5">
                  {confidenceScore.toFixed(1)}%
                </span>
              </div>

            </div>

            {/* UNCERTAINTY / UNSUPPORTED WARNING BANNER */}
            {isUncertain && (
              <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-amber-950">
                      {isUnsupportedCrop ? "Crop Not Reliably Recognized" : "Uncertain Prediction — Field Verification Recommended"}
                    </h4>
                    <p className="mt-1 leading-relaxed">
                      {prediction.uncertainty_warning ||
                        (isUnsupportedCrop
                          ? "Crop not reliably recognized. This model may not support this crop yet. Please consult an agricultural expert."
                          : "The model confidence is below the safety threshold. Do NOT begin chemical treatment based only on this AI screening. Please inspect the field in person or consult an agricultural officer.")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TOP 3 POSSIBLE MATCHES CARD matching reference */}
            <div className="mt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#17251C] flex items-center gap-1.5 mb-3">
                <span>📊</span>
                <span>Top 3 Possible Matches</span>
              </h4>

              <div className="space-y-2.5">
                {prediction.predictions.slice(0, 3).map((item, idx) => {
                  const pct = item.confidence_percentage;
                  return (
                    <div
                      key={item.rank}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white p-2.5 border border-[#F0F4EC] hover:bg-[#FAFAF2] transition-colors"
                    >
                      {/* Rank & Name */}
                      <div className="flex items-center gap-2.5 min-w-[240px]">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#16803C] text-[10px] font-black text-white">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-[#17251C]">
                          {item.crop} — {item.condition}
                        </span>
                      </div>

                      {/* Smooth Progress Bar */}
                      <div className="flex-1 mx-2 h-2.5 overflow-hidden rounded-full bg-[#E5EAE2]">
                        <div
                          className="h-full rounded-full bg-[#16803C] transition-all duration-700"
                          style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                        />
                      </div>

                      {/* Percentage */}
                      <div className="text-right sm:w-14 shrink-0 text-xs font-extrabold text-[#17251C]">
                        {pct.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 6 DISEASE INFORMATION TABS matching reference */}
            <div className="mt-7">
              {/* Tabs Navigation Strip */}
              <div className="flex flex-wrap items-center gap-2 border-b border-[#F0F4EC] pb-3">
                {[
                  { id: "about" as TabType, label: "About" },
                  { id: "symptoms" as TabType, label: "Symptoms" },
                  { id: "causes" as TabType, label: "Causes" },
                  { id: "prevention" as TabType, label: "Prevention" },
                  { id: "management" as TabType, label: "Management" },
                  { id: "nextSteps" as TabType, label: "Next Steps" },
                ].map((tab) => {
                  const isActive = activeInfoTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveInfoTab(tab.id)}
                      className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#174D36] text-white shadow-xs"
                          : "bg-white text-[#55695E] border border-[#E5EAE2] hover:bg-[#F4F8F3] hover:text-[#17251C]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Content Panel */}
              <div className="mt-4 rounded-2xl border border-[#E7F4DF] bg-[#FAFAF2] p-5">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex-1">

                    {/* ABOUT TAB */}
                    {activeInfoTab === "about" && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-black text-[#17251C] mb-2">
                          <Sprout className="h-4 w-4 text-[#16803C]" />
                          About the Disease
                        </h4>
                        <p className="text-xs text-[#3E5345] leading-relaxed font-normal">
                          {tabKnowledge.about}
                        </p>
                        {tabKnowledge.scientificName && (
                          <p className="mt-2 text-[11px] font-semibold text-[#55695E]">
                            Causal Pathogen: <em>{tabKnowledge.scientificName}</em> ({tabKnowledge.pathogenType})
                          </p>
                        )}
                      </div>
                    )}

                    {/* SYMPTOMS TAB */}
                    {activeInfoTab === "symptoms" && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-black text-[#17251C] mb-2">
                          <AlertCircle className="h-4 w-4 text-[#16803C]" />
                          Common Symptoms
                        </h4>
                        <ul className="space-y-1.5 text-xs text-[#3E5345]">
                          {tabKnowledge.symptoms.map((s, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#16803C] font-bold mt-0.5">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CAUSES TAB */}
                    {activeInfoTab === "causes" && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-black text-[#17251C] mb-2">
                          <Sun className="h-4 w-4 text-amber-600" />
                          Causes & Favorable Conditions
                        </h4>
                        <ul className="space-y-1.5 text-xs text-[#3E5345]">
                          {tabKnowledge.causes.map((c, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-600 font-bold mt-0.5">•</span>
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* PREVENTION TAB */}
                    {activeInfoTab === "prevention" && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-black text-[#17251C] mb-2">
                          <CheckCircle2 className="h-4 w-4 text-[#16803C]" />
                          Preventive Practices
                        </h4>
                        <ul className="space-y-1.5 text-xs text-[#3E5345]">
                          {tabKnowledge.prevention.map((p, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#16803C] font-bold mt-0.5">•</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* MANAGEMENT TAB */}
                    {activeInfoTab === "management" && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-black text-[#17251C] mb-2">
                          <ShieldAlert className="h-4 w-4 text-[#16803C]" />
                          Safe Management Guidance
                        </h4>
                        <ul className="space-y-1.5 text-xs text-[#3E5345]">
                          {tabKnowledge.management.map((m, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#16803C] font-bold mt-0.5">•</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* NEXT STEPS TAB */}
                    {activeInfoTab === "nextSteps" && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-sm font-black text-[#17251C] mb-2">
                          <FileCheck className="h-4 w-4 text-[#16803C]" />
                          Recommended Next Steps for Farmers
                        </h4>
                        <ul className="space-y-1.5 text-xs text-[#3E5345]">
                          {tabKnowledge.nextSteps.map((n, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-[#16803C] font-bold mt-0.5">✓</span>
                              <span>{n}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>

                  {/* Right Thumbnail Illustration matching reference */}
                  <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white shadow-xs bg-black hidden sm:block">
                    <img
                      src={activePreviewImage}
                      alt="Crop leaf disease illustration"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RESULT ACTION BUTTONS (Horizontal Row) matching reference image */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#F0F4EC] pt-4">

              {/* Save Scan Button */}
              <button
                type="button"
                onClick={handleSaveToHistory}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-xs ${
                  isSaved
                    ? "bg-[#E7F4DF] text-[#16803C] border border-[#C5D9BE]"
                    : "bg-[#16803C] text-white hover:bg-[#14532D]"
                }`}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    <span>Saved to Records</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Save Scan</span>
                  </>
                )}
              </button>

              {/* Download Report Button */}
              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:bg-[#FAFAF2] hover:border-[#16803C] transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-[#55695E]" />
                <span>Download Report</span>
              </button>

              {/* Consult AI Assistant Button */}
              {onSelectTab ? (
                <button
                  type="button"
                  onClick={() => onSelectTab("assistant")}
                  className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:bg-[#FAFAF2] hover:border-[#16803C] transition-colors"
                >
                  <Bot className="h-3.5 w-3.5 text-[#16803C]" />
                  <span>Consult AI Assistant</span>
                </button>
              ) : (
                <Link
                  href="/dashboard?tab=assistant"
                  className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:bg-[#FAFAF2] hover:border-[#16803C] transition-colors"
                >
                  <Bot className="h-3.5 w-3.5 text-[#16803C]" />
                  <span>Consult AI Assistant</span>
                </Link>
              )}

              {/* Scan Another Leaf Button */}
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:bg-[#FAFAF2] hover:border-[#16803C] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#55695E]" />
                <span>Scan Another Leaf</span>
              </button>

              {/* View Scan History Button */}
              {onSelectTab ? (
                <button
                  type="button"
                  onClick={() => onSelectTab("history")}
                  className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:bg-[#FAFAF2] hover:border-[#16803C] transition-colors ml-auto"
                >
                  <Clock className="h-3.5 w-3.5 text-[#55695E]" />
                  <span>View Scan History</span>
                </button>
              ) : (
                <Link
                  href="/dashboard?tab=history"
                  className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:bg-[#FAFAF2] hover:border-[#16803C] transition-colors ml-auto"
                >
                  <Clock className="h-3.5 w-3.5 text-[#55695E]" />
                  <span>View Scan History</span>
                </Link>
              )}

            </div>

          </div>

        </div>

      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setFullscreenImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl bg-black border border-white/20 shadow-2xl p-2">
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={fullscreenImage}
              alt="Expanded view"
              className="max-h-[85vh] w-auto rounded-2xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

    </div>
  );
}
