/**
 * Strategic Scenario Planner Helpers
 */

export interface EvacuationZone {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  flowRatePerMin: number; // capacity cleared per min
  isBlocked: boolean;
}

/**
 * Calculates estimated minutes required to fully clear a zone.
 * Factor in standard and blocked scenarios.
 */
export function estimateEvacuationTime(zone: EvacuationZone, flowRateModifier: number = 1.0): number {
  if (zone.isBlocked) {
    return 999; // Indefinite clearance time due to blockage
  }
  if (zone.currentOccupancy <= 0) return 0;
  const realFlowRate = zone.flowRatePerMin * flowRateModifier;
  if (realFlowRate <= 0) return 999;
  return Math.ceil(zone.currentOccupancy / realFlowRate);
}

/**
 * Suggests secondary routes if a primary exit path is blocked.
 */
export interface ExitRoute {
  id: string;
  name: string;
  load: number; // 0-100%
  safetyRating: number; // 1-5 stars
}

export function findOptimalBackupRoute(routes: ExitRoute[], blockedRouteId: string): ExitRoute | null {
  const openRoutes = routes.filter(r => r.id !== blockedRouteId);
  if (openRoutes.length === 0) return null;
  
  // Sort by highest safety rating first, then lowest load
  return openRoutes.sort((a, b) => {
    if (b.safetyRating !== a.safetyRating) {
      return b.safetyRating - a.safetyRating;
    }
    return a.load - b.load;
  })[0];
}

/**
 * Evaluates crisis level severity score based on congestion and current weather.
 */
export function evaluateCrisisLevel(avgCongestion: number, weatherSeverity: "Clear" | "Rain" | "Severe Storm"): "Low" | "Medium" | "High" | "Extreme" {
  if (weatherSeverity === "Severe Storm") {
    return avgCongestion >= 60 ? "Extreme" : "High";
  }
  if (weatherSeverity === "Rain") {
    if (avgCongestion >= 80) return "High";
    if (avgCongestion >= 40) return "Medium";
    return "Low";
  }
  if (avgCongestion >= 80) return "High";
  if (avgCongestion >= 50) return "Medium";
  return "Low";
}
