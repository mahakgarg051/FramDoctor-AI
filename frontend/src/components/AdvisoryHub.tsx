"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Sprout,
  HelpCircle,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Leaf,
  Bug,
  ShieldCheck,
  Search,
  ExternalLink,
  Sparkles,
  CloudSun,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  fetchKnowledgeDiseases,
  generateCropAdvisory,
  fetchWeather,
} from "@/services/api";
import {
  DiseaseKnowledgeItem,
  AdvisoryRequest,
  AdvisoryResponse,
  WeatherResponse,
} from "@/types";

export default function AdvisoryHub() {
  const [activeSubTab, setActiveSubTab] = useState<
    "agent" | "knowledge" | "safety"
  >("agent");

  // Advisory Studio state
  const [crop, setCrop] = useState("Tomato");
  const [condition, setCondition] = useState("Early Blight");
  const [growthStage, setGrowthStage] = useState("Vegetative");
  const [farmNotes, setFarmNotes] = useState("");
  const [includeWeather, setIncludeWeather] = useState(true);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<AdvisoryResponse | null>(
    null
  );
  const [advisoryError, setAdvisoryError] = useState<string | null>(null);

  // Knowledge Base directory state
  const [knowledgeList, setKnowledgeList] = useState<DiseaseKnowledgeItem[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSearch, setKnowledgeSearch] = useState("");
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>("All");
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(
    null
  );

  // FAQ state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    loadKnowledgeBase();
    loadWeatherContext();
  }, []);

  const loadWeatherContext = async () => {
    try {
      const res = await fetchWeather();
      if (res && res.configured && res.temperature_celsius !== null) {
        setWeatherData(res);
      }
    } catch {}
  };

  const loadKnowledgeBase = async (filterCrop?: string, query?: string) => {
    setKnowledgeLoading(true);
    try {
      const cropQuery = filterCrop && filterCrop !== "All" ? filterCrop : undefined;
      const res = await fetchKnowledgeDiseases(cropQuery, query);
      setKnowledgeList(res.diseases || []);
    } catch (err: any) {
      console.error("Failed to load knowledge base:", err);
    } finally {
      setKnowledgeLoading(false);
    }
  };

  const handleFilterChange = (cropName: string) => {
    setSelectedCropFilter(cropName);
    loadKnowledgeBase(cropName, knowledgeSearch);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadKnowledgeBase(selectedCropFilter, knowledgeSearch);
  };

  const handleGenerateAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdvisoryLoading(true);
    setAdvisoryError(null);

    const payload: AdvisoryRequest = {
      crop,
      condition,
      growth_stage: growthStage,
      farm_notes: farmNotes.trim() || undefined,
      confidence_percentage: 85.0,
      weather_context:
        includeWeather && weatherData?.temperature_celsius !== undefined
          ? {
              temperature_celsius: weatherData.temperature_celsius ?? undefined,
              relative_humidity: weatherData.relative_humidity ?? undefined,
              rainfall_mm: weatherData.rainfall_mm ?? undefined,
              wind_speed_kmh: weatherData.wind_speed_kmh ?? undefined,
              condition: weatherData.weather_condition ?? undefined,
            }
          : undefined,
    };

    try {
      const response = await generateCropAdvisory(payload);
      setAdvisoryResult(response);
    } catch (err: any) {
      setAdvisoryError(
        err.message || "Failed to generate agronomic advisory. Please check backend connection."
      );
    } finally {
      setAdvisoryLoading(false);
    }
  };

  const faqs = [
    {
      q: "Why does the model report high confidence on some images and low on others?",
      a: "Deep learning models evaluate visual feature maps (such as circular necrotic spots or yellow chlorotic halos). Clear, focused, daylight photographs of single leaves yield the highest precision. Blurry, backlit, or distant photos confuse feature extractors.",
    },
    {
      q: "What is 'Domain Shift' and how does it affect real farm photos?",
      a: "The PlantVillage dataset was curated in studio laboratory environments using isolated leaves laid flat on uniform paper. Real farm fields feature outdoor sunlight glare, shadows, insect chewing, dust on leaves, and mixed overlapping weeds. FarmDoctor AI alerts you to this domain shift so you treat results as advisory decision support.",
    },
    {
      q: "Can I use FarmDoctor AI's prediction to buy chemical pesticides directly?",
      a: "NO. Absolutely never self-prescribe chemical pesticides or calculate dosage from computer vision models alone. Excessive chemical applications can cause chemical leaf burn, destroy beneficial soil microbes, and risk groundwater contamination. Always consult your nearest Krishi Vigyan Kendra (KVK) officer or registered agronomist.",
    },
    {
      q: "How can I take the best photograph of an infected leaf?",
      a: "Hold the camera 15–20 cm away from the infected leaf in natural diffused morning light. Avoid heavy shadows or holding the leaf against direct backlight. Ensure the disease spot or margin is sharply in focus.",
    },
  ];

  const uniqueCrops = [
    "All",
    "Tomato",
    "Potato",
    "Apple",
    "Corn",
    "Grape",
    "Pepper",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <span className="rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-xs font-semibold text-[#16834A]">
            Agronomic Decision Support & Knowledge Base
          </span>
          <h1 className="mt-1 text-2xl font-black text-[#174D36] sm:text-3xl">
            Crop Advisory Agent & Knowledge Base
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C7367]">
            Synthesize real-time weather, verified plant pathology records, and safe cultural practices.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 rounded-2xl border border-[#E5E8E1] bg-white p-1 shadow-xs">
          <button
            onClick={() => setActiveSubTab("agent")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeSubTab === "agent"
                ? "bg-[#16834A] text-white shadow-xs"
                : "text-[#5C7367] hover:bg-[#FAFBF9] hover:text-[#174D36]"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Advisory Studio</span>
          </button>
          <button
            onClick={() => setActiveSubTab("knowledge")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeSubTab === "knowledge"
                ? "bg-[#16834A] text-white shadow-xs"
                : "text-[#5C7367] hover:bg-[#FAFBF9] hover:text-[#174D36]"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Knowledge Base</span>
          </button>
          <button
            onClick={() => setActiveSubTab("safety")}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              activeSubTab === "safety"
                ? "bg-[#16834A] text-white shadow-xs"
                : "text-[#5C7367] hover:bg-[#FAFBF9] hover:text-[#174D36]"
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>KVK & Safety</span>
          </button>
        </div>
      </div>

      {/* Critical Chemical Safety Notice */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-rose-900">
              Official Non-Prescriptive Advisory Notice
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#5C7367]">
              FarmDoctor AI recommendations prioritize preventative cultural sanitation and biological controls.
              <strong className="text-rose-900"> Never apply synthetic pesticides or chemical dosages without consulting a certified KVK agronomist and verifying the local registered product label.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: ADVISORY STUDIO */}
      {/* ========================================================================= */}
      {activeSubTab === "agent" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Advisory Form */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-[#E5E8E1] bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 border-b border-[#E5E8E1] pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5EFE5] text-[#16834A]">
                  <Sprout className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#174D36]">
                    Crop Advisory Studio
                  </h2>
                  <p className="text-[11px] text-[#5C7367]">
                    Input crop details for synthesized guidance
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerateAdvisory} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Crop Variety / Specie
                  </label>
                  <select
                    value={crop}
                    onChange={(e) => setCrop(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] px-3 py-2 text-xs text-[#11291F] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  >
                    <option value="Tomato">Tomato (Tamatar)</option>
                    <option value="Potato">Potato (Aloo)</option>
                    <option value="Apple">Apple (Seb)</option>
                    <option value="Corn">Corn / Maize (Makka)</option>
                    <option value="Grape">Grape (Angoor)</option>
                    <option value="Pepper">Pepper / Capsicum (Shimla Mirch)</option>
                    <option value="Rice">Rice / Paddy (Dhan)</option>
                    <option value="Wheat">Wheat (Gehu)</option>
                    <option value="Cotton">Cotton (Kapaas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Suspected Condition / Anomaly
                  </label>
                  <input
                    type="text"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Early Blight, Late Blight, Yellow Leaf Curl..."
                    required
                    className="mt-1 w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] px-3 py-2 text-xs text-[#11291F] placeholder-[#7F9489] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Crop Growth Stage
                  </label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] px-3 py-2 text-xs text-[#11291F] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  >
                    <option value="Nursery / Seedling">Nursery / Seedling</option>
                    <option value="Vegetative Canopy">Vegetative Canopy</option>
                    <option value="Flowering / Budding">Flowering / Budding</option>
                    <option value="Fruit Set / Grain Fill">Fruit Set / Grain Fill</option>
                    <option value="Maturity / Pre-Harvest">Maturity / Pre-Harvest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Field Notes & Observations (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={farmNotes}
                    onChange={(e) => setFarmNotes(e.target.value)}
                    placeholder="e.g. Concentric bullseye rings seen on lower leaves after rain..."
                    className="mt-1 w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] px-3 py-2 text-xs text-[#11291F] placeholder-[#7F9489] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-[#E5E8E1] bg-[#FAFBF9] p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CloudSun className="h-4 w-4 text-amber-500" />
                      <div>
                        <div className="text-xs font-semibold text-[#174D36]">
                          Synthesize Weather Context
                        </div>
                        <div className="text-[11px] text-[#5C7367]">
                          {weatherData?.temperature_celsius !== undefined
                            ? `Active: ${weatherData.temperature_celsius}°C, ${weatherData.relative_humidity}% RH`
                            : "Weather service baseline"}
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={includeWeather}
                        onChange={(e) => setIncludeWeather(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="peer h-5 w-9 rounded-full bg-slate-200 after:absolute after:top-[2px] after:start-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#16834A] peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={advisoryLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16834A] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#137240] disabled:opacity-50"
                >
                  {advisoryLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Agronomic Knowledge...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Consult Crop Advisory Agent</span>
                    </>
                  )}
                </button>
              </form>

              {advisoryError && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800">
                  {advisoryError}
                </div>
              )}
            </div>
          </div>

          {/* Advisory Result */}
          <div className="lg:col-span-7">
            {advisoryResult ? (
              <div className="space-y-4 rounded-3xl border border-[#E5E8E1] bg-white p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E8E1] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#E5EFE5] px-2 py-0.5 text-xs font-bold text-[#16834A]">
                        {advisoryResult.crop}
                      </span>
                      <span className="rounded-full bg-[#F4F6F2] px-2 py-0.5 text-[10px] font-medium text-[#5C7367]">
                        Evidence: {advisoryResult.evidence_level}
                      </span>
                    </div>
                    <h2 className="mt-1 text-base font-black text-[#174D36]">
                      Advisory for {advisoryResult.suspected_condition}
                    </h2>
                  </div>
                  <div className="text-right text-[11px] text-[#7F9489]">
                    Generated: {new Date(advisoryResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#D1E7D1] bg-[#E5EFE5] p-3.5">
                  <h3 className="text-xs font-bold text-[#174D36]">
                    Agronomic Summary & Assessment
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#174D36]">
                    {advisoryResult.summary}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E8E1] bg-[#FAFBF9] p-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#174D36]">
                    <CloudSun className="h-4 w-4 text-amber-500" />
                    <span>Microclimate & Disease Interaction</span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C7367]">
                    {advisoryResult.weather_interaction_analysis}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#E5E8E1] bg-white p-3.5">
                    <h3 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>Symptoms to Inspect</span>
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-[#5C7367]">
                      {advisoryResult.symptoms_to_verify.map((sym, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{sym}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-[#E5E8E1] bg-white p-3.5">
                    <h3 className="text-xs font-bold text-[#16834A] flex items-center gap-1.5">
                      <Leaf className="h-3.5 w-3.5" />
                      <span>Immediate Actions</span>
                    </h3>
                    <ul className="mt-2 space-y-1 text-xs text-[#5C7367]">
                      {advisoryResult.immediate_safe_actions.map((act, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#16834A] shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5">
                  <h3 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                    <PhoneCall className="h-3.5 w-3.5 text-rose-600" />
                    <span>When to Contact Local Agronomist / KVK</span>
                  </h3>
                  <ul className="mt-1.5 space-y-1 text-xs text-rose-900">
                    {advisoryResult.expert_consultation_triggers.map((trig, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span>⚠️</span>
                        <span>{trig}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {advisoryResult.references && advisoryResult.references.length > 0 && (
                  <div className="border-t border-[#E5E8E1] pt-3">
                    <div className="text-xs font-bold text-[#5C7367]">
                      Verified Agricultural Reference Sources:
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {advisoryResult.references.map((ref, idx) => (
                        <a
                          key={idx}
                          href={ref.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8E1] bg-[#FAFBF9] px-2.5 py-1 text-[11px] font-medium text-[#16834A] hover:bg-[#E5EFE5] hover:text-[#174D36]"
                        >
                          <BookOpen className="h-3 w-3" />
                          <span>{ref.source_name} ({ref.publisher})</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#D6DDD3] bg-white p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A]">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#174D36]">
                  No Active Advisory Query
                </h3>
                <p className="mt-1 max-w-sm text-xs text-[#5C7367]">
                  Select your crop and symptoms on the left, or run a leaf scan in the Scanner tab to generate comprehensive agronomic guidance.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: KNOWLEDGE BASE DIRECTORY */}
      {/* ========================================================================= */}
      {activeSubTab === "knowledge" && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-[#E5E8E1] bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {uniqueCrops.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleFilterChange(c)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      selectedCropFilter === c
                        ? "bg-[#16834A] text-white"
                        : "border border-[#E5E8E1] bg-[#FAFBF9] text-[#5C7367] hover:bg-[#E5EFE5] hover:text-[#174D36]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7F9489]" />
                  <input
                    type="text"
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    placeholder="Search pathogen, symptom..."
                    className="w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] py-1.5 pl-8 pr-3 text-xs text-[#11291F] placeholder-[#7F9489] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-[#16834A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#137240]"
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {knowledgeLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#16834A]" />
            </div>
          ) : (
            <div className="space-y-3">
              {knowledgeList.map((item) => {
                const isExpanded = expandedDiseaseId === item.disease_id;
                return (
                  <div
                    key={item.disease_id}
                    className="overflow-hidden rounded-2xl border border-[#E5E8E1] bg-white shadow-xs transition hover:border-[#16834A]"
                  >
                    <div
                      onClick={() =>
                        setExpandedDiseaseId(isExpanded ? null : item.disease_id)
                      }
                      className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 hover:bg-[#FAFBF9]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                            item.is_healthy
                              ? "bg-[#E5EFE5] text-[#16834A]"
                              : "bg-[#FEF3C7] text-[#B45309]"
                          }`}
                        >
                          {item.crop.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#174D36]">
                              {item.crop} • {item.disease_name}
                            </h3>
                            <span className="rounded-md bg-[#F4F6F2] px-2 py-0.5 text-[10px] font-mono text-[#5C7367]">
                              {item.pathogen_type}
                            </span>
                          </div>
                          <p className="text-xs text-[#5C7367] italic">
                            {item.scientific_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-block rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-[11px] font-semibold text-[#16834A]">
                          Verified Reference
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-[#16834A]" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-[#7F9489]" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-[#E5E8E1] bg-[#FAFBF9] p-5 space-y-3.5 text-xs text-[#5C7367]">
                        <div>
                          <span className="font-bold text-[#174D36]">
                            Characteristic Field Symptoms:
                          </span>
                          <ul className="mt-1 space-y-1">
                            {item.common_symptoms.map((sym, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-1.5">
                                <span className="text-[#16834A] font-bold">•</span>
                                <span>{sym}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="grid grid-cols-1 gap-2 rounded-xl border border-[#E5E8E1] bg-white p-3 sm:grid-cols-3">
                          <div>
                            <span className="font-bold text-[#174D36]">Optimal Temp:</span>{" "}
                            {item.favorable_environmental_conditions.optimal_temp_celsius}
                          </div>
                          <div>
                            <span className="font-bold text-[#174D36]">Humidity:</span>{" "}
                            {item.favorable_environmental_conditions.humidity_threshold}
                          </div>
                          <div>
                            <span className="font-bold text-[#174D36]">Leaf Wetness:</span>{" "}
                            {item.favorable_environmental_conditions.leaf_wetness_hours}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <span className="font-bold text-[#16834A]">
                              Prevention Practices:
                            </span>
                            <ul className="mt-1 space-y-1">
                              {item.prevention_practices.map((pr, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-1.5">
                                  <span className="text-[#16834A] font-bold">•</span>
                                  <span>{pr}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <span className="font-bold text-[#174D36]">
                              Safe Cultural Management:
                            </span>
                            <ul className="mt-1 space-y-1">
                              {item.safe_management_guidance.map((sg, gIdx) => (
                                <li key={gIdx} className="flex items-start gap-1.5">
                                  <span className="text-[#174D36] font-bold">•</span>
                                  <span>{sg}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="border-t border-[#E5E8E1] pt-3">
                          <span className="font-bold text-[#5C7367]">
                            Verified Citations:
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {item.references.map((ref, rIdx) => (
                              <a
                                key={rIdx}
                                href={ref.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[#E5E8E1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#16834A] hover:bg-[#E5EFE5]"
                              >
                                <span>{ref.source_name}</span>
                                <span className="text-[#7F9489]">({ref.publisher})</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: KVK DIRECTORY & SAFETY */}
      {/* ========================================================================= */}
      {activeSubTab === "safety" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E5E8E1] bg-white p-5 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                <Leaf className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-bold text-[#174D36]">
                1. Cultural Canopy Sanitation
              </h2>
              <p className="mt-1 text-xs text-[#5C7367] leading-relaxed">
                Prune diseased lower foliage before fungal spores spread across crop rows. Use drip irrigation to maintain dry leaf surfaces.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E8E1] bg-white p-5 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
                <Bug className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-bold text-[#174D36]">
                2. Botanical & Bio-Fungicides
              </h2>
              <p className="mt-1 text-xs text-[#5C7367] leading-relaxed">
                Deploy Cold-Pressed Neem Oil (10,000 ppm) or biologicals like Trichoderma viride during early incubation periods.
              </p>
            </div>

            <div className="rounded-2xl border border-[#E5E8E1] bg-white p-5 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0369A1]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="mt-3 text-sm font-bold text-[#174D36]">
                3. Crop Rotation & Resistance
              </h2>
              <p className="mt-1 text-xs text-[#5C7367] leading-relaxed">
                Avoid planting Solanaceous crops consecutively in the same plot. Rotate with legumes or cereals to break pathogen soil survival.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E8E1] bg-white p-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#174D36]">
                  Certified Agricultural Extension Support (India)
                </h2>
                <p className="text-xs text-[#5C7367]">
                  Government Agricultural Universities & KVK Advisory Centers
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-[#E5E8E1] bg-[#FAFBF9] p-3">
                <span className="font-bold text-[#174D36]">Kisan Call Centre (Toll Free):</span>
                <div className="mt-1 font-mono text-[#16834A] text-sm font-bold">1800-180-1551</div>
                <div className="text-[11px] text-[#7F9489]">Available 6:00 AM to 10:00 PM all days</div>
              </div>
              <div className="rounded-xl border border-[#E5E8E1] bg-[#FAFBF9] p-3">
                <span className="font-bold text-[#174D36]">ICAR - Krishi Portal:</span>
                <div className="mt-1 font-mono text-[#16834A] text-sm font-bold">icar.org.in / kvk.icar.gov.in</div>
                <div className="text-[11px] text-[#7F9489]">Locate your nearest district KVK center</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E5E8E1] bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-[#174D36] flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-[#16834A]" />
              <span>Frequently Asked Questions</span>
            </h2>

            <div className="mt-3 space-y-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E5E8E1] bg-[#FAFBF9] overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="flex w-full items-center justify-between p-3 text-left text-xs font-semibold text-[#174D36] hover:text-[#16834A]"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="h-4 w-4 text-[#16834A] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-[#7F9489] shrink-0" />
                    )}
                  </button>

                  {openFaq === idx && (
                    <div className="px-3 pb-3 pt-1 text-xs leading-relaxed text-[#5C7367] border-t border-[#E5E8E1]">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
