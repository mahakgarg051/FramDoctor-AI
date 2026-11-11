"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  ScanLine,
  Clock,
  BookOpen,
  Sprout,
  CloudSun,
  Grid2X2,
  Settings,
  X,
  CheckCircle2,
  AlertTriangle,
  Bot,
  CalendarDays,
} from "lucide-react";
import { ActiveTab, HealthResponse } from "@/types";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  scanCount: number;
  health: HealthResponse | null;
}

export default function MobileNav({
  open,
  onClose,
  activeTab,
  onSelectTab,
  scanCount,
  health,
}: MobileNavProps) {
  if (!open) return null;

  const navItems = [
    { id: "overview" as ActiveTab, label: "Overview", icon: Home },
    { id: "scanner" as ActiveTab, label: "Disease Scanner", icon: ScanLine },
    {
      id: "history" as ActiveTab,
      label: "Scan History",
      icon: Clock,
      badge: scanCount > 0 ? `${scanCount}` : undefined,
    },
    { id: "farms" as ActiveTab, label: "My Farms", icon: Grid2X2 },
    { id: "planner" as ActiveTab, label: "Farming Planner", icon: CalendarDays },
    { id: "assistant" as ActiveTab, label: "AI Assistant", icon: Bot },
    { id: "crops" as ActiveTab, label: "Crop Library", icon: BookOpen },
    { id: "advisory" as ActiveTab, label: "Advisory Hub", icon: Sprout },
    { id: "weather" as ActiveTab, label: "Weather", icon: CloudSun },
    { id: "settings" as ActiveTab, label: "Settings", icon: Settings },
  ];


  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative flex w-80 max-w-[85vw] flex-col border-r border-[#E5E8E1] bg-white p-5 shadow-2xl">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E8E1]">
          <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-black text-[#174D36]">FarmDoctor AI</div>
              <div className="text-[10px] text-[#5C7367]">AI for Healthy Crops</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#7F9489] hover:bg-[#F4F6F2] hover:text-[#174D36]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-medium transition ${
                  isActive
                    ? "bg-[#E5EFE5] text-[#174D36] font-bold"
                    : "text-[#5C7367] hover:bg-[#F4F6F2] hover:text-[#174D36]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 shrink-0 ${
                      isActive ? "text-[#16834A]" : "text-[#7F9489]"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-[#16834A] px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Status */}
        <div className="mt-auto pt-4 text-xs text-[#5C7367] border-t border-[#E5E8E1]">
          <div className="flex items-center gap-1.5 font-medium">
            {health?.model_loaded ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-[#16834A]" />
                <span className="text-[#174D36]">AI Inference Online</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-700">Backend Offline</span>
              </>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#7F9489]">
            PyTorch EfficientNet-B0 (38 Classes)
          </div>
        </div>
      </div>
    </div>
  );
}
