"use client";

import React, { useState, useEffect } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import FeatureHighlightStrip from "@/components/landing/FeatureHighlightStrip";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import KeyFeaturesSection from "@/components/landing/KeyFeaturesSection";
import DiseaseShowcaseSection from "@/components/landing/DiseaseShowcaseSection";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import CtaBanner from "@/components/landing/CtaBanner";
import LandingFooter from "@/components/landing/LandingFooter";
import LiveScannerModal from "@/components/landing/LiveScannerModal";
import AuthModal from "@/components/AuthModal";

import { User, HealthResponse, ScanRecord } from "@/types";
import {
  fetchHealth,
  fetchCurrentUser,
  logoutFarmer,
  savePersistentScan,
} from "@/services/api";
import { Language } from "@/components/landing/translations";

export default function HomePage() {
  const [currentLang, setCurrentLang] = useState<Language>("en");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    // Check backend health & status
    fetchHealth()
      .then((data) => setHealth(data))
      .catch((err) => {
        console.warn("Backend not yet connected:", err);
      });

    // Check existing auth session
    fetchCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
      }
    });

    // Scroll spy for active navbar section
    const handleScroll = () => {
      const sections = ["hero", "features-strip", "how-it-works", "features", "disease-showcase", "why-choose"];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = () => {
    logoutFarmer();
    setCurrentUser(null);
  };

  const handleScanSaved = async (record: ScanRecord) => {
    // Persist to localStorage
    try {
      const saved = localStorage.getItem("farmdoctor_scan_history");
      const list: ScanRecord[] = saved ? JSON.parse(saved) : [];
      const updated = [record, ...list.filter((r) => r.id !== record.id)].slice(0, 50);
      localStorage.setItem("farmdoctor_scan_history", JSON.stringify(updated));
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    // If authenticated, persist to FastAPI backend database
    if (currentUser) {
      try {
        await savePersistentScan({
          farm_id: record.farm_id || undefined,
          filename: record.filename,
          crop: record.topPrediction.crop,
          predicted_condition: record.topPrediction.condition,
          confidence_percentage: record.topPrediction.confidence_percentage,
          raw_class: record.topPrediction.raw_class,
          all_predictions: record.allPredictions,
          disclaimers: record.disclaimers,
          image_base64: record.imagePreviewUrl?.startsWith("data:")
            ? record.imagePreviewUrl
            : undefined,
        });
      } catch (err) {
        console.warn("Could not save to backend:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF2] text-[#17251C] flex flex-col font-sans selection:bg-[#E7F4DF] selection:text-[#16803C]">
      {/* 1. Sticky Navigation Bar */}
      <LandingNavbar
        currentLang={currentLang}
        onToggleLang={setCurrentLang}
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        activeSection={activeSection}
      />

      {/* 2. Hero Section */}
      <HeroSection
        currentLang={currentLang}
        onOpenLiveScanner={() => setScannerModalOpen(true)}
      />

      {/* 3. Feature Highlight Strip */}
      <FeatureHighlightStrip currentLang={currentLang} />

      {/* 4. How It Works Section */}
      <HowItWorksSection currentLang={currentLang} />

      {/* 5. Key Features Grid */}
      <KeyFeaturesSection currentLang={currentLang} />

      {/* 6. Disease Detection Showcase */}
      <DiseaseShowcaseSection currentLang={currentLang} />

      {/* 7. Why Choose FarmDoctor AI */}
      <WhyChooseSection currentLang={currentLang} />

      {/* 8. Final Call to Action */}
      <CtaBanner currentLang={currentLang} />

      {/* 9. Professional Footer */}
      <LandingFooter currentLang={currentLang} />

      {/* Auth Modal for Farmer Login / Registration */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* Live Scanner Modal */}
      <LiveScannerModal
        isOpen={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        isBackendOnline={health?.model_loaded === true}
        onScanSaved={handleScanSaved}
      />
    </div>
  );
}
