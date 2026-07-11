import React, { useState } from "react";
import { Compass, Search, MapPin, RefreshCw, Link as LinkIcon, Info } from "lucide-react";

export default function TransitScout() {
  const [query, setQuery] = useState("Best public transit routes to MetLife Stadium from Manhattan on FIFA match day");
  const [groundingType, setGroundingType] = useState<"search" | "maps">("search");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string>("");
  const [sources, setSources] = useState<any[]>([]);

  const handleScoutGrounding = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResults("");
    setSources([]);

    try {
      const endpoint = groundingType === "search" ? "/api/search-grounding" : "/api/maps-grounding";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      setResults(data.text || data.answer || "No grounded coordinates located.");
      if (data.sources) {
        setSources(data.sources);
      }
    } catch (err) {
      console.error("Grounding scout failed:", err);
      setResults("Scout service temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-gray-900 space-y-4">
      <div>
        <h4 className="text-xs uppercase font-mono tracking-wider text-cyan-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
            AI Transit & Dining Scout
          </span>
          <span className="text-[8px] bg-cyan-950 text-cyan-400 px-1 rounded uppercase">Real-Time Grounding</span>
        </h4>
        <p className="text-[10px] text-gray-400 mt-1">
          Scout transit lines or nearby restaurants. Queries are enriched with actual **Google Search & Google Maps real-time data**.
        </p>
      </div>

      <div className="space-y-3">
        {/* Grounding Toggle */}
        <div className="grid grid-cols-2 gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-900">
          <button
            type="button"
            onClick={() => setGroundingType("search")}
            className={`text-[10px] py-1.5 rounded-lg font-mono flex items-center justify-center gap-1.5 transition-all ${groundingType === "search" ? "bg-cyan-950/50 text-cyan-300 font-semibold border border-cyan-900/40" : "text-gray-500 hover:text-white"}`}
          >
            <Search className="w-3.5 h-3.5" />
            Google Search Grounding
          </button>
          <button
            type="button"
            onClick={() => setGroundingType("maps")}
            className={`text-[10px] py-1.5 rounded-lg font-mono flex items-center justify-center gap-1.5 transition-all ${groundingType === "maps" ? "bg-cyan-950/50 text-cyan-300 font-semibold border border-cyan-900/40" : "text-gray-500 hover:text-white"}`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Google Maps Grounding
          </button>
        </div>

        <div>
          <label className="text-[10px] font-mono text-gray-500 block mb-1">Scout Search Query</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-900 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            placeholder={groundingType === "search" ? "e.g. Bus schedules to MetLife Stadium..." : "e.g. Best restaurants near MetLife..."}
          />
        </div>

        <button
          onClick={handleScoutGrounding}
          disabled={loading}
          className="w-full bg-cyan-900 hover:bg-cyan-800 text-white font-semibold rounded-xl text-xs py-2 transition-all flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              Retrieving live verified data layers...
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5" />
              Verify Real-time Location Info
            </>
          )}
        </button>
      </div>

      {/* Answer and links */}
      {results && (
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-900 space-y-3">
          <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block">Grounded Answer:</span>
          <p className="text-xs text-gray-300 leading-relaxed font-sans">{results}</p>

          {/* Sources with Links */}
          {sources.length > 0 && (
            <div className="pt-2.5 border-t border-gray-900 space-y-1.5">
              <span className="text-[9px] text-gray-500 uppercase font-mono block">Citations & Grounding Sources:</span>
              <div className="space-y-1">
                {sources.map((src, index) => (
                  <a
                    key={index}
                    href={src.uri || src.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 truncate"
                  >
                    <LinkIcon className="w-3 h-3 shrink-0" />
                    {src.title || src.name || `Source [${index + 1}]`}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-1.5 p-2 bg-gray-950/40 rounded-xl border border-gray-900/60 text-[9px] text-gray-500 font-mono leading-relaxed">
        <Info className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
        Offline mode returns local stadium travel schedules, bus coordinates, and top-tier FIFA dining directories.
      </div>
    </div>
  );
}
