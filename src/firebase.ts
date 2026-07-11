import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, Auth, signOut } from "firebase/auth";
import { getFirestore, Firestore, doc, setDoc, getDoc, collection, addDoc, getDocs, query, orderBy, limit } from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export async function initFirebase() {
  if (app) return { app, auth, db };
  try {
    const res = await fetch("/api/firebase-config");
    const config = await res.json();
    if (config && config.apiKey) {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
      return { app, auth, db };
    }
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
  return { app: null, auth: null, db: null };
}

export async function signInWithGoogle() {
  const { auth } = await initFirebase();
  if (!auth) throw new Error("Firebase Auth is not initialized.");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutUser() {
  const { auth } = await initFirebase();
  if (auth) {
    await signOut(auth);
  }
}

// Firestore operations
export async function saveUserItinerary(userId: string, itinerary: { seat: string; ticketType: string; content: string; timestamp: number }) {
  const { db } = await initFirebase();
  if (!db) return;
  try {
    await addDoc(collection(db, `users/${userId}/itineraries`), itinerary);
  } catch (err) {
    console.error("Error saving itinerary to Firestore:", err);
  }
}

export async function getUserItineraries(userId: string) {
  const { db } = await initFirebase();
  if (!db) return [];
  try {
    const q = query(collection(db, `users/${userId}/itineraries`), orderBy("timestamp", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    const itineraries: any[] = [];
    querySnapshot.forEach((doc) => {
      itineraries.push({ id: doc.id, ...doc.data() });
    });
    return itineraries;
  } catch (err) {
    console.error("Error getting itineraries from Firestore:", err);
    return [];
  }
}

export async function saveGeneratedAsset(userId: string, asset: { type: "image" | "music" | "video"; prompt: string; url: string; size?: string; ratio?: string; timestamp: number }) {
  const { db } = await initFirebase();
  if (!db) return;
  try {
    await addDoc(collection(db, `users/${userId}/assets`), asset);
  } catch (err) {
    console.error("Error saving asset to Firestore:", err);
  }
}

export async function getUserAssets(userId: string) {
  const { db } = await initFirebase();
  if (!db) return [];
  try {
    const q = query(collection(db, `users/${userId}/assets`), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    const assets: any[] = [];
    querySnapshot.forEach((doc) => {
      assets.push({ id: doc.id, ...doc.data() });
    });
    return assets;
  } catch (err) {
    console.error("Error getting assets from Firestore:", err);
    return [];
  }
}
