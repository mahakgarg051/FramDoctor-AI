"use client";

import React from "react";
import { X, ScanLine, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import Scanner from "@/components/Scanner";
import { ScanRecord } from "@/types";

interface LiveScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isBackendOnline: boolean;
  onScanSaved: (record: ScanRecord) => void;
}

export default function LiveScannerModal({
  isOpen,
  onClose,
  isBackendOnline,
  onScanSaved,
}: LiveScannerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl border border-[#E7F4DF] bg-[#FAFAF2] shadow-2xl">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#E7F4DF] bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E7F4DF] text-[#16803C]">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#17251C]">
                FarmDoctor AI Disease Scanner
              </h3>
              <p className="text-xs text-[#55695E]">
                Direct PyTorch EfficientNet-B0 inference engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard?tab=scanner"
              className="hidden sm:flex items-center gap-1 rounded-full border border-[#D5E5CE] px-3 py-1.5 text-xs font-bold text-[#16803C] hover:bg-[#E7F4DF] transition-colors"
            >
              <span>Full Screen Workspace</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={onClose}
              className="rounded-full p-2 text-[#55695E] hover:bg-[#FAFAF2] hover:text-[#17251C] transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Scanner
            onScanSaved={onScanSaved}
            isBackendOnline={isBackendOnline}
          />
        </div>

      </div>
    </div>
  );
}
