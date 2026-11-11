"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sprout,
  RotateCcw,
  BookmarkCheck,
  Bookmark,
  Printer,
  Leaf,
  ExternalLink,
  Bot,
  Loader2,
  BookOpen,
} from "lucide-react";
import { PredictionResponse, AdvisoryResponse } from "@/types";
import { getGuidanceForCondition } from "@/data/diseaseAdvisory";
import { generateCropAdvisory } from "@/services/api";

interface PredictionResultProps {
  result: PredictionResponse;
  imagePreviewUrl: string;
  onReset: () => void;
  onSaveToHistory: () => void;
  isSaved: boolean;
}

export default function PredictionResult({
  result,
  imagePreviewUrl,
  onReset,
  onSaveToHistory,
  isSaved,
}: PredictionResultProps) {
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);

  const top = result.top_prediction;
  const isUncertain =
    result.is_uncertain ??
    (top.confidence_percentage < 10.0 ||
      (result.predictions.length > 1 &&
        top.confidence_percentage - result.predictions[1].confidence_percentage < 3.0));
  const isHealthy = !isUncertain && top.condition.toLowerCase().includes("healthy");
  const fallbackGuidance = getGuidanceForCondition(top.condition);

  const handleFetchAdvisory = async () => {
    if (advisory) return;
    setAdvisoryLoading(true);
    setAdvisoryError(null);
    try {
      const adv = await generateCropAdvisory({
        crop: top.crop,
        condition: top.condition,
        raw_class: top.raw_class,
        confidence_percentage: top.confidence_percentage,
      });
      setAdvisory(adv);
    } catch (err: any) {
      setAdvisoryError(err.message || "Failed to generate agronomic advisory.");
    } finally {
      setAdvisoryLoading(false);
    }
  };

  const getConfidenceBarBg = (conf: number, healthy: boolean) => {
    if (healthy) return "bg-[#16834A]";
    if (conf >= 70) return "bg-rose-600";
    if (conf >= 40) return "bg-amber-500";
    return "bg-slate-400";
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5E8E1] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
            <Leaf className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#174D36]">Diagnostic Report Ready</h2>
            <p className="text-xs text-[#5C7367]">File: {result.filename}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSaveToHistory}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              isSaved
                ? "bg-[#E5EFE5] text-[#16834A] border border-[#D1E7D1]"
                : "border border-[#E5E8E1] bg-white text-[#5C7367] hover:bg-[#FAFBF9]"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="h-3.5 w-3.5 text-[#16834A]" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Bookmark className="h-3.5 w-3.5" />
                <span>Save Scan</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E8E1] bg-white px-3 py-1.5 text-xs font-medium text-[#5C7367] hover:bg-[#FAFBF9]"
            title="Print or export report"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-xl bg-[#16834A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#137240]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Scan Another</span>
          </button>
        </div>
      </div>

      {/* Main Diagnostic Split View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Image Preview & Alternative Candidates */}
        <div className="space-y-4 lg:col-span-5">
          <div className="relative overflow-hidden rounded-2xl border border-[#E5E8E1] bg-white shadow-xs">
            {imagePreviewUrl ? (
              <img
                src={imagePreviewUrl}
                alt="Analyzed crop leaf"
                className="h-72 w-full object-cover sm:h-80"
              />
            ) : (
              <div className="flex h-72 w-full items-center justify-center bg-[#FAFBF9] text-[#7F9489]">
                <span>Image not available</span>
              </div>
            )}

            {/* Status Overlay Pill */}
            <div className="absolute left-3 top-3">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs backdrop-blur-md ${
                  isUncertain
                    ? "bg-amber-50/95 text-amber-800 ring-1 ring-amber-300"
                    : isHealthy
                    ? "bg-white/90 text-[#15803D] ring-1 ring-[#D1E7D1]"
                    : "bg-white/90 text-[#B91C1C] ring-1 ring-rose-200"
                }`}
              >
                {isUncertain ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>Uncertain Prediction</span>
                  </>
                ) : isHealthy ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
                    <span>Healthy Leaf</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-[#B91C1C]" />
                    <span>Pathology Detected</span>
                  </>
                )}
              </span>
            </div>

            <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] text-white backdrop-blur-xs">
              {new Date(result.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* Evaluated Candidates */}
          <div className="rounded-2xl border border-[#E5E8E1] bg-white p-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5C7367]">
              Evaluated Candidates ({result.predictions.length} Total)
            </h3>
            <div className="mt-3 space-y-2">
              {result.predictions.map((p) => {
                const isTop = p.rank === 1;
                return (
                  <div
                    key={p.rank}
                    className={`rounded-xl p-3 transition ${
                      isTop
                        ? "border border-[#D1E7D1] bg-[#E5EFE5]/40"
                        : "border border-[#E5E8E1] bg-[#FAFBF9]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                            isTop
                              ? "bg-[#16834A] text-white"
                              : "bg-[#E5E8E1] text-[#5C7367]"
                          }`}
                        >
                          #{p.rank}
                        </span>
                        <span className="font-semibold text-[#174D36]">
                          {p.crop} — {p.condition}
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          isTop ? "text-[#16834A]" : "text-[#5C7367]"
                        }`}
                      >
                        {p.confidence_percentage.toFixed(2)}%
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E5E8E1]">
                      <div
                        className={`h-full transition-all duration-700 ${getConfidenceBarBg(
                          p.confidence_percentage,
                          p.condition.toLowerCase().includes("healthy")
                        )}`}
                        style={{ width: `${Math.min(100, p.confidence_percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Hero Diagnosis & Advisory Agent */}
        <div className="space-y-4 lg:col-span-7">
          {/* Prominent Uncertainty Warning Banner */}
          {isUncertain && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-bold text-amber-950">
                    Uncertain Prediction — Field Verification Recommended
                  </h3>
                  <p className="text-xs leading-relaxed text-amber-900">
                    {result.uncertainty_warning ||
                      `The AI model cannot make a reliable diagnosis for this photograph (Confidence: ${top.confidence_percentage.toFixed(2)}%). Do NOT treat this prediction as a confirmed disease.`}
                  </p>
                  <div className="mt-2 rounded-xl border border-amber-200/80 bg-white/80 p-3 text-[11px] text-[#55695E] space-y-1.5">
                    <div>
                      <strong className="text-amber-900">• Potential Domain Mismatch:</strong> The PlantVillage training dataset covers 38 crop leaf classes and <strong>zero insect or pest classes</strong>. Visible insects, mites, soil, weeds, or non-crop objects represent out-of-distribution inputs.
                    </div>
                    <div>
                      <strong className="text-amber-900">• Image Quality / Lighting:</strong> Glare, extreme shadows, blur, or distance prevent reliable pattern matching.
                    </div>
                    <div>
                      <strong className="text-amber-900">• Recommended Action:</strong> Conduct physical field inspection and consult a local Krishi Vigyan Kendra (KVK) officer or extension specialist before taking any chemical or cultural intervention.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Primary Diagnosis Hero Card */}
          <div className="rounded-2xl border border-[#E5E8E1] bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${isUncertain ? "text-amber-700" : "text-[#16834A]"}`}>
                {isUncertain ? "Unconfirmed Candidate (Low Confidence)" : "Primary Diagnosis (Rank #1)"}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isUncertain ? "bg-amber-100 text-amber-800" : "bg-[#E5EFE5] text-[#16834A]"
              }`}>
                {isUncertain ? "Low Confidence Output" : "EfficientNet-B0 Output"}
              </span>
            </div>

            <div className="mt-3">
              <div className="text-xs font-medium text-[#5C7367]">
                {isUncertain ? "Nearest Visual Pattern (Unverified):" : "Identified Crop:"}
              </div>
              <h1 className="text-2xl font-black text-[#174D36] sm:text-3xl">
                {top.crop}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={`text-lg font-bold ${isUncertain ? "text-amber-800" : "text-[#16834A]"}`}>
                  {top.condition}
                </span>
                <span className="text-xs text-[#7F9489]">
                  ({top.raw_class})
                </span>
              </div>
            </div>

            {/* Confidence Meter */}
            <div className="mt-5 rounded-xl border border-[#E5E8E1] bg-[#FAFBF9] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[#174D36]">Model Confidence</span>
                <span className="font-mono text-xl font-black text-[#16834A]">
                  {top.confidence_percentage.toFixed(2)}%
                </span>
              </div>

              <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-[#E5E8E1]">
                <div
                  className={`h-full transition-all duration-1000 ${getConfidenceBarBg(
                    top.confidence_percentage,
                    isHealthy
                  )}`}
                  style={{ width: `${top.confidence_percentage}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-[#5C7367]">
                <span>Visual Match Probability</span>
                <span>
                  {top.confidence_percentage >= 70
                    ? "High Pattern Similarity"
                    : top.confidence_percentage >= 40
                    ? "Moderate Pattern Match"
                    : "Low Confidence - Field Scout Advised"}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-[#5C7367]">
              {fallbackGuidance.description}
            </p>
          </div>

          {/* Crop Advisory Agent Section */}
          <div className="rounded-2xl border border-[#E5E8E1] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#174D36]">
                    Crop Advisory Agent
                  </h3>
                  <p className="text-[11px] text-[#5C7367]">
                    Science-backed synthesis of prediction, verified records, and weather
                  </p>
                </div>
              </div>

              {!advisory && (
                <button
                  onClick={handleFetchAdvisory}
                  disabled={advisoryLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-[#16834A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] disabled:opacity-50"
                >
                  {advisoryLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Synthesizing...</span>
                    </>
                  ) : (
                    <>
                      <Sprout className="h-3.5 w-3.5" />
                      <span>Consult Advisory Agent</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {advisoryError && (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {advisoryError}
              </div>
            )}

            {advisory ? (
              <div className="mt-4 space-y-4 pt-4 border-t border-[#E5E8E1] text-xs text-[#5C7367]">
                <div className="rounded-xl border border-[#D1E7D1] bg-[#E5EFE5] p-3 leading-relaxed text-[#174D36]">
                  <strong>Agent Assessment:</strong> {advisory.summary}
                </div>

                <div>
                  <h4 className="font-bold text-[#174D36] uppercase tracking-wider text-[11px]">
                    Weather Interaction & Infection Risk
                  </h4>
                  <p className="mt-1 leading-relaxed text-[#5C7367]">
                    {advisory.weather_interaction_analysis}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-amber-700 uppercase tracking-wider text-[11px]">
                    Physical Symptoms Checklist
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {advisory.symptoms_to_verify.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-[#16834A] uppercase tracking-wider text-[11px]">
                    Immediate Cultural Sanitation Steps
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {advisory.immediate_safe_actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#16834A] shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-rose-700 uppercase tracking-wider text-[11px]">
                    When to Contact KVK / Agricultural Extension
                  </h4>
                  <ul className="mt-1.5 space-y-1">
                    {advisory.expert_consultation_triggers.map((trig, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-500">⚠️</span>
                        <span>{trig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {advisory.references && advisory.references.length > 0 && (
                  <div className="pt-2 border-t border-[#E5E8E1]">
                    <h4 className="font-bold text-[#5C7367] flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-[#16834A]" />
                      <span>Verified Agricultural References</span>
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {advisory.references.map((ref, idx) => (
                        <a
                          key={idx}
                          href={ref.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8E1] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-medium text-[#16834A] hover:bg-[#E5EFE5] hover:text-[#174D36]"
                        >
                          <span>{ref.source_name} ({ref.publisher})</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs text-[#5C7367]">
                Click <em>&quot;Consult Advisory Agent&quot;</em> to synthesize field symptoms, weather interaction,
                sanitation next-steps, and verified citations from agricultural universities.
              </p>
            )}
          </div>

          {/* Scientific Field Reliability & Pesticide Warning Box */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-amber-700" />
              <span>Scientific Reliability & Farmer Safety Disclaimers</span>
            </div>

            <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-[#5C7367]">
              <div>
                <strong className="text-[#174D36]">1. Domain Shift Notice:</strong> Trained on PlantVillage studio photographs. Outdoor sunlight glare, shadows, and overlapping weeds can alter confidence.
              </div>
              <div>
                <strong className="text-[#174D36]">2. Preliminary Decision Support:</strong> AI vision screening is an agronomic tool, not a certified laboratory diagnosis.
              </div>
              <div>
                <strong className="text-rose-800">3. Pesticide Safety Warning:</strong>{" "}
                <span className="text-rose-900 font-semibold">
                  NEVER purchase or spray synthetic chemical pesticides based solely on image predictions.
                </span>{" "}
                Always consult your local Krishi Vigyan Kendra (KVK) officer and follow locally registered product label directions.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
