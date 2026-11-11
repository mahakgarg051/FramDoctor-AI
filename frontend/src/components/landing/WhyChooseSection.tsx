"use client";

import React from "react";
import {
  Sparkles,
  Wheat,
  Smartphone,
  Languages,
  CloudSun,
  ShieldCheck,
} from "lucide-react";
import { Language, translations } from "./translations";

interface WhyChooseSectionProps {
  currentLang: Language;
}

export default function WhyChooseSection({
  currentLang,
}: WhyChooseSectionProps) {
  const t = translations[currentLang];

  const benefits = [
    {
      id: "ai-screening",
      title: t.whyChoose.benefit1,
      icon: Sparkles,
    },
    {
      id: "multi-crop",
      title: t.whyChoose.benefit2,
      icon: Wheat,
    },
    {
      id: "easy-use",
      title: t.whyChoose.benefit3,
      icon: Smartphone,
    },
    {
      id: "bilingual",
      title: t.whyChoose.benefit4,
      icon: Languages,
    },
    {
      id: "weather-aware",
      title: t.whyChoose.benefit5,
      icon: CloudSun,
    },
    {
      id: "farmer-friendly",
      title: t.whyChoose.benefit6,
      icon: ShieldCheck,
    },
  ];

  return (
    <section id="why-choose" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAFAF2]">
      <div className="mx-auto max-w-[1440px]">

        {/* Section Heading matching reference */}
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17251C]">
            {t.whyChoose.titleStart}
            <span className="text-[#16803C]">{t.whyChoose.titleHighlight}</span>
          </h2>
        </div>

        {/* Horizontal Row of 6 Benefits matching reference */}
        <div className="rounded-3xl border border-[#E7F4DF] bg-white p-5 sm:p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-2">
            {benefits.map((b, index) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.id}
                  className={`flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl hover:bg-[#F4F9F2] transition-colors ${
                    index < benefits.length - 1
                      ? "lg:border-r lg:border-[#F0F4EC]"
                      : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] shadow-xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-[#17251C] text-center sm:text-left leading-snug">
                    {b.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
