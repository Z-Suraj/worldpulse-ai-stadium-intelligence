import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UserRole } from "../types";
import {
  Send,
  Mic,
  Sparkles,
  Bot,
  User,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CopilotProps {
  activeRole: UserRole;
  language: string;
  onLanguageChange: (lang: string) => void;
  stadiumState: any;
}

// Robust language identifier for multilingual speech transcript grounding
const detectLanguage = (text: string): string => {
  if (!text) return "en-US";
  
  // Devanagari script for Hindi
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi-IN";
  }
  
  // Bengali script
  if (/[\u0980-\u09FF]/.test(text)) {
    return "bn-IN";
  }
  
  // Arabic script
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return "ar-SA";
  }

  const lower = text.toLowerCase();

  // Transliterated / Phonetic Hindi
  const hindiWords = [
    "namaste", "kaise", "bhai", "shukriya", "stadium", "ticket", "gate", "kya", "hein", "dhanyawad", "aap", "tum", "mera", "mujhe", "batao", "kahan"
  ];
  const containsHindi = hindiWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(lower);
  });
  if (containsHindi) return "hi-IN";

  // Transliterated / Phonetic Bengali
  const bengaliWords = [
    "namaskar", "bhalo", "ami", "tumi", "kemon", "achen", "shob", "kobe", "dhanyabad"
  ];
  const containsBengali = bengaliWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(lower);
  });
  if (containsBengali) return "bn-IN";

  // Transliterated Arabic
  const arabicWords = [
    "marhaban", "ahlan", "shukran", "kaifa", "mubarah", "bawaaba", "shukran", "habibi"
  ];
  const containsArabic = arabicWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(lower);
  });
  if (containsArabic) return "ar-SA";

  // Spanish words and accents
  const spanishWords = [
    "hola", "como", "estas", "gracias", "estadio", "puerta", "partido", "futbol", "boletos", 
    "salida", "entrada", "donde", "cuando", "quien", "que", "por", "favor", "buenos", "noches", "tardes", "dias"
  ];
  const containsSpanish = spanishWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(lower);
  }) || /[áéíóúüñ¿¡]/.test(lower);
  if (containsSpanish) return "es-MX";

  // French words and accents
  const frenchWords = [
    "bonjour", "salut", "comment", "allez", "vous", "merci", "stade", "porte", "match", "billet", 
    "sortie", "entree", "s'il", "te", "plait", "oui", "non", "ou", "quand", "pourquoi", "qui"
  ];
  const containsFrench = frenchWords.some(w => {
    const regex = new RegExp(`\\b${w}\\b`, "i");
    return regex.test(lower);
  }) || /[éèàùçâêîôûëïüœæ]/.test(lower);
  if (containsFrench) return "fr-FR";

  return "en-US";
};

export default function CopilotPanel({
  activeRole,
  language,
  onLanguageChange,
  stadiumState,
}: CopilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize welcome message when role changes
  useEffect(() => {
    const liveTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    setMessages([
      {
        id: "welcome",
        sender: "copilot",
        text: `👋 Bienvenue! I am your **FIFA Copilot** for the World Cup 2026.

I am fully synchronized with **MetLife Stadium's live Digital Twin**.

How can I assist your ${activeRole} experience today?`,
        timestamp: liveTime,
      },
    ]);
  }, [activeRole]);

  // Autoscroll chat
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      try {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      } catch (e) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // Simulate or execute audio wave when microphone is on
  useEffect(() => {
    if (!isRecording) return;
    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(147, 51, 234, 0.8)"; // Premium purple wave
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 +
          Math.sin(x * 0.05 + phase) * 12 * Math.sin(x * 0.01) +
          Math.sin(x * 0.12 - phase) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(6, 182, 212, 0.5)"; // cyan accent
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y =
          canvas.height / 2 +
          Math.sin(x * 0.03 - phase * 0.7) * 8 * Math.sin(x * 0.02) +
          Math.cos(x * 0.08 + phase) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += 0.15;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isRecording]);

  // Set preset prompt suggestions based on user role
  const getPresetPrompts = (): string[] => {
    switch (activeRole) {
      case "Fan":
        return [
          "Which gate has the shortest queue?",
          "How do I reach parking zone C?",
          "Where is Azteca Tacos located?",
          "Show emergency exits",
        ];
      case "Volunteer":
        return [
          "Show pending emergency tasks",
          "What is my next shift schedule?",
          "Protocols for lost-and-found items",
          "Check local transit status",
        ];
      case "Operations":
        return [
          "Predict crowd density after halftime",
          "Analyze Gate A bottleneck risk",
          "Give energy conservation recommendations",
          "Generate daily incident report summary",
        ];
      case "Organizer":
        return [
          "Summarize sustainability index scores",
          "Compare Azteca vs MetLife attendance",
          "Provide global operational KPI summary",
          "Generate executive safety memo",
        ];
      default:
        return ["Gate waiting times", "Event details"];
    }
  };

  // Handle preset click
  const handlePresetClick = (prompt: string) => {
    sendMessage(prompt);
  };

  // Clear chat history
  const clearChat = () => {
    const liveTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    setMessages([
      {
        id: "welcome-reset",
        sender: "copilot",
        text: `Chat refreshed. Standby for queries. How can I support your operations as **${activeRole}**?`,
        timestamp: liveTime,
      },
    ]);
  };

  // Simulate Mic Voice Commands
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      const voiceOptions: Record<UserRole, string[]> = {
        Fan: [
          "Where is the vegetarian food?",
          "Which gate is least crowded?",
          "How to navigate to seat Section 110?",
        ],
        Volunteer: [
          "Give me volunteer emergency instructions",
          "What is my task assignment?",
        ],
        Operations: [
          "Report gate saturation summary",
          "Suggest transit re-routing",
        ],
        Organizer: [
          "Generate World Cup tournament KPI update",
          "Show sustainability energy yield",
        ],
        Medical: [
          "Show active ambulance coordinates",
          "Replenish emergency oxygen supply",
          "Recommend route to avoid gate A bottleneck",
        ],
      };
      const queries = voiceOptions[activeRole] || ["How's the stadium status?"];
      const selectedQuery = queries[Math.floor(Math.random() * queries.length)];
      sendMessage(selectedQuery);
    } else {
      setIsRecording(true);
    }
  };

  // Send message API trigger
  const sendMessage = async (textToSend?: string) => {
    const queryText = textToSend || inputValue;
    if (!queryText.trim()) return;

    // Detect language of the input query
    const detectedLang = detectLanguage(queryText);
    if (detectedLang !== language && onLanguageChange) {
      onLanguageChange(detectedLang);
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const formattedHistory = messages
        .filter((m) => m.id !== "welcome" && m.id !== "welcome-reset")
        .slice(-6)
        .map((m) => ({
          role: m.sender === "user" ? "user" : "model",
          text: m.text,
        }));

      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          history: formattedHistory,
          role: activeRole,
          language: detectedLang,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Invalid response content-type: ${contentType}`);
      }
      const data = await res.json();

      const copilotMsg: ChatMessage = {
        id: `cop-${Date.now()}`,
        sender: "copilot",
        text: data.response || "No response received.",
        confidence: data.confidence || "High",
        intent: data.intent || "General Help",
        groundedSources: data.groundedSources || ["Stadium Telemetry Network"],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      console.log("Copilot connection error (using standard local fallback response):", err.message || err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "copilot",
          text: `⚠️ **Server connection issue.** Standard simulator answer:
            
MetLife gates waiting times:
- Gate C: 3 Mins wait (Optimal)
- Gate B: 8 Mins wait (Optimal)
- Gate D: 17 Mins wait (Warning)
- Gate A: 24 Mins wait (Critical congestion)

Please configure your \`GEMINI_API_KEY\` to activate custom natural language answers!`,
          confidence: "High",
          intent: "Stadium Services",
          groundedSources: ["Local Simulator Datastore"],
          timestamp: "Now",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border border-purple-500/10 glass-panel-glow overflow-hidden shadow-2xl">
      {/* Copilot Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-950/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600/20 p-2 rounded-lg border border-purple-500/30 text-purple-400">
            <Bot className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm tracking-wide text-white flex items-center gap-1.5">
              FIFA Copilot
              <span className="text-[9px] bg-purple-900/80 text-purple-300 font-mono px-1 rounded border border-purple-800 uppercase font-medium">
                GenAI
              </span>
            </h3>
            <span className="text-[10px] text-gray-400 block font-mono">
              Live Stadium Grounding
            </span>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${msg.sender === "user" ? "bg-cyan-950/80 border-cyan-800 text-cyan-400" : "bg-purple-950/80 border-purple-800 text-purple-400"}`}>
              {msg.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble contents */}
            <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${msg.sender === "user" ? "bg-cyan-900/30 text-cyan-100 border border-cyan-900/50" : "bg-gray-900/50 text-gray-200 border border-gray-800/80"}`}>
              {/* Visual Grounding ribbon for Copilot replies */}
              {msg.sender === "copilot" && (msg.intent || msg.confidence) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-800/50 text-[10px] text-gray-400">
                  {msg.intent && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/50 text-purple-300 border border-purple-900/40 font-mono text-[9px]">
                      {msg.intent}
                    </span>
                  )}
                  {msg.confidence && (
                    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[9px] ${
                      msg.confidence === "High" 
                        ? "bg-emerald-950/50 text-emerald-300 border border-emerald-900/40" 
                        : msg.confidence === "Medium"
                          ? "bg-amber-950/50 text-amber-300 border border-amber-900/40"
                          : "bg-rose-950/50 text-rose-300 border border-rose-900/40"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        msg.confidence === "High" 
                          ? "bg-emerald-400 animate-pulse" 
                          : msg.confidence === "Medium"
                            ? "bg-amber-400"
                            : "bg-rose-400"
                      }`} />
                      {msg.confidence} Confidence
                    </span>
                  )}
                </div>
              )}

              {/* Parse bold and linebreaks simply */}
              <div className="space-y-1.5 font-sans">
                {msg.text.split("\n").map((para, i) => {
                  if (!para.trim()) return <div key={i} className="h-2" />;

                  if (para.startsWith("- ") || para.startsWith("* ")) {
                    const formattedBullet = para.substring(2).replace(/\*\*(.*?)\*\*/g, "$1");
                    return (
                      <div key={i} className="flex items-start gap-1.5 pl-2">
                        <span className="text-purple-400 text-sm leading-none">•</span>
                        <span>{formattedBullet}</span>
                      </div>
                    );
                  }

                  const parts = para.split(/\*\*(.*?)\*\*/g);
                  const isHeader = para.startsWith("###");
                  const content = parts.map((part, index) => {
                    if (index % 2 === 1) {
                      return <strong key={index} className="text-white font-semibold">{part}</strong>;
                    }
                    return part;
                  });

                  return (
                    <p key={i} className={isHeader ? "text-sm font-bold text-white pt-2 font-display" : ""}>
                      {isHeader ? para.replace("###", "") : content}
                    </p>
                  );
                })}
              </div>

              {/* Grounded sources and timestamp info row */}
              <div className="mt-2 pt-1.5 border-t border-gray-800/40 flex items-center justify-between gap-2 text-[9px]">
                {msg.sender === "copilot" && msg.groundedSources && msg.groundedSources.length > 0 ? (
                  <span className="text-gray-500 font-mono truncate max-w-[70%]" title={msg.groundedSources.join(", ")}>
                    Grounded: {msg.groundedSources.join(", ")}
                  </span>
                ) : (
                  <span />
                )}
                <span className="text-gray-500 font-mono shrink-0">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border bg-purple-950/80 border-purple-800 text-purple-400 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-3 rounded-2xl max-w-[80%] space-y-2">
              <div className="h-3 w-40 bg-gray-800 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-800 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-800 rounded animate-pulse" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recording Modal simulator overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "80px" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2.5 bg-gray-950 border-t border-cyan-950/40 flex flex-col justify-center items-center gap-2"
          >
            <div className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping" />
              Listening to voice query (accent-adapted)
            </div>
            <canvas ref={waveCanvasRef} width="320" height="30" className="w-full max-w-[320px] opacity-90" />
            <button
              onClick={() => setIsRecording(false)}
              className="text-[9px] font-mono text-gray-500 hover:text-white uppercase cursor-pointer"
            >
              Cancel Recording
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preset Prompt suggestion pills */}
      <div className="p-2 border-t border-gray-900 bg-gray-950/50">
        <div className="text-[10px] font-mono text-gray-500 uppercase px-2 mb-1">
          Suggestions ({activeRole})
        </div>
        <div className="flex flex-wrap gap-1 px-1 max-h-24 overflow-y-auto">
          {getPresetPrompts().map((p, idx) => (
            <button
              key={idx}
              onClick={() => handlePresetClick(p)}
              className="text-[10px] bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-purple-950/30 hover:border-purple-900/40 px-2 py-1 rounded-full transition-all text-left truncate max-w-full cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input box */}
      <div className="p-3 border-t border-gray-950 bg-gray-950/90 flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Query FIFA Copilot..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-600/50"
          />
          <button
            onClick={() => sendMessage()}
            className="absolute right-2 top-1.5 p-1 text-purple-400 hover:text-white hover:bg-purple-950/30 rounded-lg transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
