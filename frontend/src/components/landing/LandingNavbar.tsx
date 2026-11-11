"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sprout,
  Globe,
  User as UserIcon,
  ArrowRight,
  Menu,
  X,
  LayoutDashboard,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Language, translations } from "./translations";
import { User } from "@/types";

interface LandingNavbarProps {
  currentLang: Language;
  onToggleLang: (lang: Language) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  activeSection: string;
}

export default function LandingNavbar({
  currentLang,
  onToggleLang,
  currentUser,
  onOpenAuth,
  onLogout,
  activeSection,
}: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const t = translations[currentLang];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { id: "hero", label: t.nav.home, href: "#hero" },
    { id: "features-strip", label: t.nav.features, href: "#features" },
    { id: "how-it-works", label: t.nav.howItWorks, href: "#how-it-works" },
    { id: "crops", label: t.nav.crops, href: "#disease-showcase" },
    { id: "advisory", label: t.nav.advisory, href: "#features" },
    { id: "why-choose", label: t.nav.about, href: "#why-choose" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled
          ? "bg-white/95 shadow-sm backdrop-blur-md border-b border-[#E7F4DF]"
          : "bg-white border-b border-[#F0F4EC]"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo matching reference */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] transition-transform duration-300 group-hover:scale-105 shadow-xs">
            <Sprout className="h-6 w-6 fill-[#16803C]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-[#17251C]">
              FarmDoctor <span className="text-[#16803C]">AI</span>
            </span>
            <span className="text-[11px] font-medium text-[#55695E] -mt-0.5">
              {t.logoSubtitle}
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Pill Items */}
        <nav className="hidden items-center gap-1.5 md:flex">
          {navLinks.map((item) => {
            const isActive = activeSection === item.id || (item.id === "hero" && activeSection === "");
            return (
              <a
                key={item.id}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-[#E7F4DF] text-[#16803C] shadow-xs"
                    : "text-[#17251C] hover:bg-[#F2F7EE] hover:text-[#16803C]"
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Right Header Actions */}
        <div className="hidden items-center gap-3 sm:flex">
          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-[#FAFAF2] px-3.5 py-1.5 text-xs font-semibold text-[#17251C] hover:border-[#16803C] hover:bg-white transition-all shadow-xs"
              title="Select Language"
            >
              <Globe className="h-3.5 w-3.5 text-[#16803C]" />
              <span>{currentLang === "en" ? "EN | हिंदी" : "हिंदी | EN"}</span>
              <ChevronDown className="h-3 w-3 text-[#55695E]" />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-2xl border border-[#E7F4DF] bg-white p-1.5 shadow-lg z-50">
                <button
                  onClick={() => {
                    onToggleLang("en");
                    setLangMenuOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    currentLang === "en"
                      ? "bg-[#E7F4DF] font-bold text-[#16803C]"
                      : "text-[#17251C] hover:bg-[#F5F8F3]"
                  }`}
                >
                  English (EN)
                </button>
                <button
                  onClick={() => {
                    onToggleLang("hi");
                    setLangMenuOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    currentLang === "hi"
                      ? "bg-[#E7F4DF] font-bold text-[#16803C]"
                      : "text-[#17251C] hover:bg-[#F5F8F3]"
                  }`}
                >
                  हिंदी (Hindi)
                </button>
              </div>
            )}
          </div>

          {/* User Sign In / Profile Button */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-full border border-[#16803C] bg-[#E7F4DF] px-4 py-1.5 text-xs font-bold text-[#14532D] hover:bg-[#d8edd0] transition-colors"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-[#16803C]" />
                <span>{currentUser.full_name || currentUser.username}</span>
              </Link>
              <button
                onClick={onLogout}
                className="rounded-full p-2 text-[#55695E] hover:bg-[#FAFAF2] hover:text-red-600 transition-colors"
                title="Log Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-full border border-[#C8DAC0] bg-white px-4 py-1.5 text-xs font-semibold text-[#17251C] hover:border-[#16803C] hover:text-[#16803C] hover:bg-[#F9FCF8] transition-all shadow-xs"
            >
              <UserIcon className="h-3.5 w-3.5 text-[#55695E]" />
              <span>{t.nav.signIn}</span>
            </button>
          )}

          {/* Get Started / Dashboard CTA Pill Button */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full bg-[#16803C] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#14532D] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{currentUser ? t.nav.dashboard : t.nav.getStarted}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={() => onToggleLang(currentLang === "en" ? "hi" : "en")}
            className="rounded-full border border-[#D5E5CE] bg-[#FAFAF2] px-2.5 py-1 text-[11px] font-bold text-[#16803C]"
          >
            {currentLang === "en" ? "हिंदी" : "EN"}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-[#D5E5CE] p-2 text-[#17251C] hover:bg-[#E7F4DF]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-[#E7F4DF] bg-white px-5 py-4 shadow-xl md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[#17251C] hover:bg-[#E7F4DF] hover:text-[#16803C]"
              >
                {item.label}
              </a>
            ))}

            <div className="my-2 border-t border-[#E7F4DF]" />

            <div className="flex flex-col gap-2">
              {currentUser ? (
                <>
                  <div className="text-xs text-[#55695E] px-2">
                    Signed in as <strong>{currentUser.full_name || currentUser.username}</strong>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#16803C] py-2.5 text-xs font-bold text-white shadow-xs"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{t.nav.dashboard}</span>
                  </Link>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-red-200 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onOpenAuth();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-[#C8DAC0] py-2.5 text-xs font-bold text-[#17251C]"
                  >
                    <UserIcon className="h-4 w-4 text-[#55695E]" />
                    <span>{t.nav.signIn}</span>
                  </button>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#16803C] py-2.5 text-xs font-bold text-white shadow-xs"
                  >
                    <span>{t.nav.getStarted}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
