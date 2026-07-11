export interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  stage: string;
  stadium: string;
  stadiumFullName: string;
  date: string;
  time: string;
  venueInfo: string;
  
  // User-specific ticket data
  seat: string;
  ticketId: string;
  ticketType: string;
  gate: string;
  optimalGateId: string;
}

export const MATCHES_DATABASE: MatchData[] = [
  {
    id: "m1",
    homeTeam: "Argentina",
    awayTeam: "France",
    stage: "Group Stage",
    stadium: "MetLife Stadium, NY/NJ",
    stadiumFullName: "MetLife Stadium, New York/New Jersey",
    date: "June 11, 2026",
    time: "20:00 UTC",
    venueInfo: "Located in East Rutherford, New Jersey. Modern stadium with 82,500 capacity, hosting 8 matches including the final.",
    seat: "Section 114, Row M, Seat 8",
    ticketId: "#FIFA-2026-ARFR-08",
    ticketType: "VIP GA Lounge",
    gate: "Gate C (West Entry)",
    optimalGateId: "C"
  },
  {
    id: "m2",
    homeTeam: "Mexico",
    awayTeam: "USA",
    stage: "Group Stage",
    stadium: "Estadio Azteca, CDMX",
    stadiumFullName: "Estadio Azteca, Mexico City",
    date: "June 12, 2026",
    time: "18:00 UTC",
    venueInfo: "Iconic historic venue in Mexico City with 87,500 capacity, hosting 10 matches including the opening match.",
    seat: "Section 105, Row E, Seat 12",
    ticketId: "#FIFA-2026-MXUS-12",
    ticketType: "General Admission",
    gate: "Gate B (North Entry)",
    optimalGateId: "B"
  },
  {
    id: "m3",
    homeTeam: "Canada",
    awayTeam: "England",
    stage: "Group Stage",
    stadium: "BC Place, Vancouver",
    stadiumFullName: "BC Place, Vancouver",
    date: "June 14, 2026",
    time: "17:00 UTC",
    venueInfo: "Stunning retractable-roof stadium in Vancouver with 54,500 capacity, hosting 7 matches.",
    seat: "Section 130, Row A, Seat 4",
    ticketId: "#FIFA-2026-CAEN-04",
    ticketType: "Club Seats",
    gate: "Gate D (South Entry)",
    optimalGateId: "D"
  },
  {
    id: "m4",
    homeTeam: "USA",
    awayTeam: "England",
    stage: "Quarter-Finals",
    stadium: "MetLife Stadium, NY/NJ",
    stadiumFullName: "MetLife Stadium, New York/New Jersey",
    date: "July 04, 2026",
    time: "16:00 UTC",
    venueInfo: "Located in East Rutherford, New Jersey. Modern stadium with 82,500 capacity, hosting 8 matches including the final.",
    seat: "Section 140, Row K, Seat 18",
    ticketId: "#FIFA-2026-USEN-18",
    ticketType: "VIP Club Admission",
    gate: "Gate A (East Entry)",
    optimalGateId: "A"
  },
  {
    id: "m5",
    homeTeam: "Canada",
    awayTeam: "Brazil",
    stage: "Round of 16",
    stadium: "BC Place, Vancouver",
    stadiumFullName: "BC Place, Vancouver",
    date: "June 28, 2026",
    time: "19:00 UTC",
    venueInfo: "Stunning retractable-roof stadium in Vancouver with 54,500 capacity, hosting 7 matches.",
    seat: "Section 114, Row M, Seat 8",
    ticketId: "#FIFA-2026-CABR-08",
    ticketType: "VIP Club Admission",
    gate: "Gate C (West Entry)",
    optimalGateId: "C"
  },
  {
    id: "m6",
    homeTeam: "Mexico",
    awayTeam: "Germany",
    stage: "Opening Match",
    stadium: "Estadio Azteca, CDMX",
    stadiumFullName: "Estadio Azteca, Mexico City",
    date: "June 11, 2026",
    time: "15:00 UTC",
    venueInfo: "Iconic historic venue in Mexico City with 87,500 capacity, hosting 10 matches including the opening match.",
    seat: "Section 105, Row E, Seat 12",
    ticketId: "#FIFA-2026-MXGE-12",
    ticketType: "VIP GA Lounge",
    gate: "Gate B (North Entry)",
    optimalGateId: "B"
  }
];

export function getMatchBySlugOrId(idOrName: string): MatchData {
  const clean = idOrName.toLowerCase();
  
  // Try ID first
  const byId = MATCHES_DATABASE.find(m => m.id.toLowerCase() === clean);
  if (byId) return byId;
  
  // Try matching teams
  const byTeams = MATCHES_DATABASE.find(m => {
    const combined = `${m.homeTeam} vs ${m.awayTeam}`.toLowerCase();
    return combined.includes(clean) || clean.includes(m.homeTeam.toLowerCase());
  });
  
  return byTeams || MATCHES_DATABASE[0];
}
