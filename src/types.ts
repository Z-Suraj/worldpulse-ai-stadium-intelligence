export interface Stadium {
  name: string;
  capacity: number;
  attendance: number;
  country: string;
  status: string;
}

export interface Gate {
  id: string;
  name: string;
  load: number; // 0 - 100
  queueCount: number;
  waitTime: number; // minutes
  status: "Optimal" | "Warning" | "Critical";
}

export interface Concession {
  id: string;
  name: string;
  zone: string;
  queueTime: number;
  popular: string;
  status: "Optimal" | "Busy" | "Overloaded";
}

export interface TransitMetric {
  status: string;
  frequencyMins: number;
  waitTimeMins: number;
  load: number;
  statusLabel: string;
}

export interface Transport {
  metro: TransitMetric;
  shuttle: TransitMetric;
  rideshare: TransitMetric;
  parkingC: TransitMetric & { occupancy: number };
}

export interface Sustainability {
  energyConsumptionKw: number;
  solarPowerGenerationKw: number;
  waterRecycledGallons: number;
  wasteSortedKg: number;
  co2SavedTons: number;
  sustainabilityScore: number;
}

export interface Incident {
  id: string;
  title: string;
  location: string;
  severity: "Low" | "Medium" | "High";
  status: "Active" | "Resolved";
  time: string;
  description: string;
}

export interface Volunteer {
  id: string;
  name: string;
  status: "Active" | "On Break" | "Standby";
  task: string;
  zone: string;
}

export interface StadiumState {
  activeStadium: string;
  capacity: number;
  activeAttendance: number;
  stadiums: Stadium[];
  gates: Gate[];
  concessions: Concession[];
  transport: Transport;
  sustainability: Sustainability;
  incidents: Incident[];
  volunteers: Volunteer[];
  evacuationSimulating: boolean;
}

export type UserRole = "Fan" | "Volunteer" | "Operations" | "Organizer";

export interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  suggestedActions?: string[];
}
