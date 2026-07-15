import { describe, it, expect } from "vitest";
import { getMatchBySlugOrId, MATCHES_DATABASE } from "./matches";

describe("getMatchBySlugOrId", () => {
  it("should find match by ID regardless of casing", () => {
    const match = getMatchBySlugOrId("M1");
    expect(match).toBeDefined();
    expect(match.id).toBe("m1");
    expect(match.homeTeam).toBe("Argentina");
  });

  it("should find match by team name", () => {
    const match = getMatchBySlugOrId("France");
    expect(match).toBeDefined();
    expect(match.id).toBe("m1");
  });

  it("should return the first match by default if nothing is found", () => {
    const match = getMatchBySlugOrId("Unknown Team");
    expect(match).toBeDefined();
    expect(match.id).toBe("m1"); // first match is default
  });

  it("should contain all match details for Mexico", () => {
    const match = getMatchBySlugOrId("m2");
    expect(match.stadiumFullName).toContain("Mexico City");
  });
});
