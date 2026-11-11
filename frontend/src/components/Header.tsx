"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  MapPin,
  Sun,
  CloudSun,
  Bell,
  Menu,
  X,
  ChevronDown,
  Settings,
  CheckCircle2,
  AlertTriangle,
  User as UserIcon,
  LogOut,
  Mic,
  Home,
  Globe,
  ArrowRight,
  Sprout,
  LayoutDashboard,
} from "lucide-react";
import { HealthResponse, WeatherResponse, ActiveTab, User } from "@/types";

interface HeaderProps {
  health: HealthResponse | null;
  healthLoading: boolean;
  onRefreshHealth: () => void;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  onOpenSettings: () => void;
  weather?: WeatherResponse | null;
  currentLocation: string;
  onChangeLocation: (city: string) => void;
  onOpenLocationModal?: () => void;
  onSearch?: (query: string) => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  alertsCount?: number;
  onOpenAlerts?: () => void;
}

export default function Header({
  health,
  healthLoading,
  onRefreshHealth,
  onOpenSettings,
  mobileMenuOpen,
  setMobileMenuOpen,
  weather,
  currentLocation,
  onChangeLocation,
  onOpenLocationModal,
  onSelectTab,
  currentUser,
  onOpenAuth,
  onLogout,
  alertsCount = 1,
  onOpenAlerts,
}: HeaderProps) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLocation, setTempLocation] = useState(currentLocation);
  const [currentLang, setCurrentLang] = useState<"en" | "hi">("en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const handleOpenLocationModal = () => {
    if (onOpenLocationModal) {
      onOpenLocationModal();
    } else {
      setTempLocation(currentLocation);
      setShowLocationModal(true);
    }
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempLocation.trim()) {
      onChangeLocation(tempLocation.trim());
      setShowLocationModal(false);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Crops", href: "/dashboard?tab=crops" },
    { label: "Advisory", href: "/dashboard?tab=advisory" },
    { label: "About", href: "/#why-choose" },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-[#E5EAE2] bg-white px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-[1536px] items-center justify-between gap-4">

          {/* Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border border-[#E5EAE2] bg-white p-2 text-[#55695E] hover:bg-[#F4F8F4] hover:text-[#174D36] lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E7F4DF] text-[#16803C] transition-transform group-hover:scale-105 shadow-2xs">
                <Sprout className="h-5 w-5 fill-[#16803C]" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-[#17251C] leading-tight">
                  FarmDoctor <span className="text-[#16803C]">AI</span>
                </span>
                <span className="text-[10px] font-medium text-[#55695E]">
                  AI for Healthy Crops
                </span>
              </div>
            </Link>
          </div>

          {/* Center Navigation Links matching reference image */}
          <nav className="hidden items-center gap-1 xl:gap-2 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3.5 py-1.5 text-xs font-bold text-[#17251C] hover:bg-[#F4F9F2] hover:text-[#16803C] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Header Controls matching reference image */}
          <div className="flex items-center gap-2 sm:gap-2.5">

            {/* Language Selector: EN | हिंदी */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-[#FAFAF2] px-3 py-1.5 text-xs font-bold text-[#17251C] hover:bg-white hover:border-[#16803C] transition-all shadow-2xs"
              >
                <Globe className="h-3.5 w-3.5 text-[#16803C]" />
                <span>{currentLang === "en" ? "EN | हिंदी" : "हिंदी | EN"}</span>
                <ChevronDown className="h-3 w-3 text-[#55695E]" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-2xl border border-[#E7F4DF] bg-white p-1.5 shadow-lg z-50">
                  <button
                    onClick={() => {
                      setCurrentLang("en");
                      setLangMenuOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-1.5 text-left text-xs font-semibold ${
                      currentLang === "en" ? "bg-[#E7F4DF] text-[#16803C]" : "hover:bg-[#F5F8F3]"
                    }`}
                  >
                    English (EN)
                  </button>
                  <button
                    onClick={() => {
                      setCurrentLang("hi");
                      setLangMenuOpen(false);
                    }}
                    className={`w-full rounded-xl px-3 py-1.5 text-left text-xs font-semibold ${
                      currentLang === "hi" ? "bg-[#E7F4DF] text-[#16803C]" : "hover:bg-[#F5F8F3]"
                    }`}
                  >
                    हिंदी (Hindi)
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell with Badge */}
            <button
              onClick={onOpenAlerts || (() => onSelectTab("advisory"))}
              className="relative flex h-8 w-8 items-center justify-center rounded-full border border-[#D5E5CE] bg-white text-[#55695E] hover:bg-[#F4F8F4] hover:text-[#174D36] transition-colors shadow-2xs"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute 0 top-0 right-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-600 ring-2 ring-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            </button>

            {/* User Profile Pill matching reference (User icon + Name) */}
            <div className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-3 py-1.5 text-xs font-bold text-[#17251C] shadow-2xs">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7F4DF] text-[#16803C]">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <span className="hidden sm:inline max-w-[110px] truncate">
                {currentUser?.full_name || currentUser?.username || "Mahak Garg"}
              </span>
            </div>

            {/* "Go to Dashboard ->" Button matching reference */}
            <button
              type="button"
              onClick={() => onSelectTab("overview")}
              className="flex items-center gap-1.5 rounded-full bg-[#16803C] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#14532D] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              className="rounded-full border border-[#E5EAE2] bg-white p-2 text-[#55695E] shadow-2xs transition hover:bg-[#F4F8F4] hover:text-[#174D36]"
              title="API Diagnostics & Settings"
              aria-label="Settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>

          </div>

        </div>
      </header>

      {/* Change Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#E5EAE2] bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-[#174D36]">Select Field Location</h3>
            <p className="mt-1 text-xs text-[#55695E]">
              Enter your town or district name to fetch localized weather observations.
            </p>
            <form onSubmit={handleLocationSubmit} className="mt-4">
              <input
                type="text"
                value={tempLocation}
                onChange={(e) => setTempLocation(e.target.value)}
                placeholder="e.g. New Delhi, Pune, Nashik, Ludhiana..."
                autoFocus
                className="w-full rounded-xl border border-[#E5EAE2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#55695E] hover:bg-[#F4F8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#16834A] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#137240]"
                >
                  Update Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
