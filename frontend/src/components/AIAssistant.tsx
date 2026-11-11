"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  User as UserIcon,
  Sprout,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ExternalLink,
  ChevronDown,
  CloudSun,
  ShieldCheck,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Globe,
  Radio,
  Check,
} from "lucide-react";
import { ActiveTab, Farm, AssistantMessage, User } from "@/types";
import {
  sendAssistantMessage,
  fetchAssistantHistory,
  clearAssistantHistory,
  fetchMyFarms,
} from "@/services/api";

interface AIAssistantProps {
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
}

export type AssistantLanguage = "auto" | "english" | "hindi" | "hinglish";

interface PromptOption {
  text: string;
  badge: string;
  langTag: string;
}

const PROMPT_OPTIONS: Record<AssistantLanguage, PromptOption[]> = {
  auto: [
    { text: "How can I protect my wheat crop?", badge: "Wheat Protection", langTag: "EN" },
    { text: "Mere chawal ke patton par bhure daag hain.", badge: "Rice Brown Spot", langTag: "Hinglish" },
    { text: "मेरे आलू के पौधों में झुलसा रोग के लक्षण हैं।", badge: "Potato Blight", langTag: "हिन्दी" },
    { text: "Tell me how to control tomato early blight.", badge: "Tomato Blight", langTag: "EN" },
    { text: "गेहूँ में पीला रतुआ कैसे रोकें?", badge: "Wheat Yellow Rust", langTag: "हिन्दी" },
    { text: "Mujhe rice blast ke symptoms samjhao.", badge: "Rice Blast", langTag: "Hinglish" },
  ],
  english: [
    { text: "How can I protect my wheat crop?", badge: "Wheat", langTag: "EN" },
    { text: "Tell me how to control tomato early blight.", badge: "Tomato", langTag: "EN" },
    { text: "What causes yellow spots on crop leaves?", badge: "Foliar Care", langTag: "EN" },
    { text: "How can I identify and control rice blast disease?", badge: "Rice", langTag: "EN" },
  ],
  hindi: [
    { text: "गेहूँ में पीला रतुआ कैसे रोकें?", badge: "गेहूँ", langTag: "हिन्दी" },
    { text: "मेरे आलू के पौधों में झुलसा रोग के लक्षण हैं।", badge: "आलू", langTag: "हिन्दी" },
    { text: "टमाटर में अगेती झुलसा का क्या उपचार है?", badge: "टमाटर", langTag: "हिन्दी" },
    { text: "धान के पत्तों पर भूरे दाग क्यों आते हैं?", badge: "चावल", langTag: "हिन्दी" },
  ],
  hinglish: [
    { text: "Mere chawal ke patton par bhure daag hain.", badge: "Chawal", langTag: "Hinglish" },
    { text: "Mujhe rice blast ke symptoms samjhao.", badge: "Rice Blast", langTag: "Hinglish" },
    { text: "Mere tamatar ke patton par peele daag aa rahe hain.", badge: "Tamatar", langTag: "Hinglish" },
    { text: "Aaloo me jhulsa rokne ke liye kaunsa spray karein?", badge: "Aloo", langTag: "Hinglish" },
  ],
};

export default function AIAssistant({ onSelectTab, currentUser, onOpenAuth }: AIAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Farm context
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  // Multilingual Selector State (auto, english, hindi, hinglish)
  const [selectedLang, setSelectedLang] = useState<AssistantLanguage>("auto");

  // Voice Assistant State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">("en-IN");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Detect browser Web Speech API support
    if (typeof window !== "undefined") {
      const hasSpeech = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
      setSpeechSupported(hasSpeech);

      // Load saved language preference
      const savedLang = localStorage.getItem("farmdoctor_assistant_lang_pref");
      if (savedLang && ["auto", "english", "hindi", "hinglish"].includes(savedLang)) {
        setSelectedLang(savedLang as AssistantLanguage);
        if (savedLang === "hindi") setSpeechLang("hi-IN");
        else if (savedLang === "hinglish") setSpeechLang("hi-IN");
        else if (savedLang === "english") setSpeechLang("en-IN");
      }
    }

    return () => {
      // Cleanup speech synthesis on unmount
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadHistory();
      loadFarms();
    } else {
      setMessages([]);
      setFarms([]);
    }
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleLanguageSelect = (lang: AssistantLanguage) => {
    setSelectedLang(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("farmdoctor_assistant_lang_pref", lang);
    }
    if (lang === "hindi") {
      setSpeechLang("hi-IN");
    } else if (lang === "english") {
      setSpeechLang("en-IN");
    } else if (lang === "hinglish") {
      setSpeechLang("hi-IN");
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await fetchAssistantHistory();
      setMessages(history);
    } catch {
      // Ignored
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadFarms = async () => {
    try {
      const myFarms = await fetchMyFarms();
      setFarms(myFarms);
      if (myFarms.length > 0) {
        setSelectedFarmId(myFarms[0].id);
      }
    } catch {
      // Ignored
    }
  };

  // ==========================================
  // Voice Input (Speech-to-Text)
  // ==========================================
  const startListening = () => {
    setSpeechError(null);
    setInterimTranscript("");

    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError(
        selectedLang === "english"
          ? "Your browser does not support Speech Recognition. Please use Google Chrome or Microsoft Edge."
          : "Aapka browser Speech Recognition support nahi karta. Kripya Google Chrome ya Microsoft Edge use karein."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      // Set recognition language based on current selection
      recognition.lang = selectedLang === "hindi" ? "hi-IN" : selectedLang === "english" ? "en-IN" : speechLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setInterimTranscript(currentTranscript);
        setInputMessage(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setSpeechError(
            "Microphone permission denied. Please allow microphone access in your browser settings."
          );
        } else if (event.error === "no-speech") {
          setSpeechError("No speech heard. Please tap the mic button and try speaking again.");
        } else if (event.error === "network") {
          setSpeechError("Speech recognition network error. Please check your connection.");
        } else {
          setSpeechError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e: any) {
      setIsListening(false);
      setSpeechError("Microphone could not start: " + (e?.message || ""));
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  // ==========================================
  // Text-to-Speech (Voice Output)
  // ==========================================
  const speakText = (text: string, responseLang?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    // Clean markdown links / stars for speech synthesis
    const cleanText = text
      .replace(/[*_#`[\]()]/g, " ")
      .replace(/http\S+/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Determine voice dialect based on detected or passed language
    let targetLangCode = "en-IN";
    const effectiveLang = responseLang || selectedLang;
    if (effectiveLang === "hindi" || /[\u0900-\u097F]/.test(cleanText)) {
      targetLangCode = "hi-IN";
    } else if (effectiveLang === "hinglish") {
      targetLangCode = "hi-IN";
    } else {
      targetLangCode = "en-IN";
    }

    utterance.lang = targetLangCode;
    utterance.rate = 0.95; // comfortable natural speaking rate

    const voices = window.speechSynthesis.getVoices();
    const targetVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith(targetLangCode.toLowerCase())) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(targetLangCode.split("-")[0])) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en"));

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // ==========================================
  // Sending Message
  // ==========================================
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || inputMessage).trim();
    if (!textToSend) return;

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    stopListening();

    const tempUserMsg: AssistantMessage = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage("");
    setInterimTranscript("");
    setLoading(true);
    setError(null);

    try {
      const response = await sendAssistantMessage({
        message: textToSend,
        farm_id: selectedFarmId || undefined,
        include_weather: true,
        language_preference: selectedLang,
      });

      const assistantTurn: AssistantMessage = {
        id: response.message_id || `turn_${Date.now()}`,
        role: "assistant",
        content: response.reply,
        citations: response.citations,
        suggested_followups: response.follow_up_questions,
        created_at: response.timestamp || new Date().toISOString(),
        detected_language: response.detected_language,
      };

      setMessages((prev) => [...prev, assistantTurn]);

      // Adjust voice recognition dialect dynamically based on assistant output
      if (response.detected_language === "hindi") {
        setSpeechLang("hi-IN");
      } else if (response.detected_language === "english") {
        setSpeechLang("en-IN");
      } else if (response.detected_language === "hinglish") {
        setSpeechLang("hi-IN");
      }

      // If auto-speak is enabled, read response aloud in matching dialect
      if (autoSpeakEnabled) {
        speakText(response.reply, response.detected_language);
      }
    } catch (err: any) {
      setError(err?.message || "Assistant could not answer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!currentUser) return;
    stopSpeaking();
    stopListening();
    try {
      await clearAssistantHistory();
      setMessages([]);
    } catch {
      // Ignored
    }
  };

  const getLanguageLabel = (lang?: string) => {
    if (lang === "hindi") return "हिंदी (Hindi)";
    if (lang === "hinglish") return "Hinglish";
    if (lang === "english") return "English";
    return "English";
  };

  const currentPrompts = PROMPT_OPTIONS[selectedLang] || PROMPT_OPTIONS.auto;

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[580px] flex-col rounded-3xl border border-[#E5EAE2] bg-white shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5EAE2] bg-[#FAFBF9] px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#174D36]">Kisan AI Farming Assistant</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-[10px] font-bold text-[#16834A]">
                <Sparkles className="h-2.5 w-2.5" />
                Auto Multilingual
              </span>
            </div>
            <p className="text-xs text-[#55695E]">
              Grounded in verified agricultural science. Speaks and responds in English, हिन्दी, or Hinglish.
            </p>
          </div>
        </div>

        {/* Controls: Farm Context, 4-Way Language Selector & Voice Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {farms.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[#D5E6D5] bg-white px-2.5 py-1 text-xs">
              <Sprout className="h-3.5 w-3.5 text-[#16834A]" />
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="bg-transparent font-medium text-[#174D36] focus:outline-none text-xs"
              >
                <option value="">General Query (No Farm)</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.crop_name} - {f.growth_stage})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4-Way Language Selector */}
          <div className="flex items-center rounded-xl border border-[#D5E6D5] bg-white p-0.5 text-xs shadow-2xs">
            <button
              onClick={() => handleLanguageSelect("auto")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedLang === "auto"
                  ? "bg-[#174D36] text-white shadow-xs"
                  : "text-[#55695E] hover:text-[#174D36]"
              }`}
              title="Automatically detect language from each user message"
            >
              <Sparkles className="h-3 w-3" />
              <span>Auto Detect</span>
            </button>
            <button
              onClick={() => handleLanguageSelect("english")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedLang === "english"
                  ? "bg-[#174D36] text-white shadow-xs"
                  : "text-[#55695E] hover:text-[#174D36]"
              }`}
              title="Respond strictly in English"
            >
              English
            </button>
            <button
              onClick={() => handleLanguageSelect("hindi")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedLang === "hindi"
                  ? "bg-[#174D36] text-white shadow-xs"
                  : "text-[#55695E] hover:text-[#174D36]"
              }`}
              title="Respond strictly in Hindi (Devanagari)"
            >
              हिन्दी
            </button>
            <button
              onClick={() => handleLanguageSelect("hinglish")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedLang === "hinglish"
                  ? "bg-[#174D36] text-white shadow-xs"
                  : "text-[#55695E] hover:text-[#174D36]"
              }`}
              title="Respond strictly in Hinglish (Roman script)"
            >
              Hinglish
            </button>
          </div>

          {/* Auto Read Aloud Toggle */}
          <button
            onClick={() => {
              if (isSpeaking) stopSpeaking();
              setAutoSpeakEnabled(!autoSpeakEnabled);
            }}
            className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
              autoSpeakEnabled
                ? "border-[#16834A] bg-[#E5EFE5] text-[#174D36]"
                : "border-[#D5DDD2] bg-white text-[#55695E] hover:text-[#174D36]"
            }`}
            title="Automatically read assistant responses aloud"
          >
            {autoSpeakEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#16834A]" /> : <VolumeX className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Voice Out</span>
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 rounded-xl border border-[#E5EAE2] bg-white px-2.5 py-1.5 text-xs font-medium text-[#55695E] hover:bg-rose-50 hover:text-rose-700"
              title="Clear conversation"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Browser Compatibility Notice */}
      {!speechSupported && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
          <span>
            ℹ️ Browser Voice Notice: Web Speech recognition is best supported in Google Chrome and Microsoft Edge on Desktop and Android.
          </span>
        </div>
      )}

      {/* Active Voice Speaking Indicator Banner */}
      {isSpeaking && (
        <div className="flex items-center justify-between border-b border-[#D1E7D1] bg-[#E5EFE5] px-4 py-2 text-xs text-[#174D36] animate-pulse">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#16834A]" />
            <span className="font-semibold">AI Assistant is speaking response aloud...</span>
          </div>
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-50"
          >
            <Square className="h-3 w-3 fill-rose-700" />
            <span>Stop Speaking</span>
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E5EFE5] text-[#16834A]">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#174D36]">
              {selectedLang === "english"
                ? "Hello Farmer! I am your FarmDoctor AI Assistant."
                : selectedLang === "hindi"
                ? "नमस्ते किसान भाई! मैं आपका FarmDoctor AI सहायक हूँ।"
                : "Namaste Kisan Bhai! Main FarmDoctor AI Assistant hoon."}
            </h3>
            <p className="mt-1 max-w-lg text-xs text-[#55695E]">
              {selectedLang === "english"
                ? "Ask questions about crop diseases, pest symptoms, fertilizer, or weather. Type or speak in English, Hindi, or Hinglish — I will automatically detect and reply in the same language."
                : selectedLang === "hindi"
                ? "अपनी फसल के रोग, कीट, पत्तियों के पीलेपन या मौसम की जानकारी प्राप्त करें। आप हिंदी, हिंग्लिश या अंग्रेजी में पूछ सकते हैं।"
                : "Apni fasal ke lakshan, keet, ya mausam ke baare me poochne ke liye neeche diye gaye prompts chunein ya microphone button dabakar bolen."}
            </p>

            {/* Quick Prompts */}
            <div className="mt-6 w-full max-w-xl space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-[#78887E] uppercase tracking-wider">
                  Suggested Questions:
                </span>
                <span className="text-[10px] text-[#16834A] font-semibold">
                  Mode: {selectedLang === "auto" ? "✨ Auto Detect" : selectedLang.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {currentPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt.text)}
                    className="flex flex-col gap-1 rounded-2xl border border-[#D5E6D5] bg-[#FAFBF9] p-3 text-xs text-[#174D36] hover:bg-[#E5EFE5] hover:border-[#16834A] transition text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="inline-flex items-center gap-1 font-bold text-[11px] text-[#16834A]">
                        <Sparkles className="h-3 w-3" />
                        {prompt.badge}
                      </span>
                      <span className="rounded-md bg-white border border-[#D5E6D5] px-1.5 py-0.5 text-[9px] font-bold text-[#55695E]">
                        {prompt.langTag}
                      </span>
                    </div>
                    <span className="leading-snug">{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  msg.role === "user"
                    ? "bg-[#174D36] text-white"
                    : "bg-[#E5EFE5] text-[#16834A]"
                }`}
              >
                {msg.role === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed shadow-xs ${
                  msg.role === "user"
                    ? "bg-[#174D36] text-white"
                    : "border border-[#E5EAE2] bg-[#FAFBF9] text-[#142F28]"
                }`}
              >
                {/* Header tag for language and voice button */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-black/5">
                  <div className="flex items-center gap-1.5">
                    {msg.role === "assistant" && msg.detected_language && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#E5EFE5] px-2 py-0.5 text-[10px] font-bold text-[#16834A]">
                        <Globe className="h-2.5 w-2.5" />
                        {getLanguageLabel(msg.detected_language)}
                      </span>
                    )}
                    {msg.role === "assistant" && !msg.detected_language && (
                      <span className="rounded-md bg-[#E5EFE5] px-2 py-0.5 text-[10px] font-bold text-[#16834A]">
                        AI Guidance
                      </span>
                    )}
                    {msg.role === "user" && (
                      <span className="text-[10px] text-emerald-100 font-medium">Farmer Question</span>
                    )}
                  </div>

                  {/* Read Aloud button for assistant replies */}
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => speakText(msg.content, msg.detected_language)}
                      className="shrink-0 rounded-lg p-1 text-[#78887E] hover:text-[#16834A] hover:bg-[#E5EFE5] transition"
                      title="Bol kar suniye (Read aloud in matching dialect)"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Message Content */}
                <div className="whitespace-pre-line font-normal">{msg.content}</div>

                {/* Follow-up Questions Chips */}
                {msg.suggested_followups && msg.suggested_followups.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#E5EAE2] space-y-1.5">
                    <span className="text-[10px] font-bold text-[#78887E] uppercase tracking-wider">
                      Follow-up Suggestions:
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {msg.suggested_followups.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => handleSend(q)}
                          className="text-left rounded-lg bg-white border border-[#D5E6D5] px-2.5 py-1 text-[11px] text-[#174D36] hover:bg-[#E5EFE5] transition"
                        >
                          💬 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#E5EAE2] flex flex-wrap gap-1.5">
                    {msg.citations.map((c, cIdx) => (
                      <a
                        key={cIdx}
                        href={c.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-white border border-[#E5EAE2] px-2 py-0.5 text-[10px] text-[#16834A] hover:underline"
                      >
                        <span>{c.publisher}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E5EFE5] text-[#16834A]">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl border border-[#E5EAE2] bg-[#FAFBF9] p-3 text-xs text-[#55695E] flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#16834A]" />
              <span>
                {selectedLang === "english"
                  ? "Kisan AI Assistant is analyzing your query against the agricultural knowledge base..."
                  : selectedLang === "hindi"
                  ? "किसान AI सहायक आपकी समस्या का वैज्ञानिक कृषि ज्ञानकोष से मिलान कर रहा है..."
                  : "Kisan AI Assistant is analyzing your query against the agricultural knowledge base..."}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {speechError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-center justify-between">
            <span>{speechError}</span>
            <button
              onClick={() => setSpeechError(null)}
              className="text-xs font-bold text-amber-900 underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Listening Banner */}
      {isListening && (
        <div className="border-t border-rose-200 bg-rose-50/90 px-4 py-3 text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <div>
              <span className="font-bold">
                Listening... Speaking in (
                {selectedLang === "hindi"
                  ? "हिन्दी"
                  : selectedLang === "english"
                  ? "English"
                  : speechLang === "hi-IN"
                  ? "हिन्दी/Hinglish"
                  : "English"}
                ):{" "}
              </span>
              <span className="italic">{interimTranscript || "Speak your farming question..."}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={stopListening}
              className="rounded-xl border border-rose-300 bg-white px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              Done Speaking
            </button>
          </div>
        </div>
      )}

      {/* Input Form with Voice Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-[#E5EAE2] bg-white p-3 sm:p-4"
      >
        <div className="relative flex items-center gap-2">
          {/* Voice Input Trigger Button */}
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition shadow-xs ${
              isListening
                ? "bg-rose-600 text-white animate-pulse"
                : "border border-[#D5E6D5] bg-[#E5EFE5] text-[#16834A] hover:bg-[#d2e4d2]"
            }`}
            title={isListening ? "Stop listening" : "Tap to speak your question in any language"}
            aria-label="Voice input"
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={
              isListening
                ? "Listening... Speak your question..."
                : selectedLang === "english"
                ? "Ask a farming question (e.g. 'How can I protect my wheat crop?')"
                : selectedLang === "hindi"
                ? "कृषि प्रश्न पूछें (जैसे: 'गेहूँ में पीला रतुआ कैसे रोकें?')"
                : "Poochiye in English, हिन्दी, or Hinglish (e.g. 'Mere chawal ke patton par bhure daag hain')"
            }
            disabled={loading}
            className="w-full rounded-2xl border border-[#E5EAE2] bg-[#F8F8F2] py-3 pl-4 pr-12 text-xs text-[#142F28] placeholder-[#78887E] focus:border-[#16834A] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#16834A] disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#16834A] text-white shadow-xs hover:bg-[#137240] transition disabled:opacity-40"
            aria-label="Send query"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[#78887E]">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3 w-3 text-[#16834A]" />
            <span>
              Mode:{" "}
              <strong className="text-[#174D36]">
                {selectedLang === "auto"
                  ? "Auto Detect (English / हिन्दी / Hinglish)"
                  : selectedLang.toUpperCase()}
              </strong>
            </span>
          </div>
          <span>Verified ICAR / University Agritech Knowledge Base Grounded</span>
        </div>
      </form>
    </div>
  );
}
