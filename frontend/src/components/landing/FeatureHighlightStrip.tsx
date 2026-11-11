"use client";

import React from "react";
import Link from "next/link";
import {
  ScanLine,
  Bot,
  CalendarCheck,
  CloudSun,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Language, translations } from "./translations";

interface FeatureHighlightStripProps {
  currentLang: Language;
}

export default function FeatureHighlightStrip({
  currentLang,
}: FeatureHighlightStripProps) {
  const t = translations[currentLang];

  const items = [
    {
      id: "disease-scanner",
      title: t.highlightStrip.diseaseDetection.title,
      desc: t.highlightStrip.diseaseDetection.desc,
      icon: ScanLine,
      href: "/dashboard?tab=scanner",
    },
    {
      id: "ai-assistant",
      title: t.highlightStrip.aiAssistant.title,
      desc: t.highlightStrip.aiAssistant.desc,
      icon: Bot,
      href: "/dashboard?tab=assistant",
    },
    {
      id: "farming-planner",
      title: t.highlightStrip.planner.title,
      desc: t.highlightStrip.planner.desc,
      icon: CalendarCheck,
      href: "/dashboard?tab=planner",
    },
    {
      id: "weather-insights",
      title: t.highlightStrip.weather.title,
      desc: t.highlightStrip.weather.desc,
      icon: CloudSun,
      href: "/dashboard?tab=weather",
    },
    {
      id: "crop-library",
      title: t.highlightStrip.cropLibrary.title,
      desc: t.highlightStrip.cropLibrary.desc,
      icon: BookOpen,
      href: "/dashboard?tab=crops",
    },
    {
      id: "advisory-hub",
      title: t.highlightStrip.advisoryHub.title,
      desc: t.highlightStrip.advisoryHub.desc,
      icon: ShieldCheck,
      href: "/dashboard?tab=advisory",
    },
  ];

  return (
    <section id="features-strip" className="relative z-10 -mt-2 mb-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <div className="rounded-2xl border border-[#E7F4DF] bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-3">
            {items.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`group flex items-start gap-3 rounded-xl p-2.5 transition-all duration-200 hover:bg-[#F4F9F2] ${
                    index < items.length - 1
                      ? "lg:border-r lg:border-[#F0F4EC]"
                      : ""
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F4DF] text-[#16803C] transition-transform duration-200 group-hover:scale-110 shadow-xs">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-xs sm:text-sm font-extrabold text-[#17251C] group-hover:text-[#16803C] transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[#55695E] line-clamp-2 leading-tight">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
