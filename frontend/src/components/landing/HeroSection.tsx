"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ScanLine,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Language, translations } from "./translations";

interface HeroSectionProps {
  currentLang: Language;
  onOpenLiveScanner: () => void;
}

export default function HeroSection({
  currentLang,
  onOpenLiveScanner,
}: HeroSectionProps) {
  const t = translations[currentLang];

  return (
    <section id="hero" className="relative overflow-hidden bg-[#FAFAF2] py-8 lg:py-16">
      {/* Background Subtle Gradient & Glow */}
      <div className="absolute top-0 right-1/4 -z-10 h-96 w-96 rounded-full bg-[#E7F4DF]/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 -z-10 h-72 w-72 rounded-full bg-[#16803C]/5 blur-3xl pointer-events-none" />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">

          {/* Left Column: Headings, Description, Actions & Benefit Badges */}
          <div className="lg:col-span-7 flex flex-col justify-center">

            {/* Main Heading matching the exact reference text and colors */}
            <h1 className="text-3xl font-extrabold tracking-tight text-[#17251C] sm:text-5xl lg:text-5xl xl:text-6xl leading-[1.15]">
              {t.hero.titleStart}
              <span className="text-[#16803C] inline-block">
                {t.hero.titleHighlight || "with AI"}
              </span>
            </h1>

            {/* Description Paragraph */}
            <p className="mt-5 text-base sm:text-lg text-[#3E5345] leading-relaxed max-w-2xl font-normal">
              {t.hero.description}
            </p>

            {/* Action Buttons Row */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {/* Primary Green Pill Button: Scan Your Crop Now */}
              <Link
                href="/dashboard?tab=scanner"
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#16803C] px-7 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-[#16803C]/20 hover:bg-[#14532D] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <ScanLine className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span>{t.hero.scanButton}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              {/* Secondary Pill Button: Explore Features */}
              <a
                href="#features"
                className="group inline-flex items-center gap-2 rounded-full border border-[#C5D9BE] bg-white px-6 py-3.5 text-sm sm:text-base font-bold text-[#17251C] hover:border-[#16803C] hover:text-[#16803C] hover:bg-[#F4F9F2] shadow-xs transition-all duration-200"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E7F4DF] text-[#16803C]">
                  <Play className="h-3 w-3 fill-[#16803C] ml-0.5" />
                </div>
                <span>{t.hero.exploreButton}</span>
              </a>
            </div>

            {/* Benefit Checkmark Indicators matching reference */}
            <div className="mt-10 flex flex-wrap items-center gap-5 sm:gap-7 border-t border-[#E7F4DF]/80 pt-6">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16803C] text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#17251C]">
                  {t.hero.benefit1}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16803C] text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#17251C]">
                  {t.hero.benefit2}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16803C] text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#17251C]">
                  {t.hero.benefit3}
                </span>
              </div>
            </div>

          </div>

          {/* Right Column: Visual Composition matching reference image */}
          <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">

            <div className="relative w-full max-w-[520px]">

              {/* Main Photo of Smiling Indian Farmer in Field */}
              <div className="relative h-[380px] sm:h-[460px] w-full overflow-hidden rounded-3xl shadow-xl border-4 border-white">
                <Image
                  src="/images/landing/hero_farmer.jpg"
                  alt="Indian farmer with smartphone in green crop field"
                  fill
                  priority
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Realistic Smartphone Screen Mockup with Leaf Scanning Reticle */}
              <button
                type="button"
                onClick={onOpenLiveScanner}
                className="absolute -bottom-6 left-2 sm:-left-4 w-48 sm:w-56 overflow-hidden rounded-2xl border-4 border-white bg-slate-900 shadow-2xl z-20 text-left cursor-pointer transition-transform hover:scale-105"
                title="Click to Launch Live Leaf Scanner"
              >
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-black">
                  <Image
                    src="/images/landing/leaf_scanner_preview.jpg"
                    alt="Smartphone AI leaf scanning"
                    fill
                    className="object-cover opacity-90"
                  />

                  {/* Glowing AI Bounding Box & Corner Brackets */}
                  <div className="absolute inset-4 rounded-xl border border-dashed border-[#16803C]/80 bg-[#16803C]/10 backdrop-blur-[1px] flex flex-col justify-between p-2">
                    {/* Corner Reticle Markers */}
                    <div className="flex justify-between">
                      <div className="h-4 w-4 border-t-2 border-l-2 border-[#16803C]" />
                      <div className="h-4 w-4 border-t-2 border-r-2 border-[#16803C]" />
                    </div>

                    {/* Animated Scanning Line */}
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#22c55e] to-transparent shadow-[0_0_8px_#22c55e] animate-pulse" />

                    <div className="flex justify-between">
                      <div className="h-4 w-4 border-b-2 border-l-2 border-[#16803C]" />
                      <div className="h-4 w-4 border-b-2 border-r-2 border-[#16803C]" />
                    </div>
                  </div>

                  {/* Top Phone Pill Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 h-3.5 w-16 rounded-full bg-black/80" />

                  {/* Live Scan indicator at bottom */}
                  <div className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-1 text-center backdrop-blur-xs">
                    <span className="text-[10px] font-bold text-white flex items-center justify-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#16803C] animate-ping" />
                      Scanning Leaf Tissue...
                    </span>
                  </div>
                </div>
              </button>

              {/* Floating Sample Diagnosis Preview Card matching reference */}
              <div className="absolute -top-3 -right-2 sm:-right-4 w-60 sm:w-64 rounded-2xl border border-[#E5EAE2] bg-white/95 p-3.5 shadow-2xl backdrop-blur-md z-30 transition-all hover:scale-[1.02]">
                {/* Red Warning Badge: Disease Detected (Example Only) */}
                <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 border border-red-100">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-600" />
                  <span>{t.hero.exampleBadge}</span>
                </div>

                {/* Leaf Diagnosis Item */}
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-[#D5E5CE] shrink-0 bg-[#FAFAF2]">
                    <Image
                      src="/images/crops/corn.jpg"
                      alt="Corn leaf rust"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-[#17251C] leading-snug">
                      {t.hero.exampleCondition}
                    </h4>
                    <span className="text-xs text-[#55695E] font-medium">
                      ({t.hero.exampleCrop})
                    </span>
                  </div>
                </div>

                {/* Confidence Percentage */}
                <div className="mt-2.5 flex items-center justify-between text-xs border-t border-[#F0F4EC] pt-2">
                  <span className="text-[#55695E] flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#16803C]" />
                    {t.hero.confidenceLabel}:
                  </span>
                  <span className="font-extrabold text-[#16803C] text-sm">
                    92.4%
                  </span>
                </div>

                {/* View Guidance Action Button */}
                <Link
                  href="/dashboard?tab=advisory"
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#14532D] py-2 text-xs font-bold text-white hover:bg-[#16803C] transition-colors shadow-xs"
                >
                  <span>{t.hero.viewGuidance}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
