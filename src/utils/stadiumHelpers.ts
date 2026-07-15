export interface GateStatus {
  id: string;
  load: number;
  waitTime: number;
}

/**
 * Calculates the status label for a gate based on its load and wait time.
 */
export function calculateGateStatus(load: number, waitTime: number): "Optimal" | "Warning" | "Critical" {
  if (load >= 80 || waitTime >= 20) {
    return "Critical";
  }
  if (load >= 50 || waitTime >= 10) {
    return "Warning";
  }
  return "Optimal";
}

/**
 * Filters stadium volunteers by their active zone and current status.
 */
export interface Volunteer {
  id: string;
  name: string;
  status: string;
  zone: string;
}

export function filterVolunteersByZone(volunteers: Volunteer[], zone: string): Volunteer[] {
  if (!zone || zone === "All") return volunteers;
  return volunteers.filter(v => v.zone.toLowerCase().includes(zone.toLowerCase()));
}

/**
 * Security helper: Validates if a file type/mime-type is acceptable for stadium security uploads.
 * Accepts standard image formats and video clips.
 */
export function isValidSecurityUpload(mimeType: string): boolean {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ];
  return allowedMimeTypes.includes(mimeType.toLowerCase());
}

/**
 * Estimates the optimal gate ID for entry based on the fan's seat section number.
 * Section 100-115 -> Gate A
 * Section 116-130 -> Gate B
 * Section 131-145 -> Gate C
 * Section 146+ -> Gate D
 */
export function estimateGateBySection(seatSection: string): "A" | "B" | "C" | "D" {
  const match = seatSection.match(/\d+/);
  if (!match) return "A";
  const sectionNum = parseInt(match[0], 10);
  if (sectionNum <= 115) return "A";
  if (sectionNum <= 130) return "B";
  if (sectionNum <= 145) return "C";
  return "D";
}

/**
 * Sustainability performance level based on solar vs total power and recycling rate.
 */
export function calculateSustainabilityLevel(solarKw: number, totalKw: number, wasteSortedKg: number): "Excellent" | "Good" | "Needs Improvement" {
  if (totalKw <= 0) return "Excellent";
  const solarPct = (solarKw / totalKw) * 100;
  if (solarPct >= 35 && wasteSortedKg > 10000) {
    return "Excellent";
  }
  if (solarPct >= 15 || wasteSortedKg > 5000) {
    return "Good";
  }
  return "Needs Improvement";
}
