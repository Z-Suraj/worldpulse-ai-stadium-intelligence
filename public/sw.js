const CACHE_NAME = "worldpulse-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon-192.jpg",
  "/icon-512.jpg"
];

// Map tile patterns to cache (OpenStreetMap / Google Maps tiles)
const MAP_DOMAINS = [
  "tile.openstreetmap.org",
  "tile.thunderforest.com",
  "basemaps.cartocdn.com",
  "googleapis.com",
  "maps.gstatic.com",
  "maps.google.com"
];

// Critical API endpoints to cache with Network-First
const CRITICAL_APIS = [
  "/api/sensor-feed",
  "/api/decision-engine/insights",
  "/api/firebase-config",
  "/api/health"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching static assets...");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error("[Service Worker] Pre-cache failed (some assets might be dynamic):", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Clearing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Interceptor
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Critical API endpoints (Network-First, Fallback to Cache)
  const isCriticalApi = CRITICAL_APIS.some((path) => url.pathname.startsWith(path));
  if (isCriticalApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const contentType = response.headers.get("content-type") || "";
          // If the network response is an HTML page (error/SPA fallback), reject it to trigger the fallback block
          if (response.status !== 200 || contentType.includes("text/html")) {
            throw new Error("Invalid API response format (HTML received instead of JSON)");
          }
          // If successful and valid JSON, clone and put in cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          console.warn(`[Service Worker] Network failed for critical API: ${url.pathname}. Serving from cache...`);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return local simulated fallback response if cache is empty
            if (url.pathname.includes("/api/sensor-feed")) {
              return new Response(
                JSON.stringify({
                  activeStadium: "MetLife Stadium (Offline Cache)",
                  capacity: 82500,
                  activeAttendance: 78420,
                  offlineMode: true,
                  gates: [
                    { id: "A", name: "Gate A", load: 50, queueCount: 100, waitTime: 5, status: "Optimal" },
                    { id: "B", name: "Gate B", load: 30, queueCount: 40, waitTime: 2, status: "Optimal" },
                    { id: "C", name: "Gate C", load: 20, queueCount: 20, waitTime: 1, status: "Optimal" },
                    { id: "D", name: "Gate D", load: 40, queueCount: 80, waitTime: 4, status: "Optimal" }
                  ],
                  concessions: [],
                  transport: {
                    metro: { status: "Active", frequencyMins: 5, waitTimeMins: 10, load: 50, statusLabel: "Offline Mode" },
                    shuttle: { status: "Active", frequencyMins: 10, waitTimeMins: 5, load: 30, statusLabel: "Offline Mode" },
                    rideshare: { status: "Active", frequencyMins: 0, waitTimeMins: 15, load: 40, statusLabel: "Offline Mode" },
                    parkingC: { status: "Active", occupancy: 50, statusLabel: "Offline Mode" }
                  },
                  sustainability: {
                    energyConsumptionKw: 1200,
                    solarPowerGenerationKw: 600,
                    waterRecycledGallons: 10000,
                    wasteSortedKg: 1000,
                    co2SavedTons: 1.0,
                    sustainabilityScore: 90
                  },
                  incidents: [
                    { id: "INC-OFFLINE", title: "Offline Emergency Mode Active", location: "Stadium Grid", severity: "High", status: "Active", time: "NOW", description: "You are disconnected. Core telemetry maps are running on offline backup systems." }
                  ],
                  volunteers: [],
                  evacuationSimulating: false
                }),
                { headers: { "Content-Type": "application/json" } }
              );
            }
            return new Response(JSON.stringify({ error: "Offline fallback unavailable." }), {
              status: 503,
              headers: { "Content-Type": "application/json" }
            });
          });
        })
    );
    return;
  }

  // 2. Map Tiles and External Map assets (Cache-First)
  const isMapAsset = MAP_DOMAINS.some((domain) => url.hostname.includes(domain));
  if (isMapAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Serve a tiny blank map tile or let browser fail gracefully
          return new Response("", { status: 404 });
        });
      })
    );
    return;
  }

  // 3. Main static app shell & Vite dynamic assets (Network-First with Cache Fallback)
  // We use Network-First here so development changes build & display immediately,
  // while offline access is fully supported.
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache valid responses of static assets
        if (
          response.status === 200 &&
          (url.pathname === "/" ||
            url.pathname.endsWith(".html") ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".svg") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".jpg") ||
            url.pathname.includes("/assets/"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If the request is for an HTML page/route, fall back to main /
          if (request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/");
          }
          return new Response("Asset offline", { status: 408 });
        });
      })
  );
});
