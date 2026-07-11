import React, { useState, useEffect } from "react";
import { 
  Users, TrendingUp, Compass, MapPin, AlertTriangle, Activity, 
  Sun, Battery, Wind, Thermometer, Sparkles, Clock, Utensils, 
  Check, Zap, Navigation, Shield, CheckCircle2, Droplets, Info, Gauge, Car
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StadiumState, Gate, Concession, Incident } from "../types";

interface DashboardProps {
  stadiumState: StadiumState;
  onResolveIncident?: (id: string) => void;
  onRefreshFeed?: () => void;
}

type ActiveTab = "crowd" | "routing" | "facilities" | "power" | "weather" | "architecture";

interface Restroom {
  id: string;
  name: string;
  zone: string;
  occupancy: number; // %
  cleanliness: number; // 0-10 rating
  status: "Optimal" | "Action Required" | "Dispatched";
}

interface ParkingZone {
  id: string;
  name: string;
  capacity: number;
  occupied: number;
  status: "Green" | "Amber" | "Red";
}

export default function StadiumIntelligenceDashboard({
  stadiumState,
  onResolveIncident,
  onRefreshFeed,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("crowd");
  const [selectedZone, setSelectedZone] = useState<string>("Lower Bowl");
  
  // Custom states for interactive modules
  const [routeFromGate, setRouteFromGate] = useState<string>("Gate C");
  const [routeToSeat, setRouteToSeat] = useState<string>("114");
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);
  
  // Cleanliness dispatches
  const [restrooms, setRestrooms] = useState<Restroom[]>([
    { id: "wc-1", name: "West Concourse WC (S112)", zone: "West", occupancy: 82, cleanliness: 9.2, status: "Optimal" },
    { id: "wc-2", name: "East Concourse WC (S234)", zone: "East", occupancy: 41, cleanliness: 5.4, status: "Action Required" },
    { id: "wc-3", name: "VIP Club Lounge WC", zone: "VIP", occupancy: 28, cleanliness: 9.8, status: "Optimal" },
    { id: "wc-4", name: "North Plaza Family WC", zone: "North", occupancy: 95, cleanliness: 4.1, status: "Action Required" },
  ]);

  const [parkingZones, setParkingZones] = useState<ParkingZone[]>([
    { id: "lot-a", name: "West Lot A (VIP & Media)", capacity: 1200, occupied: 1104, status: "Red" },
    { id: "lot-b", name: "North Lot B (Public)", capacity: 4500, occupied: 3600, status: "Amber" },
    { id: "lot-g", name: "East Lot G (Public)", capacity: 6000, occupied: 2400, status: "Green" },
    { id: "lot-k", name: "South Lot K (Bus Plaza)", capacity: 800, occupied: 150, status: "Green" },
  ]);

  // AI Insights - dynamic depending on current stadium levels
  const [aiInsights, setAiInsights] = useState<string[]>([
    "CRITICAL VECTOR: East Gate A ingress load is spiking. Recommend shifting 15% of inbound metro traffic to Gate B.",
    "SUSTAINABILITY: Solar battery storage at 94.2% capacity. Activating stage lighting grid feed-in tariff.",
    "LOGISTICS: Food stall 'Azteca Tacos' queue is 22 mins. Directing nearby users to 'Cup Stadium Grill' (4 mins queue).",
  ]);

  // Simulated metrics that tick in real time
  const [tick, setTick] = useState(0);
  const [liveAqi, setLiveAqi] = useState(24); // Low AQI is green
  const [activeSensorsCount, setActiveSensorsCount] = useState(1482);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
      // Simulate live jittering of metrics
      setLiveAqi((prev) => Math.max(15, Math.min(45, prev + (Math.random() > 0.5 ? 1 : -1))));
      setActiveSensorsCount((prev) => prev + (Math.random() > 0.6 ? 2 : Math.random() > 0.3 ? -1 : 0));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Recalculate route when selection changes
  useEffect(() => {
    // Generate route suggestions based on selected gate and seat
    const distanceMeters = Math.floor(180 + Math.random() * 220);
    const steps = [
      `Enter through security scan at ${routeFromGate}`,
      `Proceed left into the ${routeFromGate === "Gate C" || routeFromGate === "Gate B" ? "West" : "East"} lower concourse corridor`,
      `Pass the ${routeToSeat.startsWith("1") ? "Section 100 level stairs" : "Escalators to Upper Tier"}`,
      `Arrive at Section ${routeToSeat}. Seat portal is situated directly adjacent to Azteca Tacos.`
    ];
    const avgWalkSpeedMps = 1.2;
    const minutes = Math.ceil(distanceMeters / avgWalkSpeedMps / 60);

    setCalculatedRoute({
      distanceMeters,
      timeMins: minutes,
      currentCongestion: routeFromGate === "Gate C" ? "Low" : routeFromGate === "Gate A" ? "Heavy" : "Moderate",
      steps
    });
  }, [routeFromGate, routeToSeat]);

  // Trigger dispatch simulation
  const handleDispatchClean = (id: string) => {
    setRestrooms(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, status: "Dispatched" };
      }
      return r;
    }));

    // Add notification to insights
    const target = restrooms.find(r => r.id === id);
    if (target) {
      setAiInsights(prev => [
        `🚨 SYSTEM DISPATCH: Maintenance unit allocated to ${target.name}. Estimated arrival 3 mins.`,
        ...prev.slice(0, 4)
      ]);
    }
  };

  // Simulated heat map coordinates
  const heatMapSectors = [
    { name: "Upper West Deck", occupancy: 64, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", description: "Standard public deck, steady flow." },
    { name: "Upper East Deck", occupancy: 58, color: "bg-blue-500/20 text-blue-400 border-blue-500/30", description: "Standard public deck, open seats." },
    { name: "Lower West Tier", occupancy: 92, color: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse", description: "Heavy density near Gate C entry corridors." },
    { name: "Lower East Tier", occupancy: 87, color: "bg-amber-500/20 text-amber-400 border-amber-500/30", description: "Moderately dense. Concession stands at high capacity." },
    { name: "VIP Club Suite", occupancy: 42, color: "bg-green-500/20 text-green-400 border-green-500/30", description: "VIP lounge area, low wait times, excellent routing." },
    { name: "South Fan Zone", occupancy: 95, color: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse", description: "Maximum density capacity. Interactive games active." },
  ];

  return (
    <div className="glass-panel p-4 lg:p-5 rounded-2xl border border-gray-900 flex flex-col gap-4 text-white overflow-hidden shadow-2xl relative bg-gray-950/80">
      
      {/* GLOWING TECH BORDERS */}
      <div className="absolute top-0 left-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
      <div className="absolute bottom-0 right-0 w-32 h-[1px] bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-900 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" />
              Stadium Intelligence Hub
            </h3>
            <p className="text-[10px] text-gray-500 font-mono">
              FIFA World Cup MetLife AI Telemetry Node • v3.8 • {activeSensorsCount} active sensors
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-gray-900/60 p-0.5 rounded-lg border border-gray-900 text-[10px] font-mono overflow-x-auto self-start sm:self-center">
          <button 
            onClick={() => setActiveTab("crowd")}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === "crowd" ? "bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/50" : "text-gray-400 hover:text-white"}`}
          >
            Crowd
          </button>
          <button 
            onClick={() => setActiveTab("routing")}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === "routing" ? "bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/50" : "text-gray-400 hover:text-white"}`}
          >
            Route AI
          </button>
          <button 
            onClick={() => setActiveTab("facilities")}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === "facilities" ? "bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/50" : "text-gray-400 hover:text-white"}`}
          >
            Facilities
          </button>
          <button 
            onClick={() => setActiveTab("power")}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === "power" ? "bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/50" : "text-gray-400 hover:text-white"}`}
          >
            Energy
          </button>
          <button 
            onClick={() => setActiveTab("weather")}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === "weather" ? "bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/50" : "text-gray-400 hover:text-white"}`}
          >
            Aero
          </button>
          <button 
            onClick={() => setActiveTab("architecture")}
            className={`px-2.5 py-1 rounded transition-all ${activeTab === "architecture" ? "bg-cyan-950 text-cyan-300 font-semibold border border-cyan-800/50" : "text-gray-400 hover:text-white"}`}
            title="Production Specs & Architecture Plan"
          >
            📋 Specs
          </button>
        </div>
      </div>

      {/* DYNAMIC TAB OUTLETS */}
      <div className="flex-1 min-h-[300px]">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: CROWD DENSITY & HEATMAPS */}
          {activeTab === "crowd" && (
            <motion.div 
              key="crowd"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Interactive Heatmap */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ Dynamic Crowd Density Heatmap (Interactive)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {heatMapSectors.map((sector) => {
                    const isSelected = selectedZone === sector.name;
                    return (
                      <button
                        key={sector.name}
                        onClick={() => setSelectedZone(sector.name)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${sector.color} ${isSelected ? "ring-2 ring-cyan-400 bg-cyan-950/40" : "hover:bg-gray-900/40"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold font-mono truncate">{sector.name}</span>
                          <span className="text-[11px] font-mono font-black">{sector.occupancy}%</span>
                        </div>
                        <div className="w-full bg-gray-950/60 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${sector.occupancy > 80 ? "bg-red-500" : sector.occupancy > 60 ? "bg-amber-400" : "bg-green-400"}`}
                            style={{ width: `${sector.occupancy}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Zone Details Panel */}
              <div className="p-3 bg-gray-900/30 rounded-xl border border-gray-900/60 text-xs">
                {(() => {
                  const curr = heatMapSectors.find(s => s.name === selectedZone) || heatMapSectors[0];
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-cyan-300">{curr.name} Telemetry</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono ${curr.occupancy > 85 ? "bg-red-900/40 text-red-300" : "bg-cyan-900/40 text-cyan-300"}`}>
                          {curr.occupancy > 85 ? "HEAVY SATURATION" : "NORMAL LOAD"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-[11px] font-sans leading-relaxed mb-2">{curr.description}</p>
                      
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800 text-[10px] font-mono text-gray-400">
                        <div>
                          <span>Flow Velocity</span>
                          <span className="block font-bold text-white mt-0.5">1.4 m/s</span>
                        </div>
                        <div>
                          <span>Exit Flow Capacity</span>
                          <span className="block font-bold text-white mt-0.5">99.2% safe</span>
                        </div>
                        <div>
                          <span>Dwell Time</span>
                          <span className="block font-bold text-white mt-0.5">12 mins avg</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* AI Gate Predictions */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold block mb-1.5">
                  ✦ AI Gate Ingress Predictions & Congestion Forecast
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-mono text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-900 text-gray-500">
                        <th className="pb-1.5">Gate Node</th>
                        <th className="pb-1.5 text-center">Live Wait</th>
                        <th className="pb-1.5 text-center text-purple-300">In 15m</th>
                        <th className="pb-1.5 text-center text-purple-300">In 30m</th>
                        <th className="pb-1.5 text-center text-purple-300">In 60m</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900 text-gray-300">
                      {stadiumState.gates.map((g) => {
                        const baseWait = g.waitTime;
                        const w15 = Math.max(2, Math.round(baseWait * (1.1 + Math.sin(tick/2) * 0.2)));
                        const w30 = Math.max(3, Math.round(baseWait * (1.4 + Math.sin(tick/3) * 0.3)));
                        const w60 = Math.max(1, Math.round(baseWait * (0.8 + Math.cos(tick/4) * 0.15)));
                        return (
                          <tr key={g.id} className="hover:bg-gray-900/10">
                            <td className="py-2 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                              <span className="font-bold text-white">{g.name}</span>
                            </td>
                            <td className="py-2 text-center text-white font-bold">{baseWait}m</td>
                            <td className="py-2 text-center text-purple-300">{w15}m</td>
                            <td className="py-2 text-center text-purple-400 font-bold">{w30}m</td>
                            <td className="py-2 text-center text-purple-500">{w60}m</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ROUTE AI & REVENUE */}
          {activeTab === "routing" && (
            <motion.div 
              key="routing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ Smart Route Recommendation Engine
                </span>
                
                {/* Inputs Row */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-mono block mb-1">Your Entry Gate</label>
                    <select 
                      value={routeFromGate} 
                      onChange={(e) => setRouteFromGate(e.target.value)}
                      className="w-full bg-gray-950 p-2 border border-gray-900 rounded-xl text-white font-mono"
                    >
                      <option value="Gate A">Gate A (East Gate)</option>
                      <option value="Gate B">Gate B (North Gate)</option>
                      <option value="Gate C">Gate C (West Gate)</option>
                      <option value="Gate D">Gate D (South Gate)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-mono block mb-1">Your Target Section</label>
                    <select 
                      value={routeToSeat} 
                      onChange={(e) => setRouteToSeat(e.target.value)}
                      className="w-full bg-gray-950 p-2 border border-gray-900 rounded-xl text-white font-mono"
                    >
                      <option value="114">Section 114 (Concourse)</option>
                      <option value="105">Section 105 (North Side)</option>
                      <option value="130">Section 130 (South Plaza)</option>
                      <option value="140">Section 140 (East Suite)</option>
                    </select>
                  </div>
                </div>

                {/* Simulated Route Result */}
                {calculatedRoute && (
                  <div className="p-3.5 bg-cyan-950/15 border border-cyan-900/50 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 animate-bounce" />
                        Optimal Path Resolved
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        Distance: <strong className="text-white">{calculatedRoute.distanceMeters}m</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 bg-gray-950/60 rounded border border-gray-900">
                        <span className="text-[9px] text-gray-500 block">WALK TIME</span>
                        <strong className="text-white text-sm">{calculatedRoute.timeMins} Mins</strong>
                      </div>
                      <div className="p-2 bg-gray-950/60 rounded border border-gray-900">
                        <span className="text-[9px] text-gray-500 block">CURRENT CROWD</span>
                        <strong className={`${calculatedRoute.currentCongestion === "Low" ? "text-green-400" : "text-amber-400"} text-sm`}>
                          {calculatedRoute.currentCongestion}
                        </strong>
                      </div>
                    </div>

                    {/* Path Steps */}
                    <div className="space-y-1.5 pt-1 text-[11px] font-sans text-gray-300 border-t border-gray-900/60">
                      {calculatedRoute.steps.map((step: string, i: number) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-cyan-500 font-bold font-mono text-[9px] w-4 h-4 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-900">
                            {i + 1}
                          </span>
                          <span className="flex-1 text-gray-300">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Food court recommendations */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold block mb-1.5">
                  ✦ Food Court Queue Predictions & Recommendations
                </span>
                <div className="space-y-2">
                  {stadiumState.concessions.slice(0, 3).map((con) => (
                    <div key={con.id} className="p-2 bg-gray-900/30 rounded-xl border border-gray-900/60 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold flex items-center gap-1.5 text-white">
                          <Utensils className="w-3.5 h-3.5 text-purple-400" />
                          {con.name}
                          <span className="text-[9px] text-gray-500 font-mono">({con.zone})</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          Wait: <strong className="text-white">{con.queueTime}m</strong> • Pop: {con.popular}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {con.queueTime > 15 ? (
                          <div className="text-[10px] text-amber-400 font-mono bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/40">
                            Busy: Alt grill has 4m wait
                          </div>
                        ) : (
                          <div className="text-[10px] text-green-400 font-mono bg-green-950/20 px-2 py-0.5 rounded border border-green-900/40 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Recommended
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: FACILITIES HUD & RESTROOMS */}
          {activeTab === "facilities" && (
            <motion.div 
              key="facilities"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Restrooms list with dispatch action */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ Restroom Occupancy & Cleanliness HUD
                </span>
                <div className="space-y-2">
                  {restrooms.map((wc) => (
                    <div key={wc.id} className="p-2.5 bg-gray-900/30 rounded-xl border border-gray-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-white flex items-center gap-1">
                          <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                          {wc.name}
                        </div>
                        <div className="flex gap-3 text-[10px] text-gray-400 font-mono">
                          <span>Occupancy: <strong className="text-white">{wc.occupancy}%</strong></span>
                          <span>Cleanliness: <strong className="text-cyan-300">{wc.cleanliness}/10</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {wc.status === "Optimal" ? (
                          <span className="text-[9px] font-mono text-green-400 bg-green-950/30 border border-green-900/30 px-2 py-1 rounded">
                            ✦ Pristine
                          </span>
                        ) : wc.status === "Dispatched" ? (
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-1 rounded animate-pulse">
                            ⚙ Dispatched
                          </span>
                        ) : (
                          <button
                            onClick={() => handleDispatchClean(wc.id)}
                            className="bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg shadow cursor-pointer transition-colors"
                          >
                            Dispatch Cleaner
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parking and Exit optimization */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold block mb-1.5">
                  ✦ Parking Status & Exit Optimization (Egress Paths)
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {parkingZones.map((lot) => (
                    <div key={lot.id} className="p-2 bg-gray-900/20 rounded-xl border border-gray-900/60 space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-white text-[10px] truncate">{lot.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${lot.status === "Red" ? "bg-red-500" : lot.status === "Amber" ? "bg-amber-400" : "bg-green-400"}`} />
                      </div>
                      <div className="flex justify-between items-baseline text-[10px] font-mono text-gray-400">
                        <span>Occupied</span>
                        <span className="text-white font-bold">{lot.occupied} / {lot.capacity}</span>
                      </div>
                      <div className="w-full bg-gray-950 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${lot.status === "Red" ? "bg-red-500" : lot.status === "Amber" ? "bg-amber-400" : "bg-green-400"}`}
                          style={{ width: `${(lot.occupied / lot.capacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 p-2 bg-purple-950/15 border border-purple-900/50 rounded-xl text-[10px] font-mono text-purple-300 flex items-start gap-1.5">
                  <Car className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <div>
                    <strong>Route Recommendation:</strong> Highway Route 3 East is experiencing heavy stadium exit congestion. Direct drivers via Route 120 West toward the Garden State Parkway.
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: POWER & SUSTAINABILITY */}
          {activeTab === "power" && (
            <motion.div 
              key="power"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Energy Grid Overview */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ MetLife Solar & Smart Grid Analytics
                </span>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-900/30 rounded-xl border border-gray-900/60 flex items-center gap-2.5">
                    <Sun className="w-6 h-6 text-yellow-400 animate-spin-slow" />
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono block">SOLAR YIELD</span>
                      <strong className="text-sm font-mono text-white">
                        {stadiumState.sustainability.solarPowerGenerationKw} kW
                      </strong>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-900/30 rounded-xl border border-gray-900/60 flex items-center gap-2.5">
                    <Zap className="w-6 h-6 text-purple-400 animate-pulse" />
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono block">CONSUMPTION</span>
                      <strong className="text-sm font-mono text-white">
                        {stadiumState.sustainability.energyConsumptionKw} kW
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Energy Efficiency Bar */}
                <div className="mt-3 p-3 bg-gray-900/20 rounded-xl border border-gray-900/60 text-xs">
                  <div className="flex justify-between items-center mb-1 text-[10px] font-mono">
                    <span className="text-gray-400">Green Power Contribution</span>
                    <span className="text-green-400 font-bold">
                      {((stadiumState.sustainability.solarPowerGenerationKw / stadiumState.sustainability.energyConsumptionKw) * 100).toFixed(1)}% Self-Sustained
                    </span>
                  </div>
                  <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-400 h-full transition-all duration-1000"
                      style={{ width: `${(stadiumState.sustainability.solarPowerGenerationKw / stadiumState.sustainability.energyConsumptionKw) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono mt-1">
                    <span>Solar Energy</span>
                    <span>Stadium Core Grid</span>
                  </div>
                </div>
              </div>

              {/* Saved Carbon metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs text-center">
                <div className="p-2.5 bg-green-950/15 border border-green-900/30 rounded-xl">
                  <span className="text-[9px] text-gray-400 font-mono block">CO2 DISPLACED</span>
                  <strong className="text-green-400 text-sm font-mono font-black">{stadiumState.sustainability.co2SavedTons} Tons</strong>
                  <span className="text-[8px] text-gray-500 font-mono block mt-0.5">equivalent to 240 trees</span>
                </div>
                <div className="p-2.5 bg-cyan-950/15 border border-cyan-900/30 rounded-xl">
                  <span className="text-[9px] text-gray-400 font-mono block">WATER RECYCLED</span>
                  <strong className="text-cyan-400 text-sm font-mono font-black">{stadiumState.sustainability.waterRecycledGallons.toLocaleString()} Gal</strong>
                  <span className="text-[8px] text-gray-500 font-mono block mt-0.5">greywater filter active</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: AERO & WEATHER */}
          {activeTab === "weather" && (
            <motion.div 
              key="weather"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Weather & AQI Integration */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ Micro-Climate & Air Quality Index (AQI)
                </span>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 bg-gray-900/30 rounded-xl border border-gray-900/60">
                    <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                    <span className="text-[9px] text-gray-500 block">TEMP</span>
                    <strong className="font-mono text-white">74.2 °F</strong>
                  </div>
                  <div className="p-2.5 bg-gray-900/30 rounded-xl border border-gray-900/60">
                    <Wind className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                    <span className="text-[9px] text-gray-500 block">WIND SPEED</span>
                    <strong className="font-mono text-white">8.5 mph NW</strong>
                  </div>
                  <div className="p-2.5 bg-gray-900/30 rounded-xl border border-gray-900/60">
                    <Gauge className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <span className="text-[9px] text-gray-500 block">AIR QUALITY</span>
                    <strong className="font-mono text-green-400">{liveAqi} US AQI</strong>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-gray-900/20 rounded-xl border border-gray-900/60 text-xs text-gray-300">
                  <span className="text-[10px] text-cyan-300 font-mono block font-bold mb-1">
                    🍃 Aero Ventilation Impact
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Airflow conditions are **optimal**. MetLife open-air concourse ventilation is operating at maximum aerodynamic efficiency. Air quality is rated **Excellent** (safe for athletic endurance).
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: SPECS & PRODUCTION ARCHITECTURE */}
          {activeTab === "architecture" && (
            <motion.div 
              key="architecture"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 max-h-[480px] overflow-y-auto pr-1"
            >
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ FIFA Stadium Intelligence API Integration Directory
                </span>
                
                <div className="space-y-3">
                  {/* API 1: OPENWEATHERMAP WEATHER */}
                  <div className="p-3 bg-gray-900/40 border border-gray-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white font-sans">🌤️ Real-Time Micro-Climate Weather</span>
                      <span className="text-[9px] bg-cyan-950 text-cyan-400 font-mono px-1.5 py-0.5 rounded border border-cyan-900">OpenWeatherMap API</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-gray-400">
                      <div>
                        <span>PRICING</span>
                        <strong className="block text-white">Free tier (1k/day)</strong>
                      </div>
                      <div>
                        <span>RATE LIMITS</span>
                        <strong className="block text-white">60 reqs / min</strong>
                      </div>
                      <div>
                        <span>BACKUP API</span>
                        <strong className="block text-amber-400">Weatherstack API</strong>
                      </div>
                      <div>
                        <span>REFRESH PLAN</span>
                        <strong className="block text-cyan-400">10-min cache</strong>
                      </div>
                    </div>
                  </div>

                  {/* API 2: SPORTS DATA SOCCER KICKOFFS */}
                  <div className="p-3 bg-gray-900/40 border border-gray-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white font-sans">⚽ FIFA World Cup Match Schedules & Telemetry</span>
                      <span className="text-[9px] bg-purple-950 text-purple-400 font-mono px-1.5 py-0.5 rounded border border-purple-900">Sportradar Soccer API</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-gray-400">
                      <div>
                        <span>PRICING</span>
                        <strong className="block text-white">Commercial License</strong>
                      </div>
                      <div>
                        <span>RATE LIMITS</span>
                        <strong className="block text-white">120 reqs / min</strong>
                      </div>
                      <div>
                        <span>BACKUP API</span>
                        <strong className="block text-amber-400">Opta Sports API</strong>
                      </div>
                      <div>
                        <span>REFRESH PLAN</span>
                        <strong className="block text-cyan-400">WebSocket / Real-time</strong>
                      </div>
                    </div>
                  </div>

                  {/* API 3: TRANSIT SCOUT GOOGLE MAPS PLATFORM */}
                  <div className="p-3 bg-gray-900/40 border border-gray-800 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white font-sans">🚍 GIS Indoor routing & Public Transit Telemetry</span>
                      <span className="text-[9px] bg-cyan-950 text-cyan-400 font-mono px-1.5 py-0.5 rounded border border-cyan-900">Google Maps Platform</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-gray-400">
                      <div>
                        <span>PRICING</span>
                        <strong className="block text-white">$200 free credit</strong>
                      </div>
                      <div>
                        <span>RATE LIMITS</span>
                        <strong className="block text-white">Uncapped</strong>
                      </div>
                      <div>
                        <span>BACKUP API</span>
                        <strong className="block text-amber-400">Mapbox Matrix API</strong>
                      </div>
                      <div>
                        <span>REFRESH PLAN</span>
                        <strong className="block text-cyan-400">On-demand call</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* POSTGRES DB SCHEMA */}
              <div className="border-t border-gray-900 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold block mb-1.5">
                  ✦ PostgreSQL Database schema (Drizzle ORM Schema)
                </span>
                <pre className="p-3 bg-black/60 rounded-xl border border-gray-900 text-[9px] font-mono text-gray-300 leading-normal overflow-x-auto select-all">
{`import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

// Seating and ticket records
export const ticketsTable = pgTable("world_cup_tickets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  matchId: text("match_id").notNull(),
  seatSection: text("seat_section").notNull(),
  seatRow: text("seat_row").notNull(),
  seatNumber: text("seat_number").notNull(),
  admissionType: text("admission_type").notNull(), // VIP, General, Press
  scannedAt: timestamp("scanned_at"),
});

// Live gate waits and sensor telemetry log
export const gateTelemetryTable = pgTable("gate_telemetry", {
  id: text("id").primaryKey(),
  gateId: text("gate_id").notNull(), // A, B, C, D
  waitTimeMinutes: integer("wait_time_minutes").notNull(),
  loadFactorPercentage: integer("load_factor_percentage").notNull(),
  queueCount: integer("queue_count").notNull(),
  loggedAt: timestamp("logged_at").defaultNow(),
});

// Active Tactical incidents log
export const incidentsTable = pgTable("tactical_incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  severity: text("severity").notNull(), // High, Medium, Low
  status: text("status").default("Active"), // Active, Resolved, Monitoring
  description: text("description"),
  dispatchedUnit: text("dispatched_unit"),
  createdAt: timestamp("created_at").defaultNow(),
});`}
                </pre>
              </div>

              {/* RE-ENGINEERED NextJS 15 SYSTEM STRUCTURE */}
              <div className="border-t border-gray-900 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-mono font-bold block mb-1.5">
                  ✦ Next.js 15 & Node full-stack Project Structure
                </span>
                <pre className="p-3 bg-black/60 rounded-xl border border-gray-900 text-[9px] font-mono text-gray-300 leading-normal overflow-x-auto">
{`stadium-intelligence-platform/
├── package.json
├── next.config.ts
├── Dockerfile                  # Container optimization specs
├── drizzle.config.ts
├── .env.example
├── server.ts                  # High-performance WS & API hub
├── src/
│   ├── app/                   # Next.js App router
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── copilot/route.ts   # Gemini multi-layered proxy
│   │       ├── telemetry/route.ts # Real-time push sensors
│   │       └── search/route.ts    # Google search grounding proxy
│   ├── components/            # Decoupled high-performance components
│   │   ├── CinematicLanding.tsx
│   │   ├── StadiumDigitalTwin.tsx
│   │   └── CopilotPanel.tsx
│   ├── db/
│   │   ├── db.ts              # PostgreSQL connector
│   │   └── schema.ts          # Type-safe schemas
│   └── types.ts               # Shared interfaces`}
                </pre>
              </div>

              {/* DevOps, SECURITY, AND SCALABILITY PLAN */}
              <div className="border-t border-gray-900 pt-3 space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-mono font-bold block mb-0.5">
                  ✦ Enterprise DevOps, Security & Caching Blueprint
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] leading-relaxed">
                  <div className="p-2.5 bg-gray-900/35 border border-gray-900 rounded-xl space-y-1">
                    <strong className="text-white block font-sans">⚡ Redis Caching Layer</strong>
                    <p className="text-gray-400">
                      Caches external Weather (10m expiration), and FIFA Match schedules (30s expiration). Avoids downstream API key exhaust, securing sub-10ms response latency for thousands of concurrent queries.
                    </p>
                  </div>
                  
                  <div className="p-2.5 bg-gray-900/35 border border-gray-900 rounded-xl space-y-1">
                    <strong className="text-white block font-sans">🔒 Multi-Tenant Auth & TLS</strong>
                    <p className="text-gray-400">
                      Firebase Authentication handles secure OAuth. JWT verification gates admin actions. Encrypted TLS 1.3 tunnels and Content Security Policies prevent packet sniffers on crowded stadium Wi-Fi.
                    </p>
                  </div>

                  <div className="p-2.5 bg-gray-900/35 border border-gray-900 rounded-xl space-y-1">
                    <strong className="text-white block font-sans">🚀 Kubernetes & Autoscale</strong>
                    <p className="text-gray-400">
                      Containers run in highly resilient multi-zone Google Cloud Run environments. Autoscale is configured to scale up dynamically to 200 nodes during match kickoff peak ingress hours.
                    </p>
                  </div>

                  <div className="p-2.5 bg-gray-900/35 border border-gray-900 rounded-xl space-y-1">
                    <strong className="text-white block font-sans">🪵 Datadog & Pino Logging</strong>
                    <p className="text-gray-400">
                      Structured logs are serialized using Pino and streamed to Datadog. Circuit breaker state events are fully tracked to instantly alert on-call DevOps engineers on API failovers.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* EMERGENCY AND SECURITY NOTIFICATION HUD */}
      <div className="border-t border-gray-900 pt-3 text-xs">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] uppercase tracking-wider text-red-400 font-mono font-bold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            Tactical Security & Incident Alerts
          </span>
          <span className="text-[9px] font-mono text-gray-500">
            {stadiumState.incidents.filter(i => i.status === "Active").length} Active Incidents
          </span>
        </div>

        <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
          {stadiumState.incidents.length === 0 ? (
            <div className="text-[11px] text-green-400 font-mono py-1.5 text-center bg-green-950/10 border border-green-900/30 rounded-lg">
              ✓ Normal System Integrity • No active threats reported.
            </div>
          ) : (
            stadiumState.incidents.map((incident) => {
              const isActive = incident.status !== "Resolved";
              return (
                <div 
                  key={incident.id} 
                  className={`p-2 rounded-lg border text-[11px] flex items-start justify-between gap-2 ${isActive ? "bg-red-950/20 text-red-300 border-red-900/40" : "bg-gray-900/30 text-gray-400 border-gray-900"}`}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="font-bold flex items-center gap-1 text-white">
                      <span className={`w-1.5 h-1.5 rounded-full ${incident.severity === "High" ? "bg-red-500 animate-ping" : "bg-amber-400"}`} />
                      {incident.id}: {incident.title}
                      <span className="text-[9px] font-mono text-gray-500">({incident.location})</span>
                    </div>
                    <p className="text-gray-400 text-[10px] font-sans leading-tight">{incident.description}</p>
                  </div>

                  {isActive && onResolveIncident && (
                    <button
                      onClick={() => onResolveIncident(incident.id)}
                      className="bg-red-950/60 hover:bg-red-900 border border-red-800 text-[9px] font-mono text-red-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AI GENERATED INSIGHTS TICKER */}
      <div className="bg-gray-950 p-2.5 rounded-xl border border-gray-900 text-[10px] font-mono space-y-1">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="uppercase tracking-wider font-bold">AI WorldCup Copilot Analyst</span>
        </div>
        <div className="text-gray-300 leading-normal pl-5 list-disc space-y-1">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className="flex gap-1.5 items-start">
              <span className="text-cyan-500 select-none">›</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
