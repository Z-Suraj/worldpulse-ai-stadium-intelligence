import { describe, it, expect } from "vitest";
import {
  getTransitStatusDescription,
  estimateETA,
  rankRestaurants,
  BusRoute,
  Restaurant
} from "./transitHelpers";

describe("Transit Scout Helper Utilities", () => {
  describe("getTransitStatusDescription", () => {
    it("should return cancelled message for Cancelled status", () => {
      const route: BusRoute = {
        id: "b1",
        name: "Shuttle Express",
        eta: 0,
        occupancy: 0,
        status: "Cancelled"
      };
      expect(getTransitStatusDescription(route)).toContain("cancelled");
    });

    it("should return delayed description when status is Delayed", () => {
      const route: BusRoute = {
        id: "b2",
        name: "North Lot Bus",
        eta: 25,
        occupancy: 80,
        status: "Delayed"
      };
      expect(getTransitStatusDescription(route)).toContain("experiencing delays");
      expect(getTransitStatusDescription(route)).toContain("Current ETA: 25 mins");
    });

    it("should return normal description when status is On Time", () => {
      const route: BusRoute = {
        id: "b3",
        name: "Metro Connector",
        eta: 8,
        occupancy: 45,
        status: "On Time"
      };
      expect(getTransitStatusDescription(route)).toContain("operating normally");
      expect(getTransitStatusDescription(route)).toContain("45% full");
    });
  });

  describe("estimateETA", () => {
    it("should estimate normal travel time", () => {
      expect(estimateETA(10, 40, 1.0)).toBe(15); // 10 miles at 40mph is 0.25h = 15m
    });

    it("should scale with heavy traffic/congestion factor", () => {
      expect(estimateETA(10, 40, 1.8)).toBe(27); // 15m * 1.8 = 27m
    });

    it("should fallback to high number when speed is zero", () => {
      expect(estimateETA(5, 0, 1.0)).toBe(999);
    });
  });

  describe("rankRestaurants", () => {
    const mockRestaurants: Restaurant[] = [
      { id: "r1", name: "Goalpost Burgers", cuisine: "American", distance: 0.5, rating: 4.8 },
      { id: "r2", name: "MetLife Cantina", cuisine: "Mexican", distance: 1.2, rating: 4.5 },
      { id: "r3", name: "Pizzeria Stadium", cuisine: "Italian", distance: 6.0, rating: 4.9 }, // too far
      { id: "r4", name: "Touchdown Tacos", cuisine: "Mexican", distance: 2.1, rating: 4.7 }
    ];

    it("should filter restaurants by distance limit", () => {
      const results = rankRestaurants(mockRestaurants, "", 5);
      expect(results).toHaveLength(3);
      expect(results.map(r => r.id)).not.toContain("r3");
    });

    it("should filter by search query (cuisine or name)", () => {
      const mexicanSpots = rankRestaurants(mockRestaurants, "Mexican", 5);
      expect(mexicanSpots).toHaveLength(2);
      expect(mexicanSpots.map(r => r.name)).toContain("MetLife Cantina");
      expect(mexicanSpots.map(r => r.name)).toContain("Touchdown Tacos");
    });

    it("should sort by highest rating first", () => {
      const results = rankRestaurants(mockRestaurants, "Mexican", 5);
      expect(results[0].rating).toBe(4.7); // Touchdown Tacos
      expect(results[1].rating).toBe(4.5); // MetLife Cantina
    });
  });
});
