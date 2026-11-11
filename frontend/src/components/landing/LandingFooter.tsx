"use client";

import React from "react";
import Link from "next/link";
import {
  Sprout,
  Heart,
  ShieldAlert,
} from "lucide-react";
import { Language, translations } from "./translations";

interface LandingFooterProps {
  currentLang: Language;
}

export default function LandingFooter({ currentLang }: LandingFooterProps) {
  const t = translations[currentLang];

  return (
    <footer className="border-t border-[#E7F4DF] bg-white pt-12 pb-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px]">

        {/* Main Footer Links Row matching reference image */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-12 pb-10">

          {/* Brand Column */}
          <div className="lg:col-span-4 flex flex-col">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C] transition-transform group-hover:scale-105 shadow-xs">
                <Sprout className="h-6 w-6 fill-[#16803C]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-[#17251C]">
                  FarmDoctor <span className="text-[#16803C]">AI</span>
                </span>
                <span className="text-[11px] font-medium text-[#55695E] -mt-0.5">
                  {t.footer.tagline}
                </span>
              </div>
            </Link>

            <p className="mt-4 text-xs text-[#55695E] leading-relaxed max-w-sm">
              Empowering farmers with instant AI leaf diagnostics, agronomic advisory,
              weather-aware spraying windows, and personalized field planning.
            </p>

            <div className="mt-4 flex items-center gap-2 text-xs text-[#16803C] font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-[#16803C] animate-pulse" />
              <span>PlantVillage Trained EfficientNet-B0</span>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#17251C]">
              {t.footer.quickLinks}
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#55695E]">
              <li>
                <a href="#hero" className="hover:text-[#16803C] transition-colors">
                  {t.nav.home}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-[#16803C] transition-colors">
                  {t.nav.features}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#16803C] transition-colors">
                  {t.nav.howItWorks}
                </a>
              </li>
              <li>
                <Link href="/dashboard?tab=crops" className="hover:text-[#16803C] transition-colors">
                  {t.nav.crops}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#17251C]">
              {t.footer.support}
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#55695E]">
              <li>
                <Link href="/dashboard?tab=advisory" className="hover:text-[#16803C] transition-colors">
                  {t.nav.advisory}
                </Link>
              </li>
              <li>
                <Link href="/dashboard?tab=assistant" className="hover:text-[#16803C] transition-colors">
                  {t.footer.faq}
                </Link>
              </li>
              <li>
                <a href="mailto:support@farmdoctor.ai" className="hover:text-[#16803C] transition-colors">
                  {t.footer.contact}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#17251C]">
              {t.footer.legal}
            </h4>
            <ul className="mt-4 space-y-2.5 text-xs text-[#55695E]">
              <li>
                <a href="#" className="hover:text-[#16803C] transition-colors">
                  {t.footer.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-[#16803C] transition-colors">
                  {t.footer.terms}
                </a>
              </li>
            </ul>
          </div>

          {/* Follow Us Column matching reference image */}
          <div className="lg:col-span-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#17251C]">
              {t.footer.followUs}
            </h4>
            <div className="mt-4 flex items-center gap-3 text-[#17251C]">
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAFAF2] border border-[#E7F4DF] text-[#17251C] hover:text-[#16803C] hover:border-[#16803C] transition-colors"
                aria-label="YouTube"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAFAF2] border border-[#E7F4DF] text-[#17251C] hover:text-[#16803C] hover:border-[#16803C] transition-colors"
                aria-label="LinkedIn"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAFAF2] border border-[#E7F4DF] text-[#17251C] hover:text-[#16803C] hover:border-[#16803C] transition-colors"
                aria-label="GitHub"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>
          </div>

        </div>

        {/* Disclaimer & Bottom Bar */}
        <div className="border-t border-[#F0F4EC] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#55695E]">
          <div className="flex items-center gap-1.5 max-w-2xl text-center sm:text-left">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-[#16803C]" />
            <span>{t.footer.disclaimer}</span>
          </div>

          <div className="shrink-0 font-medium">
            {t.footer.copyright}
          </div>
        </div>

      </div>
    </footer>
  );
}
