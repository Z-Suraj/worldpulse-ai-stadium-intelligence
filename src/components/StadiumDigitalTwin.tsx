import React, { useEffect, useRef, useState } from "react";
import { Gate, Incident, StadiumState } from "../types";
import { AlertTriangle, MapPin, Shield, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DigitalTwinProps {
  stadiumState: StadiumState;
  onSelectGate: (gate: Gate) => void;
  onResolveIncident?: (id: string) => void;
}

export default function StadiumDigitalTwin({
  stadiumState,
  onSelectGate,
  onResolveIncident,
}: DigitalTwinProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredGate, setHoveredGate] = useState<Gate | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);

  // Animate crowd particles on a canvas overlaid on the stadium
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = 600;
    let height = canvas.height = 400;

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (canvas) {
          width = canvas.width = entry.contentRect.width || 600;
          height = canvas.height = entry.contentRect.height || 400;
        }
      }
    });
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    interface Particle {
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      speed: number;
      size: number;
      color: string;
      alpha: number;
      angle: number;
      gateId: string;
    }

    let particles: Particle[] = [];

    // Gate screen coordinates in the 600x400 view
    const gateCoords: Record<string, { x: number; y: number }> = {
      A: { x: 500, y: 200 }, // East Gate
      B: { x: 300, y: 70 },  // North Gate
      C: { x: 100, y: 200 }, // West Gate
      D: { x: 300, y: 330 }, // South Gate
    };

    const stadiumCenterX = 300;
    const stadiumCenterY = 200;

    const createParticle = (gateId: string, isEvac: boolean): Particle => {
      const gate = gateCoords[gateId];
      if (isEvac) {
        // Evac particles start near stadium center and move OUTWARDS past gates
        return {
          x: stadiumCenterX + (Math.random() - 0.5) * 60,
          y: stadiumCenterY + (Math.random() - 0.5) * 60,
          targetX: gate.x + (Math.random() - 0.5) * 40,
          targetY: gate.y + (Math.random() - 0.5) * 40,
          speed: 1.5 + Math.random() * 2,
          size: 1.5 + Math.random() * 2,
          color: gateId === "C" || gateId === "B" ? "#22c55e" : "#ef4444", // Green for safe exits, Red for blocked
          alpha: 1,
          angle: Math.atan2(gate.y - stadiumCenterY, gate.x - stadiumCenterX),
          gateId,
        };
      } else {
        // Normal flow: particles start outside and stream INWARDS through gates
        const startOutsideDist = 120 + Math.random() * 80;
        const angle = Math.atan2(gate.y - stadiumCenterY, gate.x - stadiumCenterX) + (Math.random() - 0.5) * 0.8;
        const startX = gate.x + Math.cos(angle) * startOutsideDist;
        const startY = gate.y + Math.sin(angle) * startOutsideDist;

        return {
          x: startX,
          y: startY,
          targetX: stadiumCenterX + (Math.random() - 0.5) * 120,
          targetY: stadiumCenterY + (Math.random() - 0.5) * 80,
          speed: 0.6 + Math.random() * 0.8,
          size: 1 + Math.random() * 1.5,
          color: "#06b6d4", // Cyan crowd particles
          alpha: 0.4 + Math.random() * 0.6,
          angle: Math.atan2(stadiumCenterY - startY, stadiumCenterX - startX),
          gateId,
        };
      }
    };

    // Initialize particles
    for (let i = 0; i < 80; i++) {
      const gates = ["A", "B", "C", "D"];
      const rGate = gates[Math.floor(Math.random() * gates.length)];
      particles.push(createParticle(rGate, stadiumState.evacuationSimulating));
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Adjust coordinate systems if resized
      const scaleX = width / 600;
      const scaleY = height / 400;

      // Draw safe-zones if evacuation active
      if (stadiumState.evacuationSimulating) {
        ctx.fillStyle = "rgba(34, 197, 94, 0.05)";
        ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
        ctx.lineWidth = 1.5;
        // Draw green safe exit circles around C and B
        [gateCoords.B, gateCoords.C].forEach((coord) => {
          ctx.beginPath();
          ctx.arc(coord.x * scaleX, coord.y * scaleY, 45, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });

        // Draw red danger zone around stadium center
        ctx.fillStyle = "rgba(239, 68, 68, 0.03)";
        ctx.beginPath();
        ctx.arc(stadiumCenterX * scaleX, stadiumCenterY * scaleY, 70, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw particle trails
      particles.forEach((p, index) => {
        const px = p.x * scaleX;
        const py = p.y * scaleY;

        // Fast glow: draw outer translucent halo
        ctx.beginPath();
        ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.15;
        ctx.fill();

        // Core: draw sharp inner point
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Move particle
        if (stadiumState.evacuationSimulating) {
          // Outward evac direction
          p.x += Math.cos(p.angle) * p.speed;
          p.y += Math.sin(p.angle) * p.speed;

          // Fade out as they exit
          const distToGate = Math.hypot(p.x - gateCoords[p.gateId].x, p.y - gateCoords[p.gateId].y);
          if (distToGate < 40) {
            p.alpha -= 0.03;
          }

          if (p.alpha <= 0 || p.x < -20 || p.x > 620 || p.y < -20 || p.y > 420) {
            // Re-spawn safe gates B & C mostly
            const safeGates = ["B", "C"];
            const rGate = safeGates[Math.floor(Math.random() * safeGates.length)];
            particles[index] = createParticle(rGate, true);
          }
        } else {
          // Inward normal stream direction
          p.x += Math.cos(p.angle) * p.speed;
          p.y += Math.sin(p.angle) * p.speed;

          // Arrived at stadium center -> recycle
          const distToCenter = Math.hypot(p.x - stadiumCenterX, p.y - stadiumCenterY);
          if (distToCenter < 60) {
            const gates = ["A", "B", "C", "D"];
            // Reduce flow into highly overloaded Gate A
            const filteredGates = gates.filter(g => g !== "A" || Math.random() < 0.2);
            const rGate = filteredGates[Math.floor(Math.random() * filteredGates.length)];
            particles[index] = createParticle(rGate, false);
          }
        }
      });

      ctx.globalAlpha = 1.0; // reset
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [stadiumState.evacuationSimulating]);

  // Convert Gate ID to coordinate
  const gateCoords: Record<string, { x: number; y: number }> = {
    A: { x: 500, y: 200 },
    B: { x: 300, y: 70 },
    C: { x: 100, y: 200 },
    D: { x: 300, y: 330 },
  };

  const activeIncidents = stadiumState.incidents.filter((i) => i.status === "Active");

  // Approximate coordinate mapping for incidents
  const getIncidentCoord = (inc: Incident) => {
    if (inc.location.includes("Gate A")) return { x: 490, y: 170 };
    if (inc.location.includes("Section 124") || inc.location.includes("Upper Tier")) return { x: 370, y: 120 };
    if (inc.location.includes("West Concourse") || inc.location.includes("Concessions")) return { x: 180, y: 250 };
    return { x: 300, y: 200 }; // Center
  };

  return (
    <div className="relative w-full aspect-[3/2] max-h-[420px] rounded-2xl glass-panel overflow-hidden border border-gray-800 flex flex-col">
      {/* Overlay controls/HUD */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
        </span>
        <span className="text-xs font-mono tracking-wider text-cyan-400 uppercase">
          Live Digital Twin Map
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="bg-gray-950/80 backdrop-blur border border-gray-800 px-2 py-1 rounded text-[10px] font-mono text-gray-400">
          Scale: 1:1,200
        </div>
        {stadiumState.evacuationSimulating && (
          <div className="bg-red-900/80 border border-red-500 px-2.5 py-1 rounded text-[10px] font-mono text-red-100 uppercase animate-pulse">
            🚨 Evac Drill Active
          </div>
        )}
      </div>

      {/* SVG Metlife Stadium Layout Layer */}
      <div className="absolute inset-0 z-0">
        <svg
          className="w-full h-full"
          viewBox="0 0 600 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Field green gradient */}
            <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#15803d" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#14532d" stopOpacity="0.1" />
            </radialGradient>
            {/* Gate loads glow */}
            <radialGradient id="redGlow" cx="50%" cy="50%" r="40%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cyanGlow" cx="50%" cy="50%" r="40%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid lines background */}
          <g opacity="0.15">
            <path d="M 0,50 L 600,50 M 0,100 L 600,100 M 0,150 L 600,150 M 0,200 L 600,200 M 0,250 L 600,250 M 0,300 L 600,300 M 0,350 L 600,350" stroke="#4b5563" strokeWidth="0.5" />
            <path d="M 50,0 L 50,400 M 100,0 L 100,400 M 150,0 L 150,400 M 200,0 L 200,400 M 250,0 L 250,400 M 300,0 L 300,400 M 350,0 L 350,400 M 400,0 L 400,400 M 450,0 L 450,400 M 500,0 L 500,400 M 550,0 L 550,400" stroke="#4b5563" strokeWidth="0.5" />
          </g>

          {/* Connecting outer paths (metro & shuttle lines) */}
          <g stroke="#374151" strokeWidth="1.5" strokeDasharray="3 3" fill="none">
            {/* Metro line (North) */}
            <path d="M 0,70 L 300,70 L 600,70" stroke="#4f46e5" strokeOpacity="0.4" strokeWidth="2" />
            {/* Shuttle loop (West to South) */}
            <path d="M 100,200 A 200 150 0 0 0 300,330" stroke="#0ea5e9" strokeOpacity="0.4" />
          </g>

          {/* Stadium Bowl outer shell */}
          <ellipse
            cx="300"
            cy="200"
            rx="210"
            ry="140"
            fill="none"
            stroke="#1f2937"
            strokeWidth="3"
            strokeOpacity="0.8"
          />

          {/* Concourse rings (Outer Concourse, Inner concourse) */}
          <ellipse
            cx="300"
            cy="200"
            rx="180"
            ry="115"
            fill="none"
            stroke="#374151"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <ellipse
            cx="300"
            cy="200"
            rx="145"
            ry="90"
            fill="none"
            stroke="#1f2937"
            strokeWidth="2"
          />

          {/* Seating Sectors (Interactive ring sections) */}
          {/* North Seat Ring Section */}
          <path
            d="M 180,140 A 150 95 0 0 1 420,140 L 400,160 A 110 70 0 0 0 200,160 Z"
            fill={hoveredSection === "North" ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.1)"}
            stroke="#22c55e"
            strokeWidth="1"
            className="cursor-pointer transition-colors duration-200"
            onMouseEnter={() => setHoveredSection("North")}
            onMouseLeave={() => setHoveredSection(null)}
          />

          {/* East Seat Ring Section (Gate A bottleneck region - Red) */}
          <path
            d="M 420,140 A 150 95 0 0 1 420,260 L 400,240 A 110 70 0 0 0 400,160 Z"
            fill={hoveredSection === "East" ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.15)"}
            stroke="#ef4444"
            strokeWidth="1"
            className="cursor-pointer transition-colors duration-200"
            onMouseEnter={() => setHoveredSection("East")}
            onMouseLeave={() => setHoveredSection(null)}
          />

          {/* South Seat Ring Section */}
          <path
            d="M 420,260 A 150 95 0 0 1 180,260 L 200,240 A 110 70 0 0 0 400,240 Z"
            fill={hoveredSection === "South" ? "rgba(245, 158, 11, 0.25)" : "rgba(245, 158, 11, 0.1)"}
            stroke="#f59e0b"
            strokeWidth="1"
            className="cursor-pointer transition-colors duration-200"
            onMouseEnter={() => setHoveredSection("South")}
            onMouseLeave={() => setHoveredSection(null)}
          />

          {/* West Seat Ring Section */}
          <path
            d="M 180,260 A 150 95 0 0 1 180,140 L 200,160 A 110 70 0 0 0 200,240 Z"
            fill={hoveredSection === "West" ? "rgba(34, 197, 94, 0.25)" : "rgba(34, 197, 94, 0.08)"}
            stroke="#22c55e"
            strokeWidth="1"
            className="cursor-pointer transition-colors duration-200"
            onMouseEnter={() => setHoveredSection("West")}
            onMouseLeave={() => setHoveredSection(null)}
          />

          {/* Central Soccer Pitch Field */}
          <ellipse
            cx="300"
            cy="200"
            rx="85"
            ry="55"
            fill="url(#fieldGrad)"
            stroke="#4b5563"
            strokeWidth="1"
          />
          {/* Pitch lines */}
          <rect x="250" y="170" width="100" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
          <line x1="300" y1="170" x2="300" y2="230" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />
          <ellipse cx="300" cy="200" rx="15" ry="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" />

          {/* Evacuation Safe Route Arrows (pulsing overlay if evac true) */}
          {stadiumState.evacuationSimulating && (
            <g stroke="#22c55e" strokeWidth="2.5" fill="none">
              {/* Escape vectors leading out of stadium bowl towards West (Gate C) */}
              <path d="M 260,200 L 200,200 L 140,200" className="animate-pulse" />
              <polyline points="150,193 140,200 150,207" fill="none" />

              <path d="M 280,170 L 230,130 L 170,110" className="animate-pulse" />
              <polyline points="181,107 170,110 178,119" fill="none" />

              {/* Escape vectors leading out towards North (Gate B) */}
              <path d="M 300,160 L 300,110" className="animate-pulse" />
              <polyline points="293,120 300,110 307,120" fill="none" />

              {/* Escape vectors leading out towards South (Gate B/C) */}
              <path d="M 280,230 L 230,270" className="animate-pulse" />
              <polyline points="239,271 230,270 232,260" fill="none" />
            </g>
          )}

          {/* Danger vectors blocking Gate A & D if evac true */}
          {stadiumState.evacuationSimulating && (
            <g stroke="#ef4444" strokeWidth="2" strokeDasharray="3 3" fill="none">
              <path d="M 340,200 L 460,200" />
              <path d="M 320,240 L 320,290" />
              {/* X blocks */}
              <line x1="450" y1="195" x2="460" y2="205" strokeWidth="3" />
              <line x1="460" y1="195" x2="450" y2="205" strokeWidth="3" />
            </g>
          )}

          {/* Gate Circles with dynamically styled colors based on sensor load */}
          {stadiumState.gates.map((g) => {
            const coord = gateCoords[g.id];
            const isHovered = hoveredGate?.id === g.id;

            // Determine gate stroke color
            let strokeColor = "#22c55e"; // Optimal
            let fillColor = "rgba(34, 197, 94, 0.1)";
            if (g.status === "Critical") {
              strokeColor = "#ef4444";
              fillColor = "rgba(239, 68, 68, 0.15)";
            } else if (g.status === "Warning") {
              strokeColor = "#f59e0b";
              fillColor = "rgba(245, 158, 11, 0.15)";
            }

            // Evac overrides
            if (stadiumState.evacuationSimulating) {
              if (g.id === "B" || g.id === "C") {
                strokeColor = "#22c55e";
                fillColor = "rgba(34, 197, 94, 0.2)";
              } else {
                strokeColor = "#ef4444";
                fillColor = "rgba(239, 68, 68, 0.3)";
              }
            }

            return (
              <g
                key={g.id}
                className="cursor-pointer"
                onClick={() => onSelectGate(g)}
                onMouseEnter={() => setHoveredGate(g)}
                onMouseLeave={() => setHoveredGate(null)}
              >
                {/* Pulsing ring behind key gates */}
                {g.status === "Critical" && (
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r={isHovered ? 26 : 20}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    className="pulse-dot"
                  />
                )}
                {/* Outer interactive ring */}
                <circle
                  cx={coord.x}
                  cy={coord.y}
                  r={isHovered ? 18 : 14}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-200"
                />
                {/* Gate ID character */}
                <text
                  x={coord.x}
                  y={coord.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="bold"
                  className="pointer-events-none select-none font-sans"
                >
                  {g.id}
                </text>

                {/* Live queue minute badges next to gate */}
                <rect
                  x={coord.x + (g.id === "C" ? -45 : 18)}
                  y={coord.y - 10}
                  width="28"
                  height="16"
                  rx="3"
                  fill="#030712"
                  stroke={strokeColor}
                  strokeWidth="0.75"
                  opacity="0.85"
                />
                <text
                  x={coord.x + (g.id === "C" ? -31 : 32)}
                  y={coord.y + 2}
                  textAnchor="middle"
                  fill={strokeColor}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {g.waitTime}m
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Live Canvas Particle Layer (Streams incoming fans / outgoing evac) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-1"
        style={{ mixBlendMode: "screen" }}
      />

      {/* SVG overlay for flashing security alarm pins */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <svg className="w-full h-full" viewBox="0 0 600 400">
          <AnimatePresence>
            {activeIncidents.map((inc) => {
              const coord = getIncidentCoord(inc);
              const scaleX = canvasRef.current ? canvasRef.current.width / 600 : 1;
              const scaleY = canvasRef.current ? canvasRef.current.height / 400 : 1;

              const isHigh = inc.severity === "High";

              return (
                <g key={inc.id}>
                  {/* Flashing glow ring */}
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="15"
                    fill="none"
                    stroke={isHigh ? "#ef4444" : "#f59e0b"}
                    strokeWidth="1.5"
                    className="pulse-dot"
                  />
                  {/* Glowing core */}
                  <g className="cursor-pointer pointer-events-auto">
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="7"
                      fill={isHigh ? "#ef4444" : "#f59e0b"}
                      onClick={() => onResolveIncident && onResolveIncident(inc.id)}
                    />
                    <path
                      d="M 300,200 L 300,200" // Dummy to bind path types nicely
                    />
                  </g>
                </g>
              );
            })}
          </AnimatePresence>
        </svg>
      </div>

      {/* Dynamic Hover Tooltip Cards */}
      <AnimatePresence>
        {hoveredGate && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 bg-gray-950/95 border border-cyan-500/40 px-3.5 py-1.5 rounded-xl flex items-center gap-3.5 shadow-2xl pointer-events-none whitespace-nowrap text-xs backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-semibold text-white text-[11px]">{hoveredGate.name}</span>
            </div>
            <div className="h-4 w-[1px] bg-gray-800" />
            <div className="text-[10px] text-gray-400">
              Queue: <span className="text-white font-mono font-medium">{hoveredGate.queueCount} fans</span>
            </div>
            <div className="h-4 w-[1px] bg-gray-800" />
            <div className="text-[10px] text-gray-400">
              Wait: <span className={`font-mono font-bold ${hoveredGate.status === "Critical" ? "text-red-400" : hoveredGate.status === "Warning" ? "text-amber-400" : "text-green-400"}`}>{hoveredGate.waitTime} Mins</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover info for sections */}
      <AnimatePresence>
        {hoveredSection && !hoveredGate && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20 bg-gray-950/95 border border-gray-800 px-3.5 py-1.5 rounded-xl flex items-center gap-3.5 shadow-2xl pointer-events-none whitespace-nowrap text-xs backdrop-blur-sm"
          >
            <div className="flex items-center gap-1.5 text-[11px]">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-white">{hoveredSection} Bowl</span>
            </div>
            <div className="h-4 w-[1px] bg-gray-800" />
            <div className="text-[10px] text-gray-400">
              Load:{" "}
              <span className="text-white font-mono font-semibold">
                {hoveredSection === "East"
                  ? "85% (Congested)"
                  : hoveredSection === "South"
                  ? "74% (Steady)"
                  : hoveredSection === "North"
                  ? "42% (Optimal)"
                  : "18% (Light)"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incidents Indicator list overlay (when Operations or Org views) */}
      {activeIncidents.length > 0 && (
        <div className="absolute top-12 left-4 z-10 flex flex-col gap-1.5 max-w-[180px] pointer-events-auto">
          {activeIncidents.slice(0, 2).map((inc) => (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={inc.id}
              className={`text-[10px] p-1.5 rounded border flex items-center gap-1.5 backdrop-blur-md ${inc.severity === "High" ? "bg-red-950/70 text-red-200 border-red-800/60" : "bg-amber-950/70 text-amber-200 border-amber-800/60"}`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-bounce" />
              <div className="truncate">
                <span className="font-bold">{inc.id}</span>: {inc.title}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
