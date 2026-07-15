import { describe, it, expect } from "vitest";
import {
  estimateEvacuationTime,
  findOptimalBackupRoute,
  evaluateCrisisLevel,
  EvacuationZone,
  ExitRoute
} from "./scenarioHelpers";

describe("Strategic Scenario Planner Helpers", () => {
  describe("estimateEvacuationTime", () => {
    it("should return 0 when occupancy is 0", () => {
      const zone: EvacuationZone = {
        id: "z1",
        name: "North Terrace",
        capacity: 5000,
        currentOccupancy: 0,
        flowRatePerMin: 100,
        isBlocked: false
      };
      expect(estimateEvacuationTime(zone)).toBe(0);
    });

    it("should return 999 if zone is blocked", () => {
      const zone: EvacuationZone = {
        id: "z2",
        name: "Gate B Stairwell",
        capacity: 2000,
        currentOccupancy: 800,
        flowRatePerMin: 100,
        isBlocked: true
      };
      expect(estimateEvacuationTime(zone)).toBe(999);
    });

    it("should calculate correct ceiling evacuation minutes normally", () => {
      const zone: EvacuationZone = {
        id: "z3",
        name: "South Plaza Escalators",
        capacity: 4000,
        currentOccupancy: 850,
        flowRatePerMin: 150,
        isBlocked: false
      };
      // 850 / 150 = 5.66 -> ceiling is 6
      expect(estimateEvacuationTime(zone)).toBe(6);
    });

    it("should adapt to slower flow rates via flowRateModifier", () => {
      const zone: EvacuationZone = {
        id: "z3",
        name: "South Plaza Escalators",
        capacity: 4000,
        currentOccupancy: 850,
        flowRatePerMin: 150,
        isBlocked: false
      };
      // with 0.5 flowRateModifier, real rate is 75 per min.
      // 850 / 75 = 11.33 -> ceiling is 12
      expect(estimateEvacuationTime(zone, 0.5)).toBe(12);
    });
  });

  describe("findOptimalBackupRoute", () => {
    const mockRoutes: ExitRoute[] = [
      { id: "r1", name: "Main Walkway East", load: 85, safetyRating: 5 },
      { id: "r2", name: "Secondary Concourse B", load: 30, safetyRating: 4 },
      { id: "r3", name: "Grass Hill West Bypass", load: 15, safetyRating: 3 },
      { id: "r4", name: "Tunnel Exit D", load: 45, safetyRating: 5 }
    ];

    it("should return null if no alternative routes are available", () => {
      expect(findOptimalBackupRoute([], "r1")).toBeNull();
    });

    it("should prioritize highest safety rating, then lowest load", () => {
      // "r1" is blocked. Under remaining, r4 (rating 5, load 45) is better safety-wise than r2 (rating 4) and r3 (rating 3).
      // Let's verify.
      const backup = findOptimalBackupRoute(mockRoutes, "r1");
      expect(backup).not.toBeNull();
      expect(backup?.id).toBe("r4");
    });

    it("should fallback to lower safety rating if it has much better load/traffic flow when safety ratings are equal", () => {
      const equalSafetyRoutes: ExitRoute[] = [
        { id: "ra", name: "Passage A", load: 90, safetyRating: 4 },
        { id: "rb", name: "Passage B", load: 20, safetyRating: 4 }
      ];
      const backup = findOptimalBackupRoute(equalSafetyRoutes, "rc");
      expect(backup?.id).toBe("rb");
    });
  });

  describe("evaluateCrisisLevel", () => {
    it("should handle severe weather conditions correctly", () => {
      expect(evaluateCrisisLevel(20, "Severe Storm")).toBe("High");
      expect(evaluateCrisisLevel(65, "Severe Storm")).toBe("Extreme");
    });

    it("should handle rain conditions correctly", () => {
      expect(evaluateCrisisLevel(25, "Rain")).toBe("Low");
      expect(evaluateCrisisLevel(50, "Rain")).toBe("Medium");
      expect(evaluateCrisisLevel(85, "Rain")).toBe("High");
    });

    it("should handle clear conditions correctly", () => {
      expect(evaluateCrisisLevel(30, "Clear")).toBe("Low");
      expect(evaluateCrisisLevel(60, "Clear")).toBe("Medium");
      expect(evaluateCrisisLevel(90, "Clear")).toBe("High");
    });
  });
});
