"use client";

import React, { useState, useEffect } from "react";
import {
  CloudSun,
  Droplets,
  Wind,
  CloudRain,
  MapPin,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sun,
  Key,
  Search,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { WeatherResponse } from "@/types";
import { fetchWeather } from "@/services/api";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState("New Delhi,IN");
  const [activeLocation, setActiveLocation] = useState("New Delhi,IN");

  const loadWeather = async (loc?: string) => {
    setLoading(true);
    setError(null);
    const targetLoc = loc !== undefined ? loc : activeLocation;
    try {
      const data = await fetchWeather(targetLoc);
      setWeather(data);
    } catch (err: any) {
      setError(err.message || "Failed to reach weather service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationInput.trim()) {
      setActiveLocation(locationInput.trim());
      loadWeather(locationInput.trim());
    }
  };

  const quickCities = [
    { name: "New Delhi (North)", query: "New Delhi,IN" },
    { name: "Nagpur (Central)", query: "Nagpur,IN" },
    { name: "Pune (West)", query: "Pune,IN" },
    { name: "Nashik (Grape Belt)", query: "Nashik,IN" },
    { name: "Ludhiana (Wheat Belt)", query: "Ludhiana,IN" },
    { name: "Shimla (Apple Belt)", query: "Shimla,IN" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-xs font-semibold text-[#16834A]">
              Live Field Meteorology
            </span>
            {weather?.configured ? (
              <span className="rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-[10px] font-bold text-[#174D36] border border-[#D1E7D1]">
                ● Live Data ({weather.provider || "OpenWeatherMap"})
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                ● Weather API Key Unconfigured
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-black text-[#174D36] sm:text-3xl">
            Farm Weather & Foliar Spray Advisory
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#5C7367]">
            Real microclimate conditions to prevent fungal sporulation and schedule protective foliar sprays.
          </p>
        </div>

        <button
          onClick={() => loadWeather()}
          className="flex items-center gap-1.5 self-start rounded-xl border border-[#E5E8E1] bg-white px-3 py-2 text-xs font-semibold text-[#5C7367] hover:bg-[#FAFBF9]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Weather</span>
        </button>
      </div>

      {/* Location Search Bar */}
      <div className="rounded-2xl border border-[#E5E8E1] bg-white p-4 shadow-xs">
        <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-[#16834A]" />
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Enter city or district (e.g. New Delhi, Pune, Nashik, Shimla)..."
              className="w-full rounded-xl border border-[#E5E8E1] bg-[#F8F8F2] py-2 pl-9 pr-4 text-xs text-[#11291F] placeholder-[#7F9489] focus:border-[#16834A] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[#16834A] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search Location</span>
          </button>
        </form>

        {/* Quick Location Pills */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[#5C7367] font-medium mr-1">Agricultural Hubs:</span>
          {quickCities.map((city) => (
            <button
              key={city.query}
              onClick={() => {
                setLocationInput(city.query);
                setActiveLocation(city.query);
                loadWeather(city.query);
              }}
              className={`rounded-xl px-2.5 py-1 transition text-xs font-semibold ${
                activeLocation === city.query
                  ? "bg-[#16834A] text-white"
                  : "border border-[#E5E8E1] bg-[#FAFBF9] text-[#5C7367] hover:bg-[#E5EFE5] hover:text-[#174D36]"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content: Unconfigured vs Live vs Error */}
      {loading ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-3xl border border-[#E5E8E1] bg-white text-[#5C7367]">
          <RefreshCw className="h-8 w-8 animate-spin text-[#16834A]" />
          <p className="mt-3 text-xs">Fetching microclimate observations from backend...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-xs text-rose-800">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-600" />
          <p className="mt-2 font-bold">{error}</p>
          <button
            onClick={() => loadWeather()}
            className="mt-4 rounded-xl bg-[#16834A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#137240]"
          >
            Retry Connection
          </button>
        </div>
      ) : weather && !weather.configured ? (
        /* Unconfigured State (Transparent and instructive) */
        <div className="rounded-3xl border border-amber-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200">
              <Key className="h-7 w-7" />
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-xl font-bold text-[#174D36]">
                  Live Weather Service is Unconfigured
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#5C7367]">
                  {weather.message ||
                    "To access live satellite weather observations and dynamic spray window advisories, configure a free weather API key in your backend environment."}
                </p>
              </div>

              {/* Instructions Box */}
              <div className="rounded-2xl border border-[#E5E8E1] bg-[#FAFBF9] p-4 text-xs space-y-2">
                <div className="font-semibold text-[#174D36]">
                  Quick 2-Minute Setup Instructions:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[#5C7367]">
                  <li>
                    Get a free API key from{" "}
                    <a
                      href="https://openweathermap.org/api"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#16834A] underline font-medium inline-flex items-center gap-0.5"
                    >
                      OpenWeatherMap (Free Tier) <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    or{" "}
                    <a
                      href="https://www.weatherapi.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#16834A] underline font-medium inline-flex items-center gap-0.5"
                    >
                      WeatherAPI <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                  <li>
                    Add this line in your project <code className="text-[#174D36] font-bold">.env</code> file:
                  </li>
                </ol>
                <div className="rounded-xl border border-[#E5E8E1] bg-white p-2.5 font-mono text-[#16834A] text-xs select-all">
                  WEATHER_API_KEY=your_actual_api_key_here
                </div>
                <p className="text-[11px] text-[#7F9489]">
                  Restart the backend (<code>uvicorn backend.app.main:app</code>) and refresh this view.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-800">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  FarmDoctor AI never fabricates fake live weather when unconfigured.
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : weather && weather.configured && weather.status === "live" ? (
        /* Live Weather Display */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Main Weather Card */}
          <div className="rounded-3xl border border-[#E5E8E1] bg-white p-6 md:col-span-8 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#5C7367]">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#16834A]" />
                <span className="font-bold text-[#174D36] text-sm">
                  {weather.location_name || activeLocation}
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#7F9489]">
                Observed: {weather.observation_time ? new Date(weather.observation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Live"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-5xl font-black text-[#174D36] sm:text-6xl">
                  {weather.temperature_celsius !== undefined ? `${weather.temperature_celsius}°C` : "N/A"}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#16834A]">
                  {weather.weather_condition || "Clear"}
                </div>
              </div>

              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-50 text-amber-500 border border-amber-200">
                <Sun className="h-10 w-10" />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#F4F6F2] pt-5">
              <div className="rounded-2xl border border-[#E5E8E1] bg-[#FAFBF9] p-3">
                <div className="flex items-center gap-1.5 text-xs text-[#5C7367]">
                  <Droplets className="h-4 w-4 text-sky-600" />
                  <span>Humidity</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[#174D36]">
                  {weather.relative_humidity}%
                </div>
                <div className="text-[10px] text-[#7F9489]">
                  {(weather.relative_humidity || 0) > 80 ? "Fungal risk high" : "Foliage dry"}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E8E1] bg-[#FAFBF9] p-3">
                <div className="flex items-center gap-1.5 text-xs text-[#5C7367]">
                  <Wind className="h-4 w-4 text-teal-600" />
                  <span>Wind Speed</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[#174D36]">
                  {weather.wind_speed_kmh} km/h
                </div>
                <div className="text-[10px] text-[#7F9489]">
                  {(weather.wind_speed_kmh || 0) < 15 ? "Low drift risk" : "High wind drift"}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E8E1] bg-[#FAFBF9] p-3">
                <div className="flex items-center gap-1.5 text-xs text-[#5C7367]">
                  <CloudRain className="h-4 w-4 text-blue-600" />
                  <span>Rainfall (1h)</span>
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-[#174D36]">
                  {weather.rainfall_mm ?? 0} mm
                </div>
                <div className="text-[10px] text-[#7F9489]">
                  {(weather.rainfall_mm || 0) > 0 ? "Wash-off risk" : "No rain recorded"}
                </div>
              </div>
            </div>
          </div>

          {/* Spray Window Recommendation Card */}
          <div className="rounded-3xl border border-[#E5E8E1] bg-white p-6 md:col-span-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-3 w-3 rounded-full ${
                    weather.spray_advisory?.is_favorable ? "bg-[#16834A] animate-pulse" : "bg-rose-500"
                  }`}
                />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#174D36]">
                  Spraying Advisory Window
                </h3>
              </div>

              <div
                className={`mt-4 rounded-2xl p-4 ${
                  weather.spray_advisory?.is_favorable
                    ? "border border-[#D1E7D1] bg-[#E5EFE5] text-[#174D36]"
                    : "border border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {weather.spray_advisory?.is_favorable ? (
                    <CheckCircle2 className="h-4 w-4 text-[#16834A] shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                  )}
                  <span>{weather.spray_advisory?.headline || "Spray Evaluation"}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed">
                  {weather.spray_advisory?.details}
                </p>
              </div>
            </div>

            <div className="mt-5 text-[11px] text-[#5C7367] border-t border-[#F4F6F2] pt-3">
              <strong className="text-[#174D36]">Agricultural Safety Rule:</strong> Never spray synthetic chemicals on windy or rain-imminent days. Always follow the registered product label.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
