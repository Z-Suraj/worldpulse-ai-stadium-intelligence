import React, { useState, useEffect, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from "@vis.gl/react-google-maps";
import {
  MapPin,
  Layers,
  Navigation,
  Maximize2,
  Plus,
  Minus,
  Info,
  Train,
  ShoppingBag,
  Utensils,
  ShieldAlert,
  Activity,
  Compass,
  CheckCircle,
  Eye,
  AlertTriangle,
  Globe
} from "lucide-react";

// Get API Key from environment or secrets
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

// Theme styles for Google Maps (Deep cyber tactical theme)
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#090d16" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#090d16" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a94a6" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334155" }] }
];

export interface MapFeature {
  id: string;
  name: string;
  type: "gate" | "parking" | "transit" | "food" | "merch" | "emergency" | "checkpoint";
  lat: number;
  lng: number;
  details?: string;
  // Fallback map SVG coordinates
  fx: number;
  fy: number;
}

export interface StadiumGeoData {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  capacity: string;
  weather: string;
  tickets: string;
  match: string;
  travel: string;
  boundary: { lat: number; lng: number; fx: number; fy: number }[];
  features: MapFeature[];
  heatmapPoints: { lat: number; lng: number; fx: number; fy: number; intensity: number }[];
  transitPath: { lat: number; lng: number; fx: number; fy: number }[];
  emergencyPath: { lat: number; lng: number; fx: number; fy: number }[];
}

// 5 FIFA World Cup 2026 Stadiums with precise geodata & fallback SVG mappings
const STADIUMS_DATABASE: Record<string, StadiumGeoData> = {
  VAN: {
    id: "VAN",
    name: "BC Place",
    city: "Vancouver",
    country: "Canada",
    lat: 49.2768,
    lng: -123.1120,
    capacity: "54,500",
    weather: "Light Rain • 16°C / 61°F",
    tickets: "Selling Fast (94.2%)",
    match: "Canada vs England",
    travel: "SkyTrain Expo Line directly to Stadium Station",
    boundary: [
      { lat: 49.2780, lng: -123.1135, fx: 150, fy: 110 },
      { lat: 49.2782, lng: -123.1110, fx: 250, fy: 110 },
      { lat: 49.2768, lng: -123.1095, fx: 290, fy: 160 },
      { lat: 49.2755, lng: -123.1105, fx: 250, fy: 210 },
      { lat: 49.2753, lng: -123.1130, fx: 150, fy: 210 },
      { lat: 49.2765, lng: -123.1145, fx: 110, fy: 160 }
    ],
    features: [
      { id: "g-a", name: "Gate A (Main Entry)", type: "gate", lat: 49.2778, lng: -123.1115, details: "Fast lanes open. Wait time: 3 mins", fx: 230, fy: 120 },
      { id: "g-b", name: "Gate B (North Entry)", type: "gate", lat: 49.2772, lng: -123.1098, details: "Moderate queue. Wait time: 11 mins", fx: 280, fy: 150 },
      { id: "g-c", name: "Gate C (West Entry)", type: "gate", lat: 49.2758, lng: -123.1128, details: "Clear entry. Wait time: 2 mins", fx: 160, fy: 200 },
      { id: "g-d", name: "Gate D (South Entry)", type: "gate", lat: 49.2763, lng: -123.1138, details: "Slight congestion. Wait time: 8 mins", fx: 130, fy: 170 },
      { id: "p-1", name: "Parking Plaza West", type: "parking", lat: 49.2758, lng: -123.1150, details: "Occupancy: 84%", fx: 90, fy: 220 },
      { id: "p-2", name: "VIP Deck Parking", type: "parking", lat: 49.2785, lng: -123.1100, details: "Occupancy: 95%", fx: 280, fy: 80 },
      { id: "t-1", name: "Stadium-Chinatown SkyTrain", type: "transit", lat: 49.2795, lng: -123.1095, details: "Trains every 3 mins. Fully operational", fx: 310, fy: 60 },
      { id: "f-1", name: "Maple Lounge Court", type: "food", lat: 49.2770, lng: -123.1110, details: "Queue: 5 mins", fx: 220, fy: 150 },
      { id: "m-1", name: "Team Canada Merch Hub", type: "merch", lat: 49.2765, lng: -123.1125, details: "No queue", fx: 180, fy: 170 },
      { id: "e-1", name: "Emergency Exit North-West", type: "emergency", lat: 49.2785, lng: -123.1140, details: "Evacuation route active", fx: 120, fy: 80 },
      { id: "c-1", name: "Fan Entry Checkpoint B", type: "checkpoint", lat: 49.2790, lng: -123.1112, details: "Baggage screening fully active", fx: 240, fy: 70 }
    ],
    heatmapPoints: [
      { lat: 49.2778, lng: -123.1115, fx: 230, fy: 120, intensity: 0.8 },
      { lat: 49.2772, lng: -123.1098, fx: 280, fy: 150, intensity: 0.95 },
      { lat: 49.2768, lng: -123.1120, fx: 200, fy: 160, intensity: 0.6 }
    ],
    transitPath: [
      { lat: 49.2795, lng: -123.1095, fx: 310, fy: 60 },
      { lat: 49.2788, lng: -123.1105, fx: 260, fy: 90 },
      { lat: 49.2778, lng: -123.1115, fx: 230, fy: 120 }
    ],
    emergencyPath: [
      { lat: 49.2768, lng: -123.1120, fx: 200, fy: 160 },
      { lat: 49.2780, lng: -123.1135, fx: 150, fy: 110 },
      { lat: 49.2785, lng: -123.1140, fx: 120, fy: 80 }
    ]
  },
  LA: {
    id: "LA",
    name: "SoFi Stadium",
    city: "Los Angeles",
    country: "USA",
    lat: 33.9535,
    lng: -118.3392,
    capacity: "70,000",
    weather: "Sunny • 22°C / 72°F",
    tickets: "Sold Out (100%)",
    match: "USA vs Italy (Warmup)",
    travel: "Metro K Line shuttle directly to stadium",
    boundary: [
      { lat: 33.9555, lng: -118.3415, fx: 140, fy: 90 },
      { lat: 33.9558, lng: -118.3375, fx: 260, fy: 90 },
      { lat: 33.9535, lng: -118.3360, fx: 300, fy: 160 },
      { lat: 33.9512, lng: -118.3375, fx: 260, fy: 230 },
      { lat: 33.9509, lng: -118.3410, fx: 140, fy: 230 },
      { lat: 33.9532, lng: -118.3425, fx: 100, fy: 160 }
    ],
    features: [
      { id: "g-a", name: "Gate A (East Entry)", type: "gate", lat: 33.9548, lng: -118.3370, details: "Clear. Wait time: 1 min", fx: 270, fy: 110 },
      { id: "g-b", name: "Gate B (North Entry)", type: "gate", lat: 33.9553, lng: -118.3390, details: "Pulsing queue. Wait time: 12 mins", fx: 200, fy: 95 },
      { id: "g-c", name: "Gate C (West Entry)", type: "gate", lat: 33.9525, lng: -118.3418, details: "Fast lanes active. Wait time: 4 mins", fx: 120, fy: 180 },
      { id: "g-d", name: "Gate D (South Entry)", type: "gate", lat: 33.9515, lng: -118.3385, details: "Moderate queue. Wait time: 7 mins", fx: 210, fy: 220 },
      { id: "p-1", name: "SoFi Lot N", type: "parking", lat: 33.9502, lng: -118.3425, details: "Occupancy: 91%", fx: 80, fy: 250 },
      { id: "p-2", name: "SoFi Lot H", type: "parking", lat: 33.9565, lng: -118.3360, details: "Occupancy: 76%", fx: 310, fy: 60 },
      { id: "t-1", name: "Metro K Line Shuttle Hub", type: "transit", lat: 33.9615, lng: -118.3440, details: "Buses running every 2 mins", fx: 60, fy: 30 },
      { id: "f-1", name: "Pacific Foods Court", type: "food", lat: 33.9535, lng: -118.3385, details: "Queue: 8 mins", fx: 210, fy: 160 },
      { id: "m-1", name: "FIFA Official Superstore", type: "merch", lat: 33.9538, lng: -118.3400, details: "Queue: 15 mins", fx: 170, fy: 150 },
      { id: "e-1", name: "Emergency Exit South-West", type: "emergency", lat: 33.9495, lng: -118.3400, details: "Emergency clearance path 100% OK", fx: 170, fy: 270 },
      { id: "c-1", name: "Canyon Gate Checkpoint", type: "checkpoint", lat: 33.9560, lng: -118.3400, details: "High throughput scanning active", fx: 170, fy: 70 }
    ],
    heatmapPoints: [
      { lat: 33.9553, lng: -118.3390, fx: 200, fy: 95, intensity: 0.9 },
      { lat: 33.9538, lng: -118.3400, fx: 170, fy: 150, intensity: 0.75 },
      { lat: 33.9525, lng: -118.3418, fx: 120, fy: 180, intensity: 0.6 }
    ],
    transitPath: [
      { lat: 33.9615, lng: -118.3440, fx: 60, fy: 30 },
      { lat: 33.9585, lng: -118.3420, fx: 110, fy: 80 },
      { lat: 33.9553, lng: -118.3390, fx: 200, fy: 95 }
    ],
    emergencyPath: [
      { lat: 33.9535, lng: -118.3392, fx: 200, fy: 160 },
      { lat: 33.9509, lng: -118.3410, fx: 140, fy: 230 },
      { lat: 33.9495, lng: -118.3400, fx: 170, fy: 270 }
    ]
  },
  DAL: {
    id: "DAL",
    name: "AT&T Stadium",
    city: "Dallas",
    country: "USA",
    lat: 32.7473,
    lng: -97.0945,
    capacity: "80,000",
    weather: "Humid • 28°C / 82°F",
    tickets: "Sold Out (100%)",
    match: "Brazil vs Spain (Group Stage)",
    travel: "TRE Rail Shuttle link from CentrePort",
    boundary: [
      { lat: 32.7495, lng: -97.0965, fx: 130, fy: 90 },
      { lat: 32.7498, lng: -97.0925, fx: 270, fy: 90 },
      { lat: 32.7473, lng: -97.0910, fx: 310, fy: 160 },
      { lat: 32.7448, lng: -97.0925, fx: 270, fy: 230 },
      { lat: 32.7445, lng: -97.0965, fx: 130, fy: 230 },
      { lat: 32.7470, lng: -97.0980, fx: 90, fy: 160 }
    ],
    features: [
      { id: "g-a", name: "Gate A (Main West)", type: "gate", lat: 32.7485, lng: -97.0960, details: "Extremely busy. Wait time: 18 mins", fx: 150, fy: 110 },
      { id: "g-b", name: "Gate B (North Entrance)", type: "gate", lat: 32.7490, lng: -97.0940, details: "Normal queue. Wait time: 6 mins", fx: 220, fy: 95 },
      { id: "g-c", name: "Gate C (Main East)", type: "gate", lat: 32.7460, lng: -97.0928, details: "Clear lanes. Wait time: 2 mins", fx: 260, fy: 190 },
      { id: "g-d", name: "Gate D (South Entrance)", type: "gate", lat: 32.7455, lng: -97.0950, details: "Fast queue. Wait time: 4 mins", fx: 180, fy: 215 },
      { id: "p-1", name: "Blue Lot 10", type: "parking", lat: 32.7435, lng: -97.0975, details: "Occupancy: 88%", fx: 90, fy: 260 },
      { id: "p-2", name: "Silver Lot 4", type: "parking", lat: 32.7510, lng: -97.0920, details: "Occupancy: 94%", fx: 290, fy: 50 },
      { id: "t-1", name: "TRE Shuttle Terminal", type: "transit", lat: 32.7445, lng: -97.0910, details: "Connecting trains to Dallas/Fort Worth", fx: 310, fy: 240 },
      { id: "f-1", name: "Lone Star Foods", type: "food", lat: 32.7470, lng: -97.0940, details: "Queue: 9 mins", fx: 220, fy: 160 },
      { id: "m-1", name: "Texas Megastore", type: "merch", lat: 32.7475, lng: -97.0950, details: "Queue: 7 mins", fx: 180, fy: 150 },
      { id: "e-1", name: "Emergency Exit East Gate", type: "emergency", lat: 32.7473, lng: -97.0900, details: "Auxiliary clear", fx: 340, fy: 160 },
      { id: "c-1", name: "Miller Lite Plaza Security", type: "checkpoint", lat: 32.7505, lng: -97.0955, details: "Pre-screening active", fx: 170, fy: 60 }
    ],
    heatmapPoints: [
      { lat: 32.7485, lng: -97.0960, fx: 150, fy: 110, intensity: 0.98 },
      { lat: 32.7475, lng: -97.0950, fx: 180, fy: 150, intensity: 0.8 },
      { lat: 32.7490, lng: -97.0940, fx: 220, fy: 95, intensity: 0.6 }
    ],
    transitPath: [
      { lat: 32.7445, lng: -97.0910, fx: 310, fy: 240 },
      { lat: 32.7455, lng: -97.0920, fx: 290, fy: 200 },
      { lat: 32.7460, lng: -97.0928, fx: 260, fy: 190 }
    ],
    emergencyPath: [
      { lat: 32.7473, lng: -97.0945, fx: 200, fy: 160 },
      { lat: 32.7473, lng: -97.0910, fx: 310, fy: 160 },
      { lat: 32.7473, lng: -97.0900, fx: 340, fy: 160 }
    ]
  },
  MEX: {
    id: "MEX",
    name: "Estadio Azteca",
    city: "Mexico City",
    country: "Mexico",
    lat: 19.3029,
    lng: -99.1505,
    capacity: "87,500",
    weather: "Clear Sky • 21°C / 70°F",
    tickets: "98.4% Booked",
    match: "Mexico vs USA",
    travel: "CDMX Tren Ligero directly to Estadio Azteca",
    boundary: [
      { lat: 19.3045, lng: -99.1525, fx: 130, fy: 90 },
      { lat: 19.3048, lng: -99.1485, fx: 270, fy: 90 },
      { lat: 19.3025, lng: -99.1470, fx: 310, fy: 160 },
      { lat: 19.3005, lng: -99.1485, fx: 270, fy: 230 },
      { lat: 19.3002, lng: -99.1525, fx: 130, fy: 230 },
      { lat: 19.3025, lng: -99.1540, fx: 90, fy: 160 }
    ],
    features: [
      { id: "g-a", name: "Gate A (North Entrance)", type: "gate", lat: 19.3040, lng: -99.1495, details: "Heavily congested. Wait time: 24 mins", fx: 240, fy: 110 },
      { id: "g-b", name: "Gate B (East Entrance)", type: "gate", lat: 19.3015, lng: -99.1492, details: "Fast entry. Wait time: 3 mins", fx: 250, fy: 190 },
      { id: "g-c", name: "Gate C (West Entrance)", type: "gate", lat: 19.3020, lng: -99.1520, details: "Moderate queue. Wait time: 10 mins", fx: 140, fy: 180 },
      { id: "g-d", name: "Gate D (South Entrance)", type: "gate", lat: 19.3045, lng: -99.1515, details: "Clear. Wait time: 2 mins", fx: 160, fy: 100 },
      { id: "p-1", name: "Azteca Parking Estacionamiento", type: "parking", lat: 19.2990, lng: -99.1540, details: "Occupancy: 89%", fx: 70, fy: 270 },
      { id: "p-2", name: "VIP Parking Norte", type: "parking", lat: 19.3060, lng: -99.1500, details: "Occupancy: 97%", fx: 220, fy: 40 },
      { id: "t-1", name: "Estación Estadio Azteca (Tren Ligero)", type: "transit", lat: 19.3025, lng: -99.1465, details: "Fully active. High transit frequency", fx: 320, fy: 160 },
      { id: "f-1", name: "Azteca Tacos & Cantina", type: "food", lat: 19.3025, lng: -99.1510, details: "Queue: 22 mins", fx: 180, fy: 160 },
      { id: "m-1", name: "Socio Azteca Store", type: "merch", lat: 19.3032, lng: -99.1500, details: "Queue: 5 mins", fx: 220, fy: 140 },
      { id: "e-1", name: "Emergency Exit North-East", type: "emergency", lat: 19.3055, lng: -99.1480, details: "Medical backup crew deployed", fx: 280, fy: 50 },
      { id: "c-1", name: "Explanada de Acceso Checkpoint", type: "checkpoint", lat: 19.3050, lng: -99.1510, details: "Biometric ticket screening active", fx: 180, fy: 70 }
    ],
    heatmapPoints: [
      { lat: 19.3040, lng: -99.1495, fx: 240, fy: 110, intensity: 0.99 },
      { lat: 19.3025, lng: -99.1510, fx: 180, fy: 160, intensity: 0.85 },
      { lat: 19.3020, lng: -99.1520, fx: 140, fy: 180, intensity: 0.7 }
    ],
    transitPath: [
      { lat: 19.3025, lng: -99.1465, fx: 320, fy: 160 },
      { lat: 19.3020, lng: -99.1485, fx: 270, fy: 175 },
      { lat: 19.3015, lng: -99.1492, fx: 250, fy: 190 }
    ],
    emergencyPath: [
      { lat: 19.3029, lng: -99.1505, fx: 200, fy: 160 },
      { lat: 19.3045, lng: -99.1490, fx: 250, fy: 100 },
      { lat: 19.3055, lng: -99.1480, fx: 280, fy: 50 }
    ]
  },
  NY: {
    id: "NY",
    name: "MetLife Stadium",
    city: "New York/New Jersey",
    country: "USA",
    lat: 40.8135,
    lng: -74.0744,
    capacity: "82,500",
    weather: "Partly Cloudy • 24°C / 75°F",
    tickets: "Sold Out (100%)",
    match: "Argentina vs France",
    travel: "NJ Transit Meadowlands Rail directly from NY Penn",
    boundary: [
      { lat: 40.8155, lng: -74.0765, fx: 140, fy: 90 },
      { lat: 40.8158, lng: -74.0725, fx: 260, fy: 90 },
      { lat: 40.8135, lng: -74.0710, fx: 300, fy: 160 },
      { lat: 40.8112, lng: -74.0725, fx: 260, fy: 230 },
      { lat: 40.8109, lng: -74.0760, fx: 140, fy: 230 },
      { lat: 40.8132, lng: -74.0775, fx: 100, fy: 160 }
    ],
    features: [
      { id: "g-a", name: "Gate A (East Entry)", type: "gate", lat: 40.8138, lng: -74.0722, details: "VIP lounge queue fully clear. Wait: 2 mins", fx: 270, fy: 140 },
      { id: "g-b", name: "Gate B (North Entry)", type: "gate", lat: 40.8150, lng: -74.0742, details: "Pulsing ticket lines. Wait time: 14 mins", fx: 210, fy: 100 },
      { id: "g-c", name: "Gate C (West Entry)", type: "gate", lat: 40.8135, lng: -74.0762, details: "Rerouted clear stream. Wait time: 4 mins", fx: 130, fy: 160 },
      { id: "g-d", name: "Gate D (South Entry)", type: "gate", lat: 40.8118, lng: -74.0744, details: "Standard queues. Wait time: 7 mins", fx: 200, fy: 210 },
      { id: "p-1", name: "Meadowlands Lot J", type: "parking", lat: 40.8102, lng: -74.0780, details: "Occupancy: 86%", fx: 80, fy: 250 },
      { id: "p-2", name: "Meadowlands Lot E", type: "parking", lat: 40.8168, lng: -74.0710, details: "Occupancy: 95%", fx: 310, fy: 50 },
      { id: "t-1", name: "Meadowlands Station (NJT)", type: "transit", lat: 40.8115, lng: -74.0710, details: "Trains running frequently. Boarding Gate active", fx: 300, fy: 210 },
      { id: "f-1", name: "MetLife Concourse Grills", type: "food", lat: 40.8132, lng: -74.0752, details: "Queue: 4 mins", fx: 170, fy: 170 },
      { id: "m-1", name: "FIFA Fan Store Gate A", type: "merch", lat: 40.8140, lng: -74.0732, details: "Queue: 8 mins", fx: 230, fy: 130 },
      { id: "e-1", name: "Emergency Exit West Path", type: "emergency", lat: 40.8142, lng: -74.0785, details: "Airfield escape route open", fx: 70, fy: 130 },
      { id: "c-1", name: "Pedestrian Security Checkpoint A", type: "checkpoint", lat: 40.8148, lng: -74.0715, details: "All metal detectors green", fx: 290, fy: 100 }
    ],
    heatmapPoints: [
      { lat: 40.8150, lng: -74.0742, fx: 210, fy: 100, intensity: 0.95 },
      { lat: 40.8138, lng: -74.0722, fx: 270, fy: 140, intensity: 0.7 },
      { lat: 40.8135, lng: -74.0762, fx: 130, fy: 160, intensity: 0.55 }
    ],
    transitPath: [
      { lat: 40.8115, lng: -74.0710, fx: 300, fy: 210 },
      { lat: 40.8126, lng: -74.0716, fx: 285, fy: 175 },
      { lat: 40.8138, lng: -74.0722, fx: 270, fy: 140 }
    ],
    emergencyPath: [
      { lat: 40.8135, lng: -74.0744, fx: 200, fy: 160 },
      { lat: 40.8138, lng: -74.0768, fx: 115, fy: 145 },
      { lat: 40.8142, lng: -74.0785, fx: 70, fy: 130 }
    ]
  }
};

// Polyline helper component for React Google Maps
function MapPolyline({ path, options }: { path: google.maps.LatLngLiteral[]; options?: google.maps.PolylineOptions }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const polyline = new google.maps.Polyline({
      path,
      map,
      ...options
    });
    return () => polyline.setMap(null);
  }, [map, path, options]);
  return null;
}

// Polygon helper component for React Google Maps
function MapPolygon({ paths, options }: { paths: google.maps.LatLngLiteral[]; options?: google.maps.PolygonOptions }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const polygon = new google.maps.Polygon({
      paths,
      map,
      ...options
    });
    return () => polygon.setMap(null);
  }, [map, paths, options]);
  return null;
}

// Controller component to center and zoom map when stadium changes
function MapCenterController({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(zoom);
    }
  }, [map, lat, lng, zoom]);
  return null;
}

interface StadiumIntelligenceMapProps {
  selectedCityId: string;
  onSelectCity: (id: string) => void;
}

export default function StadiumIntelligenceMap({ selectedCityId, onSelectCity }: StadiumIntelligenceMapProps) {
  const geoData = STADIUMS_DATABASE[selectedCityId] || STADIUMS_DATABASE.NY;

  // Toggle States for layers
  const [satelliteMode, setSatelliteMode] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showTransit, setShowTransit] = useState<boolean>(true);
  const [showEmergency, setShowEmergency] = useState<boolean>(true);
  const [showInfrastructure, setShowInfrastructure] = useState<boolean>(true);

  // Selected marker details overlay state
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null);

  // Fallback Map Pan & Zoom states
  const [fallbackZoom, setFallbackZoom] = useState<number>(1.2);
  const [fallbackPan, setFallbackPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync details when city selection changes
  useEffect(() => {
    setSelectedFeature(null);
    setFallbackPan({ x: 0, y: 0 });
    setFallbackZoom(1.2);
  }, [selectedCityId]);

  // Handle fallback map drag and pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (hasValidKey) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - fallbackPan.x, y: e.clientY - fallbackPan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || hasValidKey) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    // Bound the panning to keep visual centered
    setFallbackPan({
      x: Math.min(250, Math.max(-250, newX)),
      y: Math.min(200, Math.max(-200, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for dragging on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (hasValidKey || e.touches.length === 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.touches[0].clientX - fallbackPan.x, y: e.touches[0].clientY - fallbackPan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || hasValidKey || e.touches.length === 0) return;
    const newX = e.touches[0].clientX - dragStart.current.x;
    const newY = e.touches[0].clientY - dragStart.current.y;
    setFallbackPan({
      x: Math.min(250, Math.max(-250, newX)),
      y: Math.min(200, Math.max(-200, newY))
    });
  };

  // Zoom helpers
  const zoomIn = () => {
    if (hasValidKey) {
      // Handled natively or programmatically via buttons on Map component
    } else {
      setFallbackZoom(prev => Math.min(3, prev + 0.25));
    }
  };

  const zoomOut = () => {
    if (hasValidKey) {
      // Handled natively
    } else {
      setFallbackZoom(prev => Math.max(0.75, prev - 0.25));
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
        console.error("Error enabling fullscreen:", err);
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // React to fullscreen change events (like pressing Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mapContainerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Utility to map relative coordinates for fallback projection
  const getFallbackCoords = (fx: number, fy: number) => {
    const cx = 200; // SVG layout center X
    const cy = 160; // SVG layout center Y
    const x = cx + (fx - cx) * fallbackZoom + fallbackPan.x;
    const y = cy + (fy - cy) * fallbackZoom + fallbackPan.y;
    return { x, y };
  };

  // External Links
  const openInGoogleMaps = () => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${geoData.lat},${geoData.lng}`, "_blank");
  };

  const getDirections = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${geoData.lat},${geoData.lng}`, "_blank");
  };

  return (
    <div
      ref={mapContainerRef}
      id="stadium-intelligence-map-root"
      className={`relative w-full ${isFullscreen ? "h-screen bg-gray-950" : "h-[450px]"} border border-purple-900/25 rounded-2xl overflow-hidden flex flex-col md:flex-row transition-all duration-500 shadow-xl bg-gray-950`}
    >
      {/* Sidebar Control Deck */}
      <div id="layer-control-deck" className="w-full md:w-64 bg-gray-950 border-b md:border-b-0 md:border-r border-gray-900 p-4 flex flex-col justify-between z-20 space-y-4 shrink-0 overflow-y-auto">
        <div>
          <div className="flex items-center gap-1.5 mb-3 border-b border-gray-900 pb-2">
            <Layers className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase text-white tracking-widest">
              Stadium Layers
            </span>
          </div>

          {/* Quick Stadium Select */}
          <div className="mb-4">
            <span className="text-[9px] text-gray-500 font-mono uppercase block mb-1">Select Arena Node</span>
            <div className="grid grid-cols-5 gap-1">
              {(["VAN", "LA", "DAL", "MEX", "NY"] as const).map(id => (
                <button
                  key={id}
                  onClick={() => onSelectCity(id)}
                  aria-label={`Select stadium node ${id}`}
                  className={`py-1 text-[10px] font-mono font-bold rounded-lg transition-all ${
                    selectedCityId === id
                      ? "bg-purple-600 text-white border border-purple-400/50 shadow-lg shadow-purple-900/40"
                      : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-white"
                  }`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          {/* Layer Checkboxes */}
          <div className="space-y-2">
            <span className="text-[9px] text-gray-500 font-mono uppercase block">Visualization Filters</span>
            
            <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none py-1 px-1.5 hover:bg-gray-900/50 rounded-lg transition-all">
              <input
                type="checkbox"
                checked={satelliteMode}
                onChange={() => setSatelliteMode(!satelliteMode)}
                className="rounded border-gray-800 bg-gray-950 text-purple-600 focus:ring-purple-500"
              />
              <span className="font-mono">Satellite View</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none py-1 px-1.5 hover:bg-gray-900/50 rounded-lg transition-all">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={() => setShowHeatmap(!showHeatmap)}
                className="rounded border-gray-800 bg-gray-950 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="font-mono text-cyan-400">Crowd Heatmap</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none py-1 px-1.5 hover:bg-gray-900/50 rounded-lg transition-all">
              <input
                type="checkbox"
                checked={showTransit}
                onChange={() => setShowTransit(!showTransit)}
                className="rounded border-gray-800 bg-gray-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-mono text-indigo-400">Transit Routes</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none py-1 px-1.5 hover:bg-gray-900/50 rounded-lg transition-all">
              <input
                type="checkbox"
                checked={showEmergency}
                onChange={() => setShowEmergency(!showEmergency)}
                className="rounded border-gray-800 bg-gray-950 text-red-600 focus:ring-red-500"
              />
              <span className="font-mono text-red-400">Emergency Net</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-gray-300 hover:text-white cursor-pointer select-none py-1 px-1.5 hover:bg-gray-900/50 rounded-lg transition-all">
              <input
                type="checkbox"
                checked={showInfrastructure}
                onChange={() => setShowInfrastructure(!showInfrastructure)}
                className="rounded border-gray-800 bg-gray-950 text-green-600 focus:ring-green-500"
              />
              <span className="font-mono text-green-400">Infrastructure</span>
            </label>
          </div>
        </div>

        {/* Selected Node Inspector Panel */}
        <div className="pt-3 border-t border-gray-900">
          {selectedFeature ? (
            <div className="bg-gray-900/40 border border-purple-900/20 p-2.5 rounded-xl space-y-1.5 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase ${
                  selectedFeature.type === "gate" ? "bg-cyan-950 text-cyan-400" :
                  selectedFeature.type === "parking" ? "bg-amber-950 text-amber-400" :
                  selectedFeature.type === "transit" ? "bg-indigo-950 text-indigo-400" :
                  selectedFeature.type === "emergency" ? "bg-red-950 text-red-400" :
                  "bg-green-950 text-green-400"
                }`}>
                  {selectedFeature.type}
                </span>
                <button
                  onClick={() => setSelectedFeature(null)}
                  aria-label="Close selected feature details"
                  className="text-[9px] text-gray-500 hover:text-white font-mono"
                >
                  [x]
                </button>
              </div>
              <strong className="text-[11px] text-white block truncate leading-tight font-sans">
                {selectedFeature.name}
              </strong>
              <p className="text-[10px] text-gray-400 leading-normal font-sans">
                {selectedFeature.details}
              </p>
              <div className="flex gap-2 pt-1 font-mono text-[8px] text-gray-500">
                <span>Lat: {selectedFeature.lat.toFixed(4)}</span>
                <span>Lng: {selectedFeature.lng.toFixed(4)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 bg-gray-900/10 border border-dashed border-gray-900 rounded-xl">
              <Info className="w-5 h-5 text-gray-700 mx-auto mb-1.5" />
              <span className="text-[10px] font-mono text-gray-500 uppercase block">
                No Node Selected
              </span>
              <p className="text-[9px] text-gray-600 px-2 mt-0.5 font-sans leading-normal">
                Click map pins to inspect security, transport, and entrance status telemetry.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Map Presentation Stage */}
      <div id="map-presentation-stage" className="flex-1 relative bg-gray-950 overflow-hidden flex items-center justify-center">
        
        {/* Fullscreen, Directions, Zoom Overlay Controls */}
        <div id="map-overlay-controls" className="absolute top-3 right-3 z-30 flex flex-col gap-2 pointer-events-auto">
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
            className="w-8 h-8 rounded-lg bg-gray-950/90 border border-gray-800 hover:border-purple-500 text-gray-400 hover:text-white flex items-center justify-center transition-all shadow-lg shadow-black/50 cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col rounded-lg bg-gray-950/90 border border-gray-800 overflow-hidden shadow-lg shadow-black/50">
            <button
              onClick={zoomIn}
              aria-label="Zoom In"
              className="w-8 h-8 hover:bg-gray-900 border-b border-gray-900 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              aria-label="Zoom Out"
              className="w-8 h-8 hover:bg-gray-900 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={openInGoogleMaps}
            aria-label="Open Arena Venue in Google Maps"
            className="px-2.5 py-1.5 rounded-lg bg-gray-950/90 border border-gray-800 hover:border-purple-500 text-gray-400 hover:text-white flex items-center gap-1 transition-all text-[10px] font-mono font-bold shadow-lg shadow-black/50 cursor-pointer"
            title="Open Venue in Google Maps"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400 animate-spin-slow" />
            <span className="hidden sm:inline">Open Map</span>
          </button>

          <button
            onClick={getDirections}
            aria-label="Get driving or transit directions"
            className="px-2.5 py-1.5 rounded-lg bg-gray-950/90 border border-gray-800 hover:border-purple-500 text-gray-400 hover:text-white flex items-center gap-1 transition-all text-[10px] font-mono font-bold shadow-lg shadow-black/50 cursor-pointer"
            title="Get transit and driving directions"
          >
            <Navigation className="w-3.5 h-3.5 text-green-400" />
            <span className="hidden sm:inline">Directions</span>
          </button>
        </div>

        {/* Active Venue Status Banner */}
        <div id="venue-status-banner" className="absolute bottom-3 left-3 z-30 bg-gray-950/90 border border-gray-900 px-3 py-2 rounded-xl flex items-center gap-2.5 shadow-lg shadow-black/50 font-mono text-[10px] max-w-[280px]">
          <div className="relative flex items-center justify-center w-5 h-5 bg-purple-500/10 border border-purple-500/20 rounded">
            <Compass className="w-3 h-3 text-purple-400 animate-spin-slow" />
          </div>
          <div>
            <span className="text-gray-500 text-[8px] uppercase block leading-none">Command Venue Node</span>
            <strong className="text-white font-sans text-[11px] block truncate mt-0.5">{geoData.name}</strong>
          </div>
        </div>

        {/* Fallback Warning Overlay if running fallback map */}
        {!hasValidKey && (
          <div className="absolute top-3 left-3 z-30 bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono text-amber-400 px-2 py-1 rounded-lg shadow-md backdrop-blur flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Tactical Map Engine Fallback</span>
          </div>
        )}

        {/* ==================== OPTION A: REAL GOOGLE MAPS ==================== */}
        {hasValidKey ? (
          <div className="w-full h-full relative z-0">
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                center={{ lat: geoData.lat, lng: geoData.lng }}
                zoom={15}
                mapTypeId={satelliteMode ? "satellite" : "roadmap"}
                options={{
                  styles: darkMapStyle,
                  disableDefaultUI: true,
                  gestureHandling: "cooperative"
                }}
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                style={{ width: "100%", height: "100%" }}
              >
                {/* Stadium Center Marker with custom animated icon */}
                <AdvancedMarker position={{ lat: geoData.lat, lng: geoData.lng }}>
                  <div className="relative flex items-center justify-center w-12 h-12">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-purple-500/20 animate-ping opacity-60" />
                    <span className="absolute inline-flex rounded-full h-6 w-6 bg-purple-500/40 animate-pulse" />
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 border border-white text-white font-black text-[9px] shadow-lg">
                      🏟
                    </div>
                  </div>
                </AdvancedMarker>

                {/* Draw Smart Stadium boundary */}
                {showInfrastructure && (
                  <MapPolygon
                    paths={geoData.boundary.map(p => ({ lat: p.lat, lng: p.lng }))}
                    options={{
                      fillColor: "#a855f7",
                      fillOpacity: 0.08,
                      strokeColor: "#c084fc",
                      strokeOpacity: 0.8,
                      strokeWeight: 2
                    }}
                  />
                )}

                {/* Draw Transit Pathway */}
                {showTransit && geoData.transitPath && (
                  <MapPolyline
                    path={geoData.transitPath.map(p => ({ lat: p.lat, lng: p.lng }))}
                    options={{
                      strokeColor: "#4f46e5",
                      strokeOpacity: 0.8,
                      strokeWeight: 3
                    }}
                  />
                )}

                {/* Draw Emergency Network */}
                {showEmergency && geoData.emergencyPath && (
                  <MapPolyline
                    path={geoData.emergencyPath.map(p => ({ lat: p.lat, lng: p.lng }))}
                    options={{
                      strokeColor: "#ef4444",
                      strokeOpacity: 0.8,
                      strokeWeight: 3
                    }}
                  />
                )}

                {/* Crowd Heatmap nodes */}
                {showHeatmap &&
                  geoData.heatmapPoints.map((pt, idx) => (
                    <AdvancedMarker key={`g-heat-${idx}`} position={{ lat: pt.lat, lng: pt.lng }}>
                      <div
                        className="rounded-full bg-cyan-500/20 blur-md animate-pulse"
                        style={{
                          width: `${50 + pt.intensity * 40}px`,
                          height: `${50 + pt.intensity * 40}px`
                        }}
                      />
                    </AdvancedMarker>
                  ))}

                {/* Render Interactive Feature Markers */}
                {geoData.features.map(f => {
                  // Filter out disabled types
                  if (!showInfrastructure && (f.type === "gate" || f.type === "parking" || f.type === "checkpoint")) return null;
                  if (!showTransit && f.type === "transit") return null;
                  if (!showEmergency && f.type === "emergency") return null;
                  if (!showInfrastructure && (f.type === "food" || f.type === "merch")) return null;

                  return (
                    <AdvancedMarker
                      key={f.id}
                      position={{ lat: f.lat, lng: f.lng }}
                      onClick={() => setSelectedFeature(f)}
                    >
                      <div className={`p-1.5 rounded-lg border flex items-center justify-center shadow-lg transition-all cursor-pointer scale-90 hover:scale-105 active:scale-95 ${
                        f.type === "gate" ? "bg-cyan-950 border-cyan-500/50 text-cyan-400" :
                        f.type === "parking" ? "bg-amber-950 border-amber-500/50 text-amber-400" :
                        f.type === "transit" ? "bg-indigo-950 border-indigo-500/50 text-indigo-400" :
                        f.type === "emergency" ? "bg-red-950 border-red-500/50 text-red-400 animate-pulse" :
                        f.type === "food" ? "bg-green-950 border-green-500/50 text-green-400" :
                        "bg-purple-950 border-purple-500/50 text-purple-400"
                      }`}>
                        {f.type === "gate" && <span className="font-mono text-[9px] font-bold px-0.5">{f.name.split(" ")[1]}</span>}
                        {f.type === "parking" && <span className="font-mono text-[8px] font-black">P</span>}
                        {f.type === "transit" && <Train className="w-3 h-3" />}
                        {f.type === "food" && <Utensils className="w-3 h-3" />}
                        {f.type === "merch" && <ShoppingBag className="w-3 h-3" />}
                        {f.type === "emergency" && <ShieldAlert className="w-3 h-3" />}
                        {f.type === "checkpoint" && <Activity className="w-3 h-3" />}
                      </div>
                    </AdvancedMarker>
                  );
                })}
              </Map>
            </APIProvider>
          </div>
        ) : (
          /* ==================== OPTION B: HIGH-FIDELITY TACTICAL FALLBACK MAP ==================== */
          <div
            id="interactive-fallback-canvas"
            className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* Grid Map Vector Space */}
            <svg
              className="w-full h-full bg-slate-950"
              viewBox="0 0 400 320"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Tech grid */}
                <pattern id="fallback-grid" width="35" height="35" patternUnits="userSpaceOnUse">
                  <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#101827" strokeWidth="0.8" />
                  <circle cx="35" cy="0" r="1.2" fill="#312e81" opacity="0.4" />
                </pattern>
                {/* Radial glow for stadium bowl center */}
                <radialGradient id="stadiumGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={satelliteMode ? "0.2" : "0.35"} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </radialGradient>
                {/* Heatmap intensity color wave */}
                <radialGradient id="heatGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Grid Background */}
              <rect width="100%" height="100%" fill="url(#fallback-grid)" />

              {/* Dynamic Satellite Mode visual shift */}
              {satelliteMode && (
                <g opacity="0.3">
                  <path d="M 0,20 Q 150,80 400,20" fill="none" stroke="#1e293b" strokeWidth="30" strokeOpacity="0.3" />
                  <path d="M 20,320 Q 250,220 380,320" fill="none" stroke="#1e293b" strokeWidth="45" strokeOpacity="0.25" />
                  <circle cx="100" cy="100" r="140" fill="#030712" opacity="0.5" />
                  <circle cx="300" cy="240" r="90" fill="#030712" opacity="0.5" />
                </g>
              )}

              {/* Transit Routes Layer (Below Stadium) */}
              {showTransit && geoData.transitPath && (
                <g>
                  {/* Drawing connecting path */}
                  <path
                    d={geoData.transitPath.map((p, idx) => {
                      const coords = getFallbackCoords(p.fx, p.fy);
                      return `${idx === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3.5"
                    strokeOpacity="0.75"
                    strokeDasharray="6,4"
                    className="animate-pulse"
                  />
                  {/* Animate laser travel along route */}
                  <circle r="3" fill="#818cf8" className="animate-ping">
                    <animateMotion
                      dur="4s"
                      repeatCount="indefinite"
                      path={geoData.transitPath.map((p, idx) => {
                        const coords = getFallbackCoords(p.fx, p.fy);
                        return `${idx === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
                      }).join(" ")}
                    />
                  </circle>
                </g>
              )}

              {/* Emergency Network Layer */}
              {showEmergency && geoData.emergencyPath && (
                <g>
                  <path
                    d={geoData.emergencyPath.map((p, idx) => {
                      const coords = getFallbackCoords(p.fx, p.fy);
                      return `${idx === 0 ? "M" : "L"} ${coords.x} ${coords.y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeOpacity="0.8"
                    strokeDasharray="4,4"
                  />
                </g>
              )}

              {/* Stadium Bowl Center Core */}
              {(() => {
                const centerCoords = getFallbackCoords(200, 160);
                return (
                  <g>
                    {/* Outer Glowing Arena Core */}
                    <circle
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      r={70 * fallbackZoom}
                      fill="url(#stadiumGlow)"
                    />
                    <ellipse
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      rx={65 * fallbackZoom}
                      ry={45 * fallbackZoom}
                      fill="none"
                      stroke={satelliteMode ? "#334155" : "#1e1b4b"}
                      strokeWidth="10"
                      opacity="0.8"
                    />
                    <ellipse
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      rx={60 * fallbackZoom}
                      ry={40 * fallbackZoom}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="1.5"
                      strokeOpacity="0.5"
                      strokeDasharray="10 5"
                    />
                  </g>
                );
              })()}

              {/* Stadium Boundary Polygon Layer */}
              {showInfrastructure && geoData.boundary && (
                <polygon
                  points={geoData.boundary.map(p => {
                    const coords = getFallbackCoords(p.fx, p.fy);
                    return `${coords.x},${coords.y}`;
                  }).join(" ")}
                  fill="#7c3aed"
                  fillOpacity="0.04"
                  stroke="#a78bfa"
                  strokeWidth="1.5"
                  strokeOpacity="0.7"
                  strokeDasharray="4,2"
                />
              )}

              {/* Crowd Heatmap Layer Overlay */}
              {showHeatmap && geoData.heatmapPoints && (
                <g>
                  {geoData.heatmapPoints.map((pt, idx) => {
                    const coords = getFallbackCoords(pt.fx, pt.fy);
                    return (
                      <circle
                        key={`heat-${idx}`}
                        cx={coords.x}
                        cy={coords.y}
                        r={(40 + pt.intensity * 25) * fallbackZoom}
                        fill="url(#heatGlow)"
                        className="animate-pulse"
                        style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                      />
                    );
                  })}
                </g>
              )}

              {/* Arena Main Marker Pin */}
              {(() => {
                const centerCoords = getFallbackCoords(200, 160);
                return (
                  <g className="cursor-pointer">
                    <circle
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      r={24 * fallbackZoom}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      className="animate-spin-slow"
                      style={{ transformOrigin: `${centerCoords.x}px ${centerCoords.y}px` }}
                    />
                    {/* Animated central hub ping */}
                    <circle
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      r={14 * fallbackZoom}
                      fill="none"
                      stroke="#a78bfa"
                      strokeWidth="1"
                      className="animate-ping"
                      style={{ transformOrigin: `${centerCoords.x}px ${centerCoords.y}px`, animationDuration: "2s" }}
                    />
                    <circle
                      cx={centerCoords.x}
                      cy={centerCoords.y}
                      r="10"
                      className="fill-purple-600 stroke-purple-400"
                      strokeWidth="1.5"
                    />
                    <text
                      x={centerCoords.x}
                      y={centerCoords.y + 3}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="black"
                      fontFamily="sans-serif"
                    >
                      🏟
                    </text>
                  </g>
                );
              })()}

              {/* Render Interactive Feature Markers */}
              {geoData.features.map(f => {
                // Filter out disabled types
                if (!showInfrastructure && (f.type === "gate" || f.type === "parking" || f.type === "checkpoint")) return null;
                if (!showTransit && f.type === "transit") return null;
                if (!showEmergency && f.type === "emergency") return null;
                if (!showInfrastructure && (f.type === "food" || f.type === "merch")) return null;

                const coords = getFallbackCoords(f.fx, f.fy);
                const isCurrentSelected = selectedFeature?.id === f.id;

                return (
                  <g
                    key={f.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFeature(f);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Hover hotspot circle */}
                    <circle cx={coords.x} cy={coords.y} r="18" fill="transparent" />

                    {/* Highlight ring if selected */}
                    {isCurrentSelected && (
                      <circle
                        cx={coords.x}
                        cy={coords.y}
                        r="12"
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="1.5"
                        className="animate-ping"
                        style={{ transformOrigin: `${coords.x}px ${coords.y}px` }}
                      />
                    )}

                    {/* Badge Container */}
                    <rect
                      x={coords.x - 7}
                      y={coords.y - 7}
                      width="14"
                      height="14"
                      rx="3"
                      className={`transition-all duration-300 ${
                        isCurrentSelected ? "scale-125" : "hover:scale-110"
                      } ${
                        f.type === "gate" ? "fill-cyan-950 stroke-cyan-500/80" :
                        f.type === "parking" ? "fill-amber-950 stroke-amber-500/80" :
                        f.type === "transit" ? "fill-indigo-950 stroke-indigo-500/80" :
                        f.type === "emergency" ? "fill-red-950 stroke-red-500/80 animate-pulse" :
                        f.type === "food" ? "fill-green-950 stroke-green-500/80" :
                        "fill-purple-950 stroke-purple-500/80"
                      }`}
                      strokeWidth="1"
                    />

                    {/* Icon or Label inside Badge */}
                    {f.type === "gate" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#22d3ee"
                        fontSize="7"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {f.name.split(" ")[1]}
                      </text>
                    )}
                    {f.type === "parking" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="7"
                        fontWeight="black"
                        fontFamily="sans-serif"
                      >
                        P
                      </text>
                    )}
                    {f.type === "transit" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#818cf8"
                        fontSize="7"
                        fontFamily="sans-serif"
                      >
                        🚇
                      </text>
                    )}
                    {f.type === "emergency" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#f87171"
                        fontSize="7"
                        fontFamily="sans-serif"
                      >
                        🚨
                      </text>
                    )}
                    {f.type === "food" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#34d399"
                        fontSize="7"
                        fontFamily="sans-serif"
                      >
                        🍔
                      </text>
                    )}
                    {f.type === "merch" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#c084fc"
                        fontSize="7"
                        fontFamily="sans-serif"
                      >
                        🛍
                      </text>
                    )}
                    {f.type === "checkpoint" && (
                      <text
                        x={coords.x}
                        y={coords.y + 3}
                        textAnchor="middle"
                        fill="#60a5fa"
                        fontSize="7"
                        fontFamily="sans-serif"
                      >
                        🛡
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Instruction Overlay on how to Pan fall back */}
            <div className="absolute bottom-3 right-3 bg-gray-900/80 border border-gray-800 px-2 py-1 rounded text-[8px] text-gray-500 font-mono tracking-wide pointer-events-none">
              🖱 Drag to pan • Scroll to zoom
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
