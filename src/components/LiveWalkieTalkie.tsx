import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Radio, 
  Sparkles 
} from "lucide-react";

// Helper function to encode raw Float32 mono channel data to 16-bit PCM little-endian Base64
function pcmToBase64(float32Array: Float32Array): string {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp sample between -1 and 1
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit signed integer
    const value = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, value, true); // little-endian
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper function to decode base64 16-bit little-endian PCM into Float32 mono channel data
function base64ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const samplesCount = len / 2;
  const float32Array = new Float32Array(samplesCount);
  for (let i = 0; i < samplesCount; i++) {
    const int16Val = view.getInt16(i * 2, true); // little-endian
    float32Array[i] = int16Val / 32768.0;
  }
  return float32Array;
}

export default function LiveWalkieTalkie() {
  const [isConnected, setIsConnected] = useState(false);
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [statusMessage, setStatusMessage] = useState("Tap the microphone to begin.");
  const [micVolume, setMicVolume] = useState(0);

  // Refs for tracking WebSocket and Audio Context pipelines
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    // Ensure cleanup of all devices, web sockets, and sound context on unmount
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    // 1. Stop all active buffer sources
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
    }

    // 2. Disconnect the input sound processor
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch (e) {}
      processorNodeRef.current = null;
    }

    // 3. Stop the media stream tracks
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      micStreamRef.current = null;
    }

    // 4. Close the 16kHz input AudioContext
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch (e) {}
      inputAudioCtxRef.current = null;
    }

    // 5. Close the 24kHz output AudioContext
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close();
      } catch (e) {}
      outputAudioCtxRef.current = null;
    }

    // 6. Close the WebSocket connection
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    setMicVolume(0);
    nextStartTimeRef.current = 0;
  };

  const stopAllAudioPlayback = () => {
    if (activeSourcesRef.current) {
      activeSourcesRef.current.forEach((source) => {
        try {
          source.stop();
        } catch (e) {}
      });
      activeSourcesRef.current = [];
    }
    nextStartTimeRef.current = 0;
  };

  const playAudioChunk = (base64PCM: string) => {
    const audioCtx = outputAudioCtxRef.current;
    if (!audioCtx) return;

    // Convert raw PCM 16-bit to Float32 array
    const float32Data = base64ToFloat32(base64PCM);
    
    // Create an audio buffer for play out (1 channel, sample rate 24000)
    const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
    buffer.getChannelData(0).set(float32Data);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    
    // Gapless audio buffer scheduling to counter network latency and jitter
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.05; // 50ms scheduling gap
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;

    // Track active source to enable instant interruption
    activeSourcesRef.current.push(source);
    
    setVoiceState("speaking");
    setStatusMessage("Speaking...");

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
      // When the audio queue is completely empty, transition back to listening state
      if (activeSourcesRef.current.length === 0) {
        setVoiceState("listening");
        setStatusMessage("Listening...");
      }
    };
  };

  const handleConnectSession = async () => {
    cleanupAudio();
    setStatusMessage("Connecting...");

    try {
      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      // 2. Initialize input AudioContext at 16kHz for microphone capture
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;

      // 3. Initialize output AudioContext at 24kHz for Gemini Live audio playback
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;

      // 4. Create and configure WebSocket connection to the server's live API bridge
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Live voice channel established.");
        setIsConnected(true);
        setVoiceState("listening");
        setStatusMessage("Listening...");

        // Start capturing microphone input only after WebSocket is open
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          const channelData = e.inputBuffer.getChannelData(0);
          
          // Calculate microphone input volume (RMS level) for real-time visualization
          let sum = 0;
          for (let i = 0; i < channelData.length; i++) {
            sum += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sum / channelData.length);
          const mappedVol = Math.min(100, Math.round(rms * 400));
          setMicVolume(mappedVol);

          // Stream audio payload as PCM 16-bit to the server
          if (ws.readyState === WebSocket.OPEN) {
            const base64Audio = pcmToBase64(channelData);
            ws.send(JSON.stringify({ audio: base64Audio }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.audio) {
            // Play raw 24kHz PCM audio response
            playAudioChunk(msg.audio);
          }
          
          if (msg.interrupted) {
            // Instantly stop audio playback if user starts speaking / interrupts
            stopAllAudioPlayback();
            setVoiceState("listening");
            setStatusMessage("Listening...");
          }
          
          if (msg.error) {
            setStatusMessage(msg.error);
          }
        } catch (err) {
          console.error("Failed to parse websocket message:", err);
        }
      };

      ws.onclose = () => {
        console.log("Live voice channel closed.");
        handleDisconnectSession();
      };

      ws.onerror = (err) => {
        console.error("Live voice channel error:", err);
        setStatusMessage("Connection issue");
      };

    } catch (err) {
      console.error("Failed to connect live session:", err);
      setStatusMessage("Mic Access Denied");
      setIsConnected(false);
    }
  };

  const handleDisconnectSession = () => {
    setIsConnected(false);
    setVoiceState("idle");
    setStatusMessage("Tap the microphone to begin.");
    cleanupAudio();
  };

  const handleOrbClick = () => {
    if (!isConnected) {
      handleConnectSession();
      return;
    }

    if (voiceState === "speaking") {
      // Interruption support: stop playback of model response and listen instantly
      stopAllAudioPlayback();
      setVoiceState("listening");
      setStatusMessage("Listening...");
    }
  };

  return (
    <div id="futuristic-voice-dispatcher-card" className="font-sans w-full max-w-xl mx-auto">
      
      <div className="relative rounded-3xl p-8 overflow-hidden border border-purple-500/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
        
        <div className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <h2 id="dispatcher-main-title" className="text-sm font-mono tracking-widest text-purple-400 font-extrabold flex items-center justify-center gap-2">
            <Radio className="w-4 h-4 text-purple-500 shrink-0" />
            FIFA COPILOT VOICE DISPATCHER
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-4 relative z-10">
          
          <div className="relative flex items-center justify-center w-36 h-36 mb-6">
            
            <div className={`absolute inset-0 rounded-full border border-dashed transition-all duration-700 ${
              voiceState === "listening" ? "border-purple-500/40 animate-spin" :
              voiceState === "thinking" ? "border-indigo-500/40 animate-[spin_3s_linear_infinite]" :
              voiceState === "speaking" ? "border-pink-500/40 animate-[spin_5s_linear_infinite]" :
              "border-slate-800"
            }`} />
            
            <div className={`absolute inset-2 rounded-full border transition-all duration-700 ${
              voiceState === "listening" ? "border-purple-500/20 scale-105" :
              voiceState === "thinking" ? "border-indigo-500/20 scale-95" :
              voiceState === "speaking" ? "border-pink-500/20 scale-105" :
              "border-transparent"
            }`} />

            <div
              onClick={handleOrbClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleOrbClick();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Toggle voice dispatcher or trigger voice prompt"
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl relative cursor-pointer hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${
                voiceState === "listening" 
                  ? "bg-gradient-to-tr from-purple-950 via-purple-900 to-indigo-900 border-2 border-purple-400 shadow-purple-500/30 text-purple-300 animate-pulse" 
                  : voiceState === "thinking" 
                  ? "bg-gradient-to-tr from-indigo-950 via-indigo-900 to-indigo-800 border-2 border-indigo-400 shadow-indigo-500/30 text-indigo-300 animate-pulse"
                  : voiceState === "speaking"
                  ? "bg-gradient-to-tr from-pink-950 via-pink-900 to-pink-850 border-2 border-pink-400 shadow-pink-500/30 text-pink-300"
                  : "bg-slate-900 border-2 border-slate-800 shadow-black/80 text-slate-500 hover:border-purple-500/40 hover:text-purple-400"
              }`}
            >
              {voiceState === "listening" ? (
                <Mic className="w-6 h-6 text-purple-400 animate-pulse" />
              ) : voiceState === "thinking" ? (
                <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" style={{ animationDuration: "3s" }} />
              ) : voiceState === "speaking" ? (
                <Volume2 className="w-6 h-6 text-pink-400 animate-bounce" />
              ) : isConnected ? (
                <Mic className="w-6 h-6 text-purple-400 animate-pulse" />
              ) : (
                <MicOff className="w-6 h-6 text-slate-600" />
              )}

              {voiceState === "listening" && micVolume > 0 && (
                <div 
                  className="absolute inset-0 rounded-full border border-purple-400 opacity-50 scale-105 pointer-events-none transition-transform"
                  style={{ transform: `scale(${1 + micVolume / 100})` }}
                />
              )}
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="text-xs font-mono uppercase tracking-[0.1em] text-slate-400 font-bold">
              <span className={`font-extrabold ${
                voiceState === "listening" ? "text-purple-400" :
                voiceState === "thinking" ? "text-indigo-400" :
                voiceState === "speaking" ? "text-pink-400" :
                "text-slate-500"
              }`}>
                {statusMessage}
              </span>
            </div>
          </div>

          <div className="w-full max-w-xs h-4 flex items-center justify-center gap-1 mb-8">
            {[...Array(10)].map((_, i) => {
              let height = "4px";
              let color = "bg-slate-850";
              
              if (voiceState === "listening") {
                const multiplier = Math.sin((i + Date.now()) * 0.35) * 0.5 + 0.5;
                height = `${Math.max(4, micVolume * multiplier * 0.35)}px`;
                color = "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]";
              } else if (voiceState === "thinking") {
                const time = Date.now() * 0.008;
                height = `${Math.sin(i * 0.5 - time) * 4 + 8}px`;
                color = "bg-indigo-500";
              } else if (voiceState === "speaking") {
                const time = Date.now() * 0.015;
                height = `${Math.sin(i * 0.4 + time) * 6 + 10}px`;
                color = "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]";
              }

              return (
                <div 
                  key={i} 
                  className={`w-1 rounded-full transition-all duration-75 ${color}`}
                  style={{ height }}
                />
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-center">
          {!isConnected ? (
            <button
              id="btn-connect-voice-session"
              onClick={handleConnectSession}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-xs font-extrabold tracking-widest rounded-2xl border border-purple-400/20 shadow-[0_4px_20px_rgba(168,85,247,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              🎙️ CONNECT VOICE SESSION
            </button>
          ) : (
            <button
              id="btn-disconnect-voice-session"
              onClick={handleDisconnectSession}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-red-950/20 text-red-400 hover:text-red-300 font-mono text-xs font-extrabold tracking-widest rounded-2xl border border-red-500/20 shadow-md transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
            >
              🛑 DISCONNECT VOICE SESSION
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
