# 🏆 WorldPulse AI — FIFA World Cup 2026 Stadium Intelligence Ecosystem

WorldPulse AI is a next-generation GenAI-powered stadium intelligence ecosystem designed for the FIFA World Cup 2026. It combines real-time digital twin simulations, operational KPIs, multi-role dashboards, interactive maps, dynamic transit intelligence, and the **FIFA Copilot** powered by Google Gemini.

Designed for stadium operations teams, security commanders, transit scouts, and fans, WorldPulse AI bridges the gap between physical stadium operations and digital intelligence.

---

## 🚀 Key Features

### 1. 🏟️ Stadium Digital Twin (`StadiumDigitalTwin`)
- **3D-like Interactive Visualization**: Real-time rendering of stadium seating, fields, zones, and security perimeter lines.
- **Dynamic Seating Capacity Tracking**: Real-time monitoring of crowd density, VIP areas, active exits, and gate occupancy.
- **Sensor Overlays**: Visual heatmaps highlighting crowd heat, noise levels, and gate flow metrics.

### 2. 🗺️ Stadium Intelligence Map (`StadiumIntelligenceMap`)
- **Interactive Multi-Level Map**: Real-time position tracking of security personnel, drones, medical squads, and transit shuttles.
- **Dynamic Zone Security Control**: Toggle views for Crowd Heatmaps, Transit Shuttles, and Security Patrol Routes.
- **Mock GPS Simulation**: Interactive navigation guides for operational teams.

### 3. 🤖 FIFA Copilot (`CopilotPanel`)
- **Gemini-Powered AI Assistant**: Built using the `@google/genai` SDK to handle complex operations queries, incident triaging, and real-time situational assistance.
- **Context-Aware Assistance**: Automatically fetches live stadium KPIs and sensor metrics to answer coordinator queries with precision.

### 4. 🚨 Incident Command Center (`IncidentCommand`)
- **Real-Time Incident Logger**: Track critical safety events (e.g., medical emergency, ticketing issues, security alarms) live.
- **Visual Heatmap & Priority Triage**: Incidents are mapped onto zones with dynamic severity levels (Critical, High, Medium, Low).
- **Direct Dispatch controls**: Instantly dispatch emergency units (Security, Medical, Fire) directly from the command view.

### 5. 🚌 Transit Scout (`TransitScout`)
- **Dynamic Shuttle Tracking**: Real-time monitoring of stadium shuttles, passenger wait times, and shuttle statuses.
- **Interactive Map Layers**: Shows exact vehicle positions, congestion levels, and estimated time of arrivals (ETAs) to nearby transit hubs.

### 6. 🎙️ Live Walkie-Talkie (`LiveWalkieTalkie`)
- **Audio Simulation Engine**: Simulates tactical radio channels (Operations, Security, Logistics) with status tones, realistic static, and push-to-talk (PTT) capabilities.
- **Direct Recording**: Supports interactive audio tests with direct microphone usage and signal quality analyzers.

### 7. 📸 Fan Photo Booth (`PhotoBooth`)
- **Interactive Fan Engagement**: Fans can select premium customized templates, filters, and overlays tailored for the FIFA World Cup 2026.
- **Microphone and Camera Interactions**: Integrated permission requests for realistic digital photography capturing.

### 8. 📊 Strategic Scenario Planner (`StrategicScenarioPlanner`)
- **Simulations & Stress Tests**: Allows managers to model complex crowd evacuations, drone patrols, and gate congestion scenarios.
- **Real-Time Metrics Comparison**: Shows simulated vs. actual security dispatch times and crowd dispersion rates.

### 9. 🔐 Firebase User Profile (`FirebaseUserProfile`)
- **Secure Authentication & Management**: Complete profile management integrated directly with Google Firebase (Auth & Firestore).
- **Persistent Operations Ledger**: Keeps profile details synced securely across sessions.

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (`motion/react`)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend Service**: [Express.js](https://expressjs.com/) (REST APIs, Static Asset Hosting, Vite Middleware in Dev)
- **Database & Auth**: [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **AI Core**: `@google/genai` (Google Gemini API)

---

## 📂 Project Structure

```text
├── assets/                 # Shared media & design assets
├── public/                 # Static files (Icons, Web Manifest, Service Worker)
│   ├── icon.svg            # Custom Vector App Icon
│   ├── sw.js               # Service Worker for PWA / offline support
│   └── manifest.json       # Web Manifest for mobile installation
├── server.ts               # Production-ready full-stack Express server
├── src/
│   ├── App.tsx             # Main routing, state, and dashboard views
│   ├── index.css           # Global styles and Tailwind configuration
│   ├── main.tsx            # React application mount point
│   ├── components/         # Modular feature components
│   │   ├── CinematicLanding.tsx             # Gorgeous video-style welcome landing
│   │   ├── CopilotPanel.tsx                 # AI Assistant using Gemini API
│   │   ├── FirebaseUserProfile.tsx          # User login & database syncing
│   │   ├── IncidentCommand.tsx              # Command room operations & alerts
│   │   ├── LiveWalkieTalkie.tsx             # Audio radio control simulation
│   │   ├── PhotoBooth.tsx                   # Interactive photography module
│   │   ├── StadiumDigitalTwin.tsx           # Interactive 3D/2D stadium viewport
│   │   ├── StadiumIntelligenceDashboard.tsx # Executive real-time KPI overview
│   │   ├── StadiumIntelligenceMap.tsx       # Complex navigation & security tracker
│   │   └── StrategicScenarioPlanner.tsx     # Evacuation & security pathing simulation
│   │   └── TransitScout.tsx                 # Bus/train schedule & shuttle telemetry
```

---

## ⚙️ Getting Started (Local Setup)

Follow these simple steps to set up and run the project locally on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/worldpulse-ai.git
cd worldpulse-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root directory based on the provided `.env.example`:
```bash
cp .env.example .env
```

Fill in your API keys in `.env`:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GOOGLE_MAPS_PLATFORM_KEY="YOUR_GOOGLE_MAPS_PLATFORM_KEY"
APP_URL="http://localhost:3000"
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application with live Hot Module Replacement (HMR).

### 5. Build for Production
To build both the React frontend and bundle the backend TypeScript server into a high-performance single file:
```bash
npm run build
```

### 6. Start Production Server
```bash
npm start
```

---

## ⚡ Production Deployment Guidelines
When hosting on platforms like **Google Cloud Run**, **Render**, or **Heroku**:
- Ensure `NODE_ENV=production` is set in the environment variables.
- Add your secret keys (`GEMINI_API_KEY`, `GOOGLE_MAPS_PLATFORM_KEY`, etc.) directly into the hosting provider's Secrets/Environment configuration.
- The compiled CJS Express server (`dist/server.cjs`) binds to host `0.0.0.0` and port `3000` automatically to support containerized hosting perfectly.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/YOUR_USERNAME/worldpulse-ai/issues).

## 📄 License
This project is licensed under the MIT License.
