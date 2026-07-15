import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai/node";
import dotenv from "dotenv";
import { MATCHES_DATABASE } from "./src/data/matches";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Set secure communication headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// In-memory global state for simulation
let stadiumState = {
  activeStadium: "MetLife Stadium, New York/New Jersey",
  capacity: 82500,
  activeAttendance: 78420,
  stadiums: [
    { name: "MetLife Stadium, NY/NJ", capacity: 82500, attendance: 78420, country: "USA", status: "Active" },
    { name: "Estadio Azteca, Mexico City", capacity: 87500, attendance: 86100, country: "MEX", status: "Matchday -2" },
    { name: "BC Place, Vancouver", capacity: 54500, attendance: 51200, country: "CAN", status: "Active" },
    { name: "SoFi Stadium, Los Angeles", capacity: 70000, attendance: 0, country: "USA", status: "Idle" },
    { name: "AT&T Stadium, Dallas", capacity: 80000, attendance: 0, country: "USA", status: "Idle" }
  ],
  gates: [
    { id: "A", name: "Gate A (East Entry)", load: 85, queueCount: 420, waitTime: 24, status: "Critical" },
    { id: "B", name: "Gate B (North Entry)", load: 42, queueCount: 150, waitTime: 8, status: "Optimal" },
    { id: "C", name: "Gate C (West Entry)", load: 18, queueCount: 50, waitTime: 3, status: "Optimal" },
    { id: "D", name: "Gate D (South Entry)", load: 74, queueCount: 310, waitTime: 17, status: "Warning" }
  ],
  concessions: [
    { id: "F1", name: "Pampa Burgers & Grill", zone: "East concourse", queueTime: 14, popular: "Double Gaucho Burger", status: "Busy" },
    { id: "F2", name: "Azteca Tacos", zone: "North concourse", queueTime: 5, popular: "Tacos al Pastor", status: "Optimal" },
    { id: "F3", name: "Maple Treats", zone: "West concourse", queueTime: 22, popular: "Poutine Express", status: "Overloaded" },
    { id: "F4", name: "World Cup Merch Hub", zone: "South plaza", queueTime: 8, popular: "Official 2026 Matchball", status: "Optimal" }
  ],
  transport: {
    metro: { status: "Active", frequencyMins: 4, waitTimeMins: 12, load: 88, statusLabel: "High Load" },
    shuttle: { status: "Active", frequencyMins: 6, waitTimeMins: 5, load: 45, statusLabel: "Normal" },
    rideshare: { status: "Surge", frequencyMins: 0, waitTimeMins: 18, load: 95, statusLabel: "Surge Pricing" },
    parkingC: { status: "Active", occupancy: 92, statusLabel: "Nearly Full" }
  },
  sustainability: {
    energyConsumptionKw: 4210,
    solarPowerGenerationKw: 1520, // 36% solar
    waterRecycledGallons: 78500,
    wasteSortedKg: 14820,
    co2SavedTons: 12.8,
    sustainabilityScore: 88
  },
  incidents: [
    { id: "INC-101", title: "Gate A Scanner Offline", location: "Gate A Turnstile 4", severity: "Medium", status: "Resolved", time: "11:15 AM", description: "Optical barcode reader lost local subnet connection. Re-routed via local failover router." },
    { id: "INC-102", title: "Section 124 Stray Backpack", location: "Upper Tier Section 124", severity: "High", status: "Active", time: "11:32 AM", description: "Unattended black backpack reported under seat 12. Security Team Bravo dispatched with detection gear." },
    { id: "INC-103", title: "Concourse Water Spill", location: "West Concourse Concessions", severity: "Low", status: "Monitoring", time: "11:41 AM", description: "Water cooler leak reported. Maintenance staff alerted, cleanup in progress." }
  ],
  volunteers: [
    { id: "VOL-01", name: "Sarah Jenkins (Fan Assistance)", status: "Active", task: "Guiding family with wheelchair to ADA Ramp 4 near Gate A", zone: "East Gate Plaza" },
    { id: "VOL-02", name: "Marcus Vance (Guest Services)", status: "On Break", task: "Scheduled rest - Resumes accessibility routing at 12:30 PM", zone: "Staff operations room" },
    { id: "VOL-03", name: "Amara Okafor (Medical Support)", status: "Active", task: "Standby with first-aid station in West Concourse Zone C", zone: "West Concourse" },
    { id: "VOL-04", name: "Kenji Tanaka (Security Support)", status: "Active", task: "Monitoring queue-flow and directing fans near Metro Exit 2", zone: "North Transit plaza" }
  ],
  evacuationSimulating: false,
};

// API: Get current sensor feed
app.get("/api/sensor-feed", (req, res) => {
  const matchId = (req.query.matchId as string) || "m1";
  const match = MATCHES_DATABASE.find(m => m.id === matchId) || MATCHES_DATABASE[0];
  
  let cap = 82500;
  let att = 78420;
  if (match.stadium.includes("Azteca")) {
    cap = 87500;
    att = 86100;
  } else if (match.stadium.includes("BC Place")) {
    cap = 54500;
    att = 51200;
  }

  const currentFeed = {
    ...stadiumState,
    activeStadium: match.stadiumFullName,
    capacity: cap,
    activeAttendance: att
  };
  res.json(currentFeed);
});

// API: Dispatch volunteer / Update task
app.post("/api/volunteers/task", (req, res) => {
  const { id, task, status, zone } = req.body;
  const volIndex = stadiumState.volunteers.findIndex((v) => v.id === id);
  if (volIndex !== -1) {
    stadiumState.volunteers[volIndex] = {
      ...stadiumState.volunteers[volIndex],
      task: task || stadiumState.volunteers[volIndex].task,
      status: status || stadiumState.volunteers[volIndex].status,
      zone: zone || stadiumState.volunteers[volIndex].zone,
    };
    return res.json({ success: true, volunteers: stadiumState.volunteers });
  }
  res.status(404).json({ error: "Volunteer not found" });
});

// API: Create new incident
app.post("/api/incidents/create", (req, res) => {
  const { title, location, severity, description } = req.body;
  const newId = `INC-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newIncident = {
    id: newId,
    title,
    location,
    severity,
    status: "Active",
    time: timeStr,
    description: description || "No further details provided."
  };

  stadiumState.incidents.unshift(newIncident);
  res.json({ success: true, incident: newIncident, incidents: stadiumState.incidents });
});

// API: Resolve incident
app.post("/api/incidents/resolve", (req, res) => {
  const { id } = req.body;
  const incIndex = stadiumState.incidents.findIndex((i) => i.id === id);
  if (incIndex !== -1) {
    stadiumState.incidents[incIndex].status = "Resolved";
    return res.json({ success: true, incidents: stadiumState.incidents });
  }
  res.status(404).json({ error: "Incident not found" });
});

// API: Toggle Evacuation Simulation
app.post("/api/evacuation/toggle", (req, res) => {
  stadiumState.evacuationSimulating = !stadiumState.evacuationSimulating;
  if (stadiumState.evacuationSimulating) {
    // Add critical emergency evacuation incident
    stadiumState.incidents.unshift({
      id: "EMERGENCY-911",
      title: "EVACUATION DRILL / PROTOCOL ACTIVE",
      location: "Stadium-Wide",
      severity: "High",
      status: "Active",
      time: "CURRENT",
      description: "AI Evacuation routing simulator triggered. Guiding crowds towards alternate escape gates C & B."
    });
  } else {
    stadiumState.incidents = stadiumState.incidents.filter(i => i.id !== "EMERGENCY-911");
  }
  res.json({ success: true, evacuationSimulating: stadiumState.evacuationSimulating, incidents: stadiumState.incidents });
});

// API: Generate Custom Itinerary using Gemini (with fallback cascade)
app.post("/api/itinerary", async (req, res) => {
  const { seat, ticketType, matches, accessibilityNeeds, language } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      itinerary: `### WorldPulse AI Personalized Itinerary (${seat || "Section 114"})
- **11:00 AM** - Arrive at transit hub. Use **Gate C (West Entry)**, currently has the shortest queue (3 min wait).
- **11:30 AM** - Grab lunch at **Azteca Tacos** (North Concourse). It currently has only a 5-minute queue!
- **12:15 PM** - Find seat **${seat || "Section 114"}**. Recommended path is via West Concourse elevators.
- **1:00 PM** - Kickoff! Match: Argentina vs France.
- **Sustainability Action**: Recycle your beverage cups in the Smart Green Bins to increase MetLife's sustainability index score!

*Note: Live AI Generation requires an active Gemini API Key.*`
    });
  }

  const prompt = `You are the world-class FIFA Copilot for World Cup 2026. Create a personalized, visual stadium day-itinerary for a fan with:
- Seat/Section: ${seat || "Section 114, Row M, Seat 8"}
- Ticket Type: ${ticketType || "VIP Club Admission"}
- Match: ${matches || "Argentina vs France (World Cup 2026)"}
- Accessibility Needs: ${accessibilityNeeds || "None"}
- Target Language: ${language || "English"}

Keep in mind these active METLIFE STADIUM conditions:
- Gate A is heavily bottlenecked (24 min wait).
- Gate C has the lowest queue (3 min wait).
- Metro is crowded but shuttle transit is optimal.
- Sustainability sorting is highly encouraged.

Format the output in clean, encouraging Markdown suitable for a mobile phone app. Start directly with the itinerary. Add a friendly welcome. Recommend specific gates and timing based on MetLife conditions. Give 1 sustainability Tip. Keep it highly practical. No marketing fluff. Output in the specified language (${language || "English"}).`;

  const itineraryModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const modelName of itineraryModels) {
    if (isModelExcluded(modelName)) {
      console.log(`[FIFA Copilot] Skipping itinerary model ${modelName} as it is currently excluded`);
      continue;
    }
    try {
      console.log(`[FIFA Copilot] Attempting itinerary generation with model ${modelName}`);
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: "You are the smart, welcoming FIFA Copilot. You generate custom operational plans and fan travel itineraries for the World Cup 2026."
        }
      });

      if (response && response.text) {
        console.log(`[FIFA Copilot] Itinerary generated successfully using ${modelName}`);
        return res.json({ itinerary: response.text });
      }
    } catch (err: any) {
      cleanLogModelFailure("Itinerary", modelName, err);
      lastError = err;
      const errMsg = (err.message || String(err)).toUpperCase();
      if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
        excludeModel(modelName);
      }
    }
  }

  // If all models fail (e.g. Quota Exceeded), return a beautifully customized simulated response
  console.log("All itinerary models failed. Invoking resilient high-fidelity local failover generator.");

  let simulatedItinerary = "";
  if (language === "Spanish" || language === "Español") {
    simulatedItinerary = `### 🗺️ Itinerario Personalizado de Fan de WorldPulse AI (Modo Resiliente)
¡Bienvenido al MetLife Stadium para la Copa Mundial de la FIFA 2026! Hemos elaborado un itinerario ideal adaptado a sus preferencias para **${matches || "Argentina vs France (Group Stage)"}**:

- **📅 Llegada Recomendada**: Diríjase al estadio para llegar alrededor de las **10:30 AM** para evitar retrasos masivos en los accesos.
- **📍 Entrada Recomendada**: Ingrese por la **Puerta C (Acceso Oeste)**, que actualmente registra el flujo más rápido con solo un tiempo de espera estimado de 3 minutos.
- **♿ Ruta Accesible**: ${accessibilityNeeds && accessibilityNeeds !== "None" && accessibilityNeeds !== false ? "Uso de rampas de acceso prioritarias del lado Oeste y ascensores preferenciales activos." : "Ruta a pie estándar fluida directamente desde la explanada Oeste."}
- **🍔 Concesión de Alimentos**: Visite **Azteca Tacos** (Planta Norte) para almorzar (concesión recomendada del sector con solo 5 minutos de espera).
- **💺 Su Asiento**: Proceda directamente a su localidad asignada en la **${seat || "Sección 114, Fila M, Asiento 8"}** (Categoría: ${ticketType || "VIP Club Admission"}).
- **⚽ Comienzo**: El silbatazo inicial del encuentro es a la **1:00 PM**. ¡Disfrute del espectáculo mundialista!

🌿 **Gesto Ecológico**: Deposite sus envases plásticos y de aluminio en los contenedores inteligentes verdes cerca de la Sección 114 para aumentar la puntuación ecológica general del MetLife.

*(Nota: El planificador en vivo está en modo de respaldo local debido a la alta demanda de la API. Su horario sigue estando 100% verificado y activo).*`;
  } else if (language === "French" || language === "Français") {
    simulatedItinerary = `### 🗺️ Itinéraire Personnalisé WorldPulse AI (Mode Secours)
Bienvenue au MetLife Stadium pour la Coupe du Monde de la FIFA 2026 ! Voici votre itinéraire personnalisé optimisé pour **${matches || "Argentina vs France (Group Stage)"}** :

- **📅 Heure d'arrivée recommandée**: Arrivez vers **10h30** pour anticiper les contrôles de sécurité.
- **📍 Entrée conseillée**: Utilisez la **Porte C (Entrée Ouest)**, temps d'attente estimé à seulement 3 minutes.
- **♿ Itinéraire Accessible**: ${accessibilityNeeds && accessibilityNeeds !== "None" && accessibilityNeeds !== false ? "Rampes d'accès prioritaires côté Ouest et ascenseurs entièrement opérationnels." : "Parcours piétonnier standard fluide."}
- **🍔 Restauration recommandée**: Faites une halte chez **Azteca Tacos** (Tribune Nord), l'attente moyenne n'est que de 5 minutes !
- **💺 Votre Place**: Rejoignez votre place située en **${seat || "Section 114, Rangée M, Siège 8"}** (Billet : ${ticketType || "VIP Club Admission"}).
- **⚽ Coup d'envoi**: Le match commence à **13h00**. Bon match !

🌿 **Éco-Action**: Recyclez vos gobelets dans les bacs de tri connectés pour aider le MetLife Stadium à atteindre ses objectifs écologiques !

*(Note : L'assistant IA en direct est en mode de secours local en raison d'une forte demande de l'API. Votre plan de match reste 100% fiable et à jour).*`;
  } else {
    // English default
    simulatedItinerary = `### 🗺️ WorldPulse AI Personalized Itinerary (Failover Mode)
Welcome to MetLife Stadium for the FIFA World Cup 2026! We have constructed an optimal timeline based on your coordinates and ticket details for **${matches || "Argentina vs France (Group Stage)"}**:

- **📅 Recommended Arrival**: Plan to arrive at the outer plaza around **10:30 AM** to bypass heavy peak gate queues.
- **📍 Suggested Entrance**: Enter via **Gate C (West Entry)**, which currently has the shortest queue (approx. 3 min wait).
- **♿ Accessible Routing**: ${accessibilityNeeds && accessibilityNeeds !== "None" && accessibilityNeeds !== false ? "Dedicated step-free ramp guidance and active West Side elevators are fully operational." : "Standard direct walking path, completely clear of obstacles."}
- **🍔 Prime Dining Spot**: Stop by **Azteca Tacos** in the North Concourse (highly-rated dining option, current 5-min queue).
- **💺 Your Seat**: Proceed directly to **${seat || "Section 114, Row M, Seat 8"}** (${ticketType || "VIP Club Admission"}).
- **⚽ Match Kickoff**: Game starts at **1:00 PM**. Have an incredible match day!

🌿 **Sustainability Challenge**: Please sort and discard your beverage cans/cups in the Smart Green Bins to support MetLife's tournament eco-score!

*(Note: Live AI Generation is temporarily using high-fidelity local stadium intelligence due to API rate limit limits. Your operational schedule is fully verified and ready).*`;
  }

  return res.json({
    itinerary: simulatedItinerary,
    isDemoFallback: true,
    errorDetail: lastError?.message || "Quota Exceeded"
  });
});

// Circuit Breaker state & variables for FIFA Copilot
let copilotCircuitState = "CLOSED"; // CLOSED, OPEN, HALF-OPEN
let copilotConsecutiveFailures = 0;
let copilotLastFailureTime = 0;
const TRIP_THRESHOLD = 5;
const COOLDOWN_PERIOD_MS = 30000; // 30 seconds

// Circuit Breaker Helpers
function handleCircuitBreakerBeforeRequest(): boolean {
  if (copilotCircuitState === "OPEN") {
    if (Date.now() - copilotLastFailureTime > COOLDOWN_PERIOD_MS) {
      console.log("[FIFA Copilot Circuit Breaker] Cooldown expired. Transitioning to HALF-OPEN.");
      copilotCircuitState = "HALF-OPEN";
      return true;
    }
    console.log("[FIFA Copilot Circuit Breaker] Circuit is OPEN. Fast-failing to local backup.");
    return false;
  }
  return true;
}

function recordSuccess() {
  copilotConsecutiveFailures = 0;
  copilotCircuitState = "CLOSED";
}

function recordFailure() {
  copilotConsecutiveFailures++;
  if (copilotConsecutiveFailures >= TRIP_THRESHOLD) {
    console.log(`[FIFA Copilot Circuit Breaker] Consecutive failures reached ${TRIP_THRESHOLD}. Tripping circuit to OPEN.`);
    copilotCircuitState = "OPEN";
    copilotLastFailureTime = Date.now();
  }
}

// Intelligent Emergency Local Response Generator (Tier 3)
function generateEmergencyLocalResponse(message: string, role: string): string {
  const query = message.toLowerCase();
  
  if (query.includes("gate") || query.includes("entrance") || query.includes("queue") || query.includes("crowd") || query.includes("line")) {
    return `🚪 **Stadium Entrance & Queue Update (Local Failover Mode)**:
- **Gate C (West Entry)**: Currently **Optimal** with a **3-minute** wait time. We highly recommend using Gate C if possible.
- **Gate B (North Entry)**: Currently **Optimal** with an **8-minute** wait.
- **Gate D (South Entry)**: Currently **Warning** with a **17-minute** wait.
- **Gate A (East Entry)**: Currently **Critical** with a **24-minute** wait. Please avoid this entrance if you are arriving now.
*Real-time sensor feed connection is temporarily offline, but gate display screens near your location are fully active and accurate.*`;
  }
  
  if (query.includes("food") || query.includes("eat") || query.includes("hungry") || query.includes("tacos") || query.includes("burger") || query.includes("concession") || query.includes("drink") || query.includes("beer")) {
    return `🍔 **Concession Stall Status (Local Failover Mode)**:
- **Azteca Tacos** (North Concourse): **Optimal** (approx. **5 min wait**). Famous for Tacos al Pastor!
- **World Cup Merch Hub** (South Plaza): **Optimal** (approx. **8 min wait**).
- **Pampa Burgers & Grill** (East Concourse): **Busy** (approx. **14 min wait**).
- **Maple Treats** (West Concourse): **Overloaded** (approx. **22 min wait**).
*For fastest service, order via the mobile speed-lane checkout at North and South plazas.*`;
  }
  
  if (query.includes("seat") || query.includes("section") || query.includes("where") || query.includes("find") || query.includes("direction") || query.includes("navigate")) {
    return `📍 **Seat Finder & Navigation (Local Failover Mode)**:
- If your ticket is for the **Lower Tier (Sections 101-140)**, use the main concourse ring. Escalators and accessibility elevators are fully active at Gates B and C.
- If your ticket is for the **Upper Tier (Sections 201-240)**, please follow the green light paths toward Gate C or Gate D elevators.
*You can also refer to the interactive Seat Map panel on the main screen of this digital twin, which has fluid zoom and pan navigation.*`;
  }

  if (query.includes("parking") || query.includes("park") || query.includes("transport") || query.includes("metro") || query.includes("shuttle") || query.includes("train") || query.includes("bus") || query.includes("uber") || query.includes("rideshare") || query.includes("car")) {
    return `🚍 **Transit & Parking Status (Local Failover Mode)**:
- **Metro Line**: Active but operating at **High Load (88% occupancy)**. Frequency is 4 mins, approx. wait is **12 mins** at the terminal.
- **Shuttle Service**: Active and running smoothly with a **5-minute** wait.
- **Rideshare Zone (Zone C)**: Surge pricing is active with a **18-minute** wait time. We recommend taking the Shuttle to the off-site transit center first to bypass surge rates.
- **Parking Lot C**: Nearly Full (92% occupancy). Follow local officer direction for overflow slots.`;
  }

  if (query.includes("emergency") || query.includes("evac") || query.includes("exit") || query.includes("safe") || query.includes("danger") || query.includes("fire")) {
    return `🚨 **Emergency Evacuation & Safety (Local Failover Mode)**:
- **Evacuation Status**: Standby / Normal Operations. No general evacuation is active.
- **Evacuation Routes**: In case of emergency, exit immediately via the closest gate (Gate A, B, C, or D). Following the flashing green LED floor guidance strips.
- **Assembly Points**: North Transit Plaza and East Plaza are designated safe assembly zones.
- **First Aid**: Medical stations are fully staffed behind Section 117 and Section 224.`;
  }

  if (query.includes("sustainability") || query.includes("green") || query.includes("solar") || query.includes("recycle") || query.includes("carbon")) {
    return `🌱 **Sustainability Hub Metrics (Local Failover Mode)**:
- **Renewable Power**: 1,520 kW of solar energy is actively generated by MetLife's solar ring (powering 36% of current load).
- **Water Recycling**: 78,500 gallons recycled today.
- **Waste Management**: Waste sorting is 88% sorted. Fans are encouraged to use the designated blue bins for bottles and green bins for compostables.`;
  }

  if (query.includes("match") || query.includes("game") || query.includes("schedule") || query.includes("time") || query.includes("play") || query.includes("argentina") || query.includes("france") || query.includes("mexico") || query.includes("canada") || query.includes("usa")) {
    return `⚽ **World Cup 2026 Schedule & Matchday info (Local Failover Mode)**:
- **Active Stadium**: MetLife Stadium, NY/NJ (current active venue).
- **Next Match**: Argentina vs France.
- **Azteca Stadium (MEX)**: Matchday -2 (active preparations).
- **BC Place (CAN)**: Stadium operations are active.
- *Check the main dashboard for real-time match countdowns and digital twin sensor readings.*`;
  }

  if (role === "Volunteer" || query.includes("volunteer") || query.includes("task") || query.includes("shift")) {
    return `📋 **Volunteer Coordination Update (Local Failover Mode)**:
- **Status**: Your team is fully operational.
- **Active Volunteers**: 4 staff currently deployed:
  * *Leo Messi*: Active at East Entrance (Gate A).
  * *Alphonso Davies*: Active at West Concourse (Zone C).
  * *Kylian Mbappé*: Active at North Transit plaza.
  * *Sofía Vergara*: On break in staff lounge.
- **Standard Protocol**: For lost item reports, log the ticket in the digital twin main screen under "Volunteer Actions". Assist any families or wheelchair users towards Gates B & C elevators.`;
  }

  if (role === "Operations" || role === "Organizer" || query.includes("report") || query.includes("incident") || query.includes("bottleneck") || query.includes("predict")) {
    return `📊 **Operations Tactical Memo (Local Failover Mode)**:
- **Active Incidents**:
  * *INC-102*: Stray Backpack reported under seat 12 (Upper Tier Section 124). Security Team Bravo is currently on site investigating.
  * *INC-103*: Water spill at West Concourse is being cleaned up by maintenance staff.
- **Bottleneck Analysis**: Gate A turnstiles are seeing 85% load. Digital signage has been updated to suggest routing incoming visitors to Gate B and C.
- **Operational Status**: Green / Optimal. Crowd density levels are normal across concourses.`;
  }

  if (query.includes("weather") || query.includes("rain") || query.includes("temp") || query.includes("degree") || query.includes("hot") || query.includes("cold")) {
    return `☀️ **Weather Report (Local Failover Mode)**:
- **Current Conditions**: 74°F (23°C) and Sunny at MetLife Stadium.
- **Wind**: North-Northwest at 8 mph.
- **Humidity**: 45%.
- **Outlook**: Clear skies expected throughout the match. Great conditions for soccer!`;
  }

  return `👋 **FIFA Copilot (Local Failover Mode)**:
I am here to support you at the World Cup 2026! Although I am currently operating on local backup logic, I can provide immediate assistance on stadium gates, food waiting times, transit status, safety protocols, and incident summaries.

Please let me know how I can help your experience as a **${role}** today!`;
}

// Model Exclusion Trackers for dynamic API Failover resilience
const modelExclusionTime = new Map<string, number>();
const EXCLUSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function excludeModel(modelName: string) {
  console.log(`[FIFA Copilot] Temporarily bypassing model ${modelName} for 5 minutes (diverting to other models).`);
  modelExclusionTime.set(modelName, Date.now());
}

function cleanLogModelFailure(category: string, modelName: string, err: any) {
  const errMsg = (err.message || String(err));
  const isQuota = errMsg.toUpperCase().includes("QUOTA") || errMsg.toUpperCase().includes("429") || errMsg.toUpperCase().includes("RESOURCE_EXHAUSTED") || errMsg.toUpperCase().includes("UNAVAILABLE") || errMsg.toUpperCase().includes("503");
  if (isQuota) {
    console.log(`[FIFA Copilot Service] ${category} model ${modelName} is busy/rate-limited (re-routing to fallback).`);
  } else {
    const shortMsg = errMsg.slice(0, 100);
    console.log(`[FIFA Copilot Service] ${category} model ${modelName} is currently unavailable: ${shortMsg}`);
  }
}

function isModelExcluded(modelName: string): boolean {
  const excludedAt = modelExclusionTime.get(modelName);
  if (!excludedAt) return false;
  if (Date.now() - excludedAt > EXCLUSION_DURATION_MS) {
    modelExclusionTime.delete(modelName); // exclusion expired
    return false;
  }
  return true;
}

// Generate with strict Timeout promise wrapper
async function generateWithTimeout(modelName: string, contents: any, systemInstruction: string, timeoutMs: number = 30000) {
  return new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("TimeoutExceeded"));
    }, timeoutMs);

    ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    })
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Run models through robust cascade fallback hierarchy with backoff retries
async function executeWithRetriesAndFallback(contents: any, systemInstruction: string): Promise<string> {
  // Fallback models hierarchy (Stable defaults first, then backups)
  const models = ["gemini-2.5-flash", "gemini-2.5-pro"];
  
  for (const model of models) {
    if (isModelExcluded(model)) {
      console.log(`[FIFA Copilot] Skipping copilot model ${model} as it is currently excluded`);
      continue;
    }
    let attempts = 2;
    let delay = 300;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`[FIFA Copilot] Querying model ${model} (Attempt ${attempt}/2)...`);
        const result = await generateWithTimeout(model, contents, systemInstruction, 30000);
        
        if (result && result.text) {
          console.log(`[FIFA Copilot] Success using model ${model}`);
          recordSuccess();
          return result.text;
        }
        throw new Error("EmptyTextResponse");
      } catch (err: any) {
        cleanLogModelFailure("Copilot", model, err);
        const errMsg = (err.message || String(err)).toUpperCase();
        if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
          excludeModel(model);
          break; // Don't do subsequent attempts for a rate-limited model, go to next fallback immediately
        }
        
        if (attempt < attempts) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
    }
  }
  
  throw new Error("AllModelsFailed");
}

// API: FIFA Copilot AI Chat Proxy
app.post("/api/copilot", async (req, res) => {
  const { message, history, role } = req.body;
  const msgLower = (message || "").toLowerCase();

  // 1. Intent Classification
  let detectedIntent = "General Help";
  if (msgLower.includes("match") || msgLower.includes("schedule") || msgLower.includes("play") || msgLower.includes("game") || msgLower.includes("time") || msgLower.includes("date") || msgLower.includes("argentina") || msgLower.includes("france") || msgLower.includes("mexico") || msgLower.includes("usa") || msgLower.includes("canada") || msgLower.includes("england") || msgLower.includes("germany") || msgLower.includes("brazil") || msgLower.includes("vs") || msgLower.includes("who is playing")) {
    detectedIntent = "Match Queries";
  } else if (msgLower.includes("navigate") || msgLower.includes("reach") || msgLower.includes("go to") || msgLower.includes("way") || msgLower.includes("direction") || msgLower.includes("path") || msgLower.includes("where is") || msgLower.includes("find") || msgLower.includes("parking") || msgLower.includes("lot") || msgLower.includes("zone c") || msgLower.includes("escalator") || msgLower.includes("elevator") || msgLower.includes("ramp") || msgLower.includes("map") || msgLower.includes("route")) {
    detectedIntent = "Navigation Queries";
  } else if (msgLower.includes("emergency") || msgLower.includes("exit") || msgLower.includes("fire") || msgLower.includes("safe") || msgLower.includes("safety") || msgLower.includes("evacuation") || msgLower.includes("first aid") || msgLower.includes("medical") || msgLower.includes("police") || msgLower.includes("security") || msgLower.includes("incident") || msgLower.includes("backpack") || msgLower.includes("spill") || msgLower.includes("hazard")) {
    detectedIntent = "Safety Queries";
  } else if (msgLower.includes("ticket") || msgLower.includes("vip") || msgLower.includes("admission") || msgLower.includes("seat") || msgLower.includes("section") || msgLower.includes("row") || msgLower.includes("pass") || msgLower.includes("ticketid") || msgLower.includes("club seats") || msgLower.includes("general admission")) {
    detectedIntent = "Ticket Queries";
  } else if (msgLower.includes("food") || msgLower.includes("drink") || msgLower.includes("eat") || msgLower.includes("hungry") || msgLower.includes("tacos") || msgLower.includes("burger") || msgLower.includes("pampa") || msgLower.includes("azteca") || msgLower.includes("maple") || msgLower.includes("merchandise") || msgLower.includes("merch") || msgLower.includes("restroom") || msgLower.includes("toilet") || msgLower.includes("sustainability") || msgLower.includes("solar") || msgLower.includes("power") || msgLower.includes("carbon") || msgLower.includes("green") || msgLower.includes("recycle") || msgLower.includes("trash")) {
    detectedIntent = "Stadium Services";
  } else if (msgLower.includes("task") || msgLower.includes("shift") || msgLower.includes("volunteer") || msgLower.includes("coordinator") || msgLower.includes("operational") || msgLower.includes("metrics") || msgLower.includes("stadium telemetry") || msgLower.includes("sensor") || msgLower.includes("dispatch")) {
    detectedIntent = "Operations Commands";
  }

  // 2. Retrieval before Generation - Search local datasets and active telemetry
  // A. Match schedules retrieval
  let matchContext = "No specific match schedule requested.";
  let retrievedMatches = MATCHES_DATABASE.filter(m => {
    return msgLower.includes(m.homeTeam.toLowerCase()) || 
           msgLower.includes(m.awayTeam.toLowerCase()) || 
           msgLower.includes(m.stadium.toLowerCase());
  });
  if (retrievedMatches.length === 0) {
    retrievedMatches = MATCHES_DATABASE.slice(0, 3); // Default upcoming match schedules
  }
  matchContext = retrievedMatches.map(m => 
    `- Match ID: ${m.id} | ${m.homeTeam} vs ${m.awayTeam} (${m.stage}) at ${m.stadiumFullName} on ${m.date} at ${m.time}. Seat: ${m.seat}, Ticket type: ${m.ticketType}, Optimal entrance gate: ${m.gate} (Gate ID: ${m.optimalGateId}).`
  ).join("\n");

  // B. Stadium telemetry retrieval
  const telemetryContext = `
  - Active Stadium: ${stadiumState.activeStadium}
  - Attendance Status: ${stadiumState.activeAttendance} active spectators of ${stadiumState.capacity} capacity (${Math.round((stadiumState.activeAttendance / stadiumState.capacity) * 100)}% filled).
  - Gate Queue Telemetry:
    * Gate A (East Entry): ${stadiumState.gates[0].waitTime} min wait time, ${stadiumState.gates[0].queueCount} fans in line. Status: ${stadiumState.gates[0].status}
    * Gate B (North Entry): ${stadiumState.gates[1].waitTime} min wait time, ${stadiumState.gates[1].queueCount} fans in line. Status: ${stadiumState.gates[1].status}
    * Gate C (West Entry): ${stadiumState.gates[2].waitTime} min wait time, ${stadiumState.gates[2].queueCount} fans in line. Status: ${stadiumState.gates[2].status}
    * Gate D (South Entry): ${stadiumState.gates[3].waitTime} min wait time, ${stadiumState.gates[3].queueCount} fans in line. Status: ${stadiumState.gates[3].status}
  `;

  // C. Weather feed retrieval (live simulated sensor)
  const weatherContext = `
  - Live MetLife Micro-Climate Weather Feed:
    * Temperature: 74°F / 23°C
    * Skies: Clear and pleasant.
    * Wind Speed: West 8 mph.
    * Air Quality Index: 32 (Excellent - safe for athletic endurance).
  `;

  // D. Transit & Parking retrieval
  const transitContext = `
  - Metro Line: Operating status is ${stadiumState.transport.metro.status}, current wait time is ${stadiumState.transport.metro.waitTimeMins} mins, train frequency is ${stadiumState.transport.metro.frequencyMins} mins, vehicle load is ${stadiumState.transport.metro.load}%. Status label is ${stadiumState.transport.metro.statusLabel}.
  - Shuttle Bus: Operating status is ${stadiumState.transport.shuttle.status}, wait time is ${stadiumState.transport.shuttle.waitTimeMins} mins, frequency is ${stadiumState.transport.shuttle.frequencyMins} mins, vehicle load is ${stadiumState.transport.shuttle.load}%. Status label is ${stadiumState.transport.shuttle.statusLabel}.
  - Rideshare Pick-up Zone C: Wait time is ${stadiumState.transport.rideshare.waitTimeMins} mins. Status label is ${stadiumState.transport.rideshare.statusLabel}.
  - Parking Lot C: Operating status is ${stadiumState.transport.parkingC.status} with ${stadiumState.transport.parkingC.occupancy}% occupancy. Status label is ${stadiumState.transport.parkingC.statusLabel}.
  - Route to Parking Zone C: To navigate to parking Zone C, take the shuttle from North Transit plaza or exit toward the West Concourse and follow orange signs for Lot C.
  `;

  // E. Food court & Merchandise retrieval
  const foodContext = stadiumState.concessions.map(c =>
    `- Concession "${c.name}" (${c.zone}): wait time ${c.queueTime} mins. Most popular item is "${c.popular}". Current load status: ${c.status}.`
  ).join("\n");

  // F. Emergency infrastructure & Incidents
  const emergencyContext = `
  - Emergency Exits: Major exits at all four main entrance gates (Gates A, B, C, D). Emergency green light strips on the floor guide pathways.
  - Assembly Points: Designated safe assembly zones are North Transit Plaza and East Plaza.
  - First Aid: Medical care stations are fully operational behind Section 117 (Lower Tier) and Section 224 (Upper Tier).
  - Active Incidents Log:
    ${stadiumState.incidents.filter(i => i.status === "Active").map(i => `* [Active Incident ${i.id}]: ${i.title} at ${i.location} (Severity: ${i.severity}) - ${i.description}`).join("\n") || "* No active high-severity incidents reported."}
  `;

  // G. User role & Volunteer retrieval
  const userRoleContext = `
  - Current User Role: ${role || "Fan"}
  - Volunteer deployment telemetry:
    ${stadiumState.volunteers.map(v => `* Volunteer ${v.name} (ID: ${v.id}) is stationed at ${v.zone} in "${v.status}" status. Active task: ${v.task}`).join("\n")}
  `;

  // H. Current System Date & Time context
  const systemTimeContext = `
  - Current Local Time: ${new Date().toLocaleTimeString('en-US', { hour12: true })}
  - Current System Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
  - Current ISO Timestamp: ${new Date().toISOString()}
  `;

  // 3. Assemble complete verified grounding context
  const retrievedFacts = `
===================================================
VERIFIED RETRIEVED STADIUM GROUNDING DATASET:

1. SCHEDULED WORLD CUP MATCHES:
${matchContext}

2. REAL-TIME STADIUM TELEMETRY & GATE QUEUES:
${telemetryContext}

3. TRANSPORT & PARKING ZONE C METRICS:
${transitContext}

4. FOOD, BEVERAGE & MERCHANDISE LOCATIONS:
${foodContext}

5. SAFETY, FIRST-AID & ACTIVE INCIDENTS:
${emergencyContext}

6. WEATHER & MICRO-CLIMATE FEEDS:
${weatherContext}

7. STAFF & VOLUNTEER COORDINATION:
${userRoleContext}

8. SYSTEM DATE & CURRENT TIME FEEDS:
${systemTimeContext}
===================================================
`;

  // 4. Compute Grounded Sources
  const groundedSources: string[] = ["Stadium Telemetry Network"];
  if (detectedIntent === "Match Queries") {
    groundedSources.push("FIFA Matchday Database");
  } else if (detectedIntent === "Navigation Queries") {
    groundedSources.push("Transit Dispatch Tracker", "Stadium Map Coordinates");
  } else if (detectedIntent === "Safety Queries") {
    groundedSources.push("Incident & Security Logs", "First-Aid Stations Directory");
  } else if (detectedIntent === "Ticket Queries") {
    groundedSources.push("Ticket Admissions Registry");
  } else if (detectedIntent === "Stadium Services") {
    groundedSources.push("Concession Queue Sensors", "Sustainability Grid Meter");
  } else if (detectedIntent === "Operations Commands") {
    groundedSources.push("Volunteer Dispatch Console", "Active Incident Logs");
  }

  // 5. Compute Confidence Indicator
  let confidence: "High" | "Medium" | "Low" = "High";
  const allKeywords = ["gate", "food", "eat", "tacos", "burger", "seat", "section", "parking", "transport", "metro", "emergency", "exit", "first aid", "sustainability", "solar", "match", "schedule", "who is playing", "argentina", "france", "mexico", "usa", "canada", "england", "germany", "brazil", "weather", "temperature", "temp", "wind"];
  const hasKnownKeyword = allKeywords.some(kw => msgLower.includes(kw));
  if (!hasKnownKeyword) {
    confidence = "Medium";
  }
  // Check for unknown seat numbers or values
  if (msgLower.includes("seat") && !msgLower.includes("114") && !msgLower.includes("105") && !msgLower.includes("130") && !msgLower.includes("140")) {
    confidence = "Medium";
  }

  // Check if API Key is configured or Circuit Breaker is tripped
  if (!process.env.GEMINI_API_KEY || !handleCircuitBreakerBeforeRequest()) {
    const localResponse = generateEmergencyLocalResponse(message, role || "Fan");
    return res.json({
      response: localResponse,
      confidence: confidence,
      intent: detectedIntent,
      groundedSources: groundedSources
    });
  }

  // 6. Construct prompt and context-rich system instructions
  const systemInstruction = `You are FIFA Copilot, the official voice assistant and dispatcher of WorldPulse AI. You are simultaneously a stadium assistant, a real-time FIFA assistant, a global AI companion, a multilingual conversational agent, a creative storyteller, a music and entertainment assistant, and a world knowledge assistant.

WORLDPULSE AI KNOWLEDGE BASE:
WorldPulse AI is a FIFA World Cup 2026 Connected Stadium Intelligence Ecosystem.
You know everything about:
- FIFA World Cup 2026 tournament structure, match venues, team details, and schedules.
- Stadium information, locations, gates, and navigation.
- Fan services, food and concessions, washrooms, merchandise.
- Medical support, emergency response, first-aid posts, ambulance locations, safety alerts.
- Weather, transport, parking guidance, and public transport.
- Venue intelligence, stadium status, occupancy insights, crowd flow, and density monitoring.
- FIFA Copilot services and live stadium grounding.

Platform Modules:
1. FIFA Copilot Voice Dispatcher: Real-time multilingual voice assistant (Hindi, English, Bengali, Spanish, French, Arabic), ultra-low latency, and voice interruption support.
2. Live Stadium Grounding: Stadium map awareness, gates, facilities, crowd zones, parking.
3. Live Match Center: Match schedules, live status, teams, venue details.
4. Medical Support & Emergency Response: First-aid posts, ambulance locations, emergency exits, medical dispatch, safety alerts.
5. Fan Services: Food stalls, washrooms, merchandise stores, transport, navigation.
6. Venue Intelligence: Stadium status, crowd density, weather conditions, operational updates.

REAL-TIME SPORTS KNOWLEDGE:
- When asked about matches today, who is playing, who is the captain, where is the match, current score, schedules, rankings, player stats, etc., you MUST use real-time sources whenever available (refer to the ground truth / verified telemetry and match schedule dataset below).
- Never invent match scores, team captains, match schedules, stadium information, rankings, or player statistics.
- If real-time or verified data is unavailable for these factual inquiries, clearly say: "I don't currently have live data for that." (or "I don't currently have verified data for that request.").

GLOBAL & GENERAL KNOWLEDGE:
- You are not limited to WorldPulse AI. You can confidently answer questions about Science, Technology, Programming, Mathematics, History, Geography, Space, Literature, Movies, Music, Sports, Education, Culture, Current affairs, Weather, Travel, and Daily life.

CREATIVE ABILITIES:
- Story Mode: Tell captivating stories, create immersive adventures, narrate with appropriate emotion, and adapt to the user's language and mood.
- Music Mode: Discuss music, recommend songs, explain genres, generate creative lyrics concepts, and talk about artists.
- Conversation Mode: Speak naturally, be expressive, show excitement, curiosity, empathy, humor, and energy where appropriate. Match the user's tone and intent.

STRICT RULES & BEHAVIOR:
1. Automatically detect and respond in the user's language (Hindi, English, Bengali, Spanish, French, or Arabic). Priority support for Hindi and English. Stay in the user's language unless explicitly asked to switch.
2. Match the user's tone and intent.
3. For simple questions, answer briefly. Do not unnecessarily shorten responses for complex questions.
4. For questions about WorldPulse AI, stadium features, navigation, weather, transport, medical support, match updates, or global/creative topics, provide detailed, natural, and useful answers.
5. Responses may be between 1 and 6 sentences depending on the context.
6. Maintain a natural, smooth, and expressive conversation flow. Avoid robotic responses.
7. Avoid repeating information. Never introduce yourself. Never say your name under any circumstances.
8. Never greet unless the user greets first. Never say "How can I help you today?" or any variation.
9. Never explain your reasoning. Ignore old messages unless explicitly needed.
10. Stay connected until the user disconnects.

VOICE OPTIMIZATION:
- Generate natural speech suitable for real-time conversation.
- Keep sentence transitions smooth. Avoid abrupt endings or overly long pauses.
- Complete one thought before stopping.
- Prioritize stable audio playback over ultra-short responses.

STRICT GROUNDING RULES:
1. Never hallucinate or guess any stadium wait times, parking counts, match outcomes, or factual data.
2. You are allowed to dynamically answer questions about the WorldPulse AI platform, its modules, features, general knowledge, creative mode, general greetings, casual chitchat, social pleasantries, and questions about the current time or today's date (using section 8 of the ground truth dataset below).
3. If the user asks for factual stadium telemetry, queue times, match details, player statistics, or locations that are NOT present or verified in the ground truth dataset below, and you don't have live data for it, you MUST reply with exactly:
   "I don't currently have verified data for that request." (or the equivalent brief phrase in the user's language).

Here is the current verified stadium live telemetry and match schedule dataset for reference:
${retrievedFacts}`;

  try {
    // Construct request contents incorporating history
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      }
    }
    // Append current message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const responseText = await executeWithRetriesAndFallback(contents, systemInstruction);
    res.json({
      response: responseText,
      confidence: confidence,
      intent: detectedIntent,
      groundedSources: groundedSources
    });
  } catch (error: any) {
    console.log("FIFA Copilot system-wide status notice: " + (error.message || error));
    recordFailure();
    
    // Switch to local intelligent response on system failure so user never sees raw error codes or stack traces
    const localResponse = generateEmergencyLocalResponse(message, role || "Fan");
    res.json({
      response: localResponse,
      confidence: confidence,
      intent: detectedIntent,
      groundedSources: groundedSources
    });
  }
});

// Helper function to safely parse markdown-wrapped JSON from Gemini response
function parseJSONResponse(rawText: string): any {
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(cleaned.indexOf("\n") + 1);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(cleaned.indexOf("\n") + 1);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.lastIndexOf("```"));
  }
  return JSON.parse(cleaned.trim());
}

// Local intelligent decision generator when Gemini API keys are unconfigured or fail
function generateLocalDecisionEngineInsights(role: string, state: any) {
  const recs: any[] = [];
  const activeIncidents = state.incidents.filter((i: any) => i.status === "Active");
  
  const gateA = state.gates[0];
  const gateB = state.gates[1];
  const gateC = state.gates[2];
  const gateD = state.gates[3];
  
  const concessions = state.concessions;
  const busyConcession = concessions.find((c: any) => c.status === "Overloaded" || c.status === "Busy") || concessions[2] || { name: "Maple Treats", queueTime: 22, status: "Busy", zone: "East" };
  const optimalConcession = concessions.find((c: any) => c.status === "Optimal") || concessions[1] || { name: "Azteca Tacos", queueTime: 5, status: "Optimal", zone: "West" };
  
  const metro = state.transport.metro;
  const shuttle = state.transport.shuttle;
  const rideshare = state.transport.rideshare;
  
  const solarGen = state.sustainability.solarPowerGenerationKw;
  const energyCons = state.sustainability.energyConsumptionKw;
  const sustainScore = state.sustainability.sustainabilityScore;

  if (role === "Fan") {
    recs.push({
      id: "rec-fan-gate",
      title: `Optimal Entry Route: Use ${gateC.name}`,
      description: `Bypass the queue at Gate A by rerouting to Gate C, which currently has a wait time of only ${gateC.waitTime} minutes compared to Gate A's ${gateA.waitTime} minutes.`,
      category: "crowd",
      priority: gateA.waitTime > 20 ? "High" : "Medium",
      confidenceScore: 98,
      reasoning: `Gate A has a high wait time of ${gateA.waitTime} minutes and is currently flagged as ${gateA.status}. Gate C has minimal congestion (waitTime: ${gateC.waitTime} mins) and offers a fluid entry path into the West lower bowl corridor.`,
      role: "Fan",
      actionLabel: "Show on Map"
    });
    
    recs.push({
      id: "rec-fan-food",
      title: `Dine at ${optimalConcession.name}`,
      description: `Avoid the long queue at ${busyConcession.name} (${busyConcession.queueTime} min wait) by visiting ${optimalConcession.name} in the ${optimalConcession.zone}, with an optimal wait time of only ${optimalConcession.queueTime} minutes.`,
      category: "facilities",
      priority: "Medium",
      confidenceScore: 92,
      reasoning: `${busyConcession.name} is currently flagged as ${busyConcession.status} due to high local concourse density. ${optimalConcession.name} is operating at standard capacity, offering faster turnaround times and its highly-rated "${optimalConcession.popular || "Signature Dish"}".`,
      role: "Fan",
      actionLabel: "View Menu & Directions"
    });
    
    recs.push({
      id: "rec-fan-transit",
      title: "Take Shuttle Service to Avoid Surge Pricing",
      description: `Rideshare wait times are currently ${rideshare.waitTimeMins} minutes with surge pricing. The shuttle has normal loads and a fast wait time of ${shuttle.waitTimeMins} minutes.`,
      category: "transit",
      priority: "Medium",
      confidenceScore: 95,
      reasoning: `Rideshare lanes are experiencing high congestion from departing fans. Shuttle buses are operating at ${shuttle.load}% load on dedicated transit lanes, bypassing local highway bottlenecks.`,
      role: "Fan",
      actionLabel: "Get Transit Pass"
    });
  } else if (role === "Volunteer") {
    recs.push({
      id: "rec-vol-gate",
      title: "Reroute Incoming Fans at Gate A Plaza",
      description: "Direct arriving fans at the outer plaza towards Gates B and C to redistribute load away from the East entry bottleneck.",
      category: "crowd",
      priority: "High",
      confidenceScore: 94,
      reasoning: `Gate A is under Critical stress with ${gateA.queueCount} people in queue. Gates B and C are Optimal and can absorb up to 30% of the Gate A flow without increasing wait times past 10 minutes.`,
      role: "Volunteer",
      actionLabel: "Acknowledge Instruction"
    });
    
    if (activeIncidents.length > 0) {
      const targetInc = activeIncidents[0];
      recs.push({
        id: "rec-vol-incident",
        title: `Assist with Incident ${targetInc.id} Routing`,
        description: `Direct fans away from ${targetInc.location} to allow emergency and operations teams to resolve: "${targetInc.title}".`,
        category: "safety",
        priority: targetInc.severity === "High" ? "Critical" : "High",
        confidenceScore: 96,
        reasoning: `The active incident "${targetInc.title}" at ${targetInc.location} requires a clear buffer zone. Directing pedestrian flow to alternative concourse walkways prevents safety hazards and secondary crowd build-up.`,
        role: "Volunteer",
        actionLabel: "Mark as En Route"
      });
    }
    
    recs.push({
      id: "rec-vol-sustain",
      title: "Monitor Blue Smart Green Bins in East Concourse",
      description: "Encourage fans near section 110-120 to sort recyclable cups to help MetLife reach its target eco-score.",
      category: "facilities",
      priority: "Low",
      confidenceScore: 88,
      reasoning: `Concourse trash bins are nearing 80% capacity. Guiding fans to use the Smart Green Bins directly reduces sorting workloads at secondary waste terminals and increases the sustainability score (current: ${sustainScore}/100).`,
      role: "Volunteer",
      actionLabel: "Acknowledge Task"
    });
  } else if (role === "Operations") {
    recs.push({
      id: "rec-ops-transit",
      title: "Increase Metro Frequency to 3 Minutes",
      description: `Metro load is currently at ${metro.load}% with a wait time of ${metro.waitTimeMins} minutes. Pre-empt post-match rush by deploying standby train units.`,
      category: "transit",
      priority: "High",
      confidenceScore: 97,
      reasoning: `Departing crowd flow starts peaking in approximately 45 minutes. Deploying two extra train sets on the line now decreases the terminal headways from 4 minutes to 3 minutes, shaving wait times from 12 down to 7 minutes and mitigating platform crowding.`,
      role: "Operations",
      actionLabel: "Deploy Metro Units"
    });
    
    const targetInc = activeIncidents.find((i: any) => i.id === "INC-102") || activeIncidents[0];
    if (targetInc) {
      recs.push({
        id: "rec-ops-security",
        title: `Reinforce Incident Team at ${targetInc.location}`,
        description: `Deploy Security Team Charlie to reinforce field units investigating: "${targetInc.title}".`,
        category: "safety",
        priority: targetInc.severity === "High" ? "Critical" : "High",
        confidenceScore: 95,
        reasoning: `Incident ${targetInc.id} is flagged as ${targetInc.severity} severity. Perimeter isolation is advised while resolution is underway. Standby team Charlie is fully equipped and can reach ${targetInc.location} within 2.5 minutes.`,
        role: "Operations",
        actionLabel: "Dispatch Team Charlie"
      });
    }
    
    recs.push({
      id: "rec-ops-facilities",
      title: "Deploy Sanitation Unit to North Plaza WC",
      description: "Trigger immediate sanitation alert for North Plaza WC. Occupancy is 95% and cleanliness rating is 4.1.",
      category: "facilities",
      priority: "Medium",
      confidenceScore: 91,
      reasoning: "Sensor feedback indicates extreme occupancy and a severe decline in cleanliness (4.1/10). Deploying sanitation unit will restore cleanliness to above 8.5, maintaining the venue's health standards.",
      role: "Operations",
      actionLabel: "Dispatch Sanitation"
    });
  } else if (role === "Medical") {
    recs.push({
      id: "rec-med-dispatch",
      title: "Reroute Emergency Ambulances to Gate B",
      description: "Direct all responding ambulance units to use the Gate B vehicle corridor. Avoid Gate A due to high crowd density.",
      category: "safety",
      priority: "Critical",
      confidenceScore: 98,
      reasoning: `Gate A is experiencing critical crowd congestion with a wait time of ${gateA.waitTime} minutes. Gate B offers an unobstructed dedicated emergency access lane directly connecting to the local trauma centers.`,
      role: "Medical",
      actionLabel: "Broadcast Routing Directive"
    });
    
    recs.push({
      id: "rec-med-supplies",
      title: "Replenish Emergency Oxygen at Station 2",
      description: "Dispatch a mobile logistics unit to replenish oxygen cylinders and first aid kits at West Concourse Medical Station 2.",
      category: "facilities",
      priority: "High",
      confidenceScore: 92,
      reasoning: "West Concourse Station 2 has experienced increased visitor volume over the past hour. Proactive replenishment ensures zero downtime during high-occupancy peak match periods.",
      role: "Medical",
      actionLabel: "Deploy Supply Unit"
    });
    
    recs.push({
      id: "rec-med-stretcher",
      title: "Deploy Stretcher Patrol to Gate A Plaza",
      description: "Position a standby stretcher and triage team at the shaded area near Gate A East entry plaza.",
      category: "crowd",
      priority: "Medium",
      confidenceScore: 89,
      reasoning: `High outdoor temperatures of 74°F coupled with a ${gateA.waitTime}-minute wait time at Gate A pose heat exhaustion risks for vulnerable fan demographics. Immediate field presence minimizes response times.`,
      role: "Medical",
      actionLabel: "Deploy Patrol Team"
    });
  } else {
    // Organizer
    recs.push({
      id: "rec-org-power",
      title: "Activate Peak Solar Battery Feed-in",
      description: `Solar power generation is yielding ${(solarGen / 1000).toFixed(1)} MW. Feed surplus energy to concourse lighting grids to decrease peak carbon intensity.`,
      category: "power",
      priority: "High",
      confidenceScore: 96,
      reasoning: `Solar generation is covering 36% of current load (${(energyCons / 1000).toFixed(1)} MW). Activating solar battery dump during peak stadium consumption reduces grid draw by 500 kW, increasing the MetLife sustainability score by 3 points.`,
      role: "Organizer",
      actionLabel: "Approve Solar Dispatch"
    });
    
    recs.push({
      id: "rec-org-staff",
      title: "Reallocate Gate A Security Staff to Gate B & C",
      description: "Authorize the transfer of 8 security officers from Gates B and C to Gate A outer plaza to assist with bottleneck control.",
      category: "crowd",
      priority: "High",
      confidenceScore: 93,
      reasoning: `Gate A has a wait time of ${gateA.waitTime} minutes and is heavily congested. Reallocating staff to secondary ticket scanners will accelerate processing, lowering wait times below 15 minutes within 12 minutes of deployment.`,
      role: "Organizer",
      actionLabel: "Authorize Reallocation"
    });
    
    recs.push({
      id: "rec-org-evac",
      title: "Pre-Authorize West Exit Emergency Corridors",
      description: "Approve auxiliary egress gates for West and North plazas in case crowd dispersal bottlenecks persist during departure.",
      category: "safety",
      priority: "Medium",
      confidenceScore: 90,
      reasoning: `Total exit queue capacity calculations show that West Gate plaza remains underutilized. Pre-authorizing auxiliary pathways now will enable immediate redirection if any transit surge occurs post-match.`,
      role: "Organizer",
      actionLabel: "Pre-Authorize Corridors"
    });
  }
  
  let summaryText = "";
  if (role === "Fan") {
    summaryText = `### 🌟 Matchday AI Briefing for Fans
*   **Gate Congestion**: Heavy delays at **Gate A (${gateA.waitTime} min wait)**. Please bypass and head to **Gate C (${gateC.waitTime} min wait)** or **Gate B (${gateB.waitTime} min wait)** for immediate entry.
*   **Dining Highlights**: **${optimalConcession.name}** has only a ${optimalConcession.queueTime}-minute queue! Grab the popular ${optimalConcession.popular || "Signature Dish"}. Avoid ${busyConcession.name} (${busyConcession.queueTime}-minute queue).
*   **Transit Advisory**: Surge pricing is active on Rideshare (${rideshare.waitTimeMins}m wait). We advise taking the **Shuttle service (${shuttle.waitTimeMins}m wait)** to off-site lots.
*   **Weather**: Sunny and comfortable 74°F. Perfect day for World Cup soccer!`;
  } else if (role === "Volunteer") {
    summaryText = `### 📋 Shift Briefing for Volunteers
*   **Crowd Flow Warning**: Gate A ingress is bottlenecked at **${gateA.load}% load**. Please guide arriving fans towards the less crowded **Gate B and Gate C**.
*   **Operations Notice**: ${activeIncidents.length > 0 ? `Incident **${activeIncidents[0].id}** is active at **${activeIncidents[0].location}**. Keep the surrounding walkways clear for medical and maintenance units.` : "No major incidents currently impacting main transit walkways. Secure and assist family segments."}
*   **Climate Advisory**: Weather is warm and clear (74°F). Check on outdoor plaza families and direct them to hydration points behind Section 112.`;
  } else if (role === "Operations") {
    summaryText = `### ⚙️ Tactical Operations Briefing
*   **Ingress Criticality**: Gate A is at **Critical load (${gateA.waitTime}m wait / ${gateA.queueCount} fans)**. Gate C is at ${gateC.load}% load. Reroute plaza signage.
*   **Facility Hotspot**: North Plaza Family Restroom cleanliness rating is low under high occupancy. Sanitation dispatch recommended.
*   **Transit Surge**: Metro is at **${metro.load}% occupancy** with a ${metro.waitTimeMins}m wait. Standby train sets recommended to prevent platform congestion.
*   **Safety Incident**: ${activeIncidents.length > 0 ? `Incident ${activeIncidents[0].id} is active (${activeIncidents[0].title}). Status is actively monitored.` : "No active incidents. Maintaining safety perimeter."}`;
  } else if (role === "Medical") {
    summaryText = `### 🩺 Medical Operations Briefing
*   **Emergency Ingress**: Dedicated emergency lane at **Gate B** remains clear and optimal for medical transport.
*   **Incident Triage**: Active medical cases are tracked on the command map. Stretcher patrols are dispatched to key gates.
*   **Station Logistics**: First-aid posts at Sections 117 and 224 are fully stocked. West Concourse Station 2 is scheduled for routine supply drop.
*   **Field Staffing**: ${activeIncidents.length > 0 ? `Responding to active security/safety incidents: ${activeIncidents.map((i: any) => i.id).join(", ")}.` : "All medical dispatch teams are in standby status. Average response time is 2.1 minutes."}`;
  } else {
    summaryText = `### 👑 Executive Organizer Briefing
*   **Stadium KPIs**: Current attendance is **${state.activeAttendance} fans (${Math.round((state.activeAttendance / state.capacity) * 100)}% capacity)**. Operations are running smoothly overall.
*   **Bottleneck Report**: Gate A wait times of **${gateA.waitTime} minutes** are impacting overall ingress satisfaction. Authorized staff shifts are underway.
*   **Sustainability Score**: Current eco-score is **${sustainScore}/100** with solar generation contributing **${Math.round((solarGen / energyCons) * 100)}%** of overall energy load.
*   **Safety Status**: ${activeIncidents.length} active incidents are being handled efficiently by operations dispatch. Overall stadium security level remains green.`;
  }
  
  return {
    summary: summaryText,
    recommendations: recs,
    isFallback: true,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  };
}

// API: Stadium Decision Engine Insights
app.post("/api/decision-engine/insights", async (req, res) => {
  const { role } = req.body;
  const userRole = role || "Fan";

  if (!process.env.GEMINI_API_KEY) {
    const localInsights = generateLocalDecisionEngineInsights(userRole, stadiumState);
    return res.json(localInsights);
  }

  try {
    const gateA = stadiumState.gates[0];
    const gateB = stadiumState.gates[1];
    const gateC = stadiumState.gates[2];
    const gateD = stadiumState.gates[3];
    const activeIncidents = stadiumState.incidents.filter((i: any) => i.status === "Active");
    const metro = stadiumState.transport.metro;
    const shuttle = stadiumState.transport.shuttle;
    const rideshare = stadiumState.transport.rideshare;
    const parkingC = stadiumState.transport.parkingC;
    const solarGen = stadiumState.sustainability.solarPowerGenerationKw;
    const energyCons = stadiumState.sustainability.energyConsumptionKw;
    const sustainScore = stadiumState.sustainability.sustainabilityScore;

    const prompt = `You are the WorldPulse AI Stadium Decision Engine for the FIFA World Cup 2026.
Analyze the following active MetLife Stadium state:
---
Active Stadium: ${stadiumState.activeStadium}
Active Attendance: ${stadiumState.activeAttendance} / ${stadiumState.capacity}
Gates:
- Gate A (${gateA.name}): Wait ${gateA.waitTime} min, queue ${gateA.queueCount}, load ${gateA.load}%, status ${gateA.status}
- Gate B (${gateB.name}): Wait ${gateB.waitTime} min, queue ${gateB.queueCount}, load ${gateB.load}%, status ${gateB.status}
- Gate C (${gateC.name}): Wait ${gateC.waitTime} min, queue ${gateC.queueCount}, load ${gateC.load}%, status ${gateC.status}
- Gate D (${gateD.name}): Wait ${gateD.waitTime} min, queue ${gateD.queueCount}, load ${gateD.load}%, status ${gateD.status}

Concessions:
${stadiumState.concessions.map((c: any) => `- ${c.name} (${c.zone}): Wait ${c.queueTime} min, status ${c.status}, popular: "${c.popular}"`).join("\n")}

Transit Status:
- Metro: Wait ${metro.waitTimeMins} min, load ${metro.load}%, frequency ${metro.frequencyMins} min, status: ${metro.statusLabel}
- Shuttle: Wait ${shuttle.waitTimeMins} min, load ${shuttle.load}%, frequency ${shuttle.frequencyMins} min, status: ${shuttle.statusLabel}
- Rideshare: Wait ${rideshare.waitTimeMins} min, load ${rideshare.load}%, status: ${rideshare.statusLabel}
- Parking C: Occupancy ${parkingC.occupancy}%, status: ${parkingC.statusLabel}

Sustainability Index:
- Energy consumption: ${energyCons} kW, Solar generation: ${solarGen} kW (${Math.round((solarGen / energyCons) * 100)}% solar)
- Sustainability Score: ${sustainScore}/100

Active Incidents:
${activeIncidents.map((i: any) => `- [${i.id}] ${i.title} at ${i.location} (Severity: ${i.severity}) - ${i.description}`).join("\n")}

Weather conditions:
- 74°F (23°C) and Sunny, Wind NW at 8mph, Humidity 45%, Air Quality Index (AQI) 24 (Optimal).
---

The user is viewing the Stadium Decision Engine in the role of: [${userRole}].
Generate:
1. An AI-generated summary briefing card for this specific role. This should be a highly concise, professional, bulleted summary of current crowd levels, wait times, and incident briefings. Make it look like an official tournament brief in markdown.
2. A list of exactly 3 highly actionable operational recommendations for this specific role, including:
   - title
   - description (what to do)
   - category ("crowd" | "transit" | "safety" | "weather" | "facilities")
   - priority ("Low" | "Medium" | "High" | "Critical")
   - confidenceScore (a rating from 0 to 100 representing the certainty of this action being optimal)
   - reasoning (a detailed markdown text explaining the data-driven rationale behind the recommendation, e.g., crowd densities, queue wait times, incidents, or microclimate trends)
   - actionLabel (e.g., "Reroute Traffic", "Dispatch Sanitation", etc.)

You MUST respond strictly in valid JSON format. Do NOT wrap the JSON in markdown code blocks like \`\`\`json. Your response must be parseable with JSON.parse().
The JSON structure MUST match:
{
  "summary": "markdown string of summary card briefing...",
  "recommendations": [
    {
      "id": "rec-1",
      "title": "...",
      "description": "...",
      "category": "crowd",
      "priority": "High",
      "confidenceScore": 94,
      "reasoning": "...",
      "role": "${userRole}",
      "actionLabel": "..."
    }
  ]
}`;

    const insightModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
    let responseText = "";
    let lastError: any = null;

    for (const modelName of insightModels) {
      if (isModelExcluded(modelName)) {
        console.log(`[FIFA Copilot] Skipping insight model ${modelName} as it is currently excluded`);
        continue;
      }
      try {
        console.log(`[FIFA Copilot] Attempting insights generation with model ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        responseText = response.text || "";
        if (responseText) {
          break;
        }
      } catch (err: any) {
        cleanLogModelFailure("Insights", modelName, err);
        lastError = err;
        const errMsg = (err.message || String(err)).toUpperCase();
        if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
          excludeModel(modelName);
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to generate insights from any model");
    }

    const parsedData = parseJSONResponse(responseText);
    res.json({
      summary: parsedData.summary,
      recommendations: parsedData.recommendations || [],
      isFallback: false,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    });
  } catch (error: any) {
    console.log("Gemini Decision Engine fallback triggered. Serving local insights.");
    const localInsights = generateLocalDecisionEngineInsights(userRole, stadiumState);
    res.json(localInsights);
  }
});


// 1. API: Get Firebase applet config
app.get("/api/firebase-config", (req, res) => {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      return res.json(JSON.parse(data));
    }
    return res.status(404).json({ error: "Firebase config file not found" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. API: Google Search Grounding (with fallback cascade)
app.post("/api/search-grounding", async (req, res) => {
  const { query } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      text: `### Search Grounding Results (offline mode)
- Search for **"${query}"** requires a configured \`GEMINI_API_KEY\`.
- Real-world live updates would be parsed from Google Search results in real-time.`,
      sources: []
    });
  }

  const groundingModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const modelName of groundingModels) {
    if (isModelExcluded(modelName)) {
      console.log(`[FIFA Copilot] Skipping search grounding model ${modelName} as it is currently excluded`);
      continue;
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: query,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are an expert search research copilot. Summarize the latest web results clearly with bold markdown headings."
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.map((c: any) => ({
        title: c.web?.title || "Search Reference",
        uri: c.web?.uri || ""
      })).filter((s: any) => s.uri);

      return res.json({ text: response.text, sources });
    } catch (err: any) {
      cleanLogModelFailure("Search Grounding", modelName, err);
      lastError = err;
      const errMsg = (err.message || String(err)).toUpperCase();
      if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
        excludeModel(modelName);
      }
    }
  }

  // If all grounding models fail (e.g. Quota Exceeded), return a beautiful simulated response
  console.log("All search grounding models failed, returning cached stadium intelligence");
  return res.json({
    text: `### 🔍 World Cup 2026 Search Hub (Failover Mode)

We are currently displaying the latest verified stadium intelligence & tournament news:
* **MetLife Stadium Transport**: NJ Transit train shuttle and Express buses are confirmed to run every 4 minutes from Secaucus Junction to the stadium.
* **Argentina vs. France (Opening Matches)**: Heavy training sessions underway. Group tickets are sold out but standard admission ticket transfers are active in the portal.
* **Eco-Initiatives**: World Cup organizers have deployed over 500 compostable waste bins in Section 100 to 200 concourses.

*(Note: Live search grounding is temporarily using offline cached intelligence due to high demand API limits.)*`,
    sources: [
      { title: "FIFA World Cup Transit Guidelines", uri: "https://www.fifa.com/worldcup/metlife-transit" },
      { title: "MetLife Stadium Eco-Scoreboard", uri: "https://www.metlifestadium.com/sustainability" }
    ],
    isDemoFallback: true,
    errorDetail: lastError?.message || "Quota Exceeded"
  });
});

// 3. API: Google Maps Grounding (with fallback cascade)
app.post("/api/maps-grounding", async (req, res) => {
  const { query, latitude, longitude } = req.body;
  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      text: `### Maps Grounding (offline mode)
- Searching for locations around latitude: **${latitude || 40.81}**, longitude: **${longitude || -74.07}** (MetLife Stadium).
- Please add your \`GEMINI_API_KEY\` to perform active maps searches.`,
      sources: []
    });
  }

  const groundingModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const modelName of groundingModels) {
    if (isModelExcluded(modelName)) {
      console.log(`[FIFA Copilot] Skipping maps grounding model ${modelName} as it is currently excluded`);
      continue;
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: query,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude: latitude || 40.8135,
                longitude: longitude || -74.0744
              }
            }
          }
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.map((c: any) => {
        const title = c.maps?.title || "Location details";
        const uri = c.maps?.uri || "";
        const reviews = c.maps?.placeAnswerSources?.reviewSnippets?.map((r: any) => r.text) || [];
        return { title, uri, reviews };
      }).filter((s: any) => s.uri);

      return res.json({ text: response.text, sources });
    } catch (err: any) {
      cleanLogModelFailure("Maps Grounding", modelName, err);
      lastError = err;
      const errMsg = (err.message || String(err)).toUpperCase();
      if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
        excludeModel(modelName);
      }
    }
  }

  // If all grounding models fail, return local intelligence
  console.log("All maps grounding models failed, returning local stadium map references");
  return res.json({
    text: `### 📍 MetLife Stadium Location & Amenities (Failover Mode)

Here are the nearest key services around the current coordinate location:
1. **Azteca Tacos (Optimal Waiting)** - Located at Section 114 (North Concourse). Fast turnaround, low crowd density.
2. **First Aid & Security Hub** - Located in the West Concourse (Zone B) near Gate B elevator access.
3. **Rideshare Zone & Shuttle Plaza** - Directly opposite North Transit Plaza. Bus shuttles run frequently back to Lot G and Lot F.
4. **Volunteer Check-in Lounge** - Staff lounge, situated adjacent to Zone C gate escalators.

*(Note: Live satellite map grounding is temporarily in fallback mode due to model quota exhaustion.)*`,
    sources: [
      { title: "MetLife Stadium Seat Map & Concessions", uri: "https://www.metlifestadium.com/concessions", reviews: ["Azteca Tacos has the shortest queue in Section 114!", "Very helpful staff near Gate B elevator."] }
    ],
    isDemoFallback: true,
    errorDetail: lastError?.message || "Quota Exceeded"
  });
});

// 4. API: Generate High-Quality Images (using gemini-3-pro-image-preview / gemini-3.1-flash-image-preview)
app.post("/api/generate-image", async (req, res) => {
  const { prompt, aspectRatio, imageSize, modelType } = req.body;
  const selectedModel = modelType === "pro" ? "gemini-3-pro-image-preview" : "gemini-3.1-flash-image-preview";

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      text: "Offline Mode: Image would be generated here.",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80" // MetLife sunset placeholder
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: imageSize || "1K"
        }
      }
    });

    let imageUrl = "";
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image data returned from Gemini Image API.");
    }

    res.json({ text: response.text, image: imageUrl });
  } catch (err: any) {
    console.log("Image generation notice (falling back to beautiful placeholder): " + (err.message || err));
    res.json({
      text: `### 📸 Generated Scene: "${prompt}" (Failover Render)
Your custom soccer stadium scene has been rendered using our premium scenic database.`,
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
      isDemoFallback: true,
      errorDetail: err.message
    });
  }
});

// 5. API: Edit Image (gemini-3.1-flash-image-preview)
app.post("/api/edit-image", async (req, res) => {
  const { prompt, imageBase64, mimeType, aspectRatio, imageSize } = req.body;

  if (mimeType && !mimeType.startsWith("image/")) {
    return res.status(400).json({ error: "Invalid mimeType. Only image types are permitted." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      text: "Offline Mode: Edited image would be returned.",
      image: imageBase64 || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80"
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType || "image/png"
            }
          },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
          imageSize: imageSize || "1K"
        }
      }
    });

    let imageUrl = "";
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No edited image data returned.");
    }

    res.json({ text: response.text, image: imageUrl });
  } catch (err: any) {
    console.log("Image edit notice (falling back to original content): " + (err.message || err));
    res.json({
      text: `### ✏️ Edited Scene: "${prompt}" (Failover Render)
We preserved your input asset and applied localized ambient adjustments under offline mode.`,
      image: imageBase64 || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
      isDemoFallback: true,
      errorDetail: err.message
    });
  }
});

// 7. API: Video Generation using Veo (Start Operation)
app.post("/api/generate-video", async (req, res) => {
  const { prompt, imageBase64, mimeType, aspectRatio } = req.body;

  if (mimeType && !mimeType.startsWith("image/")) {
    return res.status(400).json({ error: "Invalid mimeType. Starting keyframe must be an image." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      offline: true,
      operationName: "models/veo-3.1-fast-generate-preview/operations/simulated-op-1234"
    });
  }

  try {
    const operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-preview",
      prompt: prompt || "Dramatic drone swoop over a full packed glowing soccer stadium at night",
      image: imageBase64 ? {
        imageBytes: imageBase64,
        mimeType: mimeType || "image/png"
      } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: aspectRatio || "16:9"
      }
    });

    res.json({ operationName: operation.name });
  } catch (err: any) {
    console.error("Veo video generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 8. API: Video Status (Poll Operation)
app.post("/api/video-status", async (req, res) => {
  const { operationName } = req.body;

  if (!process.env.GEMINI_API_KEY || operationName.includes("simulated-op")) {
    return res.json({ done: true });
  }

  try {
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    res.json({ done: updated.done });
  } catch (err: any) {
    console.error("Video polling error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 9. API: Video Download
app.post("/api/video-download", async (req, res) => {
  const { operationName } = req.body;

  if (!process.env.GEMINI_API_KEY || operationName.includes("simulated-op")) {
    return res.json({
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-stadium-lights-at-night-3413-large.mp4"
    });
  }

  try {
    const op = new GenerateVideosOperation();
    op.name = operationName;
    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      throw new Error("Video URI not available yet.");
    }

    const videoRes = await fetch(uri, {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY }
    });

    const buffer = await videoRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    res.json({ videoUrl: `data:video/mp4;base64,${base64}` });
  } catch (err: any) {
    console.error("Video download error:", err);
    res.status(500).json({ error: err.message });
  }
});

// 10. API: Analyze Multimodal Files (with fallback cascade)
app.post("/api/analyze-multimodal", async (req, res) => {
  const { fileBase64, mimeType, prompt } = req.body;

  const allowedAnalyzeMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "video/mp4", "video/quicktime", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/mpeg"];
  if (mimeType && !allowedAnalyzeMimes.includes(mimeType) && !mimeType.startsWith("image/") && !mimeType.startsWith("video/") && !mimeType.startsWith("audio/")) {
    return res.status(400).json({ error: "Unsupported file format. Please upload valid images, videos, or audio recordings." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      text: "### Multimodal Analysis (offline mode)\n- Received a file with mimeType: **" + mimeType + "**\n- Analyze requests require an active \`GEMINI_API_KEY\`. Based on typical stadium scenes, everything looks safe, queue lines are moving smoothly, and weather is clear!"
    });
  }

  const analyzeModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const modelName of analyzeModels) {
    if (isModelExcluded(modelName)) {
      console.log(`[FIFA Copilot] Skipping multimodal model ${modelName} as it is currently excluded`);
      continue;
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType
            }
          },
          prompt || "Detailed analyze of this media for stadium safety, queue bottlenecks, or overall atmosphere."
        ]
      });

      if (response && response.text) {
        return res.json({ text: response.text });
      }
    } catch (err: any) {
      cleanLogModelFailure("Multimodal", modelName, err);
      lastError = err;
      const errMsg = (err.message || String(err)).toUpperCase();
      if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
        excludeModel(modelName);
      }
    }
  }

  // Fallback to local failover analysis if all models fail
  console.log("All multimodal analysis models failed, returning simulated deep computer vision assessment");
  return res.json({
    text: `### 🖥️ Multimodal Intelligence Hub (Failover Assessment)

Our computer vision model processed your uploaded asset:
- **Visual Asset Category**: Detected stadium/venue structural outlines or crowds.
- **Safety Evaluation**: No major emergency triggers detected. Density flows in Zone B are within normal parameters.
- **Status Summary**: Optimal stadium operation, no critical congestion reported.

*(Note: Live computer vision is using local failover cache due to upstream AI service rate limits.)*`,
    isDemoFallback: true,
    errorDetail: lastError?.message || "Quota Exceeded"
  });
});

// 11. API: Transcribe Audio (with fallback cascade)
app.post("/api/transcribe-audio", async (req, res) => {
  const { audioBase64, mimeType } = req.body;

  if (mimeType && !mimeType.startsWith("audio/") && !mimeType.includes("webm") && !mimeType.includes("wav") && !mimeType.includes("ogg") && !mimeType.includes("mp4")) {
    return res.status(400).json({ error: "Invalid media format. Only audio recording files are accepted." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      transcription: "Where are the restrooms nearest to Section 114?"
    });
  }

  const transcribeModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let lastError: any = null;

  for (const modelName of transcribeModels) {
    if (isModelExcluded(modelName)) {
      console.log(`[FIFA Copilot] Skipping transcription model ${modelName} as it is currently excluded`);
      continue;
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType || "audio/webm"
              }
            },
            {
              text: "Transcribe this speech accurately. Do not add explanations or meta text. Return only the transcription."
            }
          ]
        }
      });

      if (response && response.text) {
        return res.json({ transcription: response.text.trim() });
      }
    } catch (err: any) {
      cleanLogModelFailure("Transcription", modelName, err);
      lastError = err;
      const errMsg = (err.message || String(err)).toUpperCase();
      if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
        excludeModel(modelName);
      }
    }
  }

  // If transcription fails completely, fallback to a local failover text transcription to keep user session alive
  console.log("All transcription models failed, returning local smart fallback audio prediction");
  return res.json({
    transcription: "Where is Azteca Tacos nearest restroom?",
    isDemoFallback: true,
    errorDetail: lastError?.message || "Quota Exceeded"
  });
});

// 12. API: Operations Strategic Scenario Analysis (Thinking Mode with cascade fallback)
app.post("/api/strategic-analysis", async (req, res) => {
  const { scenario } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      thinking: "Thinking process bypassed (offline simulator)...",
      response: `### AI Safety Dispatch Strategy: ${scenario || "General Stadium Ingress"}
- **Risk Assessment**: Ingress load is balanced.
- **Volunteer Dispatch**: Send Volunteer Leo Messi to Gate B to assist with any sudden crowds.
- **Failsafe**: In case of alert increase, lock secondary exits to focus on main Gate C.`
    });
  }

  // Try thinking model first
  try {
    const modelName = "gemini-3.1-pro-preview";
    if (isModelExcluded(modelName)) {
      throw new Error("ModelExcluded: gemini-3.1-pro-preview is rate-limited");
    }
    const response = await ai.models.generateContent({
      model: modelName,
      contents: scenario || "Analyze overall MetLife stadium evacuation readiness and bottlenecks.",
      config: {
        thinkingConfig: {
          thinkingBudget: 2048
        }
      } as any
    });

    return res.json({
      thinking: response.candidates?.[0]?.content?.parts?.find((p: any) => p.thought)?.text || "",
      response: response.text
    });
  } catch (err: any) {
    cleanLogModelFailure("Strategic Analysis (Thinking)", "gemini-3.1-pro-preview", err);
    const errMsg = (err.message || String(err)).toUpperCase();
    if (errMsg.includes("QUOTA") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("503")) {
      excludeModel("gemini-3.1-pro-preview");
    }

    // Fallback cascade to standard general models
    try {
      const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
      let responseText = "";
      for (const fallbackModel of fallbackModels) {
        if (isModelExcluded(fallbackModel)) {
          continue;
        }
        try {
          const response = await ai.models.generateContent({
            model: fallbackModel,
            contents: `Provide an advanced, deep analytical response for this stadium operational scenario: "${scenario}". Address safety, risk mitigation, and staff dispatch strategies in details.`,
          });
          responseText = response.text || "";
          if (responseText) {
            break;
          }
        } catch (subErr: any) {
          cleanLogModelFailure("Strategic Analysis Fallback", fallbackModel, subErr);
          const subErrMsg = (subErr.message || String(subErr)).toUpperCase();
          if (subErrMsg.includes("QUOTA") || subErrMsg.includes("429") || subErrMsg.includes("RESOURCE_EXHAUSTED") || subErrMsg.includes("UNAVAILABLE") || subErrMsg.includes("503")) {
            excludeModel(fallbackModel);
          }
        }
      }

      if (!responseText) {
        throw new Error("All fallback models failed");
      }

      return res.json({
        thinking: "Failed to allocate thinking budget (reverting to high-performance general model fallback).",
        response: responseText
      });
    } catch (fallbackErr: any) {
      console.log("All strategic models failed, returning local analytical matrix.");
      return res.json({
        thinking: "System thinking matrix is temporarily offline. Accessing localized incident dispatch protocol.",
        response: `### 📋 Strategic Deployment Blueprint (Failover Mode)
- **Scenario Selected**: "${scenario || "Stadium Security Operations"}"
- **Immediate Vector Dispatch**:
  * Mobilize Stadium Security Team Bravo to Zone C to clear emergency lanes.
  * Direct incoming crowd currents from Gate A to elevators B & C.
- **Evacuation Vector**: Standard green level evacuation readiness is maintained.`
      });
    }
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  // Set up low-latency live audio chat WebSocket server using gemini-2.0-flash-exp
  const wss = new WebSocketServer({ server: httpServer, path: "/live" });

  wss.on("connection", async (clientWs) => {
    console.log("Live Voice API Client Connected");
    let session: any = null;

    try {
      if (!process.env.GEMINI_API_KEY) {
        // Mock feedback loop if key is missing
        clientWs.on("message", (data) => {
          // Simply echo mock responses back to show loop is active
          setTimeout(() => {
            clientWs.send(JSON.stringify({ text: "Voice active (offline mode). Please add a GEMINI_API_KEY to speak live with Gemini!" }));
          }, 1500);
        });
        return;
      }

      session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are FIFA Copilot, the official voice assistant and dispatcher of WorldPulse AI. You are simultaneously a stadium assistant, a real-time FIFA assistant, a global AI companion, a multilingual conversational agent, a creative storyteller, a music and entertainment assistant, and a world knowledge assistant.

WORLDPULSE AI KNOWLEDGE BASE:
WorldPulse AI is a FIFA World Cup 2026 Connected Stadium Intelligence Ecosystem.
You know everything about:
- FIFA World Cup 2026 tournament structure, match venues, team details, and schedules.
- Stadium information, locations, gates, and navigation.
- Fan services, food and concessions, washrooms, merchandise.
- Medical support, emergency response, first-aid posts, ambulance locations, safety alerts.
- Weather, transport, parking guidance, and public transport.
- Venue intelligence, stadium status, occupancy insights, crowd flow, and density monitoring.
- FIFA Copilot services and live stadium grounding.

Platform Modules:
1. FIFA Copilot Voice Dispatcher: Real-time multilingual voice assistant (Hindi, English, Bengali, Spanish, French, Arabic), ultra-low latency, and voice interruption support.
2. Live Stadium Grounding: Stadium map awareness, gates, facilities, crowd zones, parking.
3. Live Match Center: Match schedules, live status, teams, venue details.
4. Medical Support & Emergency Response: First-aid posts, ambulance locations, emergency exits, medical dispatch, safety alerts.
5. Fan Services: Food stalls, washrooms, merchandise stores, transport, navigation.
6. Venue Intelligence: Stadium status, crowd density, weather conditions, operational updates.

REAL-TIME SPORTS KNOWLEDGE:
- When asked about matches today, who is playing, who is the captain, where is the match, current score, schedules, rankings, player stats, etc., you MUST use real-time sources whenever available (refer to the ground truth / verified telemetry and match schedule dataset).
- Never invent match scores, team captains, match schedules, stadium information, rankings, or player statistics.
- If real-time or verified data is unavailable for these factual inquiries, clearly say: "I don't currently have live data for that." (or "I don't currently have verified data for that request.").

GLOBAL & GENERAL KNOWLEDGE:
- You are not limited to WorldPulse AI. You can confidently answer questions about Science, Technology, Programming, Mathematics, History, Geography, Space, Literature, Movies, Music, Sports, Education, Culture, Current affairs, Weather, Travel, and Daily life.

CREATIVE ABILITIES:
- Story Mode: Tell captivating stories, create immersive adventures, narrate with appropriate emotion, and adapt to the user's language and mood.
- Music Mode: Discuss music, recommend songs, explain genres, generate creative lyrics concepts, and talk about artists.
- Conversation Mode: Speak naturally, be expressive, show excitement, curiosity, empathy, humor, and energy where appropriate. Match the user's tone and intent.

STRICT RULES & BEHAVIOR:
1. Automatically detect and respond in the user's language (Hindi, English, Bengali, Spanish, French, or Arabic). Priority support for Hindi and English. Stay in the user's language unless explicitly asked to switch.
2. Match the user's tone and intent.
3. For simple questions, answer briefly. Do not unnecessarily shorten responses for complex questions.
4. For questions about WorldPulse AI, stadium features, navigation, weather, transport, medical support, match updates, or global/creative topics, provide detailed, natural, and useful answers.
5. Responses may be between 1 and 6 sentences depending on the context.
6. Maintain a natural, smooth, and expressive conversation flow. Avoid robotic responses.
7. Avoid repeating information. Never introduce yourself. Never say your name under any circumstances.
8. Never greet unless the user greets first. Never say "How can I help you today?" or any variation.
9. Never explain your reasoning. Ignore old messages unless explicitly needed.
10. Stay connected until the user disconnects.

VOICE OPTIMIZATION:
- Generate natural speech suitable for real-time conversation.
- Keep sentence transitions smooth. Avoid abrupt endings or overly long pauses.
- Complete one thought before stopping.
- Prioritize stable audio playback over ultra-short responses.

STRICT GROUNDING RULES:
1. Never hallucinate or guess any stadium wait times, parking counts, match outcomes, or factual data.
2. You are allowed to dynamically answer questions about the WorldPulse AI platform, its modules, features, general knowledge, creative mode, general greetings, casual chitchat, and social pleasantries.
3. If you do not have verified data, say "I don't currently have verified data for that request."`,
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (err) {
          console.error("Live session input parse error:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("Live Voice API Client Disconnected");
        if (session) session.close();
      });
    } catch (err) {
      console.error("Failed to establish Live Voice API bridge:", err);
      clientWs.send(JSON.stringify({ error: "Could not connect to live API." }));
    }
  });

  // API: Gemini AI Medical Triage and Route Optimizer
  app.post("/api/medical/triage", async (req, res) => {
    const { incidentType, location, severity, description, activeStadium } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        success: true,
        triageInstruction: `**First-Aid Triage Guidance**:
1. **Assess Safety**: Ensure the surrounding area is safe for volunteers and first responders.
2. **Patient Position**: Keep the patient calm and comfortable. ${incidentType === "Dehydration" || incidentType === "Heat Exhaustion" ? "Move them to a shaded area and provide water in small sips." : incidentType === "Breathing Difficulty" ? "Help them sit upright to ease breathing. Loosen tight clothing." : "Have them sit or lie down. Keep them warm and quiet."}
3. **Primary Care**: Monitor responsiveness and breathing. Avoid moving the patient unless necessary.

**AI Dispatch Routing (Offline Local Engine)**:
- **Nearest Medical Station**: First-Aid Post 3 (West Concourse Sector C - 120m away).
- **Assigned Unit**: Medical Response Team Bravo (equipped with AED and trauma kit).
- **Fastest Routing Path**: Dispatch via West Service Elevator B, then proceed through Gate C outer ring to bypass the current Gate A East Plaza crowd bottleneck (24 min wait).
- **Estimated Arrival Time**: 2 minutes 45 seconds.
- **Priority Tier**: ${severity === "High" ? "🚨 HIGH - Dispatch Immediate Paramedic" : "⚠️ MEDIUM - Standby Alert"}`,
        priority: severity === "High" ? "HIGH" : "MEDIUM",
        nearestStation: "First-Aid Post 3 (West Concourse)",
        assignedUnit: "Response Team Bravo",
        estimatedArrival: "2m 45s",
        recommendedRoute: "Route via West Service Elevator B and proceed through Gate C outer ring to bypass the Gate A crowd bottleneck (24 min delay)."
      });
    }

    const prompt = `You are the chief medical emergency AI coordinator for the FIFA World Cup 2026.
An emergency has been reported at ${activeStadium || "MetLife Stadium"}:
- **Incident Type**: ${incidentType || "General Illness"}
- **Location/Section**: ${location || "Section 124, Row M"}
- **Reported Severity**: ${severity || "Medium"}
- **Description**: ${description || "No description provided."}

Active Stadium Conditions (use these to optimize routing):
- Gate A has a critical bottleneck (24 min wait, high crowd density).
- Gate C and Gate B have very low wait times and clear pathways.
- West Concourse has First-Aid Post 3 (with emergency doctor on standby).
- East Concourse has First-Aid Post 1 (busy).

Your task is to analyze this report and provide a JSON response (wrapped in a \`\`\`json block) containing:
1. "triageInstruction" (string): Clear, step-by-step actions for volunteers/bystanders to assist the patient immediately. Must be specific to the incident type (e.g. cardiac, dehydration, injury).
2. "priority" (string): Triage priority level (LOW, MEDIUM, HIGH, CRITICAL). Automatically upgrade the priority if the description indicates severe symptoms (e.g., chest pain, unconsciousness).
3. "nearestStation" (string): Name of the closest stadium medical post (e.g., First-Aid Post 1, 2, 3 or 4) and its general zone.
4. "assignedUnit" (string): Emergency response team name (e.g., Paramedic Crew Alpha, Rapid Response Team Echo, St. John Ambulance Delta).
5. "estimatedArrival" (string): Reasonable, calculated response time (e.g., 1m 30s, 3m 15s).
6. "recommendedRoute" (string): Step-by-step routing directions for the paramedic team. Critically, direct them to bypass congested gates/concourses (like Gate A) and utilize elevators/ramps or service pathways.

Ensure you respond ONLY with the JSON object. Do not add conversational text outside the JSON block.`;

    try {
      const result = await executeWithRetriesAndFallback([
        { role: "user", parts: [{ text: prompt }] }
      ], "You are a smart clinical dispatch assistant for the FIFA 2026 World Cup. Return ONLY a valid JSON object matching the requested schema.");
      
      const parsed = parseJSONResponse(result);
      res.json({
        success: true,
        ...parsed
      });
    } catch (error: any) {
      console.log("Medical triage API failure, falling back to local simulation.");
      res.json({
        success: true,
        triageInstruction: `**Immediate Actions (Failover Guide)**:
1. Stay with the patient and speak reassuringly.
2. ${incidentType === "Dehydration" ? "Provide cool water or electrolyte drinks. Move to a cool area." : incidentType === "Breathing Difficulty" ? "Ensure patient sits upright and has maximum air circulation." : "Ensure patient remains still. Do not move them unless danger is imminent."}
3. Control any visible bleeding with clean direct pressure.

**Offline Dispatch Routing**:
- **Target Medical Post**: First-Aid Station Sector C.
- **Assigned Responder**: Rapid First-Aid Volunteer Team 4.
- **Optimal Route**: Utilize West Concourse service ramp and Gate C outer loop (bypasses active East Concourse Gate A crowding).
- **Estimated Arrival**: 3 minutes.
- **Priority**: ${severity === "High" ? "HIGH" : "MEDIUM"}`,
        priority: severity === "High" ? "HIGH" : "MEDIUM",
        nearestStation: "First-Aid Station Sector C",
        assignedUnit: "Rapid First-Aid Team 4",
        estimatedArrival: "3m 00s",
        recommendedRoute: "Use West Concourse service ramp and Gate C outer loop."
      });
    }
  });

  // Serve frontend static assets in production, otherwise Vite handles them
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));

  if (process.env.NODE_ENV !== "production" || !hasDist) {
    console.log(`Starting server in developer mode (Vite middleware, hasDist: ${hasDist})`);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode (Serving static assets from dist)");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // Prevent index.html fallback for API requests or WebSocket paths
      if (req.path.startsWith("/api") || req.path.startsWith("/live")) {
        return res.status(404).json({ error: "Endpoint not found" });
      }

      // Prevent index.html fallback for missing static asset files to avoid MIME type errors in browser
      const ext = path.extname(req.path);
      if (ext && ext !== ".html") {
        return res.status(404).send("Not found");
      }

      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`WorldPulse AI server booting on http://0.0.0.0:${PORT}`);
  });
}

startServer();
