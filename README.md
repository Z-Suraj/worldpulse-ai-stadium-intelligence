# 🏟️ WorldPulse AI — FIFA World Cup 2026 Connected Stadium Intelligence Ecosystem

> **Winner Standard Submission** • Real-time Stadium Digital Twin, Live IoT Simulations, Multi-Role Command Center, and Gemini-Powered Multilingual Voice Dispatcher.

---

## 🌟 Overview
**WorldPulse AI** is a next-generation, high-performance **Connected Stadium Intelligence Ecosystem** purpose-built for the **FIFA World Cup 2026**. This platform bridges physical stadium operations with deep digital intelligence, empowering tournament organizers, security commanders, transport scouts, and fans with real-time analytics, predictive scenario simulations, and a hands-free **FIFA Copilot Voice Dispatcher**.

With ultra-low latency, real-time WebSockets, dynamic IoT telemetry streaming, and state-of-the-art Generative AI integrations, WorldPulse AI transforms stadium management from reactive to predictive.

---

## 🛠️ Key Architectural Pillars

### 1. 🏟️ Stadium Digital Twin (`StadiumDigitalTwin`)
*   **Interactive Virtual Arena**: Real-time rendering of seating blocks, gates, VIP zones, field alignment, and perimeters.
*   **Sensor Heatmap Overlays**: Visualizes live crowd density, decibel levels, and entry-gate wait times.
*   **Dynamic Telemetry Feed**: Simulates sensor streams across multiple sectors with instant state transitions.

### 2. 🗺️ Connected Intelligence Map (`StadiumIntelligenceMap`)
*   **Tactical GPS Layer**: Live tracking of security patrols, emergency medical squads, and shuttle buses.
*   **Dynamic Operations Control**: Toggleable layers for crowd heat zones, transit vectors, and drone routes.
*   **Interactive Simulation Commands**: Directly dispatch emergency personnel to precise coordinate markers.

### 3. 🤖 FIFA Copilot operations Console (`CopilotPanel`)
*   **Contextual Gemini Integration**: Uses the official `@google/genai` SDK to ingest live telemetry, active incidents, and stadium metrics to answer complex operational questions instantly.
*   **Smart Triaging Assistant**: Automates checklist generation, safety procedure updates, and crowd flow guidelines.

### 4. 🎙️ Ultra-Low Latency Voice Dispatcher (`LiveWalkieTalkie`)
*   **Bidirectional Audio Streaming**: Direct real-time audio pipeline using high-performance Node WebSockets.
*   **Gapless Playback Engine**: Captures user microphone input at 16kHz PCM mono, streams raw binary data, and receives 24kHz PCM chunks back. It leverages gapless audio buffer scheduling with latency-jitter compensation (50ms guard interval).
*   **Natural Interruption Support**: Active playback cancels instantly if the user speaks or taps the mic, replicating a real Walkie-Talkie flow.
*   **Multilingual Support**: Supports **English, Hindi, Bengali, Spanish, French, and Arabic** natively.

### 5. 🚨 Incident Command & Dispatch (`IncidentCommand`)
*   **Live Incident Ledger**: Centrally tracks, maps, and ranks critical events (medical emergency, drone alarms, ticket jams).
*   **Dynamic Priority Triage**: Classifies alerts with customized severe indicators (Critical, High, Medium, Low).
*   **Direct-Action Dispatching**: Fast-dispatches safety units (Medical, Security, Fire) with live ETA tracking.

### 6. 🚌 Transit Scout Telemetry (`TransitScout`)
*   **Shuttle Logistics Engine**: Direct monitoring of transit lines, bus capacities, passenger queues, and wait times.
*   **Interactive Vector Paths**: Map lines representing current transportation flow and congestion states.

### 7. 📸 Fan Engagement Photo Booth (`PhotoBooth`)
*   **Custom Overlays & Filters**: Premium interactive camera booth with custom FIFA World Cup 2026 branding.
*   **Device Permissions Capture**: Elegant visual overlays simulating live capture experiences.

### 8. 📊 Evacuation Scenario Simulator (`StrategicScenarioPlanner`)
*   **Stress-Test Scenarios**: Allows operations team to model evacuations, gate closures, or drone security paths.
*   **Operational Comparison**: Live evaluation of simulated vs. actual incident dispersion and response times.

### 9. 🔐 Secure User Workspace (`FirebaseUserProfile`)
*   **Cloud Authorization**: Secure integration with Google Firebase Authentication.
*   **Durable Cloud Storage**: Fully synchronized profile details, preferences, and ledger logs using Firestore.

---

## ⚡ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 18 + Vite |
| **Language** | TypeScript (100% Type Safe) |
| **Styling & UI** | Tailwind CSS v4 + Framer Motion (`motion/react`) |
| **Icons & Visuals** | Lucide React |
| **Backend Runtime** | Express.js (Express v4 + custom Node WebSockets) |
| **Database & Auth** | Google Firebase (Auth & Cloud Firestore) |
| **AI Integration** | Google Gemini API (via `@google/genai` SDK) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18 or higher) and `npm` installed.

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/worldpulse-ai.git
cd worldpulse-ai

# Install dependencies
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="your_gemini_api_key_here"
PORT=3000
```

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see your local instance with Hot Module Replacement (HMR).

### 5. Production Build & Execution
```bash
# Compile both the React frontend and bundle the backend TypeScript server
npm run build

# Start the production server
npm start
```

---

## 🔮 Core Engineering Highlights

### Real-Time Audio Pipeline Optimization
```text
  [ User Microphone ] ---> 16kHz PCM Mono ---> [ Base64 WebSocket Stream ]
                                                           |
                                                   (Express Server)
                                                           |
  [ User Audio Output ] <--- 24kHz Buffer <--- [ Gemini Live Response ]
```
The Voice Dispatcher utilizes a highly optimized custom buffer scheduling algorithm that eliminates audio jitter. High-performance `ScriptProcessorNode` streams captured PCM audio directly via a WebSocket bridge. The incoming 24kHz stream is written dynamically into the Web Audio API's playout queue, calculating `nextStartTime` with a precise timing guard window to guarantee premium broadcast quality.

---

## 📜 License
This project is licensed under the MIT License.
