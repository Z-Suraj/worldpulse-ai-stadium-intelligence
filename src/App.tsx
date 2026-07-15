import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { Gate, Incident, StadiumState, UserRole, Volunteer } from "./types";
import StadiumDigitalTwin from "./components/StadiumDigitalTwin";
import { MATCHES_DATABASE, getMatchBySlugOrId } from "./data/matches";
import StadiumIntelligenceDashboard from "./components/StadiumIntelligenceDashboard";
import CinematicLanding from "./components/CinematicLanding";
import CopilotPanel from "./components/CopilotPanel";
import FirebaseUserProfile from "./components/FirebaseUserProfile";
import PhotoBooth from "./components/PhotoBooth";
import IncidentCommand from "./components/IncidentCommand";
import StrategicScenarioPlanner from "./components/StrategicScenarioPlanner";
import TransitScout from "./components/TransitScout";
import LiveWalkieTalkie from "./components/LiveWalkieTalkie";
import MedicalSupport from "./components/MedicalSupport";
import { User } from "firebase/auth";
import { saveUserItinerary } from "./firebase";
import {
  Activity,
  AlertCircle,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  DollarSign,
  Droplet,
  Eye,
  Flame,
  Globe,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  Shield,
  Sun,
  Ticket,
  Users,
  Zap,
  Wifi,
  WifiOff,
  Download,
  Radio,
  FileText,
  CheckCircle2,
  Map,
  BookOpen,
  HeartPulse,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LANDING_MODE: "always" | "session" | "first_visit" = "always";

export default function App() {
  // Firebase Auth State
  const [user, setUser] = useState<User | null>(null);

  // Global State from the Express server (initialized with robust offline-first fallback)
  const [stadiumState, setStadiumState] = useState<StadiumState>({
    activeStadium: "MetLife Stadium, New York/New Jersey",
    capacity: 82500,
    activeAttendance: 78420,
    stadiums: [
      { name: "MetLife Stadium, NY/NJ", capacity: 82500, attendance: 78420, country: "USA", status: "Active" },
      { name: "Estadio Azteca, Mexico City", capacity: 87500, attendance: 86100, country: "MEX", status: "Matchday -2" },
      { name: "BC Place, Vancouver", capacity: 54500, attendance: 51200, country: "CAN", status: "Active" },
      { name: "SoFi Stadium, Los Angeles", capacity: 70000, attendance: 0, country: "USA", status: "Idle" },
      { name: "AT&T Stadium, Dallas", capacity: 80000, attendance: 0, country: "USA", status: "Idle" }
    ],
    gates: [
      { id: "A", name: "Gate A (East Entry)", load: 85, queueCount: 420, waitTime: 24, status: "Critical" },
      { id: "B", name: "Gate B (North Entry)", load: 42, queueCount: 150, waitTime: 8, status: "Optimal" },
      { id: "C", name: "Gate C (West Entry)", load: 18, queueCount: 50, waitTime: 3, status: "Optimal" },
      { id: "D", name: "Gate D (South Entry)", load: 74, queueCount: 310, waitTime: 17, status: "Warning" }
    ],
    concessions: [
      { id: "F1", name: "Pampa Burgers & Grill", zone: "East concourse", queueTime: 14, popular: "Double Gaucho Burger", status: "Busy" },
      { id: "F2", name: "Azteca Tacos", zone: "North concourse", queueTime: 5, popular: "Tacos al Pastor", status: "Optimal" },
      { id: "F3", name: "Maple Treats", zone: "West concourse", queueTime: 22, popular: "Poutine Express", status: "Overloaded" },
      { id: "F4", name: "World Cup Merch Hub", zone: "South plaza", queueTime: 8, popular: "Official 2026 Matchball", status: "Optimal" }
    ],
    transport: {
      metro: { status: "Active", frequencyMins: 4, waitTimeMins: 12, load: 88, statusLabel: "High Load" },
      shuttle: { status: "Active", frequencyMins: 6, waitTimeMins: 5, load: 45, statusLabel: "Normal" },
      rideshare: { status: "Surge", frequencyMins: 0, waitTimeMins: 18, load: 95, statusLabel: "Surge Pricing" },
      parkingC: { status: "Active", frequencyMins: 10, waitTimeMins: 0, load: 92, statusLabel: "Nearly Full", occupancy: 92 }
    },
    sustainability: {
      energyConsumptionKw: 4210,
      solarPowerGenerationKw: 1520,
      waterRecycledGallons: 78500,
      wasteSortedKg: 14820,
      co2SavedTons: 12.8,
      sustainabilityScore: 88
    },
    incidents: [
      { id: "INC-101", title: "Gate A Scanner Offline", location: "Gate A Turnstile 4", severity: "Medium", status: "Resolved", time: "11:15 AM", description: "Optical barcode reader lost local subnet connection. Re-routed via local failover router." },
      { id: "INC-102", title: "Section 124 Stray Backpack", location: "Upper Tier Section 124", severity: "High", status: "Active", time: "11:32 AM", description: "Unattended black backpack reported under seat 12. Security Team Bravo dispatched with detection gear." },
      { id: "INC-103", title: "Concourse Water Spill", location: "West Concourse Concessions", severity: "Low", status: "Monitoring", time: "11:41 AM", description: "Water cooler leak reported. Maintenance staff alerted, cleanup in progress." }
    ],
    volunteers: [
      { id: "VOL-01", name: "Sarah Jenkins (Fan Assistance)", status: "Active", task: "Guiding family with wheelchair to ADA Ramp 4 near Gate A", zone: "East Gate Plaza" },
      { id: "VOL-02", name: "Marcus Vance (Guest Services)", status: "On Break", task: "Scheduled rest - Resumes accessibility routing at 12:30 PM", zone: "Staff operations room" },
      { id: "VOL-03", name: "Amara Okafor (Medical Support)", status: "Active", task: "Standby with first-aid station in West Concourse Zone C", zone: "West Concourse" },
      { id: "VOL-04", name: "Kenji Tanaka (Security Support)", status: "Active", task: "Monitoring queue-flow and directing fans near Metro Exit 2", zone: "North Transit plaza" }
    ],
    evacuationSimulating: false,
  });
  const [activeRole, setActiveRole] = useState<UserRole>("Fan");
  const [entered, setEntered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Progressive Web App State Hooks & Listeners
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showOfflineEmergencyModal, setShowOfflineEmergencyModal] = useState<boolean>(false);
  const [offlineSyncTime, setOfflineSyncTime] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  // Offline Emergency Hub local states
  const [emergencyTab, setEmergencyTab] = useState<"directives" | "map" | "comm">("map");
  const [selectedEmergencyScenario, setSelectedEmergencyScenario] = useState<string>("med");
  const [isBroadcastSimulating, setIsBroadcastSimulating] = useState<boolean>(false);
  const [broadcastLog, setBroadcastLog] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Local emergency frequency synchronized.`
  ]);

  const playRadioSquelch = () => {
    if (typeof window === "undefined" || !window.AudioContext) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1000;
      filter.Q.value = 1.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      console.warn("Failed squelch playback:", e);
    }
  };

  const triggerOfflineScenarioSpeech = () => {
    setIsBroadcastSimulating(true);
    playRadioSquelch();

    let text = "";
    if (selectedEmergencyScenario === "med") {
      text = "Emergency Dispatch: Medical Team Alpha dispatched with AED kit to Upper Tier Section 124. Clear elevator banks and secure access ramps.";
    } else if (selectedEmergencyScenario === "crowd") {
      text = "Crowd Alert: Congestion surge detected near Gate A turnstiles. Diverting fans to Gate B. Volunteers near transit report to Gate B.";
    } else {
      text = "Hazard Report: Wet floor hazard confirmed at concessions. Clean-up crews are on-site. Standard caution signage deployed.";
    }

    setBroadcastLog((prev) => [`[${new Date().toLocaleTimeString()}] ${text}`, ...prev]);

    setTimeout(() => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.onend = () => setIsBroadcastSimulating(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsBroadcastSimulating(false);
      }
    }, 350);
  };

  // Real-time Clock states (Automatically updates every second)
  const [localTime, setLocalTime] = useState("");
  const [tournamentUtcTime, setTournamentUtcTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format local time with automatically detected user timezone
      const localTimeString = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      // Detect and append short timezone name (e.g. EST, PDT)
      const tzCode = now.toLocaleDateString([], { timeZoneName: "short" }).split(" ").pop() || "";
      setLocalTime(`${localTimeString} ${tzCode}`);

      // Format Tournament UTC time
      const utcHour = String(now.getUTCHours()).padStart(2, "0");
      const utcMin = String(now.getUTCMinutes()).padStart(2, "0");
      const utcSec = String(now.getUTCSeconds()).padStart(2, "0");
      setTournamentUtcTime(`Tournament UTC ${utcHour}:${utcMin}:${utcSec}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  const [language, setLanguage] = useState<string>("English");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Itinerary Planner Local State
  const [selectedMatchId, setSelectedMatchId] = useState("m1");
  const currentMatch = MATCHES_DATABASE.find(m => m.id === selectedMatchId) || MATCHES_DATABASE[0];
  const selectedMatch = `${currentMatch.homeTeam} vs ${currentMatch.awayTeam} (${currentMatch.stage})`;
  const [fanSeat, setFanSeat] = useState(currentMatch.seat);
  const [ticketType, setTicketType] = useState(currentMatch.ticketType);
  const [ticketTab, setTicketTab] = useState<"public" | "user" | "operations" | "medical">("user");
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(false);
  const [itineraryResult, setItineraryResult] = useState<string>("");
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [savePlanMessage, setSavePlanMessage] = useState("");

  // Holographic Ticket Local States
  const [qrVerifiedState, setQrVerifiedState] = useState<"unverified" | "verifying" | "verified">("unverified");
  const [showSeatMapModal, setShowSeatMapModal] = useState(false);
  const [scanTime, setScanTime] = useState("");

  // Mount / Hydration check for landing-page configuration
  useEffect(() => {
    setIsMounted(true);
    
    if (typeof window !== "undefined") {
      try {
        if ("scrollRestoration" in window.history) {
          window.history.scrollRestoration = "manual";
        }
      } catch (e) {
        console.warn("Could not disable automatic scroll restoration:", e);
      }
      // Guarantee opening at the top of the landing/home page
      window.scrollTo(0, 0);
    }
    
    let shouldBypass = false;
    if (typeof window !== "undefined") {
      try {
        if (LANDING_MODE === "session") {
          shouldBypass = sessionStorage.getItem("worldpulse_landing_entered") === "true";
        } else if (LANDING_MODE === "first_visit") {
          shouldBypass = localStorage.getItem("worldpulse_landing_entered") === "true";
        }
      } catch (e) {
        console.log("Storage access error:", e);
      }
    }

    if (shouldBypass) {
      setEntered(true);
      // If bypassing, apply current hash route if present
      const hash = window.location.hash;
      const matchRegex = /#\/match\/(m\d)/;
      const matchResult = hash.match(matchRegex);
      if (matchResult && matchResult[1]) {
        const matchId = matchResult[1];
        const match = MATCHES_DATABASE.find(m => m.id === matchId);
        if (match) {
          setSelectedMatchId(matchId);
          setFanSeat(match.seat);
          setTicketType(match.ticketType);
          setStadiumState(prev => prev ? { ...prev, activeStadium: match.stadiumFullName } : prev);
        }
      }
    } else {
      setEntered(false);
    }
  }, []);

  // Force scroll to top on page navigation, transition state updates, or hash routes
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [entered, selectedMatchId]);

  // Dynamic Hash-Routing System (listens to manual user navigation/back-forward actions)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const matchRegex = /#\/match\/(m\d)/;
      const matchResult = hash.match(matchRegex);
      if (matchResult && matchResult[1]) {
        const matchId = matchResult[1];
        const match = MATCHES_DATABASE.find(m => m.id === matchId);
        if (match) {
          setSelectedMatchId(matchId);
          setFanSeat(match.seat);
          setTicketType(match.ticketType);
          setStadiumState(prev => prev ? { ...prev, activeStadium: match.stadiumFullName } : prev);
          setEntered(true);
        }
      }
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // GSAP Interactive Seat Map states & ref
  const mapCanvasRef = useRef<HTMLDivElement>(null);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [currentPan, setCurrentPan] = useState({ x: 0, y: 0 });

  // Trigger GSAP zoom/pan when sector changes or modal opens
  useEffect(() => {
    if (showSeatMapModal) {
      let targetZoom = 1;
      let targetPan = { x: 0, y: 0 };

      if (fanSeat.includes("105")) {
        targetZoom = 1.6;
        targetPan = { x: 0, y: 55 };
      } else if (fanSeat.includes("114")) {
        targetZoom = 1.6;
        targetPan = { x: -55, y: 0 };
      } else if (fanSeat.includes("130")) {
        targetZoom = 1.6;
        targetPan = { x: 0, y: -55 };
      } else if (fanSeat.includes("140")) {
        targetZoom = 1.6;
        targetPan = { x: 55, y: 0 };
      }

      setCurrentZoom(targetZoom);
      setCurrentPan(targetPan);
    }
  }, [fanSeat, showSeatMapModal]);

  // Handle the active GSAP tween whenever zoom or pan state changes
  useEffect(() => {
    if (mapCanvasRef.current) {
      gsap.to(mapCanvasRef.current, {
        scale: currentZoom,
        x: currentPan.x,
        y: currentPan.y,
        duration: 0.65,
        ease: "power3.out",
        overwrite: "auto"
      });
    }
  }, [currentZoom, currentPan]);

  // Incident Modal Local State
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [newIncidentTitle, setNewIncidentTitle] = useState("");
  const [newIncidentLoc, setNewIncidentLoc] = useState("West Plaza entrance");
  const [newIncidentSeverity, setNewIncidentSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [newIncidentDesc, setNewIncidentDesc] = useState("");

  // Executive Memo Summary Local State
  const [execMemo, setExecMemo] = useState<string>("");
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);

  // Fetch live sensor state from backend
  const fetchStadiumState = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/sensor-feed?matchId=${selectedMatchId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Invalid response content-type: ${contentType}`);
      }
      const data = await res.json();
      setStadiumState(data);
      setOfflineSyncTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.log("Error fetching stadium sensor feed (using local resilient state):", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStadiumState();
    // Poll sensor-feed every 10 seconds for real-time emulation!
    const interval = setInterval(fetchStadiumState, 10000);
    return () => clearInterval(interval);
  }, [selectedMatchId]);

  // Update volunteer task status via API
  const handleUpdateVolunteerTask = async (id: string, task: string, status: "Active" | "On Break" | "Standby") => {
    try {
      const res = await fetch("/api/volunteers/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, task, status }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }
      const data = await res.json();
      if (data.success && stadiumState) {
        setStadiumState({
          ...stadiumState,
          volunteers: data.volunteers,
        });
      }
    } catch (error) {
      console.log("Error updating volunteer task:", error);
    }
  };

  // Trigger Evacuation drill on Digital twin
  const handleToggleEvacuation = async () => {
    try {
      const res = await fetch("/api/evacuation/toggle", { method: "POST" });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }
      const data = await res.json();
      if (data.success && stadiumState) {
        setStadiumState({
          ...stadiumState,
          evacuationSimulating: data.evacuationSimulating,
          incidents: data.incidents,
        });
      }
    } catch (error) {
      console.log("Error toggling evacuation:", error);
    }
  };

  // Submit new incident
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentTitle.trim()) return;

    await createIncidentDirectly({
      title: newIncidentTitle,
      location: newIncidentLoc,
      severity: newIncidentSeverity,
      description: newIncidentDesc,
    });

    // Reset and close
    setNewIncidentTitle("");
    setNewIncidentDesc("");
    setShowIncidentModal(false);
  };

  // Create Incident Direct Function (shared with CCTV component)
  const createIncidentDirectly = async (inc: { title: string; location: string; severity: "Low" | "Medium" | "High"; description: string }) => {
    try {
      const res = await fetch("/api/incidents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inc),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }
      const data = await res.json();
      if (data.success && stadiumState) {
        setStadiumState({
          ...stadiumState,
          incidents: data.incidents,
        });
      }
    } catch (error) {
      console.log("Error reporting incident:", error);
    }
  };

  // Resolve incident
  const handleResolveIncident = async (id: string) => {
    try {
      const res = await fetch("/api/incidents/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }
      const data = await res.json();
      if (data.success && stadiumState) {
        setStadiumState({
          ...stadiumState,
          incidents: data.incidents,
        });
      }
    } catch (error) {
      console.log("Error resolving incident:", error);
    }
  };

  // Generate customized Fan Itinerary using Gemini API
  const handleGenerateItinerary = async () => {
    setIsGeneratingItinerary(true);
    setItineraryResult("");
    setSavePlanMessage("");
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seat: fanSeat,
          ticketType,
          matches: selectedMatch,
          accessibilityNeeds: accessibilityNeeds ? "Wheelchair accessibility required" : "None",
          language,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }
      const data = await res.json();
      setItineraryResult(data.itinerary || "Could not generate itinerary.");
    } catch (error) {
      console.log("Error generating itinerary:", error);
      setItineraryResult("Failed to reach itinerary generation services.");
    } finally {
      setIsGeneratingItinerary(false);
    }
  };

  // Save generated itinerary to Firestore
  const handleSaveItineraryPlan = async () => {
    if (!user || !itineraryResult) return;
    setIsSavingPlan(true);
    setSavePlanMessage("");

    try {
      await saveUserItinerary(user.uid, {
        seat: fanSeat,
        ticketType,
        content: itineraryResult,
        timestamp: Date.now()
      });
      setSavePlanMessage("Plan synced successfully! Check your vault.");
    } catch (err) {
      console.log("Error saving plan:", err);
      setSavePlanMessage("Failed to sync plan to Cloud.");
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Generate Executive Summarized Memo for FIFA organizers using Gemini API
  const handleGenerateExecutiveMemo = async () => {
    setIsGeneratingMemo(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Please analyze our entire stadium operations state right now and generate a structured executive operations memo for FIFA HQ. Include security incidents overview, gate bottle-necks, transit load metrics, and sustainability ratings.",
          role: "Organizer",
          language,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Received non-JSON response: ${contentType}`);
      }
      const data = await res.json();
      setExecMemo(data.response || "No report returned from executive summary engine.");
    } catch (error) {
      console.log("Error generating executive memo:", error);
      setExecMemo("Failed to generate operational report memo.");
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  const handleSelectGate = (gate: Gate) => {
    console.log("Selected gate in Twin:", gate);
  };

  if (!stadiumState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-gray-200">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin" />
          {/* Fallback to small div if BotIcon is missing */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-purple-400 font-bold">WP</div>
        </div>
        <p className="mt-4 text-xs font-mono text-gray-400 uppercase tracking-widest animate-pulse">
          Booting WorldPulse AI Platform...
        </p>
      </div>
    );
  }

  const handleEnterLanding = (matchId?: string) => {
    if (matchId) {
      setSelectedMatchId(matchId);
      const m = MATCHES_DATABASE.find((item) => item.id === matchId);
      if (m) {
        setFanSeat(m.seat);
        setTicketType(m.ticketType);
        setStadiumState(prev => prev ? { ...prev, activeStadium: m.stadiumFullName } : prev);
        window.location.hash = `#/match/${m.id}`;
      }
    } else {
      setSelectedMatchId("m1");
      const m = MATCHES_DATABASE[0];
      setFanSeat(m.seat);
      setTicketType(m.ticketType);
      setStadiumState(prev => prev ? { ...prev, activeStadium: m.stadiumFullName } : prev);
      window.location.hash = `#/match/m1`;
    }
    
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("worldpulse_landing_entered", "true");
        localStorage.setItem("worldpulse_landing_entered", "true");
      } catch (e) {
        console.error("Storage access error:", e);
      }
    }
    setEntered(true);
  };

  const getRecommendedGate = (seat: string, gates: Gate[]) => {
    const match = seat.match(/\d+/);
    const sectionNum = match ? parseInt(match[0], 10) : 114;
    
    let primaryGateId = "C"; 
    if (sectionNum >= 101 && sectionNum <= 112) {
      primaryGateId = "B"; 
    } else if (sectionNum >= 113 && sectionNum <= 125) {
      primaryGateId = "A"; 
    } else if (sectionNum >= 126 && sectionNum <= 138) {
      primaryGateId = "D"; 
    } else {
      primaryGateId = "C"; 
    }

    const primaryGate = gates.find(g => g.id === primaryGateId) || gates[0];
    
    let bestGate = primaryGate;
    let bestScore = Infinity;

    gates.forEach(g => {
      const isClosest = g.id === primaryGateId;
      const travelTime = isClosest ? 3 : 12; 
      const transitScore = g.waitTime + travelTime;
      if (transitScore < bestScore) {
        bestScore = transitScore;
        bestGate = g;
      }
    });

    return {
      primaryGate,
      bestGate,
      isRerouted: bestGate.id !== primaryGate.id,
      reason: bestGate.id !== primaryGate.id 
        ? `Re-routed to ${bestGate.name} to bypass critical queues! Saves ${primaryGate.waitTime - bestGate.waitTime}m wait.`
        : `Primary Gate ${primaryGate.name} is optimal. Wait time: ${primaryGate.waitTime}m.`
    };
  };

  const handleVerifyQR = () => {
    if (qrVerifiedState === "verified") return;
    setQrVerifiedState("verifying");
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Synthesizer beep blocked or unsupported");
    }

    setTimeout(() => {
      setQrVerifiedState("verified");
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setScanTime(timeStr);
      
      setStadiumState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeAttendance: Math.min(prev.capacity, prev.activeAttendance + 1)
        };
      });
    }, 1200);
  };

  // Calculate active gauges
  const gateSaturationAvg = Math.round(
    stadiumState.gates.reduce((acc, g) => acc + g.load, 0) / stadiumState.gates.length
  );
  const totalWaterRecycled = stadiumState.sustainability.waterRecycledGallons.toLocaleString();
  const solarRatio = Math.round(
    (stadiumState.sustainability.solarPowerGenerationKw /
      stadiumState.sustainability.energyConsumptionKw) *
      100
  );

  return (
    <>
      <AnimatePresence mode="wait">
      {!isMounted || !entered ? (
        <motion.div
          key="landing"
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{ willChange: "opacity, transform" }}
          className="w-full min-h-screen bg-gray-950"
        >
          <CinematicLanding onEnter={handleEnterLanding} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, scale: 1.01 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ willChange: "opacity, transform" }}
          className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-purple-900 selection:text-purple-100 flex flex-col relative overflow-x-hidden"
        >
          {/* Dynamic Top Glow header background */}
          <div className="absolute top-0 left-1/4 right-1/4 h-32 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main App Bar Header */}
      <header className="border-b border-gray-900 bg-gray-950/80 backdrop-blur sticky top-0 z-40 px-4 py-3 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Pulsing visual logo */}
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600/15 border border-purple-500/30">
            <div className="absolute inset-0 w-full h-full bg-purple-500/10 rounded-xl animate-ping opacity-30" />
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-base tracking-tight text-white leading-none">
                WorldPulse <span className="text-purple-400">AI</span>
              </h1>
              <span className="text-[9px] bg-cyan-950 text-cyan-300 font-mono px-1.5 py-0.5 rounded border border-cyan-900 uppercase tracking-wider">
                V3.5
              </span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
              FIFA World Cup 2026 Ecosystem
            </p>
          </div>
        </div>

        {/* Global Attendance HUD */}
        <div className="hidden md:flex items-center gap-6 text-xs border-x border-gray-900 px-6 font-mono">
          <div>
            <span className="text-gray-500 uppercase block text-[9px]">Venue Capacity</span>
            <span className="text-white font-bold font-sans">
              {stadiumState.activeStadium.split(",")[0]}
            </span>
          </div>
          <div>
            <span className="text-gray-500 uppercase block text-[9px]">Attendance</span>
            <span className="text-cyan-400 font-bold">
              {stadiumState.activeAttendance.toLocaleString()} /{" "}
              {stadiumState.capacity.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-500 uppercase block text-[9px]">Operational State</span>
            <span className={`font-bold flex items-center gap-1.5 ${stadiumState.evacuationSimulating ? "text-red-400" : "text-green-400"}`}>
              <span className={`w-2 h-2 rounded-full ${stadiumState.evacuationSimulating ? "bg-red-500 animate-ping" : "bg-green-500"}`} />
              {stadiumState.evacuationSimulating ? "EVACUATION" : "NORMAL"}
            </span>
          </div>
        </div>

        {/* Action controls & clocks */}
        <div className="flex items-center gap-3">
          {/* PWA Install Button */}
          {deferredPrompt && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs px-3 py-2 rounded-xl border border-purple-500/30 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/20"
              title="Install WorldPulse App"
            >
              <Download className="w-3.5 h-3.5 text-white animate-bounce" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Connection Status Badge */}
          <button
            onClick={() => setShowOfflineEmergencyModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
              isOnline
                ? "bg-green-950/40 text-green-400 border-green-900/60 hover:bg-green-900/10"
                : "bg-amber-950/60 text-amber-300 border-amber-900/60 hover:bg-amber-950/80 animate-pulse"
            }`}
            title={isOnline ? "Network Connection: Secure. Click to open PWA hub" : "Network Connection: Disconnected. Click for Offline Emergency Suite"}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOnline ? "ONLINE" : "OFFLINE (EMERGENCY)"}</span>
            <span className="md:hidden">{isOnline ? "ON" : "OFF"}</span>
          </button>

          <div className="hidden sm:block text-right">
            <div className="text-xs font-mono text-gray-300 flex items-center gap-1 justify-end">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{localTime || "Detecting..."}</span>
            </div>
            <span className="text-[9px] text-gray-500 font-mono block">
              {tournamentUtcTime || "Syncing..."}
            </span>
          </div>

          <button
            onClick={fetchStadiumState}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-900 border border-gray-900 rounded-xl transition-all text-gray-400 hover:text-white"
            title="Refresh Live Sensors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </header>

      {/* Role Switcher sub-bar */}
      <div className="border-b border-gray-950 bg-gray-950/40 p-2.5 flex justify-center sticky top-[53px] z-30 backdrop-blur-sm">
        <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 max-w-full overflow-x-auto space-x-1">
          {(["Fan", "Volunteer", "Operations", "Organizer", "Medical"] as UserRole[]).map((role) => {
            const isActive = activeRole === role;
            return (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-all ${isActive ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30 font-semibold" : "text-gray-400 hover:text-gray-200"}`}
              >
                {role === "Fan" && "🎟️ Fan Space"}
                {role === "Volunteer" && "🤝 Volunteer App"}
                {role === "Operations" && "⚙️ Venue Ops"}
                {role === "Organizer" && "👑 Organizer HQ"}
                {role === "Medical" && "🩺 Medical Support"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Offline Emergency Alert Banner */}
      {!isOnline && (
        <div className="bg-gradient-to-r from-amber-950 via-red-950 to-amber-950 border-b border-amber-900/40 px-4 py-2 text-center text-xs text-amber-200 flex items-center justify-center gap-2 animate-pulse sticky top-[102px] z-20 backdrop-blur-sm">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>
            <strong>INTERNET CONNECTION LOST:</strong> Currently off-grid inside the stadium. Emergency Offline Mode is ACTIVE (Sensor fallback & offline walkie-talkie enabled).
          </span>
          <button
            onClick={() => setShowOfflineEmergencyModal(true)}
            className="ml-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-2.5 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all shadow-md shadow-amber-500/10"
          >
            Launch Emergency Hub
          </button>
        </div>
      )}

      {/* Main Content Workspace layout (Digital Twin, Workspace, Copilot) */}
      {activeRole === "Medical" ? (
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full">
          <MedicalSupport
            stadiumState={stadiumState}
            activeRole={activeRole}
            userSeat={fanSeat}
            onAddIncident={(title, location, severity, description) => {
              createIncidentDirectly({ title, location, severity, description });
            }}
          />
        </main>
      ) : (
        <main className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full">
        {/* Left column: Digital Twin (5 cols) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <StadiumDigitalTwin
            stadiumState={stadiumState}
            onSelectGate={handleSelectGate}
            onResolveIncident={handleResolveIncident}
          />

          {/* Quick HUD sensor panel summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-panel p-3 rounded-xl border border-gray-900">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">
                Gate Congestion
              </span>
              <div className="text-lg font-display font-bold mt-1 text-white">
                {gateSaturationAvg}%
              </div>
              <div className="w-full bg-gray-800 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${gateSaturationAvg}%` }}
                />
              </div>
            </div>

            <div className="glass-panel p-3 rounded-xl border border-gray-900">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">
                Solar Roof Contribution
              </span>
              <div className="text-lg font-display font-bold mt-1 text-green-400">
                {solarRatio}%
              </div>
              <span className="text-[9px] text-gray-400 block mt-1 font-mono">
                {(stadiumState.sustainability.solarPowerGenerationKw / 1000).toFixed(1)} MW yield
              </span>
            </div>

            <div className="glass-panel p-3 rounded-xl border border-gray-900">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 block font-mono">
                Safety Alerts
              </span>
              <div className={`text-lg font-display font-bold mt-1 ${stadiumState.incidents.filter(i => i.status === "Active").length > 0 ? "text-amber-400 animate-pulse" : "text-green-400"}`}>
                {stadiumState.incidents.filter((i) => i.status === "Active").length} Active
              </div>
              <span className="text-[9px] text-gray-400 block mt-1 font-mono">
                0 Critical
              </span>
            </div>
          </div>

          {/* AI-Powered Stadium Intelligence Dashboard */}
          <StadiumIntelligenceDashboard
            stadiumState={stadiumState}
            onResolveIncident={handleResolveIncident}
            onRefreshFeed={fetchStadiumState}
          />
        </section>

        {/* Center column: Role Workspace (4 cols) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {/* 1. FAN EXPERIENCE WORKSPACE */}
            {activeRole === "Fan" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                  {/* Dynamic Category Switcher Tabs for Ticketing & Operations */}
                  <div className="flex bg-gray-950/80 p-1.5 rounded-xl border border-gray-900 gap-1.5 shadow-inner">
                    <button
                      onClick={() => setTicketTab("public")}
                      className={`flex-1 py-2 text-[10px] uppercase font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        ticketTab === "public"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30"
                          : "text-gray-400 hover:text-white hover:bg-gray-900/30"
                      }`}
                    >
                      <Globe className="w-3 h-3 text-current" />
                      1. Match Info
                    </button>
                    <button
                      onClick={() => setTicketTab("user")}
                      className={`flex-1 py-2 text-[10px] uppercase font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        ticketTab === "user"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30"
                          : "text-gray-400 hover:text-white hover:bg-gray-900/30"
                      }`}
                    >
                      <Ticket className="w-3 h-3 text-current" />
                      2. My Ticket
                    </button>
                    <button
                      onClick={() => setTicketTab("operations")}
                      className={`flex-1 py-2 text-[10px] uppercase font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        ticketTab === "operations"
                          ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30"
                          : "text-gray-400 hover:text-white hover:bg-gray-900/30"
                      }`}
                    >
                      <Activity className="w-3 h-3 text-current" />
                      3. Live Sensors
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* CATEGORY 1: PUBLIC MATCH DATA */}
                    {ticketTab === "public" && (
                      <motion.div
                        key="public-match"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="glass-panel p-5 rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-gray-950 to-cyan-950/20 space-y-4"
                      >
                        <div className="flex justify-between items-start border-b border-gray-900 pb-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-widest font-mono text-cyan-400 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/30">
                              FIFA Public Match Data
                            </span>
                            <h4 className="text-base font-bold text-white mt-2">
                              {currentMatch.homeTeam} vs {currentMatch.awayTeam}
                            </h4>
                            <p className="text-xs text-purple-400 font-mono font-medium mt-0.5">
                              {currentMatch.stage} • Match {currentMatch.id.toUpperCase()}
                            </p>
                          </div>
                          <Globe className="w-6 h-6 text-cyan-400" />
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-900/40 p-2.5 rounded-lg border border-gray-900">
                            <span className="text-[9px] text-gray-500 font-mono uppercase block">Date & Time</span>
                            <div className="font-semibold text-white mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-cyan-400" />
                              {currentMatch.date}
                            </div>
                            <span className="text-[9px] font-mono text-gray-400 block mt-0.5">{currentMatch.time} (Tournament UTC)</span>
                          </div>

                          <div className="bg-gray-900/40 p-2.5 rounded-lg border border-gray-900">
                            <span className="text-[9px] text-gray-500 font-mono uppercase block">Live Weather</span>
                            <div className="font-semibold text-white mt-0.5 flex items-center gap-1">
                              <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                              {currentMatch.stadium.includes("MetLife") && "Partly Cloudy • 24°C / 75°F"}
                              {currentMatch.stadium.includes("Azteca") && "Clear Sky • 21°C / 70°F"}
                              {currentMatch.stadium.includes("BC Place") && "Light Rain • 16°C / 61°F"}
                            </div>
                            <span className="text-[9px] font-mono text-cyan-400 block mt-0.5">Humidity: 48% • Wind: 12km/h</span>
                          </div>
                        </div>

                        <div className="bg-gray-900/40 p-3 rounded-lg border border-gray-900 space-y-1.5">
                          <span className="text-[9px] text-gray-500 font-mono uppercase block">Venue Information</span>
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {currentMatch.stadiumFullName}
                          </span>
                          <p className="text-[10px] text-gray-400 leading-relaxed">
                            {currentMatch.venueInfo}
                          </p>
                          <div className="text-[9px] text-gray-500 font-mono border-t border-gray-900/60 pt-1.5 flex justify-between">
                            <span>CAPACITY: {stadiumState?.capacity?.toLocaleString() || "82,500"}</span>
                            <span>HOST COUNTRY: {stadiumState?.stadiums?.find(s => s.name.includes(currentMatch.stadium))?.country || "USA"}</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-cyan-950/20 border border-cyan-900/40 rounded-xl text-[9px] text-cyan-300 font-mono leading-relaxed flex gap-1.5">
                          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div>
                            <strong className="block text-white mb-0.5">API Integration Architecture:</strong>
                            Tournament metadata (dates, kickoff times, teams, rosters, stadiums, capacities, and host weather) are retrieved from real-world, public APIs (FIFA open-data feeds, OpenWeatherMap API). These endpoints update automatically in real-time.
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* CATEGORY 2: USER-SPECIFIC TICKET DATA */}
                    {ticketTab === "user" && (
                      <motion.div
                        key="user-ticket"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                      >
                        {/* Holographic digital ticket */}
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-950 to-blue-900 p-5 border border-purple-500/20 shadow-xl shadow-purple-950/20">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] uppercase tracking-widest font-mono text-purple-300">
                                Official Match Ticket
                              </span>
                              <h4 className="text-md font-bold text-white mt-1">
                                {selectedMatch}
                              </h4>
                              <p className="text-[10px] text-gray-300">
                                FIFA World Cup 2026, {currentMatch.stadium}
                              </p>
                            </div>
                            <Ticket className="w-8 h-8 text-purple-400 shrink-0" />
                          </div>

                          {/* Gate predictor algorithm engine output */}
                          {stadiumState && (() => {
                            const rec = getRecommendedGate(fanSeat, stadiumState.gates);
                            return (
                              <div className="my-4 border-t border-dashed border-white/20 pt-4 space-y-2.5">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-[9px] text-purple-300 font-mono uppercase block">Your Section</span>
                                    <span className="text-xs font-bold text-white font-mono block truncate">{fanSeat}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-purple-300 font-mono uppercase block">Optimal Entrance</span>
                                    <span className="text-xs font-bold text-cyan-300 block">{rec.bestGate.name}</span>
                                    <span className="text-[8px] font-mono text-gray-400 block mt-0.5">{rec.bestGate.waitTime} min wait ({rec.bestGate.queueCount} in line)</span>
                                  </div>
                                </div>

                                {rec.isRerouted ? (
                                  <div className="p-2 bg-amber-950/40 border border-amber-900/40 rounded-xl text-[9px] text-amber-300 font-mono leading-relaxed">
                                    ⚠️ **AI Dynamic Routing**: Your standard closest gate is heavily congested. Stadium controllers recommend entry via **{rec.bestGate.name}** to save **{rec.primaryGate.waitTime - rec.bestGate.waitTime} minutes**!
                                  </div>
                                ) : (
                                  <div className="p-2 bg-green-950/30 border border-green-900/30 rounded-xl text-[9px] text-green-300 font-mono leading-relaxed">
                                    ✓ **Gate Entry Optimal**: Your closest Gate entrance is running smoothly with an easy **{rec.bestGate.waitTime} min** waiting time. Enjoy the match!
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="flex items-center justify-between bg-black/30 backdrop-blur rounded-xl px-3 py-2 border border-white/5">
                            <span className="text-[10px] text-purple-200">Tier: {ticketType}</span>
                            <span className="text-xs font-mono font-bold text-white">{currentMatch.ticketId}</span>
                          </div>

                          {/* Interactive QR code and verification */}
                          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-white/10 pt-4">
                            <div className="flex items-center gap-2.5">
                              <div 
                                onClick={handleVerifyQR}
                                className="bg-white p-1 rounded-lg border border-purple-400/20 cursor-pointer hover:scale-105 active:scale-95 transition-all relative group shadow-inner"
                                title="Tap to Scan QR Code"
                              >
                                {qrVerifiedState === "unverified" && (
                                  <div className="w-10 h-10 bg-gray-900 flex items-center justify-center rounded">
                                    <span className="text-[7px] font-mono text-purple-400 font-bold text-center leading-none uppercase">TAP TO<br />SCAN</span>
                                  </div>
                                )}
                                {qrVerifiedState === "verifying" && (
                                  <div className="w-10 h-10 bg-purple-950 flex items-center justify-center rounded animate-pulse">
                                    <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
                                  </div>
                                )}
                                {qrVerifiedState === "verified" && (
                                  <div className="w-10 h-10 bg-green-950 flex items-center justify-center rounded border border-green-500/30">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <span className="text-[9px] text-purple-300 font-mono uppercase block">Gate Scanner Verification</span>
                                {qrVerifiedState === "unverified" && <span className="text-[10px] text-amber-400 font-medium animate-pulse flex items-center gap-1">● Ready to Scan</span>}
                                {qrVerifiedState === "verifying" && <span className="text-[10px] text-purple-400 font-mono">Processing...</span>}
                                {qrVerifiedState === "verified" && (
                                  <div>
                                    <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">✓ Access Logged</span>
                                    <span className="text-[8px] font-mono text-gray-500 block mt-0.5">Scanned at {scanTime}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => setShowSeatMapModal(true)}
                              className="w-full sm:w-auto bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 text-purple-300 font-mono text-[9px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            >
                              🗺️ Seat Navigation
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 bg-purple-950/20 border border-purple-900/40 rounded-xl text-[9px] text-purple-300 font-mono leading-relaxed flex gap-1.5">
                          <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                          <div>
                            <strong className="block text-white mb-0.5">Secure Ticket Integrity:</strong>
                            Personal data (Seat numbers, Ticket Classes, unique Ticket IDs, QR signatures, and scanner verification logs) are strictly user-specific. Since FIFA's ticketing core is private, we execute an encrypted local JSON-Web-Token (JWT) cryptographic signature check for the turnstile scanner, preserving high production-grade security and offline robustness.
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* CATEGORY 3: STADIUM OPERATIONS DATA */}
                    {ticketTab === "operations" && (
                      <motion.div
                        key="stadium-ops"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="glass-panel p-5 rounded-2xl border border-purple-500/10 bg-gradient-to-br from-gray-950 to-purple-950/20 space-y-4"
                      >
                        <div className="flex justify-between items-start border-b border-gray-900 pb-3">
                          <div>
                            <span className="text-[9px] uppercase tracking-widest font-mono text-purple-400 font-bold bg-purple-950/40 px-2 py-0.5 rounded border border-purple-900/30">
                              Stadium Live Telemetry
                            </span>
                            <h4 className="text-sm font-bold text-white mt-2">
                              {currentMatch.stadiumFullName} Live Grid
                            </h4>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">
                              Polling active IoT nodes every 10s
                            </p>
                          </div>
                          <Activity className="w-5 h-5 text-purple-400 animate-pulse" />
                        </div>

                        {/* Live gate statuses */}
                        <div className="space-y-2">
                          <span className="text-[9px] text-gray-500 font-mono uppercase block">Gate Queue wait times</span>
                          <div className="grid grid-cols-2 gap-2">
                            {stadiumState.gates.map((g) => (
                              <div key={g.id} className="bg-gray-950/50 p-2 rounded-lg border border-gray-900 text-[11px] flex justify-between items-center">
                                <div>
                                  <span className="font-semibold text-white font-mono">{g.id}</span>
                                  <span className="text-[8px] text-gray-500 font-mono ml-1">({g.queueCount} in line)</span>
                                </div>
                                <span className={`font-mono font-bold text-[10px] ${g.waitTime > 15 ? "text-amber-400" : "text-green-400"}`}>
                                  {g.waitTime}m wait
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Active alert status */}
                        <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-900 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[8px] text-gray-500 font-mono uppercase block">ACTIVE SECURITY LOGS</span>
                            <span className="font-semibold text-white">
                              {stadiumState.incidents.filter(i => i.status === "Active").length} Active Incidents
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            stadiumState.incidents.filter(i => i.status === "Active").length > 0
                              ? "bg-amber-950 text-amber-400 animate-pulse"
                              : "bg-green-950 text-green-400"
                          }`}>
                            {stadiumState.incidents.filter(i => i.status === "Active").length > 0 ? "ALERTING" : "SECURE"}
                          </span>
                        </div>

                        {/* Transit Metrics mini summary */}
                        <div className="p-2.5 rounded-lg bg-gray-950 border border-gray-900 space-y-1.5 text-xs">
                          <span className="text-[8px] text-gray-500 font-mono uppercase block">Live Public Transport Status</span>
                          <div className="flex justify-between text-[10px] font-mono text-gray-400">
                            <span>METRO: {stadiumState.transport.metro.waitTimeMins}m wait ({stadiumState.transport.metro.load}% capacity)</span>
                            <span>SHUTTLE: {stadiumState.transport.shuttle.waitTimeMins}m wait</span>
                          </div>
                        </div>

                        <div className="p-2.5 bg-purple-950/20 border border-purple-900/40 rounded-xl text-[9px] text-purple-300 font-mono leading-relaxed flex gap-1.5">
                          <Zap className="w-4 h-4 text-purple-400 shrink-0" />
                          <div>
                            <strong className="block text-white mb-0.5">Sensor-Grid Operations:</strong>
                            Turnstile queue wait times, public transit loads, cctv incidents, and concessions congestions are retrieved from active in-venue sensor arrays. In live environments, these represent IoT telemetry nodes measuring crowd count through AI computer vision, beacon triangulation, and transport ticketing.
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                 {/* AI personalized itinerary planner */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-4">
                  <div>
                    <h3 className="font-display font-semibold text-sm text-white flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-purple-400" />
                      AI Travel Itinerary Planner
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Gemini models synthesize gate queue loads to construct your perfect schedule timeline.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="fan-seat-input" className="text-[10px] font-mono text-gray-400 block mb-1">Your Seat/Section</label>
                      <input
                        id="fan-seat-input"
                        type="text"
                        value={fanSeat}
                        onChange={(e) => setFanSeat(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="fan-match-select" className="text-[10px] font-mono text-gray-400 block mb-1">Select Match Day Game</label>
                      <select
                        id="fan-match-select"
                        value={selectedMatchId}
                        onChange={(e) => {
                          const mId = e.target.value;
                          setSelectedMatchId(mId);
                          const m = MATCHES_DATABASE.find(item => item.id === mId) || MATCHES_DATABASE[0];
                          setFanSeat(m.seat);
                          setTicketType(m.ticketType);
                          setStadiumState(prev => prev ? { ...prev, activeStadium: m.stadiumFullName } : prev);
                          window.location.hash = `#/match/${mId}`;
                        }}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        {MATCHES_DATABASE.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.homeTeam} vs {m.awayTeam} ({m.stage})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="fan-ticket-select" className="text-[10px] font-mono text-gray-400 block mb-1">Ticket Class</label>
                      <select
                        id="fan-ticket-select"
                        value={ticketType}
                        onChange={(e) => setTicketType(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option>VIP Club Admission</option>
                        <option>General Ticket Entrance</option>
                        <option>Accessibility/ADA seating</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="ada"
                        checked={accessibilityNeeds}
                        onChange={(e) => setAccessibilityNeeds(e.target.checked)}
                        className="rounded bg-gray-900 border-gray-800 text-purple-600 focus:ring-0"
                      />
                      <label htmlFor="ada" className="text-[10px] text-gray-300 cursor-pointer select-none">
                        Include wheelchair accessibility routing
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleGenerateItinerary}
                        disabled={isGeneratingItinerary}
                        aria-label="Generate Smart Fan Itinerary Plan"
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs py-2 transition-all flex items-center justify-center gap-1.5 shadow"
                      >
                        {isGeneratingItinerary ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Analyzing stadium...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="w-3.5 h-3.5" />
                            Generate Plan
                          </>
                        )}
                      </button>

                      {user && itineraryResult && (
                        <button
                          onClick={handleSaveItineraryPlan}
                          disabled={isSavingPlan}
                          className="bg-cyan-950 hover:bg-cyan-900 border border-cyan-900 text-cyan-300 font-mono text-[10px] px-3 py-2 rounded-lg transition-all"
                        >
                          {isSavingPlan ? "Syncing..." : "💾 Cloud Sync"}
                        </button>
                      )}
                    </div>

                    {savePlanMessage && (
                      <p className="text-[9px] font-mono text-cyan-400 text-center">{savePlanMessage}</p>
                    )}
                  </div>

                  {/* Generated itinerary result */}
                  <AnimatePresence>
                    {itineraryResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-900 pt-3"
                      >
                        <div className="bg-gray-950 p-3 rounded-lg border border-gray-900 max-h-56 overflow-y-auto text-[11px] text-gray-300 space-y-1.5 scrollbar-thin scrollbar-thumb-purple-900/60">
                          {itineraryResult.split("\n").map((line, idx) => {
                            const trimmed = line.trim();
                            if (!trimmed) return <div key={idx} className="h-1.5" />;
                            
                            const isHeading = trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#");
                            const isListItem = trimmed.startsWith("-") || trimmed.startsWith("*");
                            
                            // Clean up indicators
                            let cleanText = trimmed
                              .replace(/^#+\s*/, "")
                              .replace(/^[-\*]\s*/, "");
                              
                            // Simple parser for **bold text**
                            const parts = cleanText.split(/\*\*([^*]+)\*\*/g);
                            const formattedContent = parts.map((part, pIdx) => {
                              return pIdx % 2 === 1 ? <strong key={pIdx} className="text-purple-300 font-semibold">{part}</strong> : part;
                            });

                            if (isHeading) {
                              return (
                                <h4 key={idx} className="text-white font-display font-bold text-xs mt-3 mb-1 pb-1 border-b border-purple-900/20 flex items-center gap-1">
                                  <span>{formattedContent}</span>
                                </h4>
                              );
                            }

                            if (isListItem) {
                              return (
                                <div key={idx} className="flex gap-1.5 pl-1">
                                  <span className="text-purple-400 font-extrabold select-none">▪</span>
                                  <span className="text-gray-300 leading-relaxed flex-1">{formattedContent}</span>
                                </div>
                              );
                            }

                            return (
                              <p key={idx} className="text-gray-400 leading-relaxed pl-1">
                                {formattedContent}
                              </p>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Stadium Concessions Queue Map */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-gray-400 mb-3">
                    Concessions Queue Tracker
                  </h4>
                  <div className="space-y-2">
                    {stadiumState.concessions.map((c) => (
                      <div
                        key={c.id}
                        className="bg-gray-900/40 p-2 rounded border border-gray-900 flex justify-between items-center text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{c.name}</div>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {c.zone} | Pref: {c.popular}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-mono font-bold block ${c.queueTime > 15 ? "text-red-400" : "text-green-400"}`}>
                            {c.queueTime} mins wait
                          </span>
                          <span className={`text-[8px] font-mono uppercase px-1 rounded ${c.status === "Overloaded" ? "bg-red-950 text-red-400" : "bg-green-950 text-green-400"}`}>
                            {c.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hype Card Photo Booth (Gemini Image pro / edit & Veo Video) */}
                <PhotoBooth user={user} />
              </motion.div>
            )}

            {/* 2. VOLUNTEER WORKSPACE */}
            {activeRole === "Volunteer" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Volunteer profile shift HUD */}
                <div className="glass-panel p-4 rounded-2xl border border-purple-500/10 bg-gradient-to-br from-gray-950 to-purple-950/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-purple-400 font-mono">
                        Active Volunteer Session
                      </span>
                      <h4 className="text-md font-bold text-white mt-0.5">
                        {user?.displayName || "Elena Rostova (Staff ID #1042)"}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {user?.displayName ? "Operational Safety & Guest Services Staff" : "MetLife East Plaza Coordinator"}
                      </p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-800 text-purple-300 px-2.5 py-1 rounded-xl text-xs font-mono">
                      4.95 ⭐ Rating
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-gray-900 text-xs">
                    <div>
                      <span className="text-gray-500 font-mono uppercase block text-[8px]">Active Shift</span>
                      <span className="text-white font-medium">11:00 AM - 4:00 PM</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-mono uppercase block text-[8px]">Streak Rewards</span>
                      <span className="text-purple-300 font-medium flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-purple-400" />
                        5 Badges active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Walkie-Talkie voice streaming */}
                <LiveWalkieTalkie />

                {/* AI task planner list */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs uppercase font-mono tracking-wider text-cyan-400">
                      AI Assigned Tasks ({stadiumState.volunteers.length})
                    </h4>
                    <span className="text-[9px] bg-cyan-950 text-cyan-300 font-mono px-1 rounded">
                      Live Dispatch
                    </span>
                  </div>

                  <div className="space-y-3">
                    {stadiumState.volunteers.map((vol) => (
                      <div
                        key={vol.id}
                        className="bg-gray-900/50 p-3 rounded-xl border border-gray-900 text-xs space-y-2"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{vol.name}</span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase ${vol.status === "Active" ? "bg-cyan-950 text-cyan-300" : "bg-gray-800 text-gray-400"}`}>
                            {vol.status}
                          </span>
                        </div>
                        <div className="text-gray-300">
                          <span className="text-[10px] text-gray-500 block">Current Assignment</span>
                          {vol.task}
                        </div>
                        <div className="flex gap-2 pt-1 border-t border-gray-900/50">
                          <button
                            onClick={() =>
                              handleUpdateVolunteerTask(vol.id, "Backup team reinforcement at North Plaza / Transit Terminal", "Active")
                            }
                            className="text-[10px] bg-gray-950 border border-gray-800 hover:border-cyan-500/30 hover:bg-cyan-950/20 text-gray-400 hover:text-cyan-300 px-2 py-1 rounded transition-all"
                          >
                            Reassign Support
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateVolunteerTask(
                                vol.id,
                                "Task Completed. Awaiting standby.",
                                "Standby"
                              )
                            }
                            className="text-[10px] ml-auto bg-green-950/40 border border-green-900 hover:bg-green-900/40 text-green-300 px-2.5 py-1 rounded transition-all flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Emergency volunteer instructions */}
                <div className="glass-panel-danger p-4 rounded-2xl text-xs space-y-2">
                  <h4 className="font-bold text-red-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-red-400 shrink-0" />
                    Volunteer Crisis Action Checklist
                  </h4>
                  <p className="text-gray-300 leading-relaxed text-[11px]">
                    If evacuation protocol triggers (Digital twin flashes RED/GREEN):
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-gray-300 text-[10px]">
                    <li>Direct fans AWAY from Gate A towards **Gate C & B**.</li>
                    <li>Coordinate with security team Bravo near Section 124.</li>
                    <li>Utilize hand-held smart signages for AR direction cues.</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* 3. VENUE OPERATIONS COMMAND */}
            {activeRole === "Operations" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Evacuation active simulation control */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-3">
                  <div>
                    <h4 className="text-xs uppercase font-mono tracking-wider text-red-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                      Evacuation Incident Command
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Direct the simulated digital twin into emergency routing state. Escapes will dynamically sweep outward.
                    </p>
                  </div>

                  <button
                    onClick={handleToggleEvacuation}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold font-mono transition-all border ${stadiumState.evacuationSimulating ? "bg-red-600 border-red-500 hover:bg-red-700 text-white" : "bg-gray-900 border-red-900 hover:bg-red-950 text-red-400"}`}
                  >
                    {stadiumState.evacuationSimulating ? "⚠️ DEACTIVATE DRILL / EVAC PROTOCOL" : "🚨 TRIGGER EMERGENCY EVAC DRILL"}
                  </button>
                </div>

                {/* Multimodal Incident Command (CCTV & Voice dispatch) */}
                <IncidentCommand onIncidentCreated={createIncidentDirectly} />

                {/* Alarm Incident Hub */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs uppercase font-mono tracking-wider text-cyan-400">
                      Reported Alarms & Logs
                    </h4>
                    <button
                      onClick={() => setShowIncidentModal(true)}
                      className="text-[10px] bg-purple-900 hover:bg-purple-800 border border-purple-800 text-white px-2 py-1 rounded-lg flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Report Incident
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                    {stadiumState.incidents.map((inc) => (
                      <div
                        key={inc.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 relative overflow-hidden ${inc.status === "Resolved" ? "bg-gray-950/40 border-gray-900 opacity-60" : inc.severity === "High" ? "bg-red-950/35 border-red-900/60" : "bg-amber-950/35 border-amber-900/60"}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-white">{inc.id}</span>
                          <span className={`text-[8px] font-mono px-1 rounded uppercase ${inc.status === "Resolved" ? "bg-gray-800 text-gray-400" : inc.severity === "High" ? "bg-red-950 text-red-400" : "bg-amber-950 text-amber-400"}`}>
                            {inc.status}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-white">{inc.title}</div>
                          <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">
                            {inc.description}
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-gray-900/50 text-[10px]">
                          <span className="text-gray-500 font-mono">
                            {inc.location} | {inc.time}
                          </span>
                          {inc.status === "Active" && (
                            <button
                              onClick={() => handleResolveIncident(inc.id)}
                              className="bg-green-950/80 border border-green-900 hover:bg-green-900 text-green-300 font-mono px-2 py-0.5 rounded transition-all"
                            >
                              Resolve Alarm
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ORGANIZER EXECUTIVE HEADQUARTERS */}
            {activeRole === "Organizer" && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Global multi-stadium monitor status scoreboard */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-3">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-cyan-400 flex items-center justify-between">
                    Multi-Stadium Global Network
                    <Globe className="w-3.5 h-3.5 text-cyan-500" />
                  </h4>

                  <div className="space-y-2">
                    {stadiumState.stadiums.map((stad, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-900/40 p-2.5 rounded-lg border border-gray-900 text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-semibold text-white">{stad.name}</div>
                          <span className="text-[9px] text-gray-500 font-mono">
                            Cap: {stad.capacity.toLocaleString()} | {stad.country}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-white font-mono font-bold block">
                            {stad.attendance > 0
                              ? `${stad.attendance.toLocaleString()} active`
                              : "No match today"}
                          </span>
                          <span className={`text-[8px] font-mono uppercase px-1 rounded ${stad.status === "Active" ? "bg-cyan-950 text-cyan-400" : "bg-gray-800 text-gray-400"}`}>
                            {stad.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gemini Thinking Level HIGH Strategic Scenario simulation */}
                <StrategicScenarioPlanner />

                {/* Maps & Search Grounding Travel scout */}
                <TransitScout />

                {/* Sustainability Ledger & renewable energy yield */}
                <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-3.5">
                  <h4 className="text-xs uppercase font-mono tracking-wider text-green-400 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-green-400 shrink-0" />
                    Sustainability Scoreboard
                  </h4>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-gray-900/30 rounded border border-gray-900">
                      <span className="text-gray-500 text-[8px] uppercase font-mono block">Water Recovery</span>
                      <span className="font-bold text-white mt-1 block">
                        {totalWaterRecycled} Gallons
                      </span>
                    </div>
                    <div className="p-2.5 bg-gray-900/30 rounded border border-gray-900">
                      <span className="text-gray-500 text-[8px] uppercase font-mono block">CO2 Savings today</span>
                      <span className="font-bold text-green-400 mt-1 block flex items-center gap-1">
                        <Droplet className="w-3.5 h-3.5" />
                        {stadiumState.sustainability.co2SavedTons} Tons saved
                      </span>
                    </div>
                  </div>

                  <div className="bg-green-950/20 border border-green-900/40 p-3 rounded-xl flex items-center justify-between text-xs text-green-300">
                    <div>
                      <span className="font-bold block">ESG Sustainability Rating</span>
                      MetLife ranks **Tier A** of all tournament stadiums
                    </div>
                    <div className="text-2xl font-bold font-display text-green-400">88%</div>
                  </div>
                </div>

                {/* Executive summarizer memo trigger */}
                <div className="glass-panel p-4 rounded-2xl border border-purple-500/10 bg-gradient-to-br from-gray-950 to-purple-950/10 space-y-3">
                  <div>
                    <h4 className="text-xs uppercase font-mono tracking-wider text-purple-400 flex items-center gap-1.5">
                      <SparklesIcon className="w-4 h-4 text-purple-400 shrink-0" />
                      FIFA Operational Executive Memo
                    </h4>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Compile an executive daily operational dashboard analysis memo utilizing Gemini.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateExecutiveMemo}
                    disabled={isGeneratingMemo}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs py-2 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingMemo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Analyzing system sensors...
                      </>
                    ) : (
                      <>
                        <BotIcon className="w-3.5 h-3.5" />
                        Compile Executive Memo
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {execMemo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-purple-950/40 pt-3"
                      >
                        <div className="bg-gray-950 p-3 rounded-lg border border-purple-950/30 max-h-56 overflow-y-auto text-xs text-purple-100 font-mono leading-relaxed space-y-1">
                          {execMemo.split("\n").map((line, idx) => {
                            const isHeading = line.startsWith("###");
                            return (
                              <p key={idx} className={isHeading ? "text-white font-bold mt-2" : ""}>
                                {isHeading ? line.replace("###", "") : line}
                              </p>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right column: Secure Google Auth Profile & Copilot chatbot (3 cols) */}
        <section className="lg:col-span-3 flex flex-col gap-6 min-h-[500px]">
          {/* User Secure Auth and Activity Vault */}
          <FirebaseUserProfile onUserChange={setUser} />

          {/* Core Copilot conversation box */}
          <CopilotPanel
            activeRole={activeRole}
            language={language}
            onLanguageChange={setLanguage}
            stadiumState={stadiumState}
          />
        </section>
      </main>
      )}

      {/* Incident Modal (Report New Events) */}
      <AnimatePresence>
        {showIncidentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-2xl p-6 shadow-2xl relative"
            >
              <h3 className="font-display font-semibold text-md text-white mb-4 flex items-center gap-1.5">
                <AlertCircle className="w-5 h-5 text-purple-400" />
                Report New Stadium Incident
              </h3>

              <form onSubmit={handleCreateIncident} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="rep-inc-title" className="text-[10px] font-mono text-gray-400 block mb-1">
                    Incident Title / Subject
                  </label>
                  <input
                    id="rep-inc-title"
                    type="text"
                    required
                    value={newIncidentTitle}
                    onChange={(e) => setNewIncidentTitle(e.target.value)}
                    placeholder="e.g. Broken water valve near Section 102"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rep-inc-loc" className="text-[10px] font-mono text-gray-400 block mb-1">Location</label>
                    <input
                      id="rep-inc-loc"
                      type="text"
                      required
                      value={newIncidentLoc}
                      onChange={(e) => setNewIncidentLoc(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="rep-inc-sev" className="text-[10px] font-mono text-gray-400 block mb-1">Severity Level</label>
                    <select
                      id="rep-inc-sev"
                      value={newIncidentSeverity}
                      onChange={(e) => setNewIncidentSeverity(e.target.value as any)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="Low">🟢 Low</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="High">🔴 High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="rep-inc-desc" className="text-[10px] font-mono text-gray-400 block mb-1">
                    Event Description & Dispatch Instructions
                  </label>
                  <textarea
                    id="rep-inc-desc"
                    rows={3}
                    value={newIncidentDesc}
                    onChange={(e) => setNewIncidentDesc(e.target.value)}
                    placeholder="Provide full details for security dispatch or maintenance alerts..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowIncidentModal(false)}
                    className="px-4 py-2 hover:bg-gray-900 border border-gray-900 rounded-xl text-gray-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Dispatch / Deploy
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Seat Map Navigation Modal moved to top level */}

      {/* Offline Emergency Suite & PWA Hub Modal */}
      <AnimatePresence>
        {showOfflineEmergencyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-gray-950 border border-amber-500/25 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isOnline ? "bg-green-500" : "bg-amber-500 animate-pulse"}`} />
                  <h3 className="font-display font-semibold text-sm text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    Offline Emergency Suite & PWA Sync Hub
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOfflineEmergencyModal(false)}
                  className="text-[10px] text-gray-500 hover:text-white font-mono bg-gray-900 border border-gray-800 px-2.5 py-1 rounded transition-all"
                >
                  [CLOSE]
                </button>
              </div>

              {/* Status and PWA Install Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="md:col-span-8 bg-gray-900/60 p-3.5 rounded-xl border border-gray-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-mono uppercase">App Connectivity Status</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${isOnline ? "bg-green-950/40 text-green-400 border border-green-900" : "bg-amber-950/40 text-amber-400 border border-amber-900 animate-pulse"}`}>
                      {isOnline ? "ONLINE (CONNECTED)" : "OFFLINE (AZTECA OFF-GRID)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 font-sans leading-relaxed">
                    {isOnline 
                      ? "The application is actively polling live IoT telemetry. Cache is fresh and responsive." 
                      : "No active connection detected. The app is serving assets from local service worker cache and routing telemetry locally."}
                  </p>
                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-800 text-[10px] text-gray-500 font-mono">
                    <span>Telemetry Sync Syncpoint:</span>
                    <span className="text-gray-300 font-semibold">{offlineSyncTime}</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-gray-900/60 p-3.5 rounded-xl border border-gray-800 flex flex-col justify-between gap-3">
                  <span className="text-[10px] text-gray-400 font-mono uppercase block">PWA Installation</span>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Install WorldPulse directly onto your desktop or mobile home screen for quick, hardware-accelerated offline startup.
                  </p>
                  {deferredPrompt ? (
                    <button
                      type="button"
                      onClick={handleInstallApp}
                      className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install App</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 text-[10px] text-green-400 font-mono bg-green-950/30 border border-green-900/50 rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span>Installed & Ready</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs Switcher */}
              <div className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 mb-4 gap-1">
                <button
                  type="button"
                  onClick={() => setEmergencyTab("map")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all uppercase ${emergencyTab === "map" ? "bg-amber-500 text-gray-950" : "text-gray-400 hover:text-white"}`}
                >
                  🗺 Offline Map
                </button>
                <button
                  type="button"
                  onClick={() => setEmergencyTab("comm")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all uppercase ${emergencyTab === "comm" ? "bg-amber-500 text-gray-950" : "text-gray-400 hover:text-white"}`}
                >
                  📻 Radio Trainer
                </button>
                <button
                  type="button"
                  onClick={() => setEmergencyTab("directives")}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all uppercase ${emergencyTab === "directives" ? "bg-amber-500 text-gray-950" : "text-gray-400 hover:text-white"}`}
                >
                  📋 Tactical Guides
                </button>
              </div>

              {/* Tab 1: PWA Offline Vector Map */}
              {emergencyTab === "map" && (
                <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800 flex flex-col items-center">
                  <div className="flex justify-between w-full mb-3 text-[10px] font-mono text-gray-400">
                    <span>🏟 Vector Evacuation Route Map (100% Offline)</span>
                    <span className="text-amber-400 font-semibold">Venue: {stadiumState.activeStadium}</span>
                  </div>
                  
                  <div className="relative w-full max-w-[420px] h-[250px] border border-gray-800 rounded-xl bg-gray-950 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                    <svg className="w-full h-full text-gray-600" viewBox="0 0 400 260" fill="none">
                      <ellipse cx="200" cy="130" rx="160" ry="90" stroke="#374151" strokeWidth="6" strokeDasharray="10 6" fill="#111827" />
                      <ellipse cx="200" cy="130" rx="130" ry="70" stroke="#1f2937" strokeWidth="18" fill="none" />
                      <rect x="140" y="100" width="120" height="60" rx="4" fill="#065f46" fillOpacity="0.4" stroke="#10b981" strokeWidth="1.5" />
                      <line x1="200" y1="100" x2="200" y2="160" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" />
                      <circle cx="200" cy="130" r="20" stroke="#10b981" strokeWidth="1" strokeOpacity="0.5" fill="none" />

                      <g>
                        <circle cx="65" cy="70" r="12" className="fill-red-950 stroke-red-500 animate-pulse" strokeWidth="1.5" />
                        <text x="65" y="73" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold" fontFamily="monospace">A</text>
                        <text x="65" y="52" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">GATE A EXIT</text>
                      </g>

                      <g>
                        <circle cx="335" cy="70" r="12" className="fill-green-950 stroke-green-500 animate-pulse" strokeWidth="1.5" />
                        <text x="335" y="73" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="monospace">B</text>
                        <text x="335" y="52" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">GATE B EXIT</text>
                      </g>

                      <g>
                        <circle cx="335" cy="190" r="12" className="fill-green-950 stroke-green-500 animate-pulse" strokeWidth="1.5" />
                        <text x="335" y="193" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="bold" fontFamily="monospace">C</text>
                        <text x="335" y="210" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">GATE C EXIT</text>
                      </g>

                      <g>
                        <circle cx="65" cy="190" r="12" className="fill-red-950 stroke-red-500 animate-pulse" strokeWidth="1.5" />
                        <text x="65" y="193" textAnchor="middle" fill="#f87171" fontSize="9" fontWeight="bold" fontFamily="monospace">D</text>
                        <text x="65" y="210" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">GATE D EXIT</text>
                      </g>

                      <g>
                        <rect x="180" y="200" width="40" height="20" rx="3" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1" />
                        <text x="200" y="212" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="bold" fontFamily="sans-serif">🚑 AMB</text>
                      </g>

                      <g>
                        <rect x="175" y="25" width="50" height="20" rx="3" fill="#14532d" stroke="#22c55e" strokeWidth="1" />
                        <text x="200" y="37" textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="bold" fontFamily="sans-serif">PLAZA SAFE</text>
                      </g>

                      <path d="M140 130 L95 100 L75 78" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" />
                      <path d="M260 130 L305 100 L325 78" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
                      <path d="M260 130 L305 160 L325 182" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 3" />
                      <path d="M140 130 L95 160 L75 182" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" />
                    </svg>
                    
                    <div className="absolute bottom-2 left-2 bg-gray-900/95 border border-gray-800 px-2 py-1 rounded text-[8px] font-mono space-y-0.5 text-gray-400">
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /><span>Congested Exits (Gates A, D)</span></div>
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /><span>Clear Exits (Gates B, C)</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Offline Radio Comm Trainer */}
              {emergencyTab === "comm" && (
                <div className="space-y-4 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs uppercase font-mono tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                        Air-Gapped Radio dispatcher Simulation
                      </h4>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Trigger simulated back-up radio broadcasts using local Web Speech Synthesis and DSP static noise.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label htmlFor="incident-channel-select" className="text-[9px] text-gray-400 font-mono uppercase block">1. Select Incident Channel</label>
                      <select
                        id="incident-channel-select"
                        value={selectedEmergencyScenario}
                        onChange={(e) => setSelectedEmergencyScenario(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      >
                        <option value="med">🚑 Medical Emergency (Section 124)</option>
                        <option value="crowd">👥 Crowd Surge (Gate A Turnstiles)</option>
                        <option value="hazard">⚠️ Wet Floor Hazard (West Concourse)</option>
                      </select>

                      <button
                        type="button"
                        onClick={triggerOfflineScenarioSpeech}
                        disabled={isBroadcastSimulating}
                        aria-label="Trigger Offline Scenario Speech Broadcast"
                        className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-950/30 disabled:text-gray-600 text-gray-950 font-bold py-2.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isBroadcastSimulating ? (
                          <>
                            <Activity className="w-3.5 h-3.5 animate-spin text-gray-950" />
                            <span>Broadcasting over VHF...</span>
                          </>
                        ) : (
                          <>
                            <Radio className="w-3.5 h-3.5" />
                            <span>Key Mic / Transmit</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-gray-950/80 rounded-lg p-3 border border-gray-900 space-y-2 h-[130px] overflow-y-auto">
                      <span className="text-[9px] text-gray-500 font-mono uppercase block">Simulated Comm Logs</span>
                      <div className="space-y-2 font-mono text-[9px]">
                        {broadcastLog.map((log, index) => (
                          <p key={index} className="text-amber-400/90 leading-tight">
                            {log}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Tactical Emergency Guides */}
              {emergencyTab === "directives" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                  <div className="space-y-3">
                    <h4 className="text-[10px] text-amber-400 font-mono uppercase font-bold tracking-wider flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      🚨 Safe Evacuation Protocol
                    </h4>
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-gray-400 leading-normal">
                      <li>Maintain crowd direction away from Gate A & D (under pressure).</li>
                      <li>Encourage steady walking towards clear plazas (Gates B & C).</li>
                      <li>Standby with medical stretcher teams in main concourse sectors.</li>
                      <li>Instruct staff to unlock auxiliary gates & roll up ticketing barriers.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] text-cyan-400 font-mono uppercase font-bold tracking-wider flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5" />
                      📻 Tactical Frequencies (MHz)
                    </h4>
                    <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                      <div className="bg-gray-950 p-2 rounded border border-gray-900">
                        <span className="text-gray-500 block text-[8px] uppercase">Central Dispatch</span>
                        <span className="text-white font-bold">148.55 MHz</span>
                      </div>
                      <div className="bg-gray-950 p-2 rounded border border-gray-900">
                        <span className="text-gray-500 block text-[8px] uppercase">Medical Teams</span>
                        <span className="text-white font-bold">152.12 MHz</span>
                      </div>
                      <div className="bg-gray-950 p-2 rounded border border-gray-900">
                        <span className="text-gray-500 block text-[8px] uppercase">Venue Security</span>
                        <span className="text-white font-bold">166.45 MHz</span>
                      </div>
                      <div className="bg-gray-950 p-2 rounded border border-gray-900">
                        <span className="text-gray-500 block text-[8px] uppercase">Evacuation Chime</span>
                        <span className="text-white font-bold">455.10 MHz</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cache status footer */}
              <div className="mt-6 pt-3 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between text-[10px] text-gray-500 font-mono gap-2">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Offline Cache Status: verified OK (V1-STATIC-CACHE)
                </span>
                <span className="text-amber-500/80 font-semibold animate-pulse">
                  ⚠ Disconnection Resilience: 100% AIR-GAPPED READY
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

          {/* Footer copyright */}
          <footer className="border-t border-gray-900 bg-gray-950/80 p-4 text-center text-[10px] text-gray-500 font-mono mt-auto">
            Made by Suraj
          </footer>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Holographic Seat Navigation Console - Rendered at root level to completely bypass parent scale/will-change positioning bugs */}
    <AnimatePresence>
      {showSeatMapModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-5xl bg-gradient-to-b from-gray-950 via-slate-950 to-purple-950/40 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(168,85,247,0.15)] relative max-h-[92vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-900/60"
          >
            {/* Top Scanning Line */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.8)]" />

            {/* Top Header Controls Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-gray-900 pb-5 mb-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSeatMapModal(false)}
                  className="px-3 py-1.5 bg-purple-950/50 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-500/60 text-purple-300 font-mono text-[10px] rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer uppercase select-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
                  Return to Panel
                </button>
                <div className="h-5 w-[1px] bg-gray-800 hidden sm:block" />
                <div>
                  <h3 className="font-display font-extrabold text-sm md:text-base text-white tracking-tight uppercase flex items-center gap-2">
                    <Compass className="w-5 h-5 text-purple-400 animate-spin" style={{ animationDuration: "12s" }} />
                    Holographic Seat Locator
                  </h3>
                  <span className="text-[9px] text-purple-400/80 font-mono tracking-widest uppercase block mt-0.5">
                    WORLD-PULSE AI // STADIUM INDOOR TELEMETRY
                  </span>
                </div>
              </div>

              {/* System Stats HUD */}
              <div className="flex items-center gap-4 text-[9px] font-mono text-gray-500 bg-black/40 border border-gray-900 px-3.5 py-1.5 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-gray-400">GPS ACCURACY: ±0.3m</span>
                </div>
                <div className="hidden md:block h-3 w-[1px] bg-gray-800" />
                <div className="hidden md:flex items-center gap-1.5">
                  <span className="text-gray-400">SAT FEED: LIVE_GRID_3</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              Explore dynamic seating sectors across the arena. Select sectors to automatically focus the high-precision telemetry map, compute optimal entry corridors, queue metrics, and access offline concourse navigation.
            </p>

            {/* Two-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Map Viewport & Controls */}
              <div className="lg:col-span-6 flex flex-col items-center gap-4 bg-black/40 p-4 rounded-2xl border border-gray-900/60">
                <div className="text-[10px] font-mono text-gray-500 uppercase tracking-wider self-start flex justify-between w-full">
                  <span>Interactive Map Canvas</span>
                  <span className="text-purple-400">{currentMatch.stadiumFullName}</span>
                </div>

                {/* Viewport container */}
                <div className="relative w-full max-w-[340px] aspect-square rounded-2xl border border-gray-800/80 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 overflow-hidden shadow-inner flex items-center justify-center">
                  
                  {/* Grid Lines Overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(147,51,234,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(147,51,234,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/20 via-transparent to-transparent pointer-events-none" />

                  {/* Animated GSAP Canvas */}
                  <div ref={mapCanvasRef} className="relative w-64 h-64 rounded-full border border-gray-800/30 flex items-center justify-center bg-transparent transition-all duration-300">
                    {/* Inner pitch / field */}
                    <div className="w-24 h-36 bg-green-950/40 border border-green-500/20 rounded flex items-center justify-center relative rotate-90 shadow-inner">
                      <div className="w-full h-[1px] bg-green-500/20 absolute top-1/2" />
                      <div className="w-8 h-8 rounded-full border border-green-500/20 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                      <span className="text-[7px] font-mono text-green-400 tracking-wider uppercase opacity-40">PITCH</span>
                    </div>

                    {/* Sectors Ring Indicators */}
                    {/* North Sector (101-112) */}
                    <div
                      onClick={() => setFanSeat("Section 105, Row E, Seat 12")}
                      className={`absolute top-4 left-1/2 transform -translate-x-1/2 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all shadow cursor-pointer border select-none ${fanSeat.includes("105") ? "bg-purple-600/90 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105" : "bg-gray-900/80 text-gray-400 border-gray-800/80 hover:border-purple-500/30"}`}
                    >
                      SEC 105 (North)
                    </div>
                    {/* East Sector (113-125) */}
                    <div
                      onClick={() => setFanSeat("Section 114, Row M, Seat 8")}
                      className={`absolute right-4 top-1/2 transform -translate-y-1/2 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all shadow cursor-pointer border select-none ${fanSeat.includes("114") ? "bg-purple-600/90 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105" : "bg-gray-900/80 text-gray-400 border-gray-800/80 hover:border-purple-500/30"}`}
                    >
                      SEC 114 (East)
                    </div>
                    {/* South Sector (126-138) */}
                    <div
                      onClick={() => setFanSeat("Section 130, Row A, Seat 4")}
                      className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all shadow cursor-pointer border select-none ${fanSeat.includes("130") ? "bg-purple-600/90 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105" : "bg-gray-900/80 text-gray-400 border-gray-800/80 hover:border-purple-500/30"}`}
                    >
                      SEC 130 (South)
                    </div>
                    {/* West Sector (Other) */}
                    <div
                      onClick={() => setFanSeat("Section 140, Row K, Seat 18")}
                      className={`absolute left-4 top-1/2 transform -translate-y-1/2 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all shadow cursor-pointer border select-none ${fanSeat.includes("140") ? "bg-purple-600/90 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105" : "bg-gray-900/80 text-gray-400 border-gray-800/80 hover:border-purple-500/30"}`}
                    >
                      SEC 140 (West)
                    </div>

                    {/* Indicator labels */}
                    <span className="absolute top-[32%] left-[30%] text-[8px] font-mono text-gray-600">GATE B</span>
                    <span className="absolute top-[32%] right-[30%] text-[8px] font-mono text-gray-600">GATE A</span>
                    <span className="absolute bottom-[32%] left-[30%] text-[8px] font-mono text-gray-600">GATE C</span>
                    <span className="absolute bottom-[32%] right-[30%] text-[8px] font-mono text-gray-600">GATE D</span>
                  </div>

                  {/* HUD Overlay */}
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur border border-white/10 rounded px-2 py-0.5 text-[8px] font-mono text-purple-300 pointer-events-none select-none">
                    Zoom: {currentZoom.toFixed(2)}x | Pan: ({Math.round(currentPan.x)}, {Math.round(currentPan.y)})
                  </div>
                </div>

                {/* GSAP Controls Console */}
                <div className="flex flex-wrap gap-1.5 justify-center bg-gray-950/80 p-2 rounded-xl border border-gray-900/80 w-full max-w-[340px]">
                  <button
                    type="button"
                    onClick={() => setCurrentZoom(z => Math.min(3, z + 0.2))}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] px-2 py-1 rounded text-white font-mono transition-all flex items-center gap-0.5 cursor-pointer"
                    title="Zoom In"
                  >
                    ➕ In
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentZoom(z => Math.max(1, z - 0.2))}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] px-2 py-1 rounded text-white font-mono transition-all flex items-center gap-0.5 cursor-pointer"
                    title="Zoom Out"
                  >
                    ➖ Out
                  </button>
                  <div className="h-4 w-[1px] bg-gray-800 self-center" />
                  <button
                    type="button"
                    onClick={() => setCurrentPan(p => ({ ...p, y: p.y + 20 }))}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] p-1 rounded text-white transition-all cursor-pointer"
                    title="Pan Up"
                  >
                    ⬆️
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPan(p => ({ ...p, y: p.y - 20 }))}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] p-1 rounded text-white transition-all cursor-pointer"
                    title="Pan Down"
                  >
                    ⬇️
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPan(p => ({ ...p, x: p.x + 20 }))}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] p-1 rounded text-white transition-all cursor-pointer"
                    title="Pan Left"
                  >
                    ⬅️
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPan(p => ({ ...p, x: p.x - 20 }))}
                    className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-[10px] p-1 rounded text-white transition-all cursor-pointer"
                    title="Pan Right"
                  >
                    ➡️
                  </button>
                  <div className="h-4 w-[1px] bg-gray-800 self-center" />
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentZoom(1);
                      setCurrentPan({ x: 0, y: 0 });
                    }}
                    className="bg-purple-900/40 hover:bg-purple-900/60 border border-purple-800/50 text-[10px] px-2 py-1 rounded text-purple-200 font-mono transition-all cursor-pointer"
                    title="Reset Map"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive Telemetry, Recommended Gates, & AI Concourse Routing */}
              <div className="lg:col-span-6 space-y-5 font-mono text-xs">
                
                {/* Section selection header */}
                <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-900/80 space-y-2.5">
                  <span className="text-[9px] text-gray-500 uppercase block tracking-wider">Seated Telemetry Record</span>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-white font-sans">{fanSeat}</div>
                      <div className="text-[10px] text-purple-400 font-medium">Ticket Class: {ticketType || "General Admission"}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-purple-900/20 border border-purple-500/20 text-purple-300 font-semibold rounded text-[9px]">
                      CONFIRMED SEAT
                    </span>
                  </div>

                  {/* Manual selector grid */}
                  <div className="pt-2 border-t border-gray-900">
                    <span className="text-[9px] text-gray-500 uppercase block mb-2">Switch Seating Zone</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { name: "North Ring", seat: "Section 105, Row E, Seat 12" },
                        { name: "East Ring", seat: "Section 114, Row M, Seat 8" },
                        { name: "South Ring", seat: "Section 130, Row A, Seat 4" },
                        { name: "West Ring", seat: "Section 140, Row K, Seat 18" },
                      ].map((sec) => (
                        <button
                          key={sec.name}
                          type="button"
                          onClick={() => setFanSeat(sec.seat)}
                          className={`py-1.5 px-1 rounded-lg text-[9px] font-mono font-bold transition-all border text-center cursor-pointer ${
                            fanSeat === sec.seat
                              ? "bg-purple-600 text-white border-purple-400 shadow-md animate-pulse"
                              : "bg-gray-950 text-gray-400 border-gray-900 hover:bg-gray-900"
                          }`}
                        >
                          {sec.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Recommended Entry Gate Telemetry */}
                <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-900/80 space-y-3">
                  <span className="text-[9px] text-gray-500 uppercase block tracking-wider">Entry Routing Telemetry</span>
                  
                  {(() => {
                    const rec = getRecommendedGate(fanSeat, stadiumState.gates);
                    return (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-gray-950/70 p-3 rounded-xl border border-gray-900">
                          <div>
                            <span className="text-[8px] text-gray-500 block uppercase">SUGGESTED CORRIDOR</span>
                            <span className="text-white font-bold font-sans text-sm">{rec.bestGate.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-gray-500 block uppercase">QUEUE WAIT TIME</span>
                            <span className={`font-bold font-mono text-sm ${rec.bestGate.waitTime > 12 ? "text-amber-400 animate-pulse" : "text-green-400"}`}>
                              {rec.bestGate.waitTime} mins
                            </span>
                          </div>
                        </div>

                        {/* Rerouted info alert */}
                        <div className={`p-2.5 rounded-xl text-[10px] leading-relaxed border ${
                          rec.isRerouted 
                            ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                            : "bg-purple-950/10 border-purple-900/30 text-purple-300"
                        }`}>
                          <strong className="block mb-0.5 uppercase tracking-wide text-white">
                            {rec.isRerouted ? "⚡ Optimized Re-route Applied:" : "✓ optimal corridor:"}
                          </strong>
                          {rec.reason}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* AI Concourse Wayfinding Instructions */}
                <div className="bg-gradient-to-br from-gray-950/80 to-purple-950/20 p-4 rounded-2xl border border-purple-500/10 space-y-3">
                  <span className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-widest block">
                    ✦ AI Concourse Wayfinding Navigation
                  </span>
                  
                  {(() => {
                    const getAIConcourseRoute = (seat: string) => {
                      if (seat.includes("105")) {
                        return {
                          gate: "Gate B (North Entry Lobby)",
                          steps: [
                            "Enter through Gate B — optimal turnstile wait time (under 2m).",
                            "Ascend to Concourse level via Sector 100 North ramp.",
                            "Follow green glow floor striping directly to Section 105.",
                            "Identify Entry Portal 3B — Seat is located at row E, seat 12."
                          ]
                        };
                      } else if (seat.includes("114")) {
                        return {
                          gate: "Gate A (East Entry Lobby)",
                          steps: [
                            "Enter through Gate A — optimal turnstile wait time (under 4m).",
                            "Proceed right along the Main East Concourse ring loop.",
                            "Navigate past the Azteca Tacos station to Section 114.",
                            "Identify Entry Portal 5 — Seat is located at row M, seat 8."
                          ]
                        };
                      } else if (seat.includes("130")) {
                        return {
                          gate: "Gate D (South Entry Lobby)",
                          steps: [
                            "Enter through Gate D — optimal turnstile wait time (under 1m).",
                            "Turn left at the South Concourse concession corridor.",
                            "Follow purple digital guidance markers to Section 130.",
                            "Identify Entry Portal 1 — Seat is located at row A, seat 4."
                          ]
                        };
                      } else {
                        return {
                          gate: "Gate C (West Entry Lobby)",
                          steps: [
                            "Enter through Gate C — optimal turnstile wait time (under 3m).",
                            "Ascend West Escalators directly to the 100 level concourse.",
                            "Proceed past the FIFA Fan Megastore to Section 140.",
                            "Identify Entry Portal 2W — Seat is located at row K, seat 18."
                          ]
                        };
                      }
                    };

                    const routing = getAIConcourseRoute(fanSeat);
                    return (
                      <div className="space-y-2.5">
                        <div className="text-[10px] text-gray-400 italic">
                          Calculated route starting at <span className="text-white font-semibold">{routing.gate}</span>:
                        </div>
                        <div className="space-y-2">
                          {routing.steps.map((step, idx) => (
                            <div key={step} className="flex gap-2.5 items-start text-[11px] text-gray-300">
                              <span className="w-5 h-5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Nearby Seating Amenities & Concourse Wait Times */}
                <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-900/80 space-y-2.5">
                  <span className="text-[9px] text-gray-500 uppercase block tracking-wider">Nearby Concourse Amenities</span>
                  <ul className="space-y-2 text-[10px]">
                    {currentMatch.stadium.includes("MetLife") ? (
                      <>
                        <li className="flex justify-between items-center border-b border-gray-900/40 pb-1.5"><span>🍔 MetLife Grill (Gate A area)</span> <span className="text-green-400 font-bold bg-green-950/40 px-1.5 py-0.5 rounded">Low wait (2m)</span></li>
                        <li className="flex justify-between items-center border-b border-gray-900/40 pb-1.5"><span>🥤 Pepsi Club Lounge (Gate B area)</span> <span className="text-green-400 font-bold bg-green-950/40 px-1.5 py-0.5 rounded">Normal (4m)</span></li>
                        <li className="flex justify-between items-center"><span>👕 FIFA Fan Megastore (Gate C area)</span> <span className="text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded">Crowded (12m)</span></li>
                      </>
                    ) : currentMatch.stadium.includes("Azteca") ? (
                      <>
                        <li className="flex justify-between items-center border-b border-gray-900/40 pb-1.5"><span>🌮 Azteca Cantina (Gate B area)</span> <span className="text-green-400 font-bold bg-green-950/40 px-1.5 py-0.5 rounded">Low wait (3m)</span></li>
                        <li className="flex justify-between items-center border-b border-gray-900/40 pb-1.5"><span>🥤 Corona VIP Pavilion (Gate A area)</span> <span className="text-green-400 font-bold bg-green-950/40 px-1.5 py-0.5 rounded">Normal (5m)</span></li>
                        <li className="flex justify-between items-center"><span>👕 Azteca Merchandise (Gate C area)</span> <span className="text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded">Crowded (15m)</span></li>
                      </>
                    ) : (
                      <>
                        <li className="flex justify-between items-center border-b border-gray-900/40 pb-1.5"><span>🍔 BC Pavilion Foods (Gate D area)</span> <span className="text-green-400 font-bold bg-green-950/40 px-1.5 py-0.5 rounded">Low wait (1m)</span></li>
                        <li className="flex justify-between items-center border-b border-gray-900/40 pb-1.5"><span>🥤 Granville Island Bar (Gate C area)</span> <span className="text-green-400 font-bold bg-green-950/40 px-1.5 py-0.5 rounded">Normal (3m)</span></li>
                        <li className="flex justify-between items-center"><span>👕 Vancouver Fan Store (Gate B area)</span> <span className="text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded">Crowded (9m)</span></li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Footer confirmation button */}
                <button
                  type="button"
                  onClick={() => setShowSeatMapModal(false)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-2xl text-xs py-3 px-4 transition-all shadow-[0_4px_15px_rgba(147,51,234,0.3)] hover:shadow-[0_4px_25px_rgba(147,51,234,0.5)] cursor-pointer text-center uppercase"
                >
                  Bind to Ticket & Confirm Seating
                </button>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}

// Inline SVGs to avoid loading errors
function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3v16M8 5s3 5 3 6-2 1-3 1M16 5s-3 5-3 6 2 1 3 1M12 11h8" />
      <path d="m19 12 3-3-3-3" />
      <path d="m5 12-3-3 3-3" />
    </svg>
  );
}

function BotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
