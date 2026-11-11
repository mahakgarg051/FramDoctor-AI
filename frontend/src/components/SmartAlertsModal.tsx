"use client";

import React, { useState } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  Info,
  Calendar,
  CloudSun,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sprout,
} from "lucide-react";
import { CropAlert, ActiveTab } from "@/types";
import { dismissSmartAlert } from "@/services/api";

interface SmartAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: CropAlert[];
  onAlertDismissed: (alertId: string) => void;
  onSelectTab: (tab: ActiveTab) => void;
}

export default function SmartAlertsModal({
  isOpen,
  onClose,
  alerts,
  onAlertDismissed,
  onSelectTab,
}: SmartAlertsModalProps) {
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDismiss = async (alertId: string) => {
    setDismissingId(alertId);
    try {
      await dismissSmartAlert(alertId);
      onAlertDismissed(alertId);
    } catch (e) {
      // Still dismiss from UI state
      onAlertDismissed(alertId);
    } finally {
      setDismissingId(null);
    }
  };

  const handleActionClick = (alert: CropAlert) => {
    if (alert.action_tab) {
      onSelectTab(alert.action_tab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-3xl border border-[#E5EAE2] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAE2] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#174D36]">Smart Crop Alerts</h2>
                <span className="rounded-full bg-[#E5EFE5] px-2 py-0.5 text-xs font-bold text-[#16834A]">
                  {alerts.length} Active
                </span>
              </div>
              <p className="text-xs text-[#55695E]">
                Evidence-grounded notifications from farm planner, disease scans, and microclimate.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#55695E] hover:bg-[#F4F8F4] hover:text-[#174D36]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Alerts Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A]">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#174D36]">No Active Crop Alerts</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[#55695E]">
                All field tasks are on schedule and no critical microclimate risks are active for your plots.
              </p>
            </div>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.severity === "critical";
              const isWarning = alert.severity === "warning";

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 shadow-xs transition ${
                    isCritical
                      ? "border-rose-200 bg-rose-50/50"
                      : isWarning
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-blue-200 bg-blue-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isCritical
                            ? "bg-rose-600 text-white"
                            : isWarning
                            ? "bg-amber-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="rounded-md border border-[#D5DDD2] bg-white px-2 py-0.5 text-[10px] font-medium text-[#55695E]">
                        {alert.evidence_source}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDismiss(alert.id)}
                      disabled={dismissingId === alert.id}
                      className="rounded-lg p-1 text-[#7A8E81] hover:bg-white hover:text-rose-600 transition"
                      title="Dismiss alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <h4 className="mt-2 text-sm font-bold text-[#174D36]">
                    {alert.title}
                  </h4>

                  <p className="mt-1 text-xs text-[#55695E] leading-relaxed">
                    {alert.message}
                  </p>

                  {/* Weather Risk Notice */}
                  {alert.is_weather_risk_indicator && (
                    <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-amber-100/60 p-2.5 text-[11px] font-medium text-amber-900">
                      <span className="font-bold">Notice: </span>
                      {alert.disclaimer}
                    </div>
                  )}

                  {/* Metadata and Action Button */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-[#7A8E81]">
                      {alert.farm_name && (
                        <span className="flex items-center gap-1 font-semibold text-[#174D36]">
                          <Sprout className="h-3 w-3 text-[#16834A]" />
                          {alert.farm_name}
                        </span>
                      )}
                      {alert.crop && <span>• Crop: {alert.crop}</span>}
                    </div>

                    {alert.action_tab && (
                      <button
                        onClick={() => handleActionClick(alert)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:underline"
                      >
                        <span>Take Action in {alert.action_tab}</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5EAE2] bg-[#F4F8F4] px-6 py-3 rounded-b-3xl text-right">
          <button
            onClick={onClose}
            className="rounded-xl bg-[#174D36] px-5 py-2 text-xs font-semibold text-white hover:bg-[#137240] transition"
          >
            Close Alerts
          </button>
        </div>
      </div>
    </div>
  );
}
