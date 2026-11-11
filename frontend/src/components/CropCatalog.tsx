"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { DiseaseClassItem } from "@/types";
import { fetchDiseaseClasses } from "@/services/api";
import { getGuidanceForCondition, DiseaseGuidance } from "@/data/diseaseAdvisory";

export default function CropCatalog() {
  const [classes, setClasses] = useState<DiseaseClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCrop, setSelectedCrop] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<{
    item: DiseaseClassItem;
    guidance: DiseaseGuidance;
  } | null>(null);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDiseaseClasses();
      setClasses(res.classes);
    } catch (err: any) {
      setError(err.message || "Failed to load disease classes from backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const crops = ["all", ...Array.from(new Set(classes.map((c) => c.crop)))];

  const filtered = classes.filter((c) => {
    if (selectedCrop !== "all" && c.crop !== selectedCrop) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.crop.toLowerCase().includes(term) ||
      c.condition.toLowerCase().includes(term) ||
      c.raw_class.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-xs font-semibold text-[#16834A]">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Pathology Atlas</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#174D36] sm:text-3xl">
            Crop Health Library & Atlas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C7367]">
            Browse all 38 plant disease and healthy foliar categories identified by FarmDoctor AI.
          </p>
        </div>

        <button
          onClick={loadClasses}
          className="flex items-center gap-1.5 self-start rounded-xl border border-[#E5E8E1] bg-white px-3 py-2 text-xs font-semibold text-[#5C7367] hover:bg-[#FAFBF9]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Classes</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 rounded-2xl border border-[#E5E8E1] bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#7F9489]" />
          <input
            type="text"
            placeholder="Search by crop, disease name, or scientific tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] py-2 pl-9 pr-4 text-xs text-[#11291F] placeholder-[#7F9489] focus:border-[#16834A] focus:bg-white focus:outline-none"
          />
        </div>

        {/* Crop Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#5C7367] font-medium mr-1">Crop Filter:</span>
          {crops.map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`rounded-xl px-2.5 py-1 capitalize transition text-xs font-semibold ${
                selectedCrop === crop
                  ? "bg-[#16834A] text-white"
                  : "border border-[#E5E8E1] bg-[#FAFBF9] text-[#5C7367] hover:bg-[#E5EFE5] hover:text-[#174D36]"
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      {/* Grid or Loader */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-[#E5E8E1] bg-white text-[#5C7367]">
          <Loader2 className="h-8 w-8 animate-spin text-[#16834A]" />
          <p className="mt-3 text-xs">Loading 38 disease categories from FastAPI backend...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
          <p className="mt-2 font-bold">{error}</p>
          <button
            onClick={loadClasses}
            className="mt-4 rounded-xl bg-[#16834A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#137240]"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const isHealthy = item.is_healthy;
            return (
              <div
                key={item.class_index}
                onClick={() =>
                  setSelectedItem({
                    item,
                    guidance: getGuidanceForCondition(item.condition),
                  })
                }
                className="group cursor-pointer rounded-2xl border border-[#E5E8E1] bg-white p-4 shadow-xs transition hover:border-[#16834A] hover:shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#7F9489]">
                      Class #{item.class_index.toString().padStart(2, "0")}
                    </span>
                    <h2 className="text-sm font-bold text-[#174D36] group-hover:text-[#16834A]">
                      {item.crop}
                    </h2>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isHealthy
                        ? "bg-[#DCFCE7] text-[#15803D]"
                        : "bg-[#FEE2E2] text-[#B91C1C]"
                    }`}
                  >
                    {isHealthy ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <span>{isHealthy ? "Healthy" : "Disease"}</span>
                  </span>
                </div>

                <div className="mt-2 text-xs font-bold text-[#16834A]">
                  {item.condition}
                </div>

                <div className="mt-1 text-[11px] font-mono text-[#7F9489] truncate">
                  Tag: {item.raw_class}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[#F4F6F2] pt-2 text-[11px] font-semibold text-[#5C7367] group-hover:text-[#16834A]">
                  <span>View symptoms & care</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disease Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setSelectedItem(null)}
          />

          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#E5E8E1] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E5E8E1] pb-4">
              <div>
                <span className="rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-[10px] font-bold text-[#16834A]">
                  {selectedItem.item.crop} Pathology Atlas
                </span>
                <h3 className="mt-1 text-lg font-bold text-[#174D36]">
                  {selectedItem.item.condition}
                </h3>
                <p className="text-xs font-mono text-[#7F9489]">
                  {selectedItem.item.raw_class}
                </p>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-lg p-1.5 text-[#7F9489] hover:bg-[#F4F6F2] hover:text-[#174D36]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-[#5C7367]">
              <p className="leading-relaxed">{selectedItem.guidance.description}</p>

              <div>
                <h4 className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                  Identification Symptoms
                </h4>
                <ul className="mt-1.5 space-y-1">
                  {selectedItem.guidance.symptoms.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#16834A] uppercase tracking-wider text-[11px]">
                  Organic & Cultural Controls
                </h4>
                <ul className="mt-1.5 space-y-1">
                  {selectedItem.guidance.organicControls.map((c, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#16834A] font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sky-800 uppercase tracking-wider text-[11px]">
                  Preventive Farming Tips
                </h4>
                <ul className="mt-1.5 space-y-1">
                  {selectedItem.guidance.preventivePractices.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-sky-600 font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <strong>Agronomic Advisory Notice:</strong> {selectedItem.guidance.caution}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
