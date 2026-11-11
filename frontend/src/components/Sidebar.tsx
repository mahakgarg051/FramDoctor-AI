"use client";

import React from "react";
import Image from "next/image";
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
  ShieldAlert,
  Bot,
  CalendarDays,
} from "lucide-react";
import { ActiveTab, HealthResponse } from "@/types";

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  scanCount: number;
  health: HealthResponse | null;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  scanCount,
}: SidebarProps) {
  const navItems = [
    {
      id: "overview" as ActiveTab,
      label: "Overview",
      icon: Home,
    },
    {
      id: "scanner" as ActiveTab,
      label: "Disease Scanner",
      icon: ScanLine,
    },
    {
      id: "history" as ActiveTab,
      label: "Scan History",
      icon: Clock,
      badge: scanCount > 0 ? `${scanCount}` : undefined,
    },
    {
      id: "farms" as ActiveTab,
      label: "My Farms",
      icon: Grid2X2,
    },
    {
      id: "planner" as ActiveTab,
      label: "Farming Planner",
      icon: CalendarDays,
    },
    {
      id: "assistant" as ActiveTab,
      label: "AI Assistant",
      icon: Bot,
      badge: "AI",
    },
    {
      id: "crops" as ActiveTab,

      label: "Crop Library",
      icon: BookOpen,
    },
    {
      id: "advisory" as ActiveTab,
      label: "Advisory Hub",
      icon: Sprout,
    },
    {
      id: "weather" as ActiveTab,
      label: "Weather",
      icon: CloudSun,
    },
    {
      id: "settings" as ActiveTab,
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden w-[245px] shrink-0 flex-col border-r border-[#E5EAE2] bg-white px-4 py-5 lg:flex">
      {/* Brand Logo & Tagline */}
      <Link href="/" className="flex items-center gap-3 px-2 pb-6 group" title="Return to Home Landing Page">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A] group-hover:bg-[#16803C] group-hover:text-white transition-all">
          <Sprout className="h-6 w-6" />
        </div>
        <div>
          <div className="text-base font-extrabold tracking-tight text-[#174D36] group-hover:text-[#16803C] transition-colors">
            FarmDoctor AI
          </div>
          <div className="text-[10.5px] font-medium text-[#68756B]">
            AI for Healthy Crops
          </div>
        </div>
      </Link>

      {/* Navigation Links */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                isActive
                  ? "bg-[#16834A] text-white shadow-sm font-bold"
                  : "text-[#55695E] hover:bg-[#F4F8F4] hover:text-[#174D36]"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 ${
                    isActive ? "text-white" : "text-[#78887E]"
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    isActive
                      ? "bg-white text-[#16834A]"
                      : "bg-[#E5EFE5] text-[#16834A]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Sidebar Agricultural Promo Card matching reference image */}
      <div className="mt-auto pt-4">
        <div className="relative overflow-hidden rounded-2xl border border-[#D8E6D6] bg-gradient-to-b from-[#EBF5EA] to-[#DCEBD9] p-3.5 shadow-xs">
          <div className="relative z-10">
            <h4 className="text-sm font-extrabold text-[#17251C] leading-snug">
              Smart<br />
              Farming with AI
            </h4>
            <p className="mt-1 text-[11px] font-medium text-[#55695E]">
              Healthier Crops,<br />
              Higher Yields
            </p>
          </div>

          {/* Background Illustration */}
          <div className="mt-3 relative h-20 w-full overflow-hidden rounded-xl border border-white/60 shadow-2xs">
            <Image
              src="/images/scanner/scanner_banner_bg.jpg"
              alt="Farm crop field"
              fill
              className="object-cover"
            />
          </div>
        </div>

        {/* Disclaimer Note */}
        <div className="mt-2.5 flex items-center gap-1.5 px-2 text-[10px] text-[#78887E]">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#16834A]" />
          <span>Decision support screening tool</span>
        </div>
      </div>
    </aside>
  );
}
