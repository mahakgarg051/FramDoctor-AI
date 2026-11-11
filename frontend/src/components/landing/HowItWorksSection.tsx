"use client";

import React from "react";
import Image from "next/image";
import {
  UploadCloud,
  Cpu,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import { Language, translations } from "./translations";

interface HowItWorksProps {
  currentLang: Language;
}

export default function HowItWorksSection({ currentLang }: HowItWorksProps) {
  const t = translations[currentLang];

  return (
    <section id="how-it-works" className="py-10 px-4 sm:px-6 lg:px-8 bg-[#FAFAF2]">
      <div className="mx-auto max-w-[1440px]">

        {/* Main How It Works Container matching the reference image layout */}
        <div className="relative overflow-hidden rounded-3xl border border-[#E7F4DF] bg-white p-6 sm:p-8 shadow-sm">

          <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">

            {/* Section Title */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17251C]">
                {t.howItWorks.title.replace("?", "")}
                <span className="text-[#16803C]">?</span>
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-[#55695E]">
                Three quick steps from symptom capture to actionable agronomy guidance.
              </p>
            </div>

            {/* Steps 1, 2, 3 with connecting chevrons */}
            <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-between gap-4">

              {/* Step 1 */}
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] shadow-xs">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#16803C] text-[10px] font-extrabold text-white">
                    1
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17251C]">
                    {t.howItWorks.step1Title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#55695E] leading-relaxed">
                    {t.howItWorks.step1Desc}
                  </p>
                </div>
              </div>

              {/* Connecting Chevron */}
              <div className="hidden sm:flex text-[#16803C]/40">
                <ChevronRight className="h-6 w-6 stroke-[3]" />
              </div>

              {/* Step 2 */}
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] shadow-xs">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#16803C] text-[10px] font-extrabold text-white">
                    2
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17251C]">
                    {t.howItWorks.step2Title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#55695E] leading-relaxed">
                    {t.howItWorks.step2Desc}
                  </p>
                </div>
              </div>

              {/* Connecting Chevron */}
              <div className="hidden sm:flex text-[#16803C]/40">
                <ChevronRight className="h-6 w-6 stroke-[3]" />
              </div>

              {/* Step 3 */}
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] shadow-xs">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#16803C] text-[10px] font-extrabold text-white">
                    3
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17251C]">
                    {t.howItWorks.step3Title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#55695E] leading-relaxed">
                    {t.howItWorks.step3Desc}
                  </p>
                </div>
              </div>

            </div>

            {/* Seedling Image Accent on the far right matching reference image */}
            <div className="lg:col-span-2 hidden lg:flex justify-end">
              <div className="relative h-20 w-32 overflow-hidden rounded-2xl border border-[#E7F4DF] shadow-xs">
                <Image
                  src="/images/landing/seedling_soil.jpg"
                  alt="Young seedling sprouting in rich farm soil"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
