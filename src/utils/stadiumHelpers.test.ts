import { describe, it, expect } from "vitest";
import {
  calculateGateStatus,
  filterVolunteersByZone,
  isValidSecurityUpload,
  estimateGateBySection,
  calculateSustainabilityLevel,
  Volunteer
} from "./stadiumHelpers";

describe("Stadium Helper Utilities", () => {
  describe("calculateGateStatus", () => {
    it("should return Critical when load is high or wait time is long", () => {
      expect(calculateGateStatus(85, 5)).toBe("Critical");
      expect(calculateGateStatus(10, 25)).toBe("Critical");
    });

    it("should return Warning when load or wait time is moderately high", () => {
      expect(calculateGateStatus(60, 5)).toBe("Warning");
      expect(calculateGateStatus(20, 15)).toBe("Warning");
    });

    it("should return Optimal when load and wait time are low", () => {
      expect(calculateGateStatus(30, 5)).toBe("Optimal");
    });
  });

  describe("filterVolunteersByZone", () => {
    const mockVolunteers: Volunteer[] = [
      { id: "1", name: "Sarah", status: "Active", zone: "East Gate" },
      { id: "2", name: "Marcus", status: "Active", zone: "West Concourse" },
      { id: "3", name: "Amara", status: "Active", zone: "East Concourse" }
    ];

    it("should return all volunteers if zone is All or empty", () => {
      expect(filterVolunteersByZone(mockVolunteers, "All")).toHaveLength(3);
      expect(filterVolunteersByZone(mockVolunteers, "")).toHaveLength(3);
    });

    it("should correctly filter by matching zone text", () => {
      const eastVols = filterVolunteersByZone(mockVolunteers, "East");
      expect(eastVols).toHaveLength(2);
      expect(eastVols.map(v => v.name)).toContain("Sarah");
      expect(eastVols.map(v => v.name)).toContain("Amara");
    });

    it("should return an empty array if no zones match", () => {
      expect(filterVolunteersByZone(mockVolunteers, "North Transit")).toHaveLength(0);
    });
  });

  describe("isValidSecurityUpload", () => {
    it("should return true for valid image and video formats", () => {
      expect(isValidSecurityUpload("image/jpeg")).toBe(true);
      expect(isValidSecurityUpload("image/png")).toBe(true);
      expect(isValidSecurityUpload("video/mp4")).toBe(true);
    });

    it("should return false for unsupported mime types", () => {
      expect(isValidSecurityUpload("application/pdf")).toBe(false);
      expect(isValidSecurityUpload("text/plain")).toBe(false);
      expect(isValidSecurityUpload("image/bmp")).toBe(false);
    });
  });

  describe("estimateGateBySection", () => {
    it("should map sections below 115 to Gate A", () => {
      expect(estimateGateBySection("Section 105")).toBe("A");
      expect(estimateGateBySection("114")).toBe("A");
    });

    it("should map sections 116-130 to Gate B", () => {
      expect(estimateGateBySection("Section 124")).toBe("B");
      expect(estimateGateBySection("130")).toBe("B");
    });

    it("should map sections 131-145 to Gate C", () => {
      expect(estimateGateBySection("Section 140")).toBe("C");
    });

    it("should map sections above 145 to Gate D", () => {
      expect(estimateGateBySection("Section 165")).toBe("D");
    });

    it("should fallback to Gate A if no number is present", () => {
      expect(estimateGateBySection("Club Lounge")).toBe("A");
    });
  });

  describe("calculateSustainabilityLevel", () => {
    it("should return Excellent with high solar percentage and high waste sorted", () => {
      expect(calculateSustainabilityLevel(1500, 4000, 12000)).toBe("Excellent");
    });

    it("should return Good with moderate parameters", () => {
      expect(calculateSustainabilityLevel(800, 4000, 6000)).toBe("Good");
    });

    it("should return Needs Improvement with low metrics", () => {
      expect(calculateSustainabilityLevel(100, 4000, 1000)).toBe("Needs Improvement");
    });
  });
});
