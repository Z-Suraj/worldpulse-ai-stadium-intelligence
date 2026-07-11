import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Globe, Calendar, Trophy, ArrowRight, MapPin, 
  Users, Star, Clock, Info, CloudSun, Compass, ShieldAlert, Zap
} from "lucide-react";
import StadiumIntelligenceMap from "./StadiumIntelligenceMap";

interface CinematicLandingProps {
  onEnter: (matchId?: string) => void;
}

interface MatchSchedule {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  date: string;
  countdownMins: number;
  ticketsSold: string;
}

interface TelemetryCity {
  id: string;
  name: string;
  country: string;
  stadium: string;
  capacity: string;
  status: string;
  weather: string;
  match: string;
  date: string;
  tickets: string;
  travel: string;
  matchId: string;
  x: number; // coordinate out of 450
  y: number; // coordinate out of 300
}

export default function CinematicLanding({ onEnter }: CinematicLandingProps) {
  // Live Countdown Timer
  const [countdown, setCountdown] = useState({
    days: 337,
    hours: 14,
    minutes: 42,
    seconds: 55
  });

  // Day & Night Effects State
  const [isNightMode, setIsNightMode] = useState(true);

  // Selected telemetry city state (Default: New York/New Jersey)
  const [selectedCityId, setSelectedCityId] = useState<string>("NY");

  const telemetryCities: TelemetryCity[] = [
    { 
      id: "VAN", 
      name: "Vancouver", 
      country: "Canada", 
      stadium: "BC Place", 
      capacity: "54,500", 
      status: "Active Matchday", 
      weather: "Light Rain • 16°C / 61°F", 
      match: "Canada vs England", 
      date: "June 14, 2026", 
      tickets: "Selling Fast (94.2%)", 
      travel: "SkyTrain Expo Line directly to Stadium Station", 
      matchId: "m3", 
      x: 70, 
      y: 65 
    },
    { 
      id: "LA", 
      name: "Los Angeles", 
      country: "USA", 
      stadium: "SoFi Stadium", 
      capacity: "70,000", 
      status: "Venue Secured", 
      weather: "Sunny • 22°C / 72°F", 
      match: "USA vs Italy (Warmup)", 
      date: "June 18, 2026", 
      tickets: "Sold Out (100%)", 
      travel: "Metro K Line shuttle directly to stadium", 
      matchId: "", 
      x: 65, 
      y: 175 
    },
    { 
      id: "DAL", 
      name: "Dallas", 
      country: "USA", 
      stadium: "AT&T Stadium", 
      capacity: "80,000", 
      status: "Operational Prep", 
      weather: "Humid • 28°C / 82°F", 
      match: "Brazil vs Spain (Group Stage)", 
      date: "June 20, 2026", 
      tickets: "Sold Out (100%)", 
      travel: "TRE Rail Shuttle link from CentrePort", 
      matchId: "", 
      x: 195, 
      y: 215 
    },
    { 
      id: "MEX", 
      name: "Mexico City", 
      country: "Mexico", 
      stadium: "Estadio Azteca", 
      capacity: "87,500", 
      status: "Matchday -2", 
      weather: "Clear Sky • 21°C / 70°F", 
      match: "Mexico vs USA", 
      date: "June 12, 2026", 
      tickets: "98.4% Booked", 
      travel: "CDMX Tren Ligero directly to Estadio Azteca", 
      matchId: "m2", 
      x: 175, 
      y: 305 
    },
    { 
      id: "NY", 
      name: "New York/New Jersey", 
      country: "USA", 
      stadium: "MetLife Stadium", 
      capacity: "82,500", 
      status: "Active Matchday", 
      weather: "Partly Cloudy • 24°C / 75°F", 
      match: "Argentina vs France", 
      date: "June 11, 2026", 
      tickets: "Sold Out (100%)", 
      travel: "NJ Transit Meadowlands Rail directly from NY Penn", 
      matchId: "m1", 
      x: 375, 
      y: 105 
    }
  ];

  const activeCity = telemetryCities.find(c => c.id === selectedCityId) || telemetryCities[4];

  // Up-coming matches
  const upcomingMatches: MatchSchedule[] = [
    { id: "m1", homeTeam: "Argentina", awayTeam: "France", stadium: "MetLife Stadium, NY/NJ", date: "June 11, 2026", countdownMins: 45, ticketsSold: "100%" },
    { id: "m2", homeTeam: "Mexico", awayTeam: "USA", stadium: "Estadio Azteca, CDMX", date: "June 12, 2026", countdownMins: 1420, ticketsSold: "98.4%" },
    { id: "m3", homeTeam: "Canada", awayTeam: "England", stadium: "BC Place, Vancouver", date: "June 14, 2026", countdownMins: 4300, ticketsSold: "94.2%" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans overflow-x-hidden relative flex flex-col justify-between selection:bg-purple-900">
      
      {/* GLOWING CINEMATIC AMBIENT LIGHTS */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] bg-purple-900/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] bg-cyan-950/20 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-[30%] left-[40%] w-[250px] h-[250px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER BAR */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-950/50">
            <Trophy className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase text-white font-display">
              WorldPulse <span className="text-purple-400">AI</span>
            </h1>
            <p className="text-[9px] text-gray-500 font-mono tracking-wider uppercase">MetLife Stadium Intelligence Node</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-[10px] font-mono text-gray-400 uppercase bg-gray-900/60 px-2.5 py-1 rounded border border-gray-800">
            Node status: Active
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-7xl mx-auto px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* LEFT COLUMN: HERO TEXT & ENTER ACTION (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-purple-950/40 border border-purple-800/40 rounded-full text-xs text-purple-300 font-mono"
          >
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 animate-pulse" />
            <span>FIFA World Cup 2026™ Connected Stadium</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-3"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-[1.05]">
              Experience the Future of <br className="hidden md:inline" />
              <span className="bg-gradient-to-r from-white via-purple-300 to-cyan-400 bg-clip-text text-transparent">
                Stadium Intelligence
              </span>
            </h2>
            <p className="text-sm text-gray-400 max-w-lg leading-relaxed font-sans">
              Welcome to WorldPulse AI, the elite operations, GIS-telemetry, and real-time crowd analytics suite built for MetLife Stadium and international FIFA tournament hubs.
            </p>
          </motion.div>

          {/* DYNAMIC STATISTICS GRID */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl"
          >
            <div className="p-3 bg-gray-900/35 border border-gray-900 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-gray-500 font-mono uppercase">Capacity</span>
              <span className="text-xl font-bold font-display text-white mt-1">82,500</span>
              <span className="text-[8px] text-gray-400 font-mono">MetLife Venue</span>
            </div>
            <div className="p-3 bg-gray-900/35 border border-gray-900 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-gray-500 font-mono uppercase">Solar Yield</span>
              <span className="text-xl font-bold font-display text-emerald-400 mt-1">1,520 kW</span>
              <span className="text-[8px] text-emerald-500 font-mono">Self-Sustained</span>
            </div>
            <div className="p-3 bg-gray-900/35 border border-gray-900 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-gray-500 font-mono uppercase">Cities</span>
              <span className="text-xl font-bold font-display text-cyan-400 mt-1">16 Cities</span>
              <span className="text-[8px] text-cyan-500 font-mono">Tri-Nation Hub</span>
            </div>
            <div className="p-3 bg-gray-900/35 border border-gray-900 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-gray-500 font-mono uppercase">AI Core</span>
              <span className="text-xl font-bold font-display text-purple-400 mt-1">Gemini 3.5</span>
              <span className="text-[8px] text-purple-500 font-mono">Live Copilot</span>
            </div>
          </motion.div>

          {/* DYNAMIC ENTER ACTION BUTTONS */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
          >
            <button
              onClick={() => onEnter(activeCity.matchId || "m1")}
              className="px-8 py-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-2.5 shadow-xl shadow-purple-900/40 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              Enter {activeCity.name} Experience
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
            
            <a 
              href="#schedule"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("tourney-insights")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-4 rounded-xl border border-gray-800 hover:bg-gray-900/60 text-gray-300 font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              Tournament Schedule
            </a>
          </motion.div>
        </div>

        {/* RIGHT COLUMN: PREMIUM DYNAMIC MAP EXPERIENCE (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className={`p-5 rounded-3xl border relative overflow-hidden flex flex-col justify-between transition-all duration-500 ${
              isNightMode 
                ? "bg-gray-950/80 border-gray-800 shadow-2xl shadow-cyan-950/20" 
                : "bg-slate-900/90 border-slate-700 shadow-xl shadow-amber-950/15"
            }`}
          >
            {/* Ambient Background Gradient overlays (Day/Night) */}
            <AnimatePresence mode="wait">
              {isNightMode ? (
                <motion.div
                  key="night-ambient"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-cyan-950/30 pointer-events-none"
                />
              ) : (
                <motion.div
                  key="day-ambient"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-amber-950/10 to-transparent pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Title Bar / Controls */}
            <div className="relative z-10 flex items-center justify-between border-b border-gray-800/80 pb-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                FIFA Host Cities Telemetry
              </span>
              
              {/* Day/Night toggle switch button */}
              <button
                type="button"
                onClick={() => setIsNightMode(!isNightMode)}
                className="text-[9px] font-mono flex items-center gap-1.5 bg-gray-900 border border-gray-800 hover:border-purple-500 px-2.5 py-1 rounded-xl text-gray-300 hover:text-white transition-all shadow"
                title="Toggle Day/Night Ambient Light effects"
              >
                <span>{isNightMode ? "🌙 Night" : "☀️ Day"}</span>
              </button>
            </div>

            {/* HIGH-TECH INTERACTIVE STADIUM INTELLIGENCE MAP */}
            <div className="flex-1 flex flex-col my-4 relative min-h-[450px]">
              <StadiumIntelligenceMap
                selectedCityId={selectedCityId}
                onSelectCity={(id) => setSelectedCityId(id)}
              />
            </div>

            {/* LIVE MATCH INTELLIGENCE CARD (When Marker is selected) */}
            <div className="relative z-10 bg-black/40 p-4 rounded-2xl border border-gray-900 space-y-2.5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block">Active Telemetry Node</span>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    {activeCity.name}, {activeCity.country}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {activeCity.stadium} (Capacity: {activeCity.capacity})
                  </p>
                </div>
                <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full ${
                  activeCity.status.includes("Active") ? "bg-cyan-950 text-cyan-300 border border-cyan-900/30" : "bg-gray-900 text-gray-400 border border-gray-800"
                }`}>
                  {activeCity.status}
                </span>
              </div>

              {/* Match details & Tickets */}
              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-gray-900/60 text-[10px] font-mono">
                <div>
                  <span className="text-[8px] text-gray-500 uppercase block">Weather Telemetry</span>
                  <span className="text-white block mt-0.5 truncate">{activeCity.weather}</span>
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase block">Tickets Sold</span>
                  <span className="text-purple-300 font-bold block mt-0.5">{activeCity.tickets}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div>
                  <span className="text-[8px] text-gray-500 uppercase block">Active Match</span>
                  <span className="text-white font-medium block mt-0.5 truncate">{activeCity.match}</span>
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase block">Transit Connection</span>
                  <span className="text-cyan-300 block mt-0.5 truncate" title={activeCity.travel}>{activeCity.travel}</span>
                </div>
              </div>
            </div>

          </motion.div>

          {/* Countdown & Quick Action Banner */}
          <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-950 flex items-center justify-center border border-purple-900">
                <Clock className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              </div>
              <div>
                <strong className="text-white">Next Kickoff Countdown</strong>
                <p className="text-[10px] text-gray-400 font-mono">Argentina vs France • MetLife</p>
              </div>
            </div>

            <div className="flex gap-1.5 font-mono text-[10px] bg-gray-950/80 px-2.5 py-1 rounded-lg border border-gray-900 text-purple-300 font-bold">
              <span>{countdown.days}d</span>
              <span>:</span>
              <span>{countdown.hours}h</span>
              <span>:</span>
              <span>{countdown.minutes}m</span>
              <span>:</span>
              <span>{countdown.seconds}s</span>
            </div>
          </div>

        </div>

      </main>

      {/* NEW SECTION: LIVE TOURNAMENT PULSE (Below Map) */}
      <section className="w-full max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 border-t border-gray-900 bg-gray-950/20 relative z-10">
        
        {/* Core Live game telemetry module (5 cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-purple-950/15 to-gray-950 p-4 rounded-2xl border border-purple-900/20 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-purple-400 font-mono font-bold tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                LIVE TOURNAMENT TELEMETRY
              </span>
              <span className="text-[9px] font-mono bg-purple-900/40 text-purple-200 px-2 py-0.5 rounded border border-purple-800/20">Group A • Game 1</span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-gray-500 font-mono block">HOSTED AT</span>
                <span className="text-xs text-white font-bold">{activeCity.stadium}</span>
                <span className="text-[9px] text-gray-400 block font-mono">{activeCity.name} Node</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-500 font-mono block">CURRENT STATUS</span>
                <span className="text-xs text-emerald-400 font-mono font-bold">Active Stream</span>
              </div>
            </div>
          </div>

          <div className="bg-black/30 p-2.5 rounded-xl border border-gray-900 flex items-center justify-between">
            <div className="flex items-center gap-2 font-display">
              <span className="font-bold text-white text-sm">ARG</span>
              <span className="text-lg font-black text-purple-400 font-mono">2</span>
              <span className="text-gray-500 text-xs font-mono">-</span>
              <span className="text-lg font-black text-cyan-400 font-mono">1</span>
              <span className="font-bold text-white text-sm">FRA</span>
            </div>
            <div className="text-[10px] font-mono text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-800">
              ⏱ 85' Live
            </div>
          </div>
        </div>

        {/* Global Stats Indicators (7 cols) */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-900/20 p-4 rounded-2xl border border-gray-900">
          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Active Attendance</span>
            <div className="text-lg font-bold text-white font-display">133,720</div>
            <p className="text-[8px] text-gray-400 font-mono">Across live venues</p>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Total Goals Scored</span>
            <div className="text-lg font-bold text-purple-400 font-display">6 Goals</div>
            <p className="text-[8px] text-gray-400 font-mono">3.0 per match average</p>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Solar Power Recovers</span>
            <div className="text-lg font-bold text-emerald-400 font-mono flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              15,420<span className="text-[10px] text-gray-500">kW</span>
            </div>
            <p className="text-[8px] text-emerald-500 font-mono">Solar canopy output</p>
          </div>

          <div className="space-y-1">
            <span className="text-[9px] text-gray-500 font-mono uppercase block">CO2 Carbon Saved</span>
            <div className="text-lg font-bold text-cyan-400 font-display">12.8 Tons</div>
            <p className="text-[8px] text-cyan-500 font-mono">Fan transit credits</p>
          </div>
        </div>

      </section>

      {/* MATCH SCHEDULE AND INSIGHTS SECTION */}
      <section id="tourney-insights" className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-gray-900 bg-gray-950/40 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-purple-400" />
              FIFA World Cup 2026™ Schedule Overview
            </h3>
            <p className="text-[10px] text-gray-500 font-mono">Real-time ticketing & live match schedule overview</p>
          </div>

          <div className="flex gap-1">
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-900/30 px-2.5 py-1 rounded">
              June 11 - July 19, 2026
            </span>
            <span className="text-[9px] font-mono text-purple-300 bg-purple-950/40 border border-purple-900/30 px-2.5 py-1 rounded">
              104 Matches Total
            </span>
          </div>
        </div>

        {/* Upcoming matches list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {upcomingMatches.map((match) => (
            <div key={match.id} className="p-3.5 bg-gray-900/30 border border-gray-900 rounded-2xl space-y-2 flex flex-col justify-between text-xs">
              <div className="flex justify-between items-center font-mono text-[9px] text-gray-500">
                <span>{match.date}</span>
                <span className="text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-900/30 px-1.5 py-0.5 rounded">
                  {match.ticketsSold} SOLD OUT
                </span>
              </div>

              <div className="flex items-center justify-between py-1 font-display">
                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                  <span>{match.homeTeam}</span>
                  <span className="text-gray-500 text-[10px] font-mono font-normal">vs</span>
                  <span>{match.awayTeam}</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-gray-900/60 pt-2 font-mono text-[10px] text-gray-400">
                <span>{match.stadium}</span>
                <button 
                  onClick={() => onEnter(match.id)}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  Enter <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER METADATA */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 border-t border-gray-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] font-mono text-gray-500 relative z-20">
        <div>
          © 2026 FIFA World Cup™ MetLife Intelligence System Node. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a href="#privacy" onClick={(e) => e.preventDefault()} className="hover:text-gray-300">Operational Guidelines</a>
          <a href="#terms" onClick={(e) => e.preventDefault()} className="hover:text-gray-300">System Telemetry Specs</a>
          <a href="#support" onClick={(e) => e.preventDefault()} className="hover:text-gray-300">Security Protocols</a>
        </div>
      </footer>

    </div>
  );
}
