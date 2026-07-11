import React, { useState } from "react";
import { Sparkles, Brain, AlertTriangle, RefreshCw, Send, CheckCircle } from "lucide-react";

export default function StrategicScenarioPlanner() {
  const [scenario, setScenario] = useState("Extreme blizzard/storm causing sudden transit stoppage at East Gate");
  const [customPrompt, setCustomPrompt] = useState("Explain step-by-step how to route 25k fans safely to indoor concourses and redirect transport fleets.");
  const [loading, setLoading] = useState(false);
  const [strategicReport, setStrategicReport] = useState("");

  const handleRunThinkingSimulation = async () => {
    if (!scenario.trim()) return;
    setLoading(true);
    setStrategicReport("");

    try {
      const res = await fetch("/api/scenario-thinking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          customPrompt,
        }),
      });
      const data = await res.json();
      setStrategicReport(data.response || "No strategic summary returned.");
    } catch (err) {
      console.error("Thinking Simulation failed:", err);
      setStrategicReport("Failed to generate strategic thinking simulation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-4">
      <div>
        <h4 className="text-xs uppercase font-mono tracking-wider text-purple-400 flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-purple-400 shrink-0" />
          AI Strategic Scenario Planner
        </h4>
        <p className="text-[10px] text-gray-400 mt-1">
          Simulate high-impact stadium operational incidents with **Gemini-3.1 Pro Thinking Mode** to draft complete disaster contingency plans.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono text-gray-500 block mb-1">Select Crisis Scenario Template</label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            className="w-full bg-gray-950 border border-gray-900 rounded-xl p-2.5 text-xs text-white focus:outline-none"
          >
            <option value="Extreme blizzard/storm causing sudden transit stoppage at East Gate">❄️ Extreme blizzard / transit outage at East Gate</option>
            <option value="Coordinate total evacuation drill with Gate A blocked completely due to smoke alarm">🔥 Smoke alarm / Gate A blocked total evacuation</option>
            <option value="Simulate a 45% VIP fan arrival surge combined with heavy rain congestion">🌧️ VIP Fan arrival surge & torrential rainfall</option>
            <option value="Cyber-threat blackout affecting electronic entry gates on North plaza">🔌 Cyber-threat power blackout at entry gates</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-mono text-gray-500 block mb-1">Additional Operational Directives</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={2}
            className="w-full bg-gray-950 border border-gray-900 rounded-xl p-2.5 text-xs text-white focus:outline-none"
            placeholder="Type custom strategic variables..."
          />
        </div>

        <button
          onClick={handleRunThinkingSimulation}
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 hover:from-purple-800 hover:to-indigo-800 border border-purple-500/20 text-purple-200 font-semibold rounded-xl text-xs py-2.5 transition-all flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
              Thinking deeply with Gemini (ThinkingLevel: HIGH)...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              Run Deep Strategy Simulation
            </>
          )}
        </button>
      </div>

      {strategicReport && (
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-900 space-y-2 max-h-[350px] overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold border-b border-gray-900 pb-2">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-mono">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              Simulation Report Compiled
            </span>
            <span className="font-mono text-gray-500">ThinkingLevel: HIGH</span>
          </div>

          <div className="text-xs text-purple-100 font-sans leading-relaxed whitespace-pre-wrap space-y-2">
            {strategicReport.split("\n").map((line, index) => {
              const isHeading = line.startsWith("###") || line.startsWith("##");
              return (
                <p key={index} className={isHeading ? "text-white font-extrabold mt-3 border-l-2 border-purple-500 pl-2" : ""}>
                  {line.replace(/###|##|\*/g, "")}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
