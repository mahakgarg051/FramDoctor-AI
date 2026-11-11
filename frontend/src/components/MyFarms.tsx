"use client";

import React, { useState, useEffect } from "react";
import {
  Grid2X2,
  Plus,
  Sprout,
  ScanLine,
  MapPin,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X,
  Edit2,
  Trash2,
  FileText,
  Loader2,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Droplets,
  BookOpen,
} from "lucide-react";
import { ActiveTab, Farm, CreateFarmInput, UpdateFarmInput, PersonalizedActionPlan, User } from "@/types";
import {
  fetchMyFarms,
  createFarmPlot,
  updateFarmPlot,
  deleteFarmPlot,
  fetchFarmActionPlan,
} from "@/services/api";

interface MyFarmsProps {
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
}

const GROWTH_STAGES = [
  "Seedling",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Harvest",
];

const POPULAR_CROPS = [
  "Tomato",
  "Potato",
  "Corn",
  "Apple",
  "Grape",
  "Pepper",
  "Eggplant",
  "Wheat",
  "Rice",
  "Cotton",
];

export default function MyFarms({ onSelectTab, currentUser, onOpenAuth }: MyFarmsProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFarm, setEditingFarm] = useState<Farm | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Action plan modal state
  const [activeActionPlan, setActiveActionPlan] = useState<PersonalizedActionPlan | null>(null);
  const [actionPlanLoading, setActionPlanLoading] = useState(false);
  const [actionPlanError, setActionPlanError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [cropName, setCropName] = useState("Tomato");
  const [cropVariety, setCropVariety] = useState("");
  const [sowingDate, setSowingDate] = useState("");
  const [growthStage, setGrowthStage] = useState("Vegetative");
  const [soilType, setSoilType] = useState("");
  const [irrigationNotes, setIrrigationNotes] = useState("");
  const [areaAcres, setAreaAcres] = useState("2.5");

  const loadFarms = async () => {
    if (!currentUser) {
      setFarms([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyFarms();
      setFarms(data);
    } catch (err: any) {
      setError(err.message || "Failed to load farms from database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, [currentUser]);

  const handleOpenAdd = () => {
    setEditingFarm(null);
    setName("");
    setLocation("");
    setCropName("Tomato");
    setCropVariety("");
    setSowingDate(new Date().toISOString().split("T")[0]);
    setGrowthStage("Vegetative");
    setSoilType("Loamy Soil");
    setIrrigationNotes("Drip irrigation");
    setAreaAcres("2.5");
    setShowAddModal(true);
  };

  const handleOpenEdit = (farm: Farm) => {
    setEditingFarm(farm);
    setName(farm.name);
    setLocation(farm.location);
    setCropName(farm.crop_name);
    setCropVariety(farm.crop_variety || "");
    setSowingDate(farm.sowing_date || "");
    setGrowthStage(farm.growth_stage);
    setSoilType(farm.soil_type || "");
    setIrrigationNotes(farm.irrigation_notes || "");
    setAreaAcres(farm.area_acres.toString());
    setShowAddModal(true);
  };

  const handleSaveFarm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !cropName.trim()) return;

    setSubmitting(true);
    try {
      if (editingFarm) {
        const updateData: UpdateFarmInput = {
          name: name.trim(),
          location: location.trim(),
          crop_name: cropName.trim(),
          crop_variety: cropVariety.trim() || undefined,
          sowing_date: sowingDate.trim() || undefined,
          growth_stage: growthStage,
          soil_type: soilType.trim() || undefined,
          irrigation_notes: irrigationNotes.trim() || undefined,
          area_acres: parseFloat(areaAcres) || 1.0,
        };
        await updateFarmPlot(editingFarm.id, updateData);
      } else {
        const createData: CreateFarmInput = {
          name: name.trim(),
          location: location.trim(),
          crop_name: cropName.trim(),
          crop_variety: cropVariety.trim() || undefined,
          sowing_date: sowingDate.trim() || undefined,
          growth_stage: growthStage,
          soil_type: soilType.trim() || undefined,
          irrigation_notes: irrigationNotes.trim() || undefined,
          area_acres: parseFloat(areaAcres) || 1.0,
        };
        await createFarmPlot(createData);
      }
      setShowAddModal(false);
      loadFarms();
    } catch (err: any) {
      alert(err.message || "Failed to save farm plot.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (farm: Farm) => {
    if (!confirm(`Are you sure you want to delete '${farm.name}'?`)) return;
    try {
      await deleteFarmPlot(farm.id);
      loadFarms();
    } catch (err: any) {
      alert(err.message || "Failed to delete farm plot.");
    }
  };

  const handleViewActionPlan = async (farm: Farm) => {
    setActionPlanLoading(true);
    setActionPlanError(null);
    try {
      const plan = await fetchFarmActionPlan(farm.id);
      setActiveActionPlan(plan);
    } catch (err: any) {
      setActionPlanError(err.message || "Could not generate crop action plan.");
    } finally {
      setActionPlanLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-xs font-semibold text-[#16834A]">
            <Grid2X2 className="h-3.5 w-3.5" />
            <span>Farm Management System</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#174D36] sm:text-3xl">
            My Farm Plots
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C7367]">
            Record your crop plots, growth stages, soil notes, and generate personalized crop-care plans.
          </p>
        </div>

        {currentUser ? (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-[#16834A] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#137240]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Farm Plot</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 rounded-xl bg-[#174D36] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#123E2B]"
          >
            <span>Sign In to Manage Farms</span>
          </button>
        )}
      </div>

      {/* Unauthenticated Alert */}
      {!currentUser && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold">Authentication Required for Persistent Farm Storage</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Farm plots and historical scan ownership are secured per farmer account in SQLite. Sign in or create a free profile to save your plots and receive personalized action plans.
              </p>
              <button
                onClick={onOpenAuth}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#16834A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#137240]"
              >
                <span>Sign In / Create Account</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error */}
      {loading && (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-[#E5EAE2] bg-white p-6">
          <div className="flex items-center gap-2 text-xs font-medium text-[#55695E]">
            <Loader2 className="h-4 w-4 animate-spin text-[#16834A]" />
            <span>Loading farm plots from database...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Farm Plots Grid */}
      {currentUser && !loading && (
        <>
          {farms.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#C5D7C5] bg-[#F6FAF6] p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A] shadow-xs">
                <Sprout className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-base font-bold text-[#142F28]">No Farm Plots Saved Yet</h3>
              <p className="mt-1 max-w-sm text-xs text-[#55695E] leading-relaxed">
                Add your field details (crop, variety, sowing date, and growth stage) to unlock tailored crop-care action plans and link your diagnostic leaf scans.
              </p>
              <button
                onClick={handleOpenAdd}
                className="mt-4 flex items-center gap-2 rounded-xl bg-[#16834A] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Farm</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {farms.map((farm) => (
                <div
                  key={farm.id}
                  className="rounded-[22px] border border-[#E5EAE2] bg-white p-5 shadow-xs flex flex-col justify-between transition hover:shadow-md"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#F0F4EF]">
                      <div>
                        <span className="rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-[10px] font-bold text-[#16834A]">
                          {farm.crop_name} {farm.crop_variety ? `(${farm.crop_variety})` : ""}
                        </span>
                        <h3 className="mt-1.5 text-sm font-bold text-[#142F28]">{farm.name}</h3>
                        <div className="flex items-center gap-1 text-[11px] text-[#68756B] mt-0.5">
                          <MapPin className="h-3 w-3 text-[#16834A]" />
                          <span>{farm.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(farm)}
                          className="rounded-lg p-1.5 text-[#55695E] hover:bg-[#E5EFE5] hover:text-[#174D36]"
                          title="Edit Farm"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(farm)}
                          className="rounded-lg p-1.5 text-[#55695E] hover:bg-rose-50 hover:text-rose-600"
                          title="Delete Farm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                      <div className="rounded-xl bg-[#FAFBF9] border border-[#E5EAE2] p-2.5">
                        <span className="text-[10px] text-[#78887E]">Growth Stage</span>
                        <div className="font-bold text-[#174D36] mt-0.5">{farm.growth_stage}</div>
                      </div>
                      <div className="rounded-xl bg-[#FAFBF9] border border-[#E5EAE2] p-2.5">
                        <span className="text-[10px] text-[#78887E]">Plot Size</span>
                        <div className="font-bold text-[#174D36] mt-0.5">{farm.area_acres} Acres</div>
                      </div>
                    </div>

                    {/* Soil & Irrigation */}
                    <div className="space-y-1.5 text-[11px] text-[#55695E]">
                      {farm.sowing_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-[#78887E]" />
                          <span>Sown: {farm.sowing_date}</span>
                        </div>
                      )}
                      {farm.soil_type && (
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-[#78887E]" />
                          <span>Soil: {farm.soil_type}</span>
                        </div>
                      )}
                      {farm.irrigation_notes && (
                        <div className="flex items-center gap-1.5">
                          <Droplets className="h-3 w-3 text-[#78887E]" />
                          <span>Water: {farm.irrigation_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-[#F0F4EF] space-y-2">
                    <button
                      onClick={() => handleViewActionPlan(farm)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#E5EFE5] py-2 text-xs font-bold text-[#174D36] transition hover:bg-[#D5E6D5]"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#16834A]" />
                      <span>Personalized Action Plan</span>
                    </button>
                    <button
                      onClick={() => onSelectTab("scanner")}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E5EAE2] bg-white py-1.5 text-xs font-semibold text-[#55695E] hover:bg-[#FAFBF9] transition"
                    >
                      <ScanLine className="h-3.5 w-3.5" />
                      <span>Scan Leaf for this Plot</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add / Edit Farm Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] border border-[#E5EAE2] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5EAE2] bg-[#F8F8F2] px-6 py-4">
              <h3 className="text-sm font-bold text-[#174D36]">
                {editingFarm ? "Edit Farm Plot" : "Add New Farm Plot"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-xl p-1 text-[#68756B] hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFarm} className="p-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Plot / Farm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. North Ridge Tomato Block"
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Location / Village <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Pune, Maharashtra"
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Crop Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  >
                    {POPULAR_CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Crop Variety / Hybrid
                  </label>
                  <input
                    type="text"
                    value={cropVariety}
                    onChange={(e) => setCropVariety(e.target.value)}
                    placeholder="e.g. Roma VF, Kufri Jyoti"
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Growth Stage
                  </label>
                  <select
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value)}
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  >
                    {GROWTH_STAGES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Sowing Date
                  </label>
                  <input
                    type="date"
                    value={sowingDate}
                    onChange={(e) => setSowingDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Area (Acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={areaAcres}
                    onChange={(e) => setAreaAcres(e.target.value)}
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Soil Type & Notes
                  </label>
                  <input
                    type="text"
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    placeholder="e.g. Sandy loam, pH 6.5"
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#142F28] mb-1">
                    Irrigation Method
                  </label>
                  <input
                    type="text"
                    value={irrigationNotes}
                    onChange={(e) => setIrrigationNotes(e.target.value)}
                    placeholder="e.g. Drip lines, furrow"
                    className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#F0F4EF]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[#55695E] hover:bg-[#F4F8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-[#16834A] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#137240] disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingFarm ? "Update Plot" : "Save Plot"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Personalized Action Plan Drawer / Modal */}
      {activeActionPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-[#E5EAE2] bg-white shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5EAE2] bg-[#F8F8F2] px-6 py-4">
              <div>
                <span className="rounded-md bg-[#E5EFE5] px-2 py-0.5 text-[10px] font-bold text-[#16834A]">
                  AI Crop-Care Action Plan
                </span>
                <h3 className="text-base font-bold text-[#174D36] mt-1">
                  {activeActionPlan.farm_name} • {activeActionPlan.crop_name} ({activeActionPlan.growth_stage})
                </h3>
              </div>
              <button
                onClick={() => setActiveActionPlan(null)}
                className="rounded-xl p-1.5 text-[#68756B] hover:bg-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Health & Weather Banner */}
              <div className="rounded-xl border border-[#D5E6D5] bg-[#E5EFE5]/50 p-3.5 space-y-1 text-xs">
                <div className="font-bold text-[#174D36]">Field Diagnostic Status:</div>
                <div className="text-[#55695E]">{activeActionPlan.recent_health_status}</div>
                {activeActionPlan.weather_summary && (
                  <div className="text-[11px] text-[#16834A] pt-1">
                    🌤️ Live Weather: {activeActionPlan.weather_summary}
                  </div>
                )}
              </div>

              {/* What to Inspect Next */}
              <div>
                <h4 className="text-xs font-bold text-[#142F28] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ScanLine className="h-3.5 w-3.5 text-[#16834A]" />
                  <span>What to Inspect Next</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-[#55695E]">
                  {activeActionPlan.what_to_inspect_next.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 rounded-lg bg-[#FAFBF9] border border-[#E5EAE2] p-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E5EFE5] text-[10px] font-bold text-[#16834A]">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prevention Practices */}
              <div>
                <h4 className="text-xs font-bold text-[#142F28] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#16834A]" />
                  <span>General Prevention Practices</span>
                </h4>
                <ul className="space-y-1 text-xs text-[#55695E]">
                  {activeActionPlan.general_prevention_practices.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#16834A] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Follow-up Observations */}
              <div>
                <h4 className="text-xs font-bold text-[#142F28] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#16834A]" />
                  <span>Suggested Follow-Up Observations</span>
                </h4>
                <ul className="space-y-1 text-xs text-[#55695E]">
                  {activeActionPlan.suggested_follow_up_observations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16834A] shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* When to Seek Expert */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
                <h4 className="text-xs font-bold text-rose-900 mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                  <span>When to Seek Agricultural Expert / KVK Advice</span>
                </h4>
                <ul className="space-y-1 text-xs text-rose-800">
                  {activeActionPlan.when_to_seek_expert.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </div>

              {/* Citations */}
              <div>
                <h4 className="text-[11px] font-bold text-[#78887E] uppercase tracking-wider mb-1.5">
                  Scientific Sources & University Extensions
                </h4>
                <div className="flex flex-wrap gap-2">
                  {activeActionPlan.relevant_sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#E5EAE2] bg-[#FAFBF9] px-2.5 py-1 text-[11px] text-[#16834A] hover:underline"
                    >
                      <span>{src.publisher}: {src.source_name}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-[#78887E] italic border-t border-[#F0F4EF] pt-2">
                {activeActionPlan.uncertainty_warning}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
