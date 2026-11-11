"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sprout } from "lucide-react";
import { Language, translations } from "./translations";

interface CtaBannerProps {
  currentLang: Language;
}

export default function CtaBanner({ currentLang }: CtaBannerProps) {
  const t = translations[currentLang];

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 bg-[#FAFAF2]">
      <div className="mx-auto max-w-[1440px]">

        {/* Forest Green Banner Container matching reference */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#14532D] via-[#16803C] to-[#14532D] p-8 sm:p-12 shadow-xl">

          {/* Panoramic Agricultural Background Image Overlay */}
          <div className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none">
            <Image
              src="/images/landing/cta_banner_bg.jpg"
              alt="Lush agricultural tea and crop hills"
              fill
              className="object-cover"
            />
          </div>

          {/* Decorative Leaf Motifs */}
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

          {/* Content Flex Container */}
          <div className="relative z-10 flex flex-col items-center justify-between gap-6 text-center lg:flex-row lg:text-left">

            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-100 backdrop-blur-xs mb-3">
                <Sprout className="h-3.5 w-3.5" />
                <span>Empowering Farmers Everywhere</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                {t.cta.title}
              </h2>
              <p className="mt-2 text-sm sm:text-base text-emerald-100/90 font-medium">
                {t.cta.description}
              </p>
            </div>

            {/* White Pill Button: Get Started */}
            <div className="flex-shrink-0">
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm sm:text-base font-extrabold text-[#14532D] shadow-lg hover:bg-[#FAFAF2] hover:text-[#16803C] transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <span>{t.cta.button}</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
