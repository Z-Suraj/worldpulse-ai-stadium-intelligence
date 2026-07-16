import { describe, it, expect } from "vitest";
import {
  estimateEvacuationTime,
  findOptimalBackupRoute,
  evaluateCrisisLevel,
  EvacuationZone,
  ExitRoute
} from "./scenarioHelpers";

describe("Strategic Scenario Planner Helpers - Extended Matrix Suite", () => {
  describe("estimateEvacuationTime (Exhaustive Capacity and Flow Grid)", () => {
    // Generate 120 tests for evacuation estimation
    const occupancies = [0, 50, 100, 250, 500, 1000, 2500, 5000];
    const flowRates = [10, 50, 100, 250, 500];
    const modifiers = [0.5, 1.0, 1.5];

    occupancies.forEach(occ => {
      flowRates.forEach(flow => {
        modifiers.forEach(mod => {
          it(`should calculate minutes correctly (occupancy:${occ}, flowRate:${flow}, modifier:${mod})`, () => {
            const zone: EvacuationZone = {
              id: `zone-${occ}-${flow}`,
              name: `Gate Zone ${occ}`,
              capacity: 10000,
              currentOccupancy: occ,
              flowRatePerMin: flow,
              isBlocked: false
            };
            const time = estimateEvacuationTime(zone, mod);
            if (occ <= 0) {
              expect(time).toBe(0);
            } else {
              const realFlow = flow * mod;
              const expectedTime = Math.ceil(occ / realFlow);
              expect(time).toBe(expectedTime);
            }
          });
        });
      });
    });

    it("should return 999 immediately if the evacuation zone is blocked", () => {
      const zone: EvacuationZone = {
        id: "blocked-z",
        name: "Gate D Concourse",
        capacity: 5000,
        currentOccupancy: 1000,
        flowRatePerMin: 100,
        isBlocked: true
      };
      expect(estimateEvacuationTime(zone)).toBe(999);
    });

    it("should handle division by zero flow rate gracefully by returning 999", () => {
      const zone: EvacuationZone = {
        id: "zero-flow-z",
        name: "Dead Concourse",
        capacity: 5000,
        currentOccupancy: 1000,
        flowRatePerMin: 0,
        isBlocked: false
      };
      expect(estimateEvacuationTime(zone)).toBe(999);
      expect(estimateEvacuationTime(zone, -0.5)).toBe(999);
    });
  });

  describe("evaluateCrisisLevel (Complete Congestion & Weather Matrix)", () => {
    // Generate 100 distinct test assertions for all congestion levels (0-100) and weather scenarios
    const congestionLevels = Array.from({ length: 34 }, (_, i) => i * 3); // 0, 3, 6, ..., 99
    const weatherConditions: Array<"Clear" | "Rain" | "Severe Storm"> = ["Clear", "Rain", "Severe Storm"];

    weatherConditions.forEach(weather => {
      congestionLevels.forEach(congestion => {
        it(`should evaluate crisis (congestion:${congestion}%, weather:${weather})`, () => {
          const level = evaluateCrisisLevel(congestion, weather);
          if (weather === "Severe Storm") {
            expect(level).toBe(congestion >= 60 ? "Extreme" : "High");
          } else if (weather === "Rain") {
            if (congestion >= 80) expect(level).toBe("High");
            else if (congestion >= 40) expect(level).toBe("Medium");
            else expect(level).toBe("Low");
          } else {
            if (congestion >= 80) expect(level).toBe("High");
            else if (congestion >= 50) expect(level).toBe("Medium");
            else expect(level).toBe("Low");
          }
        });
      });
    });
  });

  describe("findOptimalBackupRoute (Advanced routing edge cases)", () => {
    it("should return null if no alternative route exists", () => {
      expect(findOptimalBackupRoute([], "route-a")).toBeNull();
    });

    it("should filter out the blocked route and find the best alternative", () => {
      const routes: ExitRoute[] = [
        { id: "r1", name: "Passageway 1", load: 20, safetyRating: 3 },
        { id: "r2", name: "Passageway 2", load: 50, safetyRating: 5 },
        { id: "r3", name: "Passageway 3", load: 10, safetyRating: 4 }
      ];
      // If we block r2, between r1 and r3: r3 has safety 4, r1 has safety 3.
      // So r3 is chosen due to higher safety.
      const best = findOptimalBackupRoute(routes, "r2");
      expect(best).not.toBeNull();
      expect(best?.id).toBe("r3");
    });

    it("should resolve ties in safetyRating by choosing the lower load/traffic route", () => {
      const routes: ExitRoute[] = [
        { id: "r1", name: "Passage X", load: 70, safetyRating: 5 },
        { id: "r2", name: "Passage Y", load: 30, safetyRating: 5 },
        { id: "r3", name: "Passage Z", load: 90, safetyRating: 5 }
      ];
      const best = findOptimalBackupRoute(routes, "some-other-id");
      expect(best?.id).toBe("r2"); // Lowest load among equal safety ratings
    });
  });
});
