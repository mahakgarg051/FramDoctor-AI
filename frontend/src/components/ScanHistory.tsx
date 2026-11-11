"use client";

import React, { useState } from "react";
import {
  Clock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight,
  Sparkles,
  Sprout,
  Filter,
} from "lucide-react";
import { ScanRecord, User } from "@/types";

interface ScanHistoryProps {
  records: ScanRecord[];
  onClearHistory: () => void;
  onSelectRecord: (record: ScanRecord) => void;
  onStartNewScan: () => void;
  onDeleteRecord?: (recordId: string) => void;
  currentUser?: User | null;
}

export default function ScanHistory({
  records,
  onClearHistory,
  onSelectRecord,
  onStartNewScan,
  onDeleteRecord,
  currentUser,
}: ScanHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "disease" | "healthy">("all");
  const [selectedCrop, setSelectedCrop] = useState<string>("all");

  const availableCrops = Array.from(
    new Set(records.map((r) => r.topPrediction.crop).filter(Boolean))
  );

  const filtered = records.filter((r) => {
    const isHealthy = r.topPrediction.condition.toLowerCase().includes("healthy");
    if (filterType === "disease" && isHealthy) return false;
    if (filterType === "healthy" && !isHealthy) return false;

    if (selectedCrop !== "all" && r.topPrediction.crop.toLowerCase() !== selectedCrop.toLowerCase()) {
      return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.topPrediction.crop.toLowerCase().includes(term) ||
      r.topPrediction.condition.toLowerCase().includes(term) ||
      r.filename.toLowerCase().includes(term) ||
      (r.farm_name && r.farm_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Title & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-xs font-semibold text-[#16834A]">
            <Clock className="h-3.5 w-3.5" />
            <span>Inspection Archives</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#174D36] sm:text-3xl">
            Persistent Diagnostic History
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C7367]">
            {currentUser
              ? `Diagnostic scans saved in SQLite database for @${currentUser.username}.`
              : "Locally saved leaf inspections, confidence scores, and historical advisory records."}
          </p>
        </div>

        {records.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
            <button
              onClick={onStartNewScan}
              className="flex items-center gap-1.5 rounded-xl bg-[#16834A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] transition"
            >
              <span>+ New Scan</span>
            </button>
          </div>
        )}
      </div>

      {records.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#C5D7C5] bg-[#F6FAF6] p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A] shadow-xs">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="mt-3 text-base font-bold text-[#174D36]">No Diagnostic Scans Saved Yet</h2>
          <p className="mt-1 max-w-sm text-xs text-[#5C7367] leading-relaxed">
            Scan your first crop leaf using the Quick Scan or Disease Scanner. Successful inspections are saved to your account with full diagnostic breakdown and agronomic advice.
          </p>
          <button
            onClick={onStartNewScan}
            className="mt-5 flex items-center gap-2 rounded-xl bg-[#16834A] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] transition"
          >
            <Sparkles className="h-4 w-4" />
            <span>Open Leaf Scanner</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-[#E5EAE2] bg-white p-3 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#78887E]" />
              <input
                type="text"
                placeholder="Search by crop, disease, farm name, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-[#E5EAE2] bg-[#F8F8F2] py-2 pl-9 pr-4 text-xs text-[#142F28] placeholder-[#78887E] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
            </div>

            {/* Filter Buttons & Crop Selector */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {availableCrops.length > 0 && (
                <div className="flex items-center gap-1 rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-2.5 py-1.5">
                  <Filter className="h-3 w-3 text-[#78887E]" />
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-[#142F28] focus:outline-none"
                  >
                    <option value="all">All Crops</option>
                    {availableCrops.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilterType("all")}
                  className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                    filterType === "all"
                      ? "bg-[#16834A] text-white"
                      : "bg-[#FAFBF9] text-[#5C7367] border border-[#E5EAE2] hover:bg-[#F4F8F4]"
                  }`}
                >
                  All ({records.length})
                </button>
                <button
                  onClick={() => setFilterType("disease")}
                  className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                    filterType === "disease"
                      ? "bg-rose-600 text-white"
                      : "bg-[#FAFBF9] text-[#5C7367] border border-[#E5EAE2] hover:bg-[#F4F8F4]"
                  }`}
                >
                  Diseases
                </button>
                <button
                  onClick={() => setFilterType("healthy")}
                  className={`rounded-xl px-3 py-1.5 font-semibold transition ${
                    filterType === "healthy"
                      ? "bg-[#16834A] text-white"
                      : "bg-[#FAFBF9] text-[#5C7367] border border-[#E5EAE2] hover:bg-[#F4F8F4]"
                  }`}
                >
                  Healthy
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((rec) => {
              const top = rec.topPrediction;
              const isHealthy = top.condition.toLowerCase().includes("healthy");
              return (
                <div
                  key={rec.id}
                  className="group relative overflow-hidden rounded-[22px] border border-[#E5EAE2] bg-white p-4 shadow-xs transition hover:border-[#16834A] hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-3.5">
                      {/* Thumbnail */}
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E5EAE2] bg-[#F4F6F2]">
                        <img
                          src={rec.imagePreviewUrl || "/images/crops/tomato.jpg"}
                          alt={top.condition}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
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
                            <span>{isHealthy ? "Healthy" : "Infection"}</span>
                          </span>

                          {onDeleteRecord && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this scan record?")) {
                                  onDeleteRecord(rec.id);
                                }
                              }}
                              className="rounded-lg p-1 text-[#78887E] hover:bg-rose-50 hover:text-rose-600"
                              title="Delete Scan"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <h2 className="mt-1 truncate text-xs font-bold text-[#174D36]">
                          {top.crop}
                        </h2>
                        <p className="truncate text-[11px] font-semibold text-[#16834A]">
                          {top.condition}
                        </p>

                        <div className="mt-1 text-[10px] text-[#5C7367]">
                          Confidence: <strong>{top.confidence_percentage.toFixed(1)}%</strong>
                        </div>

                        {rec.farm_name && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#174D36]">
                            <Sprout className="h-2.5 w-2.5 text-[#16834A]" />
                            <span className="truncate">Plot: {rec.farm_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-3 pt-2.5 border-t border-[#F0F4EF] flex items-center justify-between">
                    <span className="text-[10px] text-[#78887E]">
                      {new Date(rec.timestamp).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => onSelectRecord(rec)}
                      className="flex items-center gap-1 text-xs font-bold text-[#16834A] hover:text-[#174D36]"
                    >
                      <span>View Full Diagnostic</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
