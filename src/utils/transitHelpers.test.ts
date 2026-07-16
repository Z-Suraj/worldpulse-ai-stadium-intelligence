import { describe, it, expect } from "vitest";
import {
  getTransitStatusDescription,
  estimateETA,
  rankRestaurants,
  BusRoute,
  Restaurant
} from "./transitHelpers";

describe("Transit Scout Helper Utilities - High Density Suite", () => {
  describe("getTransitStatusDescription (Extensive Grid)", () => {
    // Generate 150 tests testing various transit conditions and message formations
    const etas = [0, 5, 10, 20, 30, 45, 60];
    const occupancies = [0, 10, 30, 50, 70, 85, 100];
    const statuses: Array<"On Time" | "Delayed" | "Cancelled"> = ["On Time", "Delayed", "Cancelled"];

    statuses.forEach(status => {
      etas.forEach(eta => {
        occupancies.forEach(occ => {
          it(`should return accurate description for route (status:${status}, eta:${eta}, occupancy:${occ}%)`, () => {
            const route: BusRoute = {
              id: `route-${status}-${eta}-${occ}`,
              name: "Airport Shuttle Express",
              eta,
              occupancy: occ,
              status
            };
            const desc = getTransitStatusDescription(route);
            if (status === "Cancelled") {
              expect(desc).toContain("cancelled");
              expect(desc).toContain("Airport Shuttle Express");
            } else if (status === "Delayed") {
              expect(desc).toContain("experiencing delays");
              expect(desc).toContain(`Current ETA: ${eta} mins`);
              expect(desc).toContain(`Occupancy is ${occ}%`);
            } else {
              expect(desc).toContain("operating normally");
              expect(desc).toContain(`ETA: ${eta} mins`);
              expect(desc).toContain(`${occ}% full`);
            }
          });
        });
      });
    });
  });

  describe("estimateETA (Speed, Congestion, and Distance Matrix)", () => {
    // Test 100+ combinations of distance, speed, and congestion
    const distances = [1, 2, 5, 10, 15, 20];
    const speeds = [10, 20, 30, 40, 50, 60];
    const congestionFactors = [1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0];

    distances.forEach(dist => {
      speeds.forEach(speed => {
        congestionFactors.forEach(cong => {
          it(`should estimate ETA for ${dist} miles at ${speed} mph with ${cong} congestion factor`, () => {
            const eta = estimateETA(dist, speed, cong);
            const expectedBase = (dist / speed) * 60;
            const expectedWithCong = Math.round(expectedBase * cong);
            expect(eta).toBe(expectedWithCong);
          });
        });
      });
    });

    it("should handle division by zero or negative speeds gracefully", () => {
      expect(estimateETA(10, 0, 1.0)).toBe(999);
      expect(estimateETA(10, -5, 1.0)).toBe(999);
    });
  });

  describe("rankRestaurants (Intense search and filter checks)", () => {
    const generateRestaurants = (): Restaurant[] => {
      const list: Restaurant[] = [];
      const cuisines = ["American", "Mexican", "Italian", "Indian", "Asian"];
      for (let i = 1; i <= 30; i++) {
        list.push({
          id: `rest-${i}`,
          name: `Restaurant Spot ${i}`,
          cuisine: cuisines[i % cuisines.length],
          distance: (i * 0.3) + 0.1, // 0.4, 0.7, 1.0 ... 9.1 miles
          rating: 4.0 + ((i % 11) * 0.1) // 4.0 to 5.0
        });
      }
      return list;
    };

    it("should correctly rank and filter under custom maximum distances", () => {
      const list = generateRestaurants();
      const results = rankRestaurants(list, "", 3.0); // max 3.0 miles
      expect(results.length).toBeLessThan(list.length);
      results.forEach(r => {
        expect(r.distance).toBeLessThanOrEqual(3.0);
      });
    });

    it("should perform query string search filtering correctly on names or cuisines", () => {
      const list = generateRestaurants();
      const results = rankRestaurants(list, "Mexican");
      results.forEach(r => {
        expect(r.cuisine.toLowerCase()).toContain("mexican");
      });
    });

    it("should rank primarily by rating, then distance", () => {
      const list: Restaurant[] = [
        { id: "ra", name: "Alpha", cuisine: "American", distance: 1.0, rating: 4.5 },
        { id: "rb", name: "Beta", cuisine: "American", distance: 0.5, rating: 4.5 },
        { id: "rc", name: "Gamma", cuisine: "American", distance: 1.2, rating: 4.8 }
      ];
      const results = rankRestaurants(list, "");
      expect(results[0].id).toBe("rc"); // Highest rating first (4.8)
      expect(results[1].id).toBe("rb"); // Secondary tie-break: rating is same (4.5), closer distance (0.5)
      expect(results[2].id).toBe("ra"); // Farther distance (1.0)
    });
  });
});
