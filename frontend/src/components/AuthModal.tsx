"use client";

import React, { useState } from "react";
import { X, Sprout, Lock, User as UserIcon, Mail, Loader2, AlertCircle } from "lucide-react";
import { loginFarmer, registerFarmer } from "@/services/api";
import { User } from "@/types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!username.trim() || !email.trim() || !password.trim()) {
          throw new Error("Please fill in username, email, and password.");
        }
        const res = await registerFarmer({
          username: username.trim(),
          email: email.trim(),
          password: password,
          full_name: fullName.trim() || undefined,
        });
        onLoginSuccess(res.user);
        onClose();
      } else {
        if (!username.trim() || !password.trim()) {
          throw new Error("Please enter your username and password.");
        }
        const res = await loginFarmer({
          username: username.trim(),
          password: password,
        });
        onLoginSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#E5EAE2] bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="relative border-b border-[#E5EAE2] bg-[#F8F8F2] px-6 py-5">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-xl p-1.5 text-[#68756B] hover:bg-white hover:text-[#174D36]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A] shadow-xs">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#174D36]">
                {isRegister ? "Create Farmer Profile" : "Farmer Sign In"}
              </h3>
              <p className="text-xs text-[#68756B]">
                {isRegister
                  ? "Save your farm plots, cloud history, and personalized advice"
                  : "Access your saved farms, diagnostic records, and action plans"}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#142F28] mb-1">
                Full Name (Optional)
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78887E]" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] py-2 pl-9 pr-3 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#142F28] mb-1">
              Username or ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78887E]" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ramesh_farmer"
                className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] py-2 pl-9 pr-3 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#142F28] mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78887E]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ramesh@kisan.in"
                  className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] py-2 pl-9 pr-3 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#142F28] mb-1">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#78887E]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E5EAE2] bg-[#FAFBF9] py-2 pl-9 pr-3 text-xs text-[#142F28] focus:border-[#16834A] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16834A] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#137240] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : isRegister ? (
              <span>Create Account</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsRegister(!isRegister);
              }}
              className="text-xs font-medium text-[#16834A] hover:underline"
            >
              {isRegister
                ? "Already have an account? Sign In"
                : "New farmer? Create an account to save farms"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
