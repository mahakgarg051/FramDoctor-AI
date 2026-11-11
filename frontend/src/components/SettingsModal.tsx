"use client";

import React, { useState } from "react";
import {
  X,
  Settings,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Cpu,
} from "lucide-react";
import { HealthResponse } from "@/types";
import { getApiBaseUrl, setApiBaseUrl, fetchHealth } from "@/services/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: HealthResponse | null;
  onRefreshHealth: () => void;
  onClearHistory: () => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  health,
  onRefreshHealth,
  onClearHistory,
}: SettingsModalProps) {
  const [apiUrl, setApiUrlState] = useState(getApiBaseUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    setTesting(true);
    setTestResult(null);
    setApiBaseUrl(apiUrl);

    try {
      const data = await fetchHealth();
      setIsSuccess(true);
      setTestResult(
        `Connection Successful! Model: ${data.model_name} (${data.num_classes} classes, ${data.device} mode)`
      );
      onRefreshHealth();
    } catch (err: any) {
      setIsSuccess(false);
      setTestResult(err.message || "Failed to reach backend endpoint.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-[#E5E8E1] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5E8E1] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174D36]">System Diagnostics & API Settings</h2>
              <p className="text-xs text-[#5C7367]">Configure connection to local or remote FastAPI server</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#7F9489] hover:bg-[#F4F6F2] hover:text-[#174D36]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4 text-xs">
          {/* API URL Config */}
          <div>
            <label className="block font-semibold text-[#174D36]">
              FastAPI Backend Endpoint URL
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrlState(e.target.value)}
                placeholder="http://127.0.0.1:8000"
                className="flex-1 rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] px-3.5 py-2 font-mono text-[#11291F] placeholder-[#7F9489] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
              <button
                onClick={handleSaveAndTest}
                disabled={testing}
                className="flex items-center gap-1.5 rounded-xl bg-[#16834A] px-4 py-2 font-semibold text-white shadow-xs hover:bg-[#137240] disabled:opacity-50"
              >
                {testing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Server className="h-3.5 w-3.5" />
                )}
                <span>Test & Save</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-[#7F9489]">
              Default local address is <code className="text-[#16834A] font-bold">http://127.0.0.1:8000</code>.
            </p>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 ${
                isSuccess
                  ? "border border-[#D1E7D1] bg-[#E5EFE5] text-[#174D36]"
                  : "border border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16834A] mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-tight">{testResult}</span>
            </div>
          )}

          {/* Model Status Specs */}
          <div className="rounded-2xl border border-[#E5E8E1] bg-[#FAFBF9] p-4">
            <div className="font-bold text-[#174D36] flex items-center gap-1.5 text-xs">
              <Cpu className="h-3.5 w-3.5 text-[#16834A]" />
              <span>Active Inference Server Specs</span>
            </div>
            <div className="mt-3 space-y-1.5 text-[#5C7367]">
              <div className="flex justify-between">
                <span>Model Architecture:</span>
                <span className="font-semibold text-[#174D36]">
                  {health?.model_name || "EfficientNet-B0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Checkpoint:</span>
                <span className="font-mono text-[#5C7367] truncate max-w-[220px]">
                  {health?.checkpoint_path || "models/farmdoctor_efficientnet_b0.pth"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Class Definitions:</span>
                <span className="font-medium text-[#174D36]">{health?.num_classes || 38} Categories</span>
              </div>
              <div className="flex justify-between">
                <span>Execution Hardware:</span>
                <span className="font-semibold text-[#16834A] uppercase">
                  {health?.device || "cpu"}
                </span>
              </div>
            </div>
          </div>

          {/* Reset Storage */}
          <div className="border-t border-[#E5E8E1] pt-4 flex items-center justify-between">
            <div>
              <div className="font-semibold text-[#174D36]">Clear Local Scan Records</div>
              <div className="text-[11px] text-[#7F9489]">
                Removes all cached inspection history from this browser.
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear your local scan history?")) {
                  onClearHistory();
                  alert("Local scan history cleared.");
                }
              }}
              className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
