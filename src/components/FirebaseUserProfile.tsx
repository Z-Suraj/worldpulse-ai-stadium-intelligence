import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { signInWithGoogle, signOutUser, initFirebase, getUserAssets, getUserItineraries } from "../firebase";
import { LogIn, LogOut, Shield, User as UserIcon, Calendar, Image, Music, Film, History, Sparkles } from "lucide-react";

interface FirebaseUserProfileProps {
  onUserChange?: (user: User | null) => void;
}

export default function FirebaseUserProfile({ onUserChange }: FirebaseUserProfileProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [itineraries, setItineraries] = useState<any[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"assets" | "itineraries">("assets");
  const [authError, setAuthError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    const setupAuth = async () => {
      const { auth } = await initFirebase();
      if (auth) {
        auth.onAuthStateChanged((currentUser) => {
          setUser(currentUser);
          if (onUserChange) onUserChange(currentUser);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    };
    setupAuth();
  }, [onUserChange]);

  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setAssets([]);
      setItineraries([]);
    }
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    try {
      const [userAssets, userItineraries] = await Promise.all([
        getUserAssets(user.uid),
        getUserItineraries(user.uid)
      ]);
      setAssets(userAssets);
      setItineraries(userItineraries);
    } catch (err) {
      console.error("Error loading history from Firestore:", err);
    }
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setAuthError({
        code: err?.code || "unknown",
        message: err?.message || "Google Authentication issue."
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
        <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
        Synchronizing...
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 rounded-2xl border border-purple-500/10">
      {!user ? (
        <div className="text-center py-4 space-y-3">
          <div className="w-10 h-10 rounded-full bg-purple-950/40 border border-purple-800/40 flex items-center justify-center mx-auto text-purple-400">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Secure Cloud Sync</h4>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Sign in with Google to save your generated anthems, visual cards, and travel plans.
            </p>
          </div>
          <button
            onClick={handleSignIn}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-lg shadow-purple-950/40"
          >
            <LogIn className="w-3.5 h-3.5" />
            Connect Google Account
          </button>

          {typeof window !== "undefined" && window.location.hostname === "worldpulse-ai.ai.studio" && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-left">
              <p className="text-[9px] text-purple-300 leading-relaxed">
                <span className="text-purple-400 font-semibold block mb-0.5">🚀 Google Login & Install Link:</span>
                If Google Login fails here, please visit our pre-whitelisted direct URL where Google Sign-In & PWA works 100% instantly without any setup:
                <a 
                  href="https://worldpulse-ai-142502196934.asia-southeast1.run.app" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-purple-400 hover:text-purple-300 underline font-bold mt-1 block break-all font-mono"
                >
                  https://worldpulse-ai-142502196934.asia-southeast1.run.app
                </a>
              </p>
            </div>
          )}

          {authError && (
            <div className="mt-3 text-left p-3 rounded-xl bg-red-950/40 border border-red-500/20 space-y-2">
              <div className="flex items-start gap-1.5 text-red-400 font-semibold text-[11px]">
                <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>Google Auth Setup Required</span>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Firebase limits Google login to whitelisted domains. To fix this, you must add your custom domain to your Firebase settings.
              </p>
              <div className="text-[10px] text-gray-500 space-y-1 font-mono">
                <div className="font-semibold text-gray-400">Easy Fix Steps:</div>
                <div className="text-gray-400">1. Open <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline font-bold">Firebase Console</a></div>
                <div className="text-gray-400">2. Select project &gt; <b>Authentication</b> &gt; <b>Settings</b> tab</div>
                <div className="text-gray-400">3. Click on <b>"Authorized domains"</b></div>
                <div className="text-gray-400">4. Click <b>"Add domain"</b> and add:</div>
                <div className="text-purple-400 font-bold select-all bg-purple-950/60 p-1 rounded break-all">
                  worldpulse-ai.ai.studio
                </div>
                {typeof window !== "undefined" && window.location.hostname !== "worldpulse-ai.ai.studio" && (
                  <>
                    <div className="text-gray-400">And also add:</div>
                    <div className="text-purple-400 font-bold select-all bg-purple-950/60 p-1 rounded break-all">
                      {window.location.hostname}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-[9px] text-purple-400 hover:underline pt-1 block"
              >
                Dismiss Alert
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Profile Header */}
          <div className="flex items-center justify-between border-b border-gray-950 pb-3">
            <div className="flex items-center gap-2.5">
              <img
                src={user.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80"}
                alt={user.displayName || "User"}
                className="w-9 h-9 rounded-full border border-purple-500/20"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="text-xs font-bold text-white leading-snug flex items-center gap-1">
                  {user.displayName}
                  <Shield className="w-3 h-3 text-purple-400" />
                </h4>
                <span className="text-[9px] text-gray-500 font-mono block">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 hover:bg-gray-900 border border-gray-900 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Activity Ledger History */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-purple-400" />
                Your Cloud Vault
              </h5>
              <div className="flex bg-gray-900 p-0.5 rounded-lg border border-gray-800">
                <button
                  onClick={() => setActiveHistoryTab("assets")}
                  className={`text-[9px] px-2 py-1 rounded-md transition-all ${activeHistoryTab === "assets" ? "bg-purple-900/40 text-purple-300 font-semibold" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Assets ({assets.length})
                </button>
                <button
                  onClick={() => setActiveHistoryTab("itineraries")}
                  className={`text-[9px] px-2 py-1 rounded-md transition-all ${activeHistoryTab === "itineraries" ? "bg-purple-900/40 text-purple-300 font-semibold" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Plans ({itineraries.length})
                </button>
              </div>
            </div>

            {/* History Feed list */}
            <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
              {activeHistoryTab === "assets" ? (
                assets.length === 0 ? (
                  <p className="text-[10px] text-gray-600 text-center py-4">No generated assets yet.</p>
                ) : (
                  assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="bg-gray-950 p-2 rounded-xl border border-gray-900 flex gap-2 items-center"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
                        {asset.type === "image" && <Image className="w-4 h-4 text-purple-400" />}
                        {asset.type === "music" && <Music className="w-4 h-4 text-cyan-400" />}
                        {asset.type === "video" && <Film className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white font-sans font-semibold truncate">
                          {asset.prompt}
                        </p>
                        <span className="text-[8px] text-gray-500 font-mono block">
                          {asset.size ? `${asset.size} | ` : ""}{asset.ratio ? `${asset.ratio} | ` : ""}{new Date(asset.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[9px] bg-purple-950/60 hover:bg-purple-900 border border-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded font-sans"
                      >
                        Open
                      </a>
                    </div>
                  ))
                )
              ) : (
                itineraries.length === 0 ? (
                  <p className="text-[10px] text-gray-600 text-center py-4">No itineraries saved yet.</p>
                ) : (
                  itineraries.map((it) => (
                    <div
                      key={it.id}
                      className="bg-gray-950 p-2 rounded-xl border border-gray-900 space-y-1"
                    >
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-white font-bold font-sans flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-purple-400" />
                          {it.seat}
                        </span>
                        <span className="text-gray-500">
                          {new Date(it.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 line-clamp-2 font-sans">
                        {it.content.replace(/[#*]/g, "")}
                      </p>
                    </div>
                  ))
                )
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={loadHistory}
                className="text-[9px] text-purple-400 hover:text-purple-300 flex items-center gap-1.5 font-sans"
              >
                <Sparkles className="w-3 h-3" />
                Refresh Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
