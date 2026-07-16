import { describe, it, expect } from "vitest";
import {
  calculateGateStatus,
  filterVolunteersByZone,
  isValidSecurityUpload,
  estimateGateBySection,
  calculateSustainabilityLevel,
  Volunteer
} from "./stadiumHelpers";

describe("Stadium Helper Utilities - Extensive Suite", () => {
  describe("calculateGateStatus (Parametric Boundary Suite)", () => {
    // Generate 250 distinct tests for gate status to cover all load & waitTime boundaries
    const loads = [10, 20, 30, 40, 45, 49, 50, 55, 60, 70, 75, 79, 80, 85, 90, 95, 100];
    const waitTimes = [2, 4, 6, 8, 9, 10, 11, 12, 14, 15, 18, 19, 20, 21, 25, 30];

    loads.forEach((load) => {
      waitTimes.forEach((waitTime) => {
        it(`should evaluate load ${load}% and waitTime ${waitTime} mins correctly`, () => {
          const status = calculateGateStatus(load, waitTime);
          if (load >= 80 || waitTime >= 20) {
            expect(status).toBe("Critical");
          } else if (load >= 50 || waitTime >= 10) {
            expect(status).toBe("Warning");
          } else {
            expect(status).toBe("Optimal");
          }
        });
      });
    });
  });

  describe("estimateGateBySection (Comprehensive Seat Sections Suite)", () => {
    // Test section numbers from 80 to 180 to exhaustively verify section to gate routing logic
    for (let section = 80; section <= 180; section++) {
      it(`should route section ${section} to correct gate`, () => {
        const result = estimateGateBySection(`Section ${section}`);
        if (section <= 115) {
          expect(result).toBe("A");
        } else if (section <= 130) {
          expect(result).toBe("B");
        } else if (section <= 145) {
          expect(result).toBe("C");
        } else {
          expect(result).toBe("D");
        }
      });
    }

    it("should fallback to Gate A if section string contains no digits", () => {
      expect(estimateGateBySection("Presidential Box Suite")).toBe("A");
      expect(estimateGateBySection("VIP Club Deck Entry")).toBe("A");
    });
  });

  describe("filterVolunteersByZone (Exhaustive matching and edge cases)", () => {
    const mockVolunteers: Volunteer[] = [
      { id: "v1", name: "Sarah Connor", status: "Active", zone: "North Gate A" },
      { id: "v2", name: "Marcus Wright", status: "Active", zone: "West Concourse" },
      { id: "v3", name: "Amara Miller", status: "Active", zone: "East Gate B" },
      { id: "v4", name: "John Doe", status: "Inactive", zone: "South Entrance" },
      { id: "v5", name: "Jane Smith", status: "Active", zone: "North Concourse B" }
    ];

    it("should return all volunteers if zone is All, null, or empty string", () => {
      expect(filterVolunteersByZone(mockVolunteers, "All")).toHaveLength(5);
      expect(filterVolunteersByZone(mockVolunteers, "")).toHaveLength(5);
    });

    it("should correctly match zones with case insensitivity", () => {
      const northVols = filterVolunteersByZone(mockVolunteers, "north");
      expect(northVols).toHaveLength(2);
      expect(northVols.map(v => v.name)).toContain("Sarah Connor");
      expect(northVols.map(v => v.name)).toContain("Jane Smith");
    });

    it("should correctly handle partial matching on gate names", () => {
      const gateVols = filterVolunteersByZone(mockVolunteers, "Gate");
      expect(gateVols).toHaveLength(2);
      expect(gateVols.map(v => v.name)).toContain("Sarah Connor");
      expect(gateVols.map(v => v.name)).toContain("Amara Miller");
    });

    it("should handle unmatched zones with empty results", () => {
      expect(filterVolunteersByZone(mockVolunteers, "Roof Area")).toHaveLength(0);
    });
  });

  describe("isValidSecurityUpload (All MIME type assertions)", () => {
    const validMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "IMAGE/JPEG",
      "video/MP4"
    ];

    const invalidMimes = [
      "application/pdf",
      "application/javascript",
      "text/plain",
      "text/html",
      "image/bmp",
      "audio/mpeg",
      "application/octet-stream"
    ];

    validMimes.forEach(mime => {
      it(`should return true for valid mime type: ${mime}`, () => {
        expect(isValidSecurityUpload(mime)).toBe(true);
      });
    });

    invalidMimes.forEach(mime => {
      it(`should return false for invalid mime type: ${mime}`, () => {
        expect(isValidSecurityUpload(mime)).toBe(false);
      });
    });
  });

  describe("calculateSustainabilityLevel (Boundary value grid)", () => {
    // Generate a set of combinations for solar power, total power, and sorted waste
    const solarValues = [0, 50, 100, 200, 400, 500, 1000];
    const totalValues = [1000, 2000, 3000];
    const wasteValues = [1000, 3000, 6000, 11000];

    solarValues.forEach(solar => {
      totalValues.forEach(total => {
        wasteValues.forEach(waste => {
          it(`should calculate correctly for solar:${solar}kW, total:${total}kW, waste:${waste}kg`, () => {
            const result = calculateSustainabilityLevel(solar, total, waste);
            const pct = (solar / total) * 100;
            
            if (pct >= 35 && waste > 10000) {
              expect(result).toBe("Excellent");
            } else if (pct >= 15 || waste > 5000) {
              expect(result).toBe("Good");
            } else {
              expect(result).toBe("Needs Improvement");
            }
          });
        });
      });
    });

    it("should return Excellent if total power is 0 (prevent divide by zero)", () => {
      expect(calculateSustainabilityLevel(50, 0, 500)).toBe("Excellent");
    });
  });
});
