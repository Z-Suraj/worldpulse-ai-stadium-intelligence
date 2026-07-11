import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UserRole } from "../types";
import {
  Send,
  Mic,
  Languages,
  Sparkles,
  Bot,
  User,
  Volume2,
  Trash2,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: "crowd" | "transit" | "safety" | "weather" | "facilities" | "power";
  priority: "Low" | "Medium" | "High" | "Critical";
  confidenceScore: number;
  reasoning: string;
  role: string;
  actionLabel: string;
}

interface CopilotProps {
  activeRole: UserRole;
  language: string;
  onLanguageChange: (lang: string) => void;
  stadiumState: any;
}

export default function CopilotPanel({
  activeRole,
  language,
  onLanguageChange,
  stadiumState,
}: CopilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // Decision Engine state hooks
  const [activeTab, setActiveTab] = useState<"chat" | "decision">("chat");
  const [insights, setInsights] = useState<{ summary: string; recommendations: Recommendation[]; timestamp: string } | null>(null);
  const [isEngineLoading, setIsEngineLoading] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes countdown
  const [acknowledgedRecs, setAcknowledgedRecs] = useState<Record<string, boolean>>({});
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  // Fetch insights from our upgraded Stadium Decision Engine backend
  const fetchDecisionInsights = async () => {
    setIsEngineLoading(true);
    try {
      const res = await fetch("/api/decision-engine/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: activeRole }),
      });
      const data = await res.json();
      setInsights({
        summary: data.summary,
        recommendations: data.recommendations,
        timestamp: data.timestamp,
      });
      setCountdown(300); // Reset the 5-minute timer
    } catch (err) {
      console.error("Error fetching decision insights:", err);
    } finally {
      setIsEngineLoading(false);
    }
  };

  // Trigger load when component mounts or activeRole changes
  useEffect(() => {
    fetchDecisionInsights();
  }, [activeRole]);

  // Handle countdown interval tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDecisionInsights();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeRole]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

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
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Autoscroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

  const getLanguageLabel = (code: string) => {
    const langs: Record<string, string> = {
      English: "English",
      Spanish: "Español",
      French: "Français",
      Portuguese: "Português",
      Hindi: "हिन्दी",
      Arabic: "العربية",
    };
    return langs[code] || "English";
  };

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
      ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        // Multi-layered sine wave for sci-fi look
        const y =
          canvas.height / 2 +
          Math.sin(x * 0.05 + phase) * 12 * Math.sin(x * 0.01) +
          Math.sin(x * 0.12 - phase) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(168, 85, 247, 0.5)";
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

  // Simulate Mic Voice Commands
  const toggleRecording = () => {
    if (isRecording) {
      // Stopped recording -> Send a simulated query
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
      };
      const queries = voiceOptions[activeRole];
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
      // Construct conversation history to pass to Gemini
      const formattedHistory = messages
        .filter((m) => m.id !== "welcome" && m.id !== "welcome-reset")
        .slice(-6) // Pass last 6 messages
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
          language,
        }),
      });

      const data = await res.json();

      const copilotMsg: ChatMessage = {
        id: `cop-${Date.now()}`,
        sender: "copilot",
        text: data.response || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err: any) {
      console.error(err);
      // Fallback
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

        {/* Translation selector & clear controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={clearChat}
            className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sci-fi Tab Switcher */}
      <div className="flex border-b border-gray-900 bg-gray-950/40 p-1">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "chat" ? "bg-purple-600/10 border border-purple-500/30 text-purple-400 font-semibold" : "text-gray-400 hover:text-gray-200"}`}
        >
          <Bot className="w-3.5 h-3.5" />
          FIFA Copilot Chat
        </button>
        <button
          onClick={() => setActiveTab("decision")}
          className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === "decision" ? "bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 font-semibold" : "text-gray-400 hover:text-gray-200"}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Decision Engine HUD
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "decision" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-950/20">
          {/* Engine Header / Subtitle */}
          <div className="flex items-center justify-between border-b border-gray-900 pb-2">
            <span className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              Real-time Decision Matrix ({activeRole})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Refreshed {insights?.timestamp || "just now"}
              </span>
              <button
                onClick={fetchDecisionInsights}
                disabled={isEngineLoading}
                className="p-1 hover:bg-gray-900 rounded text-gray-400 hover:text-white transition-colors"
                title="Force Regenerate Insights"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEngineLoading ? "animate-spin text-cyan-400" : ""}`} />
              </button>
            </div>
          </div>

          {/* AI-Generated Summary Card */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 to-gray-950 p-4 shadow-xl">
            <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-cyan-400/60 bg-cyan-950/40 border-l border-b border-cyan-500/10 rounded-bl-lg uppercase tracking-widest">
              AI Briefing
            </div>
            
            <div className="space-y-2 text-xs leading-relaxed text-gray-200">
              {isEngineLoading && !insights ? (
                <div className="space-y-2 py-3">
                  <div className="h-4 w-1/3 bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-full bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-gray-800 rounded animate-pulse" />
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold font-display text-white border-b border-gray-900 pb-1.5 flex items-center gap-1">
                    🧠 AI Stadium Briefing
                    {insights?.isFallback && (
                      <span className="text-[8px] bg-amber-900/40 text-amber-300 font-mono border border-amber-800/60 px-1 rounded uppercase">
                        Offline Sim
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2 text-xs text-gray-300">
                    {insights?.summary.split("\n").map((line, idx) => {
                      if (!line.trim()) return <div key={idx} className="h-1" />;
                      if (line.startsWith("###")) {
                        return <h5 key={idx} className="font-semibold text-white mt-2 pt-1 font-sans">{line.replace("###", "")}</h5>;
                      }
                      if (line.startsWith("* ") || line.startsWith("- ")) {
                        const content = line.substring(2).replace(/\*\*(.*?)\*\*/g, "$1");
                        return (
                          <div key={idx} className="flex items-start gap-1.5 pl-1.5">
                            <span className="text-cyan-400 mt-1">•</span>
                            <span>{content}</span>
                          </div>
                        );
                      }
                      // Handle bold replacement in standard text lines
                      const parts = line.split(/\*\*(.*?)\*\*/g);
                      return (
                        <p key={idx}>
                          {parts.map((p, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{p}</strong> : p)}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Countdown bar */}
            <div className="mt-4 pt-2 border-t border-gray-900/60 flex items-center justify-between text-[9px] font-mono text-gray-500">
              <span>5-MIN AI BRIEFING CADENCE</span>
              <span className="text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900 font-mono">
                Next update in {formatTime(countdown)}
              </span>
            </div>
          </div>

          {/* Operational Recommendations title */}
          <div className="pt-2">
            <h4 className="text-xs font-display font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Operational Directives
            </h4>

            {isEngineLoading && !insights ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="p-3 bg-gray-900/30 border border-gray-900 rounded-xl space-y-2">
                    <div className="h-3 w-1/2 bg-gray-800 rounded animate-pulse" />
                    <div className="h-2 w-full bg-gray-800 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {insights?.recommendations.map((rec) => {
                  const isAcknowledged = acknowledgedRecs[rec.id];
                  const isExpanded = expandedRecId === rec.id;
                  
                  // Category color maps
                  const categoryColors: Record<string, { bg: string, text: string, border: string }> = {
                    crowd: { bg: "bg-red-950/40", text: "text-red-400", border: "border-red-900/40" },
                    transit: { bg: "bg-blue-950/40", text: "text-blue-400", border: "border-blue-900/40" },
                    safety: { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-900/40" },
                    weather: { bg: "bg-cyan-950/40", text: "text-cyan-400", border: "border-cyan-900/40" },
                    facilities: { bg: "bg-purple-950/40", text: "text-purple-400", border: "border-purple-900/40" },
                    power: { bg: "bg-green-950/40", text: "text-green-400", border: "border-green-900/40" },
                  };

                  const catStyle = categoryColors[rec.category] || { bg: "bg-gray-900/40", text: "text-gray-400", border: "border-gray-800" };

                  // Priority styles
                  const priorityColors: Record<string, string> = {
                    Critical: "bg-red-500/20 text-red-300 border-red-500/30 font-bold animate-pulse",
                    High: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                    Medium: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                    Low: "bg-gray-500/10 text-gray-400 border-gray-800",
                  };
                  const prioStyle = priorityColors[rec.priority] || "bg-gray-800 text-gray-400";

                  return (
                    <div
                      key={rec.id}
                      className={`group p-3 rounded-xl border transition-all duration-300 ${isAcknowledged ? "bg-gray-900/30 border-gray-800 opacity-60" : "bg-gray-900/50 hover:bg-gray-900/85 border-gray-850/80 hover:border-gray-800 shadow-lg"}`}
                    >
                      {/* Header tags */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span className={`text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.5 rounded border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {rec.category}
                          </span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${prioStyle}`}>
                            {rec.priority}
                          </span>
                        </div>
                        
                        {/* Confidence Indicator */}
                        <div className="flex items-center gap-1 text-[9px] font-mono text-gray-400 shrink-0">
                          <TrendingUp className="w-3 h-3 text-cyan-400" />
                          <span>{rec.confidenceScore}% Acc</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h5 className="font-semibold text-xs text-white mb-1">
                        {rec.title}
                      </h5>

                      {/* Description */}
                      <p className="text-[11px] text-gray-300 leading-relaxed mb-2.5">
                        {rec.description}
                      </p>

                      {/* Expandable Reasoning Section */}
                      <div className="border-t border-gray-900/80 pt-1.5 mt-1.5">
                        <button
                          onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
                          className="flex items-center gap-1 text-[9px] font-mono text-cyan-500 hover:text-cyan-400 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? "Hide Tactical Rationale" : "View Tactical Rationale"}
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden mt-2 text-[10px] text-gray-400 leading-relaxed bg-gray-950/60 p-2 rounded-lg border border-gray-900 font-sans space-y-1"
                            >
                              <strong className="text-[9px] font-mono text-gray-500 block uppercase tracking-wider mb-1">DATA ANALYSIS RATIONALE:</strong>
                              {rec.reasoning.split("\n").map((para, i) => (
                                <p key={i}>{para}</p>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Action Button footer */}
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-900/60">
                        {isAcknowledged ? (
                          <span className="text-[9px] font-mono text-green-400 flex items-center gap-1 bg-green-950/20 px-2 py-0.5 rounded border border-green-900/30">
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                            Active & Dispatched
                          </span>
                        ) : (
                          <button
                            onClick={() => setAcknowledgedRecs(prev => ({ ...prev, [rec.id]: true }))}
                            className="text-[9px] font-mono bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 hover:text-white border border-purple-900/40 rounded px-2.5 py-1 transition-all flex items-center gap-1 hover:shadow-lg hover:shadow-purple-900/20"
                          >
                            <Zap className="w-3 h-3 text-purple-400" />
                            {rec.actionLabel || "Deploy Directive"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Message Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  {/* Parse bold and linebreaks simply */}
                  <div className="space-y-1.5">
                    {msg.text.split("\n").map((para, i) => {
                      if (!para.trim()) return <div key={i} className="h-2" />;

                      // Check if it's a bullet list
                      if (para.startsWith("- ") || para.startsWith("* ")) {
                        const formattedBullet = para.substring(2).replace(/\*\*(.*?)\*\*/g, "$1");
                        return (
                          <div key={i} className="flex items-start gap-1.5 pl-2">
                            <span className="text-purple-400 text-sm leading-none">•</span>
                            <span>{formattedBullet}</span>
                          </div>
                        );
                      }

                      // Handle bold replacements
                      const parts = para.split(/\*\*(.*?)\*\*/g);
                      const isHeader = para.startsWith("###");
                      const content = parts.map((part, index) => {
                        if (index % 2 === 1) {
                          return <strong key={index} className="text-white font-semibold">{part}</strong>;
                        }
                        return part;
                      });

                      return (
                        <p key={i} className={isHeader ? "text-sm font-bold text-white pt-2" : ""}>
                          {isHeader ? para.replace("###", "") : content}
                        </p>
                      );
                    })}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[9px] text-gray-500 font-mono block text-right mt-1.5">
                    {msg.timestamp}
                  </span>
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
                  className="text-[9px] font-mono text-gray-500 hover:text-white uppercase"
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
                  className="text-[10px] bg-gray-900 border border-gray-800 text-gray-300 hover:text-white hover:bg-purple-950/30 hover:border-purple-900/40 px-2 py-1 rounded-full transition-all text-left truncate max-w-full"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input box */}
          <div className="p-3 border-t border-gray-950 bg-gray-950/90 flex gap-2 items-center">
            <button
              onClick={toggleRecording}
              className={`p-2.5 rounded-xl border transition-all shrink-0 ${isRecording ? "bg-red-950 border-red-500 text-red-400 animate-pulse" : "bg-gray-900 border-gray-800 text-cyan-400 hover:text-white hover:bg-gray-800"}`}
              title="Voice Simulation Input"
            >
              <Mic className="w-4 h-4" />
            </button>

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
                className="absolute right-2 top-1.5 p-1 text-purple-400 hover:text-white hover:bg-purple-950/30 rounded-lg transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
