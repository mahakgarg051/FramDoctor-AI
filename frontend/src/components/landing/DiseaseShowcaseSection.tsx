"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Sparkles,
  Layers,
} from "lucide-react";
import { Language, translations } from "./translations";

interface DiseaseShowcaseSectionProps {
  currentLang: Language;
}

interface LeafExample {
  id: string;
  name: string;
  crop: string;
  status: "diseased" | "healthy";
  confidence: number;
  condition: string;
  symptoms: string;
  image: string;
  solution: string;
}

export default function DiseaseShowcaseSection({
  currentLang,
}: DiseaseShowcaseSectionProps) {
  const t = translations[currentLang];

  const examples: LeafExample[] = [
    {
      id: "corn-rust",
      name: "Common Rust",
      crop: "Corn (Maize)",
      status: "diseased",
      confidence: 92.4,
      condition: "Fungal Infection (Puccinia sorghi)",
      symptoms: "Elongated golden-brown pustules on both upper and lower leaf surfaces.",
      image: "/images/crops/corn.jpg",
      solution: "Apply foliar mancozeb spray; improve field aeration and avoid overhead irrigation.",
    },
    {
      id: "tomato-blight",
      name: "Early Blight",
      crop: "Tomato",
      status: "diseased",
      confidence: 94.8,
      condition: "Fungal Blight (Alternaria solani)",
      symptoms: "Dark concentric rings forming 'target' patterns surrounded by yellow halo.",
      image: "/images/crops/tomato.jpg",
      solution: "Prune bottom leaves touching soil; apply copper hydroxide or neem-based bio-fungicide.",
    },
    {
      id: "apple-healthy",
      name: "Healthy Foliage",
      crop: "Apple",
      status: "healthy",
      confidence: 98.1,
      condition: "Optimal Plant Health",
      symptoms: "Vibrant deep green foliage with balanced turgor and zero lesion spots.",
      image: "/images/crops/apple.jpg",
      solution: "Maintain seasonal balanced NPK fertilization and routine prophylactic scouting.",
    },
    {
      id: "potato-blight",
      name: "Late Blight",
      crop: "Potato",
      status: "diseased",
      confidence: 91.2,
      condition: "Oomycete Pathogen (Phytophthora)",
      symptoms: "Water-soaked dark lesions with white fungal fuzz on leaf undersides in humid mornings.",
      image: "/images/crops/potato.jpg",
      solution: "Eliminate volunteer tubers; apply systemic metalaxyl / chlorothalonil during high humidity.",
    },
  ];

  const [selectedExample, setSelectedExample] = useState<LeafExample>(examples[0]);

  return (
    <section id="disease-showcase" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#E7F4DF]">
      <div className="mx-auto max-w-[1440px]">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E7F4DF] px-3.5 py-1 text-xs font-bold text-[#16803C] mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Diagnostic Engine</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#17251C]">
            {t.diseaseShowcase.title}
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-[#55695E]">
            {t.diseaseShowcase.subtitle}
          </p>
        </div>

        {/* Interactive Demonstration Workspace */}
        <div className="rounded-3xl border border-[#E7F4DF] bg-[#FAFAF2] p-5 sm:p-8 shadow-sm">

          {/* Sample Selector Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7F4DF] pb-4">
            <span className="text-xs sm:text-sm font-bold text-[#17251C] flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-[#16803C]" />
              {t.diseaseShowcase.selectLeaf}
            </span>

            <div className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedExample(ex)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    selectedExample.id === ex.id
                      ? "bg-[#16803C] text-white shadow-xs"
                      : "bg-white text-[#17251C] border border-[#D5E5CE] hover:border-[#16803C]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      ex.status === "healthy" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span>
                    {ex.crop}: {ex.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Inspection Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-center">

            {/* Visual Leaf Scanner Simulation Box */}
            <div className="lg:col-span-5 relative flex flex-col items-center">
              <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-2xl border-2 border-white shadow-lg bg-black">
                <Image
                  src={selectedExample.image}
                  alt={selectedExample.name}
                  fill
                  className="object-cover"
                />

                {/* Simulated Reticle Viewfinder */}
                <div className="absolute inset-5 rounded-xl border border-dashed border-[#16803C] bg-[#16803C]/10 flex flex-col justify-between p-3 pointer-events-none">
                  <div className="flex justify-between">
                    <div className="h-5 w-5 border-t-2 border-l-2 border-[#22c55e]" />
                    <div className="h-5 w-5 border-t-2 border-r-2 border-[#22c55e]" />
                  </div>

                  {/* Subtle animated scan sweep */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#22c55e] to-transparent shadow-[0_0_10px_#22c55e] animate-pulse" />

                  <div className="flex justify-between">
                    <div className="h-5 w-5 border-b-2 border-l-2 border-[#22c55e]" />
                    <div className="h-5 w-5 border-b-2 border-r-2 border-[#22c55e]" />
                  </div>
                </div>

                {/* Badge Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/75 px-3 py-1.5 text-xs text-white backdrop-blur-xs">
                  <span className="flex items-center gap-1.5 font-bold">
                    <ScanLine className="h-3.5 w-3.5 text-[#22c55e]" />
                    <span>Leaf Feature Map Extracted</span>
                  </span>
                  <span className="text-[10px] text-zinc-300">224x224 RGB</span>
                </div>
              </div>

              {/* Real Model Note */}
              <span className="mt-2 text-[11px] text-[#55695E] flex items-center gap-1 text-center">
                <Info className="h-3.5 w-3.5 shrink-0 text-[#16803C]" />
                <span>Simulated preview. Real-time predictions run via PyTorch EfficientNet-B0.</span>
              </span>
            </div>

            {/* Diagnostic Report Preview Card */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-[#E5EAE2] bg-white p-5 sm:p-6 shadow-sm">

              <div>
                {/* Header Status & Example Disclaimer */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F0F4EC] pb-3">
                  <div className="flex items-center gap-2">
                    {selectedExample.status === "healthy" ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Foliage Healthy</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-200">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                        <span>Pathogen Detected (Example)</span>
                      </span>
                    )}

                    <span className="text-xs font-bold text-[#55695E]">
                      Crop: <strong className="text-[#17251C]">{selectedExample.crop}</strong>
                    </span>
                  </div>

                  <span className="rounded-md bg-[#FAFAF2] border border-[#E7F4DF] px-2 py-0.5 text-[10px] font-semibold text-[#55695E]">
                    Interactive Sample
                  </span>
                </div>

                {/* Primary Diagnosis */}
                <div className="mt-4">
                  <h3 className="text-xl font-extrabold text-[#17251C]">
                    {selectedExample.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#16803C] mt-0.5">
                    {selectedExample.condition}
                  </p>
                </div>

                {/* Confidence Bar */}
                <div className="mt-4 rounded-xl bg-[#FAFAF2] p-3 border border-[#E7F4DF]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#17251C] mb-1.5">
                    <span>{t.diseaseShowcase.confidenceRate}</span>
                    <span className="text-[#16803C] font-extrabold text-sm">
                      {selectedExample.confidence}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#E5EAE2]">
                    <div
                      className="h-full rounded-full bg-[#16803C] transition-all duration-700"
                      style={{ width: `${selectedExample.confidence}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-[#55695E]">
                    <span>High Confidence Baseline (&gt;75%)</span>
                    <span>Safety Margin: 18.5%</span>
                  </div>
                </div>

                {/* Observed Symptoms */}
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-[#17251C] uppercase tracking-wide">
                    Symptom Analysis:
                  </h4>
                  <p className="mt-1 text-xs text-[#55695E] leading-relaxed">
                    {selectedExample.symptoms}
                  </p>
                </div>

                {/* Actionable Guidance */}
                <div className="mt-3">
                  <h4 className="text-xs font-bold text-[#17251C] uppercase tracking-wide">
                    Recommended Action:
                  </h4>
                  <p className="mt-1 text-xs text-[#14532D] font-medium leading-relaxed bg-[#E7F4DF]/50 p-2.5 rounded-xl border border-[#D5E5CE]">
                    {selectedExample.solution}
                  </p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#F0F4EC] pt-4">
                <Link
                  href="/dashboard?tab=scanner"
                  className="flex items-center gap-2 rounded-full bg-[#16803C] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#14532D] transition-colors"
                >
                  <ScanLine className="h-3.5 w-3.5" />
                  <span>{t.diseaseShowcase.openRealScanner}</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>

                <Link
                  href="/dashboard?tab=advisory"
                  className="flex items-center gap-1.5 rounded-full border border-[#D5E5CE] bg-white px-4 py-2 text-xs font-bold text-[#17251C] hover:border-[#16803C] hover:text-[#16803C] transition-colors"
                >
                  <span>{t.diseaseShowcase.viewFullReport}</span>
                </Link>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
