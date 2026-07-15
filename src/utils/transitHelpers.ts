/**
 * Transit Scout helper functions
 */

export interface BusRoute {
  id: string;
  name: string;
  eta: number; // in minutes
  occupancy: number; // percentage
  status: "On Time" | "Delayed" | "Cancelled";
}

/**
 * Calculates transit status description.
 */
export function getTransitStatusDescription(route: BusRoute): string {
  if (route.status === "Cancelled") {
    return `Route ${route.name} is cancelled. Please look for alternative shuttle buses.`;
  }
  if (route.status === "Delayed") {
    return `Route ${route.name} is experiencing delays. Current ETA: ${route.eta} mins. Occupancy is ${route.occupancy}%.`;
  }
  return `Route ${route.name} is operating normally. ETA: ${route.eta} mins (${route.occupancy}% full).`;
}

/**
 * Simulates ETA updates based on current simulated congestion and distance.
 */
export function estimateETA(distanceMiles: number, speedMph: number, congestionFactor: number): number {
  if (speedMph <= 0) return 999;
  const baseTimeHrs = distanceMiles / speedMph;
  const baseTimeMins = baseTimeHrs * 60;
  return Math.round(baseTimeMins * congestionFactor);
}

/**
 * Filters and ranks dining spots by distance and matching query.
 */
export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  distance: number; // in miles
  rating: number;
}

export function rankRestaurants(restaurants: Restaurant[], query: string, maxDistance: number = 5): Restaurant[] {
  const normQuery = query.toLowerCase();
  return restaurants
    .filter(r => {
      const matchesQuery = r.name.toLowerCase().includes(normQuery) || r.cuisine.toLowerCase().includes(normQuery);
      return matchesQuery && r.distance <= maxDistance;
    })
    .sort((a, b) => {
      // Rank by higher rating, then closer distance
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return a.distance - b.distance;
    });
}
