import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Droplet,
  Flame,
  HeartPulse,
  Info,
  MapPin,
  Navigation,
  Plus,
  ShieldAlert,
  Stethoscope,
  TrendingUp,
  Users,
  AlertCircle
} from "lucide-react";
import { StadiumState } from "../types";

interface MedicalSupportProps {
  stadiumState: StadiumState;
  activeRole: "Fan" | "Volunteer" | "Operations" | "Organizer" | "Medical";
  userSeat?: string;
  onAddIncident?: (title: string, location: string, severity: "Low" | "Medium" | "High", description: string) => void;
}

interface MedicalAsset {
  id: string;
  name: string;
  type: "firstaid" | "ambulance" | "doctor" | "exit";
  location: string;
  x: number; // SVG X coord
  y: number; // SVG Y coord
  status: "Standby" | "Active" | "Dispatched" | "Optimal" | "Crowded" | "In-Transit";
  details: string;
}

interface LiveAmbulance {
  id: string;
  name: string;
  status: "Standby" | "In-Transit" | "Arrived";
  speed: number;
  battery: number;
  oxygen: number;
  crewHR: number;
  location: string;
  x: number;
  y: number;
  route: string;
}

interface MedicalStaff {
  id: string;
  name: string;
  role: string;
  specialty: string;
  location: string;
  hr: number;
  status: "Duty" | "Standby" | "On-Call";
}

interface Hospital {
  id: string;
  name: string;
  bedsAvailable: number;
  travelTime: number;
  status: "Normal" | "Alert" | "Full";
  distance: string;
}

export default function MedicalSupport({
  stadiumState,
  activeRole,
  userSeat = "Section 124, Row M, Seat 8",
  onAddIncident
}: MedicalSupportProps) {
  
  // --- STATE FOR SECTIONS ---
  const [assets, setAssets] = useState<MedicalAsset[]>([
    { id: "fa-1", name: "First-Aid Post 1", type: "firstaid", location: "East Concourse Section 112", x: 260, y: 130, status: "Active", details: "Paramedic team ready. Equipped with standard AED and triage kits." },
    { id: "fa-2", name: "First-Aid Post 2", type: "firstaid", location: "North Plaza Section 140", x: 200, y: 80, status: "Standby", details: "Full trauma backup center on standby. High-capacity oxygen reserve." },
    { id: "fa-3", name: "First-Aid Post 3 (HQ)", type: "firstaid", location: "West Concourse Section 124", x: 140, y: 160, status: "Standby", details: "Core emergency HQ. Active physician on duty. Advanced life support system." },
    { id: "fa-4", name: "First-Aid Post 4", type: "firstaid", location: "Upper Tier Section 224", x: 200, y: 220, status: "Active", details: "Upper tier rapid care unit. Secondary triage outpost." },
    
    { id: "amb-1", name: "Ambulance Medic 1", type: "ambulance", location: "East Outer Gate A", x: 280, y: 100, status: "Standby", details: "Critical care transport. Response route cleared." },
    { id: "amb-2", name: "Ambulance Medic 2", type: "ambulance", location: "West Outer Gate C", x: 100, y: 180, status: "Active", details: "Currently handling patient transfer. Re-routing via Gate C access lanes." },
    { id: "amb-3", name: "Ambulance Medic 3", type: "ambulance", location: "South Outer Gate D", x: 190, y: 250, status: "Standby", details: "Equipped with advanced cardiac telemetry." },
    
    { id: "doc-1", name: "Dr. Ramirez (Cardiologist)", type: "doctor", location: "West Post 3 HQ", x: 155, y: 150, status: "Standby", details: "Incident lead. Over 15 years trauma response experience." },
    { id: "doc-2", name: "Dr. Chen (Emergency MD)", type: "doctor", location: "East Post 1", x: 245, y: 140, status: "Active", details: "Directing minor injury triage under high stadium entry load." },
    { id: "doc-3", name: "Paramedic Squad Bravo", type: "doctor", location: "Mobile Patrol North Concourse", x: 190, y: 110, status: "Dispatched", details: "Staggered patrol. Mobile AED unit." },
    
    { id: "ex-1", name: "Emergency Exit North-West", type: "exit", location: "Gate B North Corridor", x: 170, y: 65, status: "Optimal", details: "Direct path to emergency airfield and transport hub." },
    { id: "ex-2", name: "Emergency Exit West Path", type: "exit", location: "Gate C Airfield Path", x: 115, y: 150, status: "Optimal", details: "Cleared access corridor for EMS vehicles." },
    { id: "ex-3", name: "Emergency Exit East Plaza", type: "exit", location: "Gate A East Outer Plaza", x: 290, y: 160, status: "Crowded", details: "Heavy incoming pedestrian load. EMS egress slightly bottlenecked." }
  ]);

  const [selectedAsset, setSelectedAsset] = useState<MedicalAsset | null>(null);

  // Map Filters
  const [showFirstAid, setShowFirstAid] = useState(true);
  const [showAmbulances, setShowAmbulances] = useState(true);
  const [showDoctors, setShowDoctors] = useState(true);
  const [showExits, setShowExits] = useState(true);

  // --- AMBULANCE REAL-TIME TRACKING STATE ---
  const [ambulances, setAmbulances] = useState<LiveAmbulance[]>([
    { id: "AMB-101", name: "Critical Unit Alpha", status: "Standby", speed: 0, battery: 98, oxygen: 100, crewHR: 72, location: "East Gate A Outpost", x: 280, y: 100, route: "Route Alpha A1 (Optimal)" },
    { id: "AMB-102", name: "Trauma Unit Beta", status: "In-Transit", speed: 52, battery: 84, oxygen: 85, crewHR: 104, location: "En-Route Hackensack ER", x: 100, y: 180, route: "Route Bravo B2 via Gate C Path" },
    { id: "AMB-103", name: "Cardiac Unit Gamma", status: "Standby", speed: 0, battery: 91, oxygen: 92, crewHR: 78, location: "South Heli-Pad Standby", x: 190, y: 250, route: "Route Gamma C1 (Standby)" }
  ]);
  const [isDrivingSim, setIsDrivingSim] = useState(false);

  // --- FIRST-AID STATIONS STATE ---
  const [stations, setStations] = useState([
    { id: "STA-01", name: "Post 1 (East Wing)", beds: 12, occupied: 8, aedStatus: "Optimal (4 units)", oxLevel: 95, physician: "Dr. Angela Chen" },
    { id: "STA-02", name: "Post 2 (North Gate)", beds: 8, occupied: 3, aedStatus: "Optimal (2 units)", oxLevel: 100, physician: "Dr. Sterling Vance" },
    { id: "STA-03", name: "Post 3 (HQ - West)", beds: 24, occupied: 14, aedStatus: "Optimal (8 units)", oxLevel: 92, physician: "Dr. Mateo Ramirez" },
    { id: "STA-04", name: "Post 4 (Upper Deck)", beds: 6, occupied: 4, aedStatus: "Refill Needed", oxLevel: 80, physician: "Lead Nurse Kim" }
  ]);

  // --- DOCTORS AND PARAMEDICS TELEMETRY STATE ---
  const [staffList, setStaffList] = useState<MedicalStaff[]>([
    { id: "MD-01", name: "Dr. Mateo Ramirez", role: "MD Physician", specialty: "Cardiology & Trauma Lead", location: "Post 3 West HQ", hr: 74, status: "Duty" },
    { id: "MD-02", name: "Dr. Angela Chen", role: "MD Emergency MD", specialty: "Rapid Triage Outpost", location: "Post 1 East Wing", hr: 81, status: "Duty" },
    { id: "MD-03", name: "Dr. Sterling Vance", role: "MD Trauma Surgeon", specialty: "Critical Interventions", location: "Post 2 North Gate", hr: 68, status: "Standby" },
    { id: "SQ-BRAVO", name: "Paramedic Squad Bravo", role: "Squad", specialty: "Advanced Life Support", location: "Mobile North Ring", hr: 102, status: "Duty" },
    { id: "SQ-DELTA", name: "Paramedic Squad Delta", role: "Squad", specialty: "First Aid & CPR", location: "Mobile South concourse", hr: 85, status: "Standby" }
  ]);

  // --- DISPATCH QUEUE STATE ---
  const [dispatchQueue, setDispatchQueue] = useState<any[]>([
    { id: "ALM-301", title: "Heat Exhaustion / Fainting", location: "Section 104, Row G", severity: "High", time: "11:45 AM", status: "Responding", assigned: "Trauma Unit Beta", description: "Fan unconscious, breathing shallowly. Evacuated from seat to concourse corridor." },
    { id: "ALM-302", title: "Ankle Fracture", location: "Gate B Access Ramp", severity: "Medium", time: "11:50 AM", status: "Responding", assigned: "Post 2 North Gate", description: "Fan slipped on slick concrete near stairs. Splint and wheelchair deployed." },
    { id: "ALM-303", title: "Chest Pain / Heart Rate Spike", location: "Section 124, Row M", severity: "High", time: "11:55 AM", status: "Unassigned", assigned: "Awaiting Dispatch", description: "Telemetry alarm triggered. Chest tightness reported by fan." },
    { id: "ALM-298", title: "Minor Dehydration", location: "Section 218, Row D", severity: "Low", time: "11:12 AM", status: "Resolved", assigned: "Post 4 Upper Deck", description: "Delivered hydration packs. Symptom resolved." }
  ]);

  // Intake Form
  const [newSymptom, setNewSymptom] = useState("Dehydration");
  const [newLocation, setNewLocation] = useState("Section 124");
  const [newSeverity, setNewSeverity] = useState<"Low" | "Medium" | "High">("Medium");
  const [newDescription, setNewDescription] = useState("");

  // --- HOSPITAL COORDINATION STATE ---
  const [hospitals, setHospitals] = useState<Hospital[]>([
    { id: "HOS-01", name: "Hackensack Trauma Level 1", bedsAvailable: 14, travelTime: 8, status: "Normal", distance: "4.2 miles" },
    { id: "HOS-02", name: "Meadowlands Medical Center", bedsAvailable: 6, travelTime: 4, status: "Alert", distance: "1.8 miles" },
    { id: "HOS-03", name: "MetLife Evac Flight Deck", bedsAvailable: 2, travelTime: 12, status: "Normal", distance: "On-site Helipad" }
  ]);

  // --- EMERGENCY EXIT & CORRIDORS STATE ---
  const [exitOverrideFlashing, setExitOverrideFlashing] = useState(false);
  const [exitsState, setExitsState] = useState([
    { id: "EG-B", name: "Corridor B (North)", clearance: "98% CLEAR", flowRate: "Optimal", activeSensors: "Normal" },
    { id: "EG-C", name: "Corridor C (West)", clearance: "100% CLEAR", flowRate: "Optimal", activeSensors: "Normal" },
    { id: "EG-A", name: "Corridor A (East Plaza)", clearance: "74% CONGESTED", flowRate: "Slow", activeSensors: "High Traffic Alert" }
  ]);

  // --- SIMULATION EFFECTS ---
  // 1. Biometric Jiggle Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setStaffList(prev => prev.map(staff => ({
        ...staff,
        hr: Math.round(staff.hr + (Math.random() * 4 - 2))
      })));
      setAmbulances(prev => prev.map(amb => ({
        ...amb,
        crewHR: Math.round(amb.crewHR + (Math.random() * 2 - 1))
      })));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // 2. Drive Ambulance Simulator
  useEffect(() => {
    let driveInterval: any;
    if (isDrivingSim) {
      driveInterval = setInterval(() => {
        setAmbulances(prev => prev.map(amb => {
          if (amb.status === "In-Transit") {
            let nextX = amb.x + (Math.random() * 6 - 3);
            let nextY = amb.y + (Math.random() * 6 - 3);
            if (nextX < 100) nextX = 120;
            if (nextX > 300) nextX = 280;
            if (nextY < 80) nextY = 100;
            if (nextY > 260) nextY = 240;
            
            return {
              ...amb,
              speed: Math.round(45 + Math.random() * 15),
              battery: Math.max(20, amb.battery - 1),
              oxygen: Math.max(50, amb.oxygen - 0.5),
              x: Number(nextX.toFixed(1)),
              y: Number(nextY.toFixed(1))
            };
          }
          return amb;
        }));
      }, 1000);
    }
    return () => clearInterval(driveInterval);
  }, [isDrivingSim]);

  // Trigger dispatch optimization Central Core simulation
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationLog, setOptimizationLog] = useState<string[]>([]);
  const handleGlobalRouteOptimization = () => {
    setIsOptimizing(true);
    setOptimizationLog([]);
    const logs = [
      "Initializing Central AI Rapid Response Route optimizer...",
      "Analyzing stadium ring loads & Gate corridors...",
      "CRITICAL: Concourse Section 124 reports crowd bottlenecks.",
      "Calculating shortest path bypassing East wing concessions...",
      "SUCCESS: Re-routed Ambulance 1 via Gate C service corridor to West HQ.",
      "Triage instructions compiled via Gemini Medical Specialist Model.",
      "ETA reduction successfully applied to all pending alerts."
    ];
    logs.forEach((log, index) => {
      setTimeout(() => {
        setOptimizationLog(prev => [...prev, `[AI-SYSTEM] ${log}`]);
        if (index === logs.length - 1) {
          setIsOptimizing(false);
          setDispatchQueue(prev => prev.map(item => {
            if (item.status === "Unassigned") {
              return { ...item, status: "Responding", assigned: "Cardiac Unit Gamma (AI Route Optimized)" };
            }
            return item;
          }));
        }
      }, (index + 1) * 600);
    });
  };

  // Dispatch manual assignment
  const handleDispatchManual = (caseId: string, squad: string) => {
    setDispatchQueue(prev => prev.map(item => {
      if (item.id === caseId) {
        return { ...item, status: "Responding", assigned: squad };
      }
      return item;
    }));
  };

  // Resolve case manual
  const handleResolveCase = (caseId: string) => {
    setDispatchQueue(prev => prev.map(item => {
      if (item.id === caseId) {
        return { ...item, status: "Resolved" };
      }
      return item;
    }));
  };

  // Post dynamic incident
  const handleAddNewIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `ALM-${Math.floor(305 + Math.random() * 95)}`;
    const timeString = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newCase = {
      id: newId,
      title: `${newSymptom} Incident`,
      location: newLocation,
      severity: newSeverity,
      time: timeString,
      status: "Unassigned",
      assigned: "Awaiting Dispatch",
      description: newDescription || `Rapid clinical dispatch desired at ${newLocation}.`
    };

    setDispatchQueue(prev => [newCase, ...prev]);
    if (onAddIncident) {
      onAddIncident(
        `MEDICAL EMER: ${newSymptom}`,
        newLocation,
        newSeverity,
        newDescription || `Emergency triggered from standalone Medical Command Desk.`
      );
    }
    // reset form
    setNewDescription("");
  };

  // Evac Air Transfer simulator
  const handleEvacTransferSim = (hosId: string) => {
    setHospitals(prev => prev.map(h => {
      if (h.id === hosId) {
        return { ...h, bedsAvailable: Math.max(0, h.bedsAvailable - 1) };
      }
      return h;
    }));
    alert(`FIFA Medical Air-Evac Request Approved. Heli-ambulance clearance synced with airport.`);
  };

  // AED Refill simulator
  const handleAedRefill = (staId: string) => {
    setStations(prev => prev.map(s => {
      if (s.id === staId) {
        return { ...s, aedStatus: "Optimal (4 units)" };
      }
      return s;
    }));
  };

  // Emergency Egress Override Trigger
  const handleExitOverrideTrigger = () => {
    setExitOverrideFlashing(!exitOverrideFlashing);
    setExitsState(prev => prev.map(ex => ({
      ...ex,
      flowRate: exitOverrideFlashing ? "Optimal" : "EMERGENCY OVERRIDE",
      clearance: exitOverrideFlashing ? "98% CLEAR" : "100% EVACUATION FORCE RELEASE"
    })));
  };

  return (
    <div className="space-y-6">
      
      {/* ================= HEADER PANEL ================= */}
      <div className="bg-gradient-to-r from-red-950/45 via-slate-900 to-indigo-950/45 border border-red-500/20 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-red-600/10 border border-red-500/30 text-red-500 animate-pulse">
                <HeartPulse className="w-6 h-6" />
              </span>
              <div>
                <span className="text-[10px] bg-red-950 text-red-400 font-mono font-bold px-2 py-0.5 rounded border border-red-900/40 uppercase tracking-widest">
                  FIFA Medical Command Suite
                </span>
                <h1 className="text-xl md:text-2xl font-display font-extrabold text-white mt-1">
                  Emergency Medical Response Control Deck
                </h1>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 ml-11 max-w-3xl">
              Centralized telemetry dashboard for on-duty tournament physicians, EMS paramedics, and stadium safety leads. Synchronizing active sensor grids with FIFA World Cup Hospital network nodes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 md:self-center">
            <span className="text-[10px] font-mono text-gray-500 bg-black/45 px-3 py-1.5 rounded-xl border border-gray-900">
              SYS-UPTIME: <span className="text-emerald-400 font-bold">100% ONLINE</span>
            </span>
            <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/30 px-3.5 py-1.5 rounded-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-mono font-bold uppercase text-red-400 tracking-wider">
                LIVE TRAFFIC CHANNEL #9
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= THE STANDALONE CORE DASHBOARD BENTO GRID ================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ================= LEFT GRID: MAP & DISPATCH (8 COLS) ================= */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* 1. SECTION: LIVE MEDICAL STADIUM MAP */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-900 pb-3.5">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-red-500 animate-pulse" />
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                    Live Tactical Medical Map
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">Rendering IoT beacon coordinates</p>
                </div>
              </div>

              {/* Map Filter Toggles */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setShowFirstAid(!showFirstAid)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                    showFirstAid
                      ? "bg-red-950/50 border-red-500/40 text-red-400"
                      : "bg-gray-900 border-gray-800 text-gray-500"
                  }`}
                >
                  🏥 First-Aid ({assets.filter(a => a.type === "firstaid").length})
                </button>
                <button
                  onClick={() => setShowAmbulances(!showAmbulances)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                    showAmbulances
                      ? "bg-amber-950/50 border-amber-500/40 text-amber-400"
                      : "bg-gray-900 border-gray-800 text-gray-500"
                  }`}
                >
                  🚑 Ambulances ({assets.filter(a => a.type === "ambulance").length})
                </button>
                <button
                  onClick={() => setShowDoctors(!showDoctors)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                    showDoctors
                      ? "bg-cyan-950/50 border-cyan-500/40 text-cyan-400"
                      : "bg-gray-900 border-gray-800 text-gray-500"
                  }`}
                >
                  🩺 Staff MDs ({assets.filter(a => a.type === "doctor").length})
                </button>
                <button
                  onClick={() => setShowExits(!showExits)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition-all ${
                    showExits
                      ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-400"
                      : "bg-gray-900 border-gray-800 text-gray-500"
                  }`}
                >
                  🚪 Exits ({assets.filter(a => a.type === "exit").length})
                </button>
              </div>
            </div>

            {/* CYBERPUNK VECTOR MEDICAL MAP VIEW */}
            <div className="relative w-full aspect-[16/9] bg-slate-950 rounded-xl overflow-hidden border border-red-900/10">
              <svg className="absolute inset-0 w-full h-full opacity-45" viewBox="0 0 400 300" preserveAspectRatio="none">
                <rect width="100%" height="100%" fill="url(#med-grid)" />
                <ellipse cx="200" cy="150" rx="120" ry="90" fill="none" stroke="#ef4444" strokeWidth="0.8" strokeDasharray="3,6" />
                <ellipse cx="200" cy="150" rx="90" ry="65" fill="none" stroke="#dc2626" strokeWidth="1.2" />
                <ellipse cx="200" cy="150" rx="65" ry="45" fill="none" stroke="#450a0a" strokeWidth="2" />
                <rect x="165" y="125" width="70" height="50" fill="#022c22" stroke="#059669" strokeWidth="0.8" opacity="0.3" rx="3" />
                <g stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.4">
                  <path d="M 115,150 L 140,160 L 200,220 L 260,130 L 200,80 L 115,150" fill="none" />
                </g>
              </svg>

              {/* Pulsing Active Incident Indicators */}
              {dispatchQueue.filter(q => q.status === "Responding").map((activeAlm, i) => (
                <div 
                  key={i}
                  className="absolute"
                  style={{ 
                    left: `${activeAlm.id.includes("301") ? "140px" : "200px"}`, 
                    top: `${activeAlm.id.includes("301") ? "160px" : "80px"}`, 
                    transform: "translate(-50%, -50%)" 
                  }}
                >
                  <span className="absolute inline-flex h-12 w-12 rounded-full bg-red-600/35 animate-ping" />
                  <span className="absolute inline-flex h-6 w-6 rounded-full bg-red-600/60 animate-pulse" />
                  <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-white flex items-center justify-center text-[7px] font-mono font-bold text-white shadow-xl shadow-red-950">
                    !
                  </div>
                </div>
              ))}

              {/* INTERACTIVE MARKERS */}
              {assets.map((asset) => {
                if (asset.type === "firstaid" && !showFirstAid) return null;
                if (asset.type === "ambulance" && !showAmbulances) return null;
                if (asset.type === "doctor" && !showDoctors) return null;
                if (asset.type === "exit" && !showExits) return null;

                const isSelected = selectedAsset?.id === asset.id;

                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    aria-label={`Select tactical node ${asset.name}`}
                    className="absolute group transition-transform hover:scale-120 active:scale-90"
                    style={{
                      left: `${(asset.x / 400) * 100}%`,
                      top: `${(asset.y / 300) * 100}%`,
                      transform: "translate(-50%, -50%)"
                    }}
                  >
                    <span className={`absolute inset-0 rounded-full scale-150 opacity-0 group-hover:opacity-45 transition-opacity ${
                      asset.type === "firstaid" ? "bg-red-500/35" :
                      asset.type === "ambulance" ? "bg-amber-500/35" :
                      asset.type === "doctor" ? "bg-cyan-500/35" : "bg-emerald-500/35"
                    }`} />

                    <div className={`p-1.5 rounded-xl border shadow-xl flex items-center justify-center transition-all ${
                      isSelected 
                        ? "scale-115 border-white text-white z-20 bg-red-600 shadow-lg shadow-red-950" 
                        : asset.type === "firstaid" ? "bg-red-950/80 border-red-500/40 text-red-400" :
                          asset.type === "ambulance" ? "bg-amber-950/80 border-amber-500/40 text-amber-400" :
                          asset.type === "doctor" ? "bg-cyan-950/80 border-cyan-500/40 text-cyan-400" :
                          "bg-emerald-950/80 border-emerald-500/40 text-emerald-400"
                    }`}>
                      {asset.type === "firstaid" && <HeartPulse className="w-4 h-4" />}
                      {asset.type === "ambulance" && <Ambulance className="w-4 h-4" />}
                      {asset.type === "doctor" && <Stethoscope className="w-4 h-4" />}
                      {asset.type === "exit" && <ShieldAlert className="w-4 h-4" />}
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:block bg-gray-950 border border-gray-800 text-[10px] text-white px-2 py-0.5 rounded shadow-xl whitespace-nowrap z-20 font-mono">
                      {asset.name}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Map Asset Card */}
            <div className="bg-gray-900/40 border border-red-950/20 p-4 rounded-xl">
              {selectedAsset ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                        selectedAsset.type === "firstaid" ? "bg-red-950 text-red-400 border-red-500/25" :
                        selectedAsset.type === "ambulance" ? "bg-amber-950 text-amber-400 border-amber-500/25" :
                        selectedAsset.type === "doctor" ? "bg-cyan-950 text-cyan-400 border-cyan-500/25" :
                        "bg-emerald-950 text-emerald-400 border-emerald-500/25"
                      }`}>
                        {selectedAsset.type}
                      </span>
                      <h4 className="text-sm font-bold text-white">{selectedAsset.name}</h4>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">Zone: {selectedAsset.location} • Status: <span className="text-white font-bold">{selectedAsset.status}</span></p>
                    <p className="text-xs text-gray-300 mt-1.5 leading-relaxed">{selectedAsset.details}</p>
                  </div>
                  <button
                    onClick={() => {
                      alert(`Sent priority query packet to telemetry node: ${selectedAsset.name}`);
                    }}
                    className="self-start sm:self-auto px-3.5 py-1.5 bg-gray-950 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded-xl transition-all font-mono text-[10px]"
                  >
                    Diagnose Node
                  </button>
                </div>
              ) : (
                <div className="text-center py-2 text-gray-500 text-xs flex items-center justify-center gap-2 font-mono">
                  <Info className="w-4 h-4 text-gray-600" />
                  Select any icon on the Live Medical Map above to extract real-time details & route.
                </div>
              )}
            </div>
          </div>

          {/* 2. SECTION: AMBULANCE GPS TRACKING & TELEMETRY */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <div className="flex items-center gap-2">
                <Ambulance className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                    Ambulance Tracking & Telemetry
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">Live vehicular GPS telemetry & cardiac links</p>
                </div>
              </div>
              
              <button
                onClick={() => setIsDrivingSim(!isDrivingSim)}
                className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg border transition-all ${
                  isDrivingSim 
                    ? "bg-amber-950/50 border-amber-500 text-amber-400 animate-pulse" 
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {isDrivingSim ? "🟢 DRIVING SIMULATOR ACTIVE" : "🏎️ ENABLE DYNAMIC SIMULATOR"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ambulances.map((amb) => (
                <div key={amb.id} className="bg-gray-900/35 border border-gray-850 p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] font-mono text-gray-500 uppercase block">{amb.id}</span>
                      <h4 className="text-xs font-bold text-white">{amb.name}</h4>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{amb.location}</p>
                    </div>
                    <span className={`text-[8px] font-mono px-2 py-0.5 rounded uppercase font-black tracking-wider ${
                      amb.status === "In-Transit" ? "bg-red-950 text-red-400 border border-red-900/35 animate-pulse" : "bg-gray-850 text-gray-400"
                    }`}>
                      {amb.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/30 p-2 rounded-lg border border-gray-900/60">
                    <div>
                      <span className="text-gray-500 block">SPEED</span>
                      <span className="text-white font-bold">{amb.speed} km/h</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">EV BATTERY</span>
                      <span className="text-white font-bold">{amb.battery}%</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-500 block">OXYGEN LVL</span>
                      <span className="text-white font-bold">{amb.oxygen}%</span>
                    </div>
                    <div className="mt-1">
                      <span className="text-gray-500 block">CREW AVG HR</span>
                      <span className="text-emerald-400 font-bold">{amb.crewHR} bpm</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-900 pt-2 text-[9px] font-mono text-gray-400 flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="truncate">Route: {amb.route}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. SECTION: FIRST-AID STATIONS & REPLENISHMENT */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                    Concourse First-Aid Stations
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">Triage capacity, AED count, and on-site doctors</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-900/30">
                TOTAL CAP: 50 BEDS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300 font-mono">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 text-[9px] uppercase tracking-wider">
                    <th className="py-2.5">Station ID</th>
                    <th className="py-2.5">Name</th>
                    <th className="py-2.5">Bed Occupancy</th>
                    <th className="py-2.5">Physician Lead</th>
                    <th className="py-2.5">AED Stock</th>
                    <th className="py-2.5 text-right">Oxygen cylinders</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/40">
                  {stations.map((sta) => (
                    <tr key={sta.id} className="hover:bg-gray-900/10">
                      <td className="py-3 font-bold text-white">{sta.id}</td>
                      <td className="py-3 font-sans font-medium text-gray-200">{sta.name}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{sta.occupied} / {sta.beds}</span>
                          <div className="w-20 bg-gray-900 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-red-500 h-1.5 rounded-full" 
                              style={{ width: `${(sta.occupied / sta.beds) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-gray-400 font-sans">{sta.physician}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sta.aedStatus.includes("Refill") ? "bg-red-950 text-red-400 animate-pulse" : "bg-gray-850 text-gray-300"
                        }`}>
                          {sta.aedStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right text-cyan-400 font-bold">{sta.oxLevel}%</td>
                      <td className="py-3 text-right">
                        {sta.aedStatus.includes("Refill") ? (
                          <button
                            onClick={() => handleAedRefill(sta.id)}
                            aria-label={`Restock AED for station ${sta.name}`}
                            className="bg-red-900/60 hover:bg-red-900 text-white text-[9px] font-bold px-2.5 py-1 rounded transition-all"
                          >
                            ⚡ RESTOCK AED
                          </button>
                        ) : (
                          <span className="text-[9px] text-gray-600">Secure</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ================= RIGHT GRID: DISPATCH & STATS (4 COLS) ================= */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* 4. SECTION: CO-PILOT OPTIMIZATION & DISPATCH QUEUE */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-900 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                    Emergency Dispatch Board
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">Triage, routing, and manual controls</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-900/30">
                {dispatchQueue.filter(item => item.status !== "Resolved").length} Pending
              </span>
            </div>

            {/* Central AI Optimizer button */}
            <div className="p-3 bg-red-950/15 border border-red-500/20 rounded-xl space-y-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-red-400 block">AI ROUTING ENGINE</span>
                  <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">Calculates optimal transit pathways avoiding heavy turnstiles.</p>
                </div>
                <Activity className="w-4 h-4 text-red-400 animate-pulse" />
              </div>
              <button
                onClick={handleGlobalRouteOptimization}
                disabled={isOptimizing}
                className="w-full py-2 bg-gradient-to-r from-red-600 to-indigo-600 hover:from-red-500 hover:to-indigo-500 text-white font-mono font-bold text-xs uppercase rounded-lg shadow-lg disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                {isOptimizing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-t-2 border-white rounded-full animate-spin" />
                    Running Central Optimization...
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-white" />
                    AI Path Route Optimization Run
                  </>
                )}
              </button>

              {/* Optimization Log Terminal */}
              {optimizationLog.length > 0 && (
                <div className="bg-black/80 p-2.5 rounded border border-gray-900 max-h-[120px] overflow-y-auto text-[9px] font-mono text-gray-400 space-y-1">
                  {optimizationLog.map((log, i) => (
                    <p key={i} className={log.includes("SUCCESS") ? "text-emerald-400" : log.includes("CRITICAL") ? "text-red-400" : "text-gray-400"}>
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {/* Alarm Feed */}
            <div className="space-y-3.5">
              <span className="text-[9px] text-gray-500 font-mono uppercase block">Active Intake Queue</span>
              
              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {dispatchQueue.map((alarm) => (
                  <div 
                    key={alarm.id} 
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                      alarm.status === "Resolved" 
                        ? "bg-gray-950/40 border-gray-900 opacity-55" 
                        : alarm.severity === "High" 
                          ? "bg-red-950/20 border-red-900/50" 
                          : "bg-amber-950/15 border-amber-900/40"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-white text-[10px]">{alarm.id} • {alarm.time}</span>
                      <span className={`text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                        alarm.status === "Resolved" ? "bg-gray-800 border-gray-700 text-gray-400" :
                        alarm.severity === "High" ? "bg-red-950 border-red-500/20 text-red-400" :
                        "bg-amber-950 border-amber-500/20 text-amber-400"
                      }`}>
                        {alarm.status}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <h4 className="font-bold text-white text-[11px] font-sans">{alarm.title}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">{alarm.location}</p>
                      <p className="text-[10px] text-gray-300 font-sans mt-1 leading-normal">{alarm.description}</p>
                    </div>

                    <div className="border-t border-gray-900/40 pt-2 flex justify-between items-center text-[10px] font-mono text-gray-400">
                      <span>Responder: <span className="text-white font-bold">{alarm.assigned}</span></span>
                      
                      <div className="flex gap-1">
                        {alarm.status === "Unassigned" && (
                          <button
                            onClick={() => handleDispatchManual(alarm.id, "Squad Bravo")}
                            aria-label={`Dispatch emergency squad for alert ${alarm.id}`}
                            className="bg-red-900 hover:bg-red-800 text-white px-2 py-0.5 rounded text-[9px] font-bold"
                          >
                            DISPATCH SQUAD
                          </button>
                        )}
                        {alarm.status === "Responding" && (
                          <button
                            onClick={() => handleResolveCase(alarm.id)}
                            aria-label={`Mark emergency alert ${alarm.id} as resolved`}
                            className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-900/40 px-2 py-0.5 rounded text-[9px] font-bold"
                          >
                            RESOLVE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report New Medical Event Intake Form */}
            <form onSubmit={handleAddNewIncidentSubmit} className="border-t border-gray-900 pt-4 space-y-3">
              <span className="text-[9px] text-gray-500 font-mono uppercase block">Intake Form: Report New Case</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label htmlFor="med-incident-type" className="text-[9px] font-mono text-gray-400 block mb-1">Incident Type</label>
                  <select
                    id="med-incident-type"
                    value={newSymptom}
                    onChange={(e) => setNewSymptom(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  >
                    <option value="Dehydration">Dehydration</option>
                    <option value="Heat Exhaustion">Heat Stroke</option>
                    <option value="Breathing Issue">Breathing Issue</option>
                    <option value="Cardiac Chest Pain">Cardiac Chest Pain</option>
                    <option value="Severe Fall">Severe Fall</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="med-location" className="text-[9px] font-mono text-gray-400 block mb-1">Location</label>
                  <input
                    id="med-location"
                    type="text"
                    required
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label htmlFor="med-severity" className="text-[9px] font-mono text-gray-400 block mb-1">Severity</label>
                  <select
                    id="med-severity"
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-400 block mb-1">Confirm Intake</label>
                  <button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold uppercase rounded-lg py-1.5 transition-all shadow"
                  >
                    DEPLOY ALARM
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Details: patient gender, age, symptoms..."
                  aria-label="Details: patient gender, age, symptoms..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none"
                />
              </div>
            </form>
          </div>

          {/* 5. SECTION: DOCTORS & PARAMEDICS ROSTER */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                    Medical Roster & Telemetry
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">Biometric cardiac feeds of deployed responders</p>
                </div>
              </div>
              <Users className="w-4 h-4 text-gray-500" />
            </div>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {staffList.map((staff) => (
                <div key={staff.id} className="bg-gray-900/40 border border-gray-850 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{staff.name}</span>
                      <span className="text-[8px] bg-gray-850 text-gray-400 px-1 rounded">{staff.role}</span>
                    </div>
                    <span className="text-[9px] text-gray-400 block">{staff.specialty}</span>
                    <span className="text-[9px] text-gray-500 block">Duty Sector: {staff.location}</span>
                  </div>

                  <div className="text-right flex items-center gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[8px] text-gray-500 block uppercase">Cardiac Feed</span>
                      <span className={`font-mono font-bold block ${staff.hr > 95 ? "text-red-400 animate-pulse" : "text-emerald-400"}`}>
                        ❤ {staff.hr} bpm
                      </span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${
                      staff.status === "Duty" ? "bg-emerald-500" : "bg-amber-500"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. SECTION: HOSPITAL COORDINATION */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                  External Hospital Coordination
                </h3>
                <p className="text-[9px] text-gray-500 font-mono">Emergency bed counts and airflight pathways</p>
              </div>
            </div>

            <div className="space-y-3">
              {hospitals.map((hos) => (
                <div key={hos.id} className="bg-gray-900/30 border border-gray-850 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-start text-xs font-mono">
                    <div>
                      <h4 className="font-bold text-white font-sans">{hos.name}</h4>
                      <span className="text-[9px] text-gray-500 block">{hos.distance} • Travel time: {hos.travelTime}m</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      hos.status === "Alert" ? "bg-red-950 text-red-400 animate-pulse" : "bg-emerald-950 text-emerald-400"
                    }`}>
                      {hos.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-900/50 pt-2 text-[10px] font-mono">
                    <span className="text-gray-400">Available Beds: <strong className="text-white">{hos.bedsAvailable}</strong></span>
                    
                    <button
                      onClick={() => handleEvacTransferSim(hos.id)}
                      disabled={hos.bedsAvailable === 0}
                      aria-label={`Request helicopter flight transfer to ${hos.name}`}
                      className="bg-indigo-950 hover:bg-indigo-900 border border-indigo-900 text-indigo-300 font-mono text-[9px] px-2.5 py-1 rounded transition-all"
                    >
                      🚁 REQUEST FLIGHT TRANSFER
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. SECTION: MEDICAL ANALYTICS */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <div>
                <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                  Emergency Medical Analytics
                </h3>
                <p className="text-[9px] text-gray-500 font-mono">Hourly load profiles and response time indexes</p>
              </div>
            </div>

            {/* Beautiful SVG Double Line Graph */}
            <div className="bg-black/30 p-3 rounded-xl border border-gray-900">
              <div className="flex justify-between items-center text-[8px] font-mono text-gray-500 mb-2">
                <span>INCIDENT INTAKE RATE (BY HOUR)</span>
                <span className="text-red-400">❤ Avg Response: 2m 45s</span>
              </div>
              <svg className="w-full h-24" viewBox="0 0 200 60" preserveAspectRatio="none">
                {/* Grid lines */}
                <line x1="0" y1="10" x2="200" y2="10" stroke="#1c1917" strokeWidth="0.5" />
                <line x1="0" y1="30" x2="200" y2="30" stroke="#1c1917" strokeWidth="0.5" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="#1c1917" strokeWidth="0.5" />
                
                {/* Area under curve for Patient volume */}
                <path d="M 0,55 L 40,48 L 80,25 L 120,40 L 160,18 L 200,32 L 200,55 Z" fill="rgba(239, 68, 68, 0.05)" />
                <path d="M 0,55 L 40,51 L 80,38 L 120,44 L 160,32 L 200,41 L 200,55 Z" fill="rgba(59, 130, 246, 0.05)" />
                
                {/* Curve 1 (Admissions - RED) */}
                <path d="M 0,55 Q 20,50 40,48 T 80,25 T 120,40 T 160,18 T 200,32" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                {/* Curve 2 (Response Time Index - BLUE) */}
                <path d="M 0,55 Q 20,53 40,51 T 80,38 T 120,44 T 160,32 T 200,41" fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2,2" />
                
                {/* Dots on line */}
                <circle cx="80" cy="25" r="2" fill="#ef4444" />
                <circle cx="160" cy="18" r="2" fill="#ef4444" />
              </svg>
              <div className="flex justify-between text-[8px] font-mono text-gray-500 mt-1.5">
                <span>09:00 AM</span>
                <span>11:00 AM</span>
                <span>01:00 PM (KICK-OFF)</span>
                <span>03:00 PM</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
              <div className="bg-gray-900/30 p-2.5 rounded-xl border border-gray-900/80">
                <span className="text-gray-500 text-[8px] uppercase block">Completion rate</span>
                <span className="font-bold text-emerald-400 mt-1 block">98.4% SECURE</span>
              </div>
              <div className="bg-gray-900/30 p-2.5 rounded-xl border border-gray-900/80">
                <span className="text-gray-500 text-[8px] uppercase block">Peak Load Area</span>
                <span className="font-bold text-white mt-1 block">Concourse 124</span>
              </div>
            </div>
          </div>

          {/* 8. SECTION: EMERGENCY EXIT MONITORING & GATE OVERRIDES */}
          <div className="bg-gray-950 border border-red-950/25 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-900 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="font-mono text-xs font-bold uppercase text-white tracking-wider">
                    Emergency Exit Monitoring
                  </h3>
                  <p className="text-[9px] text-gray-500 font-mono">Egress corridor clearance levels & overrides</p>
                </div>
              </div>
              
              <button
                onClick={handleExitOverrideTrigger}
                aria-label="Toggle global turnstile emergency override"
                className={`text-[10px] font-mono font-bold px-3 py-1 rounded border transition-all ${
                  exitOverrideFlashing 
                    ? "bg-red-600 border-red-500 text-white animate-flash" 
                    : "bg-gray-900 border-red-950 text-red-400 hover:bg-red-950/20"
                }`}
              >
                {exitOverrideFlashing ? "🚨 TURNSTILE OVERRIDE ACTIVATED" : "🔓 OVERRIDE ALL GATES"}
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              {exitsState.map((ex) => (
                <div key={ex.id} className="bg-gray-900/35 border border-gray-850 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white">{ex.name}</span>
                      <span className="text-[9px] text-gray-500 block">Sensors: {ex.activeSensors}</span>
                    </div>
                    <span className={`text-[10px] font-black ${
                      ex.clearance.includes("CONGESTED") ? "text-amber-400" : "text-emerald-400 animate-pulse"
                    }`}>
                      {ex.clearance}
                    </span>
                  </div>

                  {/* Flow Rate bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-500 uppercase block shrink-0 w-16">Egress Flow:</span>
                    <div className="flex-1 bg-gray-950 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${ex.clearance.includes("CONGESTED") ? "bg-amber-400" : "bg-emerald-400"}`} 
                        style={{ width: ex.clearance.includes("CONGESTED") ? "74%" : "100%" }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-300 font-bold shrink-0">{ex.flowRate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
