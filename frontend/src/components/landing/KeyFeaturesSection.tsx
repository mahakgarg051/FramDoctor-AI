"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ScanLine,
  Bot,
  CalendarDays,
  CloudSun,
  BookOpen,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Language, translations } from "./translations";

interface KeyFeaturesSectionProps {
  currentLang: Language;
}

export default function KeyFeaturesSection({
  currentLang,
}: KeyFeaturesSectionProps) {
  const t = translations[currentLang];

  const cards = [
    {
      id: "scanner",
      title: t.keyFeatures.card1.title,
      desc: t.keyFeatures.card1.desc,
      buttonText: t.keyFeatures.card1.button,
      image: "/images/landing/feature_disease_scanner.jpg",
      icon: ScanLine,
      href: "/dashboard?tab=scanner",
      hasViewfinder: true,
    },
    {
      id: "assistant",
      title: t.keyFeatures.card2.title,
      desc: t.keyFeatures.card2.desc,
      buttonText: t.keyFeatures.card2.button,
      image: "/images/landing/feature_ai_assistant.jpg",
      icon: Bot,
      href: "/dashboard?tab=assistant",
    },
    {
      id: "planner",
      title: t.keyFeatures.card3.title,
      desc: t.keyFeatures.card3.desc,
      buttonText: t.keyFeatures.card3.button,
      image: "/images/landing/feature_planner.jpg",
      icon: CalendarDays,
      href: "/dashboard?tab=planner",
    },
    {
      id: "weather",
      title: t.keyFeatures.card4.title,
      desc: t.keyFeatures.card4.desc,
      buttonText: t.keyFeatures.card4.button,
      image: "/images/landing/feature_weather.jpg",
      icon: CloudSun,
      href: "/dashboard?tab=weather",
    },
    {
      id: "crops",
      title: t.keyFeatures.card5.title,
      desc: t.keyFeatures.card5.desc,
      buttonText: t.keyFeatures.card5.button,
      image: "/images/landing/feature_crop_library.jpg",
      icon: BookOpen,
      href: "/dashboard?tab=crops",
    },
    {
      id: "advisory",
      title: t.keyFeatures.card6.title,
      desc: t.keyFeatures.card6.desc,
      buttonText: t.keyFeatures.card6.button,
      image: "/images/landing/feature_advisory.jpg",
      icon: ShieldCheck,
      href: "/dashboard?tab=advisory",
    },
  ];

  return (
    <section id="features" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#FAFAF2]">
      <div className="mx-auto max-w-[1440px]">

        {/* Section Heading matching reference */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#17251C]">
            {t.keyFeatures.titleStart}
            <span className="text-[#16803C]">{t.keyFeatures.titleHighlight}</span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#55695E]">
            A complete agricultural intelligence suite built for smallholders, agronomists, and commercial farmers.
          </p>
        </div>

        {/* 6 Feature Cards Grid matching reference */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E7F4DF] bg-white shadow-xs hover:shadow-xl hover:border-[#C5D9BE] transition-all duration-300 transform hover:-translate-y-1.5"
              >
                {/* Card Top Image with subtle zoom on hover */}
                <div className="relative h-44 w-full overflow-hidden bg-[#FAFAF2]">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Scanner reticle overlay for Card 1 */}
                  {card.hasViewfinder && (
                    <div className="absolute inset-4 rounded-xl border border-white/60 flex flex-col justify-between p-2 pointer-events-none">
                      <div className="flex justify-between">
                        <div className="h-3 w-3 border-t-2 border-l-2 border-white" />
                        <div className="h-3 w-3 border-t-2 border-r-2 border-white" />
                      </div>
                      <div className="flex justify-between">
                        <div className="h-3 w-3 border-b-2 border-l-2 border-white" />
                        <div className="h-3 w-3 border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                  )}

                  {/* Gradient shadow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    {/* Title with matching green icon */}
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E7F4DF] text-[#16803C] shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-extrabold text-[#17251C] leading-snug group-hover:text-[#16803C] transition-colors">
                        {card.title}
                      </h3>
                    </div>

                    {/* Short Description */}
                    <p className="mt-2.5 text-xs text-[#55695E] leading-relaxed line-clamp-3">
                      {card.desc}
                    </p>
                  </div>

                  {/* Action Pill Button matching reference */}
                  <div className="mt-4 pt-2">
                    <Link
                      href={card.href}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#E7F4DF] px-4 py-2 text-xs font-bold text-[#16803C] hover:bg-[#16803C] hover:text-white transition-all duration-200 shadow-xs"
                    >
                      <span>{card.buttonText}</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
