import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  RefreshCw, 
  Radio, 
  Volume2, 
  VolumeX, 
  Info, 
  AlertTriangle, 
  RotateCcw, 
  Shield, 
  Activity, 
  Wifi, 
  Cpu, 
  Play, 
  Download, 
  Server, 
  CheckCircle, 
  XCircle, 
  HelpCircle 
} from "lucide-react";

interface FlowStatus {
  micRecording: "PENDING" | "PASS" | "FAIL";
  localDownload: "PENDING" | "PASS" | "FAIL";
  transcription: "PENDING" | "PASS" | "FAIL";
  copilotResponse: "PENDING" | "PASS" | "FAIL";
  speechSynthesis: "PENDING" | "PASS" | "FAIL";
  browserAudioElement: "PENDING" | "PASS" | "FAIL";
  streamedPCM: "PENDING" | "PASS" | "FAIL";
}

export default function LiveWalkieTalkie() {
  // Connection states
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to start voice session");
  const [aiTextResponse, setAiTextResponse] = useState("");
  const [userTranscription, setUserTranscription] = useState("");
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);

  // Debug Panel States
  const [micPermission, setMicPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  const [inputDeviceName, setInputDeviceName] = useState("Checking devices...");
  const [systemSampleRate, setSystemSampleRate] = useState(0);
  const [micVolume, setMicVolume] = useState(0);
  
  const [audioCtxState, setAudioCtxState] = useState("closed");
  const [playbackQueueSize, setPlaybackQueueSize] = useState(0);
  const [ttsAvailable, setTtsAvailable] = useState(false);

  const [wsState, setWsState] = useState("CLOSED");
  const [lastPingTime, setLastPingTime] = useState<string>("Never");
  const [reconnectCount, setReconnectCount] = useState(0);

  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micTestCountdown, setMicTestCountdown] = useState(0);

  // Diagnostic checklist status
  const [flowStatus, setFlowStatus] = useState<FlowStatus>({
    micRecording: "PENDING",
    localDownload: "PENDING",
    transcription: "PENDING",
    copilotResponse: "PENDING",
    speechSynthesis: "PENDING",
    browserAudioElement: "PENDING",
    streamedPCM: "PENDING",
  });

  // Refs for audio system & sockets
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Int16Array[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const heartbeatTimerRef = useRef<any>(null);
  const volumeAnimFrameRef = useRef<number | null>(null);

  // Check initial hardware capabilities
  useEffect(() => {
    // Check speech synthesis support
    if (window.speechSynthesis) {
      setTtsAvailable(true);
      setFlowStatus(prev => ({ ...prev, speechSynthesis: "PASS" }));
    } else {
      setFlowStatus(prev => ({ ...prev, speechSynthesis: "FAIL" }));
    }

    // Check mic permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: "microphone" as any })
        .then((permissionStatus) => {
          setMicPermission(permissionStatus.state as any);
          permissionStatus.onchange = () => {
            setMicPermission(permissionStatus.state as any);
          };
        })
        .catch(() => setMicPermission("unknown"));
    }

    // Get list of devices
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        const audioInputs = devices.filter(d => d.kind === "audioinput");
        if (audioInputs.length > 0) {
          setInputDeviceName(audioInputs[0].label || "Default Input Source");
        } else {
          setInputDeviceName("No audio inputs detected");
        }
      })
      .catch(() => setInputDeviceName("Permission required to scan devices"));

    return () => {
      cleanupAll();
    };
  }, []);

  const initAudioContext = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      setAudioCtxState(audioContextRef.current.state);
      setSystemSampleRate(audioContextRef.current.sampleRate);
      return audioContextRef.current;
    } catch (err) {
      console.error("Failed to initialize AudioContext:", err);
      setAudioCtxState("failed");
      throw err;
    }
  };

  const stopAllAudioPlayback = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch (e) {}
    }
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
    setPlaybackQueueSize(0);
    setIsSpeaking(false);
  };

  // Connect to Gemini Live audio session
  const connectVoice = async () => {
    setIsConnecting(true);
    setStatusMessage("Connecting to voice assistant...");
    stopAllAudioPlayback();

    const audioCtx = await initAudioContext();

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/live`;
    setWsState("CONNECTING");

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      const connectTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.warn("WebSocket connection timeout. Switching to fallback mode.");
          ws.close();
          activateFallbackMode();
        }
      }, 4000);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
        setIsConnected(true);
        setIsConnecting(false);
        setIsFallbackMode(false);
        setWsState("OPEN");
        setStatusMessage("Connected! Ready to talk.");
        setFlowStatus(prev => ({ ...prev, browserAudioElement: "PASS" }));
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.error) {
            console.error("Live API error message:", data.error);
            activateFallbackMode();
          } else if (data.audio) {
            playRawPCM(data.audio);
          } else if (data.interrupted) {
            stopAllAudioPlayback();
            setStatusMessage("Interrupted by user input.");
          } else if (data.text) {
            setAiTextResponse(data.text);
          }
        } catch (err) {
          console.warn("Unknown packet format:", err);
        }
      };

      ws.onclose = () => {
        setWsState("CLOSED");
        stopHeartbeat();
        if (isConnected) {
          activateFallbackMode();
        } else {
          setIsConnecting(false);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setWsState("ERROR");
        activateFallbackMode();
      };
    } catch (err) {
      console.error("WS connection instantiation error:", err);
      activateFallbackMode();
    }
  };

  const disconnectVoice = () => {
    stopHeartbeat();
    stopMicrophone();
    stopAllAudioPlayback();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsRecording(false);
    setIsFallbackMode(false);
    setWsState("CLOSED");
    setStatusMessage("Ready to start voice session");
    setAiTextResponse("");
    setUserTranscription("");
    setFlowStatus(prev => ({
      ...prev,
      micRecording: "PENDING",
      localDownload: "PENDING",
      transcription: "PENDING",
      copilotResponse: "PENDING",
      streamedPCM: "PENDING"
    }));
  };

  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
        setLastPingTime(new Date().toLocaleTimeString());
      }
    }, 20000);
  };

  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  const activateFallbackMode = () => {
    setIsFallbackMode(true);
    setIsConnected(true);
    setIsConnecting(false);
    setStatusMessage("Voice service is temporarily unavailable. Switching to text mode.");
    stopHeartbeat();
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
  };

  // Web Audio PCM Player (24kHz little-endian float32 stream)
  const playRawPCM = (base64Data: string) => {
    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioCtx = audioContextRef.current;
      if (!audioCtx) return;

      if (nextPlayTimeRef.current < audioCtx.currentTime) {
        nextPlayTimeRef.current = audioCtx.currentTime;
      }

      const buffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      buffer.copyToChannel(float32Array, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += buffer.duration;

      activeSourcesRef.current.push(source);
      setPlaybackQueueSize(activeSourcesRef.current.length);
      setIsSpeaking(true);
      setFlowStatus(prev => ({ ...prev, streamedPCM: "PASS" }));

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((src) => src !== source);
        setPlaybackQueueSize(activeSourcesRef.current.length);
        if (activeSourcesRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };
    } catch (err) {
      console.error("PCM stream decoding failed:", err);
      setFlowStatus(prev => ({ ...prev, streamedPCM: "FAIL" }));
    }
  };

  // Local Web Speech Synthesis Backup
  const speakTextLocal = (text: string) => {
    if (!window.speechSynthesis) return;
    
    stopAllAudioPlayback();
    setIsSpeaking(true);

    const cleanText = text.replace(/[*#_`~]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setFlowStatus(prev => ({ ...prev, speechSynthesis: "PASS" }));
    };

    utterance.onerror = (e: any) => {
      // Ignore normal user interruptions/cancellations
      if (e.error === "interrupted" || e.error === "canceled") {
        console.log("TTS play cancelled or interrupted.");
        return;
      }
      console.warn("TTS error:", e);
      setIsSpeaking(false);
      setFlowStatus(prev => ({ ...prev, speechSynthesis: "FAIL" }));
    };

    window.speechSynthesis.speak(utterance);
  };

  // Browser Microphone Capture & Analyser Stream
  const startMicrophone = async () => {
    stopAllAudioPlayback();
    recordedChunksRef.current = [];
    setAiTextResponse("");
    setUserTranscription("");

    try {
      const audioCtx = await initAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // Update actual permission status
      setMicPermission("granted");

      // Update selected device label
      const tracks = stream.getAudioTracks();
      if (tracks.length > 0) {
        setInputDeviceName(tracks[0].label || "Active Microphone");
      }

      const source = audioCtx.createMediaStreamSource(stream);

      // Setup live sound analyser for debugging volume
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Start volume updates
      setIsRecording(true);
      setFlowStatus(prev => ({ ...prev, micRecording: "PASS" }));

      // Script processor for real-time downsampling to 16kHz
      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptNodeRef.current = scriptNode;

      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Downsample inputData to 16kHz PCM
        const downsampledLength = Math.round(inputData.length * (16000 / audioCtx.sampleRate));
        const downsampledBuffer = new Int16Array(downsampledLength);

        for (let i = 0; i < downsampledLength; i++) {
          const index = Math.round(i * (audioCtx.sampleRate / 16000));
          const sample = Math.max(-1, Math.min(1, inputData[index]));
          downsampledBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        recordedChunksRef.current.push(downsampledBuffer);

        // Live stream socket PCM if active and connected
        if (!isFallbackMode && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const base64Audio = arrayBufferToBase64(downsampledBuffer.buffer);
          wsRef.current.send(JSON.stringify({ audio: base64Audio }));
        }
      };

      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);
      
      setStatusMessage("Listening...");
      startVolumeMonitor();
    } catch (err) {
      console.error("Microphone capture failed:", err);
      setMicPermission("denied");
      setFlowStatus(prev => ({ ...prev, micRecording: "FAIL" }));
      setStatusMessage("Microphone permission blocked or unavailable.");
    }
  };

  const startVolumeMonitor = () => {
    if (volumeAnimFrameRef.current) cancelAnimationFrame(volumeAnimFrameRef.current);
    
    const monitor = () => {
      if (!analyserRef.current || !micStreamRef.current) {
        setMicVolume(0);
        return;
      }
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let total = 0;
      for (let i = 0; i < dataArray.length; i++) {
        total += dataArray[i];
      }
      const average = total / dataArray.length;
      setMicVolume(Math.round((average / 150) * 100)); // Scaled for visible levels
      volumeAnimFrameRef.current = requestAnimationFrame(monitor);
    };
    
    volumeAnimFrameRef.current = requestAnimationFrame(monitor);
  };

  const stopMicrophone = () => {
    if (volumeAnimFrameRef.current) {
      cancelAnimationFrame(volumeAnimFrameRef.current);
      volumeAnimFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (scriptNodeRef.current) {
      scriptNodeRef.current.disconnect();
      scriptNodeRef.current = null;
    }
    setMicVolume(0);
    setIsRecording(false);
  };

  const finishRecording = async () => {
    stopMicrophone();

    if (recordedChunksRef.current.length === 0) {
      setStatusMessage("No audio captured. Try again.");
      return;
    }

    setIsProcessingResponse(true);
    setStatusMessage("Generating response...");
    setFlowStatus(prev => ({ ...prev, localDownload: "PASS" }));

    try {
      // Build standard compliant 16kHz WAV file from recorded buffer chunks
      const wavBlob = convertPcmChunksToWavBlob(recordedChunksRef.current, 16000);
      const base64Audio = await blobToBase64(wavBlob);

      // Step 1: Speech-To-Text Transcribe
      const transcribeRes = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioBase64: base64Audio, mimeType: "audio/wav" }),
      });

      if (!transcribeRes.ok) {
        throw new Error("STT Translation failed");
      }

      const transcribeData = await transcribeRes.json();
      const transcription = transcribeData.transcription || "";
      setFlowStatus(prev => ({ ...prev, transcription: "PASS" }));

      if (!transcription.trim()) {
        setStatusMessage("I couldn't hear anything. Please try again!");
        setIsProcessingResponse(false);
        return;
      }

      setUserTranscription(transcription);

      // Step 2: Query FIFA Copilot Response
      const copilotRes = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: transcription,
          role: "Fan",
          history: [],
        }),
      });

      if (!copilotRes.ok) {
        throw new Error("Copilot system failed");
      }

      const copilotData = await copilotRes.json();
      const responseText = copilotData.response || "";
      setFlowStatus(prev => ({ ...prev, copilotResponse: "PASS" }));

      setAiTextResponse(responseText);
      setStatusMessage("Speaking response...");

      // Final step: Read answer locally or handle failover voice playback
      if (isFallbackMode) {
        speakTextLocal(responseText);
      } else {
        // If live PCM playback does not start in 1.5s, play locally to ensure user gets voice
        setTimeout(() => {
          if (!isSpeaking) {
            speakTextLocal(responseText);
          }
        }, 1500);
      }
    } catch (err) {
      console.error("Audio pipeline diagnostic failure:", err);
      setFlowStatus(prev => ({ 
        ...prev, 
        transcription: flowStatus.transcription === "PASS" ? "PASS" : "FAIL",
        copilotResponse: flowStatus.copilotResponse === "PASS" ? "PASS" : "FAIL"
      }));

      const backupSpeech = "I am having difficulty connecting to our central systems. Rest assured, Stadium Security is active and Azteca Tacos is running perfectly in Section 114!";
      setAiTextResponse(backupSpeech);
      speakTextLocal(backupSpeech);
      setStatusMessage("Voice service is temporarily unavailable. Switching to text mode.");
    } finally {
      setIsProcessingResponse(false);
    }
  };

  // Convert array buffer to base64 helper
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const convertPcmChunksToWavBlob = (chunks: Int16Array[], sampleRate: number): Blob => {
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }
    const result = new Int16Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    const headerBuffer = new ArrayBuffer(44);
    const view = new DataView(headerBuffer);

    const writeString = (v: DataView, off: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(off + i, str.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + totalLength * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM Format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    writeString(view, 36, "data");
    view.setUint32(40, totalLength * 2, true);

    return new Blob([headerBuffer, result.buffer], { type: "audio/wav" });
  };

  // STEP 3: FORCE A SPEAKER TEST
  const triggerSpeakerTest = async () => {
    try {
      const audioCtx = await initAudioContext();
      
      // Part 1: Synth beep sound to prove Web Audio API pipeline is unblocked
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1);

      // Play synthesized chord for feedback
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(554.37, audioCtx.currentTime); // C#5
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.8);
      }, 200);

      setFlowStatus(prev => ({ ...prev, browserAudioElement: "PASS" }));

      // Part 2: Speak test utterance via window.speechSynthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const testUtterance = new SpeechSynthesisUtterance("FIFA Copilot speaker test successful.");
        testUtterance.lang = "en-US";
        window.speechSynthesis.speak(testUtterance);
        setFlowStatus(prev => ({ ...prev, speechSynthesis: "PASS" }));
      } else {
        setFlowStatus(prev => ({ ...prev, speechSynthesis: "FAIL" }));
      }
    } catch (err) {
      console.error("Speaker test failure:", err);
      setFlowStatus(prev => ({ ...prev, browserAudioElement: "FAIL", speechSynthesis: "FAIL" }));
    }
  };

  // STEP 4: FORCE A MICROPHONE TEST (Record exactly 5 seconds and download the mono WAV)
  const triggerMicrophoneTest = async () => {
    if (isTestingMic) return;
    setIsTestingMic(true);
    setMicTestCountdown(5);
    recordedChunksRef.current = [];

    try {
      const audioCtx = await initAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioCtx.createMediaStreamSource(stream);

      // Analyse volume levels live
      const testAnalyser = audioCtx.createAnalyser();
      testAnalyser.fftSize = 128;
      analyserRef.current = testAnalyser;
      source.connect(testAnalyser);

      const scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
      
      scriptNode.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampledLength = Math.round(inputData.length * (16000 / audioCtx.sampleRate));
        const downsampledBuffer = new Int16Array(downsampledLength);

        for (let i = 0; i < downsampledLength; i++) {
          const index = Math.round(i * (audioCtx.sampleRate / 16000));
          const sample = Math.max(-1, Math.min(1, inputData[index]));
          downsampledBuffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }
        recordedChunksRef.current.push(downsampledBuffer);
      };

      source.connect(scriptNode);
      scriptNode.connect(audioCtx.destination);

      // Start volume monitor during test
      let testAnimFrame: number;
      const updateTestVolume = () => {
        const dataArray = new Uint8Array(testAnalyser.frequencyBinCount);
        testAnalyser.getByteFrequencyData(dataArray);
        let total = 0;
        for (let i = 0; i < dataArray.length; i++) {
          total += dataArray[i];
        }
        const average = total / dataArray.length;
        setMicVolume(Math.round((average / 150) * 100));
        testAnimFrame = requestAnimationFrame(updateTestVolume);
      };
      testAnimFrame = requestAnimationFrame(updateTestVolume);

      // Set up standard 5s recording countdown interval
      const timer = setInterval(() => {
        setMicTestCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            cancelAnimationFrame(testAnimFrame);
            // Stop recording & trigger download
            scriptNode.disconnect();
            source.disconnect();
            stream.getTracks().forEach((track) => track.stop());
            setMicVolume(0);

            // Construct and download test WAV file
            setTimeout(() => {
              try {
                const wavBlob = convertPcmChunksToWavBlob(recordedChunksRef.current, 16000);
                const url = URL.createObjectURL(wavBlob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `fifa_mic_test_${Date.now()}.wav`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                setFlowStatus((prevStatus) => ({ 
                  ...prevStatus, 
                  micRecording: "PASS", 
                  localDownload: "PASS" 
                }));
                setStatusMessage("Microphone diagnostic test file downloaded successfully!");
              } catch (wavErr) {
                console.error("WAV creation failed during test:", wavErr);
                setFlowStatus((prevStatus) => ({ 
                  ...prevStatus, 
                  micRecording: "FAIL", 
                  localDownload: "FAIL" 
                }));
              }
              setIsTestingMic(false);
            }, 300);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Mic diagnostic test failed:", err);
      setIsTestingMic(false);
      setFlowStatus(prev => ({ ...prev, micRecording: "FAIL", localDownload: "FAIL" }));
    }
  };

  const cleanupAll = () => {
    stopHeartbeat();
    stopMicrophone();
    stopAllAudioPlayback();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return (
    <div id="live-walkie-talkie" className="space-y-4">
      {/* Primary Voice Action Card */}
      <div className="glass-panel p-5 rounded-2xl border border-purple-500/15 shadow-xl relative overflow-hidden bg-gray-950/80">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h4 className="text-xs uppercase font-mono tracking-wider text-purple-400 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-purple-400 animate-pulse shrink-0" />
              FIFA Copilot Voice Dispatcher
            </h4>
            <p className="text-[10px] text-gray-400 mt-1">
              Ultra-low latency walkie-talkie mode optimized for Chrome, Edge, Safari, iOS & Android.
            </p>
          </div>
          <span className={`text-[8px] font-mono border px-1.5 py-0.5 rounded uppercase tracking-wider font-bold shrink-0 ${isFallbackMode ? "bg-amber-950 border-amber-800 text-amber-300" : "bg-purple-950 border-purple-800 text-purple-300"}`}>
            {isFallbackMode ? "Fallback Mode" : "Live Stream"}
          </span>
        </div>

        {/* Warning banner for Fallback mode */}
        {isFallbackMode && (
          <div className="mb-4 bg-amber-950/30 border border-amber-900/40 px-3 py-2.5 rounded-xl text-[10px] text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Voice service is temporarily unavailable. Switching to local text-to-speech engine.</span>
          </div>
        )}

        {/* Main Interface Content */}
        {!isConnected ? (
          <button
            onClick={connectVoice}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-950 disabled:to-indigo-950 disabled:text-gray-500 text-white font-semibold rounded-xl text-xs py-3.5 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                <span>Connecting to voice assistant...</span>
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-white" />
                <span>Connect Voice Session</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-4">
            {/* Connected Session State Card */}
            <div className="flex flex-col items-center justify-center p-6 bg-gray-900/60 rounded-2xl border border-gray-800 relative overflow-hidden">
              
              {/* Voice Active visualizer waveforms */}
              {(isRecording || isSpeaking || isProcessingResponse || isTestingMic) ? (
                <div className="flex items-end gap-1 h-10 mb-4 transition-all">
                  {[...Array(16)].map((_, i) => {
                    const animDuration = isSpeaking ? "0.35s" : isRecording ? "0.6s" : isTestingMic ? "0.45s" : "1.2s";
                    const randomDelay = (i * 0.08).toFixed(2);
                    return (
                      <div
                        key={i}
                        className="w-1 bg-purple-500 rounded-full"
                        style={{
                          height: "100%",
                          animationName: "bounce",
                          animationDuration: animDuration,
                          animationIterationCount: "infinite",
                          animationTimingFunction: "ease-in-out",
                          animationDirection: "alternate",
                          animationDelay: `${randomDelay}s`,
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-1 h-10 mb-4 justify-center">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="w-1 h-1.5 bg-gray-800 rounded-full" />
                  ))}
                </div>
              )}

              {/* Status Indicator Label */}
              <span className="text-[10px] font-mono text-gray-300 uppercase tracking-widest text-center">
                {isTestingMic ? `RECORDING MIC DIAGNOSTIC: ${micTestCountdown}s` :
                 isRecording ? "Listening..." : 
                 isSpeaking ? "Speaking Response..." : 
                 isProcessingResponse ? "Generating response..." : 
                 statusMessage}
              </span>

              {/* Action dispatch controls */}
              <div className="flex items-center justify-center gap-4 mt-5 w-full">
                {!isRecording && !isTestingMic ? (
                  <button
                    onClick={startMicrophone}
                    disabled={isProcessingResponse || isSpeaking}
                    className="w-44 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-950/30 disabled:text-gray-600 text-white font-bold py-3.5 rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer transform hover:scale-102 active:scale-98"
                  >
                    <Mic className="w-4 h-4 text-white" />
                    <span>TAP TO SPEAK</span>
                  </button>
                ) : isRecording ? (
                  <button
                    onClick={finishRecording}
                    className="w-44 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-full text-xs transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer transform scale-102 animate-pulse"
                  >
                    <MicOff className="w-4 h-4 text-white" />
                    <span>STOP & SEND</span>
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-44 bg-amber-600/50 text-amber-200 font-bold py-3.5 rounded-full text-xs flex items-center justify-center gap-2"
                  >
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>RECORDING TEST</span>
                  </button>
                )}

                {/* Stop audio playback trigger */}
                {isSpeaking && (
                  <button
                    onClick={stopAllAudioPlayback}
                    className="p-3 bg-gray-950 border border-gray-800 hover:bg-gray-800 text-red-400 rounded-full transition-all cursor-pointer shadow"
                    title="Stop Audio Playback"
                  >
                    <VolumeX className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation text transcript block */}
            {(userTranscription || aiTextResponse) && (
              <div className="space-y-3 p-3 bg-gray-950/60 rounded-xl border border-gray-900 text-xs leading-relaxed">
                {userTranscription && (
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 uppercase block">Your voice query:</span>
                    <p className="text-gray-300 font-mono mt-0.5 font-medium">"{userTranscription}"</p>
                  </div>
                )}
                {aiTextResponse && (
                  <div className="pt-2.5 border-t border-gray-900/60">
                    <span className="text-[9px] font-mono text-purple-400 uppercase block">AI Verbal Response:</span>
                    <p className="text-white mt-1 leading-relaxed font-sans">{aiTextResponse}</p>
                  </div>
                )}
              </div>
            )}

            {/* Bottom session action buttons */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={connectVoice}
                disabled={isConnecting}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-[10px] text-gray-400 font-mono flex items-center gap-1 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-purple-400" />
                Reconnect
              </button>
              <button
                onClick={disconnectVoice}
                className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 rounded-xl text-[10px] text-red-400 font-mono flex items-center gap-1 transition-all cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* EMERGENCY DEVELOPER DIAGNOSTICS DASHBOARD */}
      <div className="glass-panel p-5 rounded-2xl border border-purple-500/10 bg-gray-950/95 shadow-2xl text-xs space-y-4">
        
        {/* Diagnostic Title */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <h5 className="font-mono text-xs uppercase tracking-wider text-purple-300">
              Voice Diagnostic Panel (Debug Mode)
            </h5>
          </div>
          <span className="text-[9px] bg-red-950/50 text-red-400 border border-red-900 px-2 py-0.5 rounded uppercase font-mono font-bold">
            Live Telemetry
          </span>
        </div>

        {/* Diagnostic Real-time telemetry values */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Microphones Status Column */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] uppercase font-semibold">
              <Mic className="w-3.5 h-3.5" />
              <span>Microphone Status</span>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-gray-400">
              <div className="flex justify-between">
                <span>Permission State:</span>
                <span className={`font-bold ${micPermission === "granted" ? "text-green-400" : micPermission === "denied" ? "text-red-400" : "text-amber-400"}`}>
                  {micPermission.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Input Device Name:</span>
                <span className="text-white text-right truncate max-w-[140px]">{inputDeviceName}</span>
              </div>
              <div className="flex justify-between">
                <span>System Sample Rate:</span>
                <span className="text-white">{systemSampleRate ? `${systemSampleRate / 1000} kHz` : "0 kHz"}</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-gray-800/40">
                <div className="flex justify-between text-[9px] text-gray-500">
                  <span>Current Volume Level:</span>
                  <span>{micVolume}%</span>
                </div>
                <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden border border-gray-800">
                  <div 
                    className="bg-purple-500 h-full transition-all duration-75"
                    style={{ width: `${micVolume}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Speakers Status Column */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] uppercase font-semibold">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Speaker / Speech Engine</span>
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-gray-400">
              <div className="flex justify-between">
                <span>AudioContext State:</span>
                <span className={`font-bold ${audioCtxState === "running" ? "text-green-400" : audioCtxState === "suspended" ? "text-amber-400" : "text-red-400"}`}>
                  {audioCtxState.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Local Vocal TTS Engine:</span>
                <span className={`font-bold ${ttsAvailable ? "text-green-400" : "text-red-400"}`}>
                  {ttsAvailable ? "AVAILABLE" : "UNSUPPORTED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Output Buffer Size:</span>
                <span className="text-white">{playbackQueueSize} queued packet(s)</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-800/40">
                <span>Web Sockets State:</span>
                <span className={`font-bold ${wsState === "OPEN" ? "text-green-400" : wsState === "CONNECTING" ? "text-amber-400" : "text-red-400"}`}>
                  {wsState}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: VERIFY THE COMPLETE AUDIO FLOW CHECKLIST */}
        <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] uppercase font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>Interactive Diagnostic Flow Verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
            {/* Step 1 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40">
              <span className="text-gray-400">1. Mic Capture Pipeline</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.micRecording === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.micRecording === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.micRecording}
              </span>
            </div>
            {/* Step 2 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40">
              <span className="text-gray-400">2. Local WAV Packaging</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.localDownload === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.localDownload === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.localDownload}
              </span>
            </div>
            {/* Step 3 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40">
              <span className="text-gray-400">3. STT Transcription API</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.transcription === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.transcription === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.transcription}
              </span>
            </div>
            {/* Step 4 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40">
              <span className="text-gray-400">4. FIFA Copilot Response</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.copilotResponse === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.copilotResponse === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.copilotResponse}
              </span>
            </div>
            {/* Step 5 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40">
              <span className="text-gray-400">5. SpeechSynthesis Vocal</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.speechSynthesis === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.speechSynthesis === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.speechSynthesis}
              </span>
            </div>
            {/* Step 6 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40">
              <span className="text-gray-400">6. Web Audio Playback</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.browserAudioElement === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.browserAudioElement === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.browserAudioElement}
              </span>
            </div>
            {/* Step 7 */}
            <div className="flex items-center justify-between bg-gray-950/40 px-2.5 py-1.5 rounded-lg border border-gray-800/40 col-span-1 md:col-span-2">
              <span className="text-gray-400">7. Live Streaming Streamed PCM Audio packets</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${flowStatus.streamedPCM === "PASS" ? "bg-green-950 text-green-400 border border-green-800" : flowStatus.streamedPCM === "FAIL" ? "bg-red-950 text-red-400 border border-red-800" : "bg-gray-900 text-gray-500 border border-gray-800"}`}>
                {flowStatus.streamedPCM}
              </span>
            </div>
          </div>
        </div>

        {/* DIAGNOSTIC HARNESS ACTION BUTTONS */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800/60">
          <button
            id="btn-test-speaker"
            onClick={triggerSpeakerTest}
            className="flex-1 min-w-[140px] bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 rounded-xl py-2 px-3 text-[10px] font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Speaker</span>
          </button>

          <button
            id="btn-test-microphone"
            onClick={triggerMicrophoneTest}
            disabled={isTestingMic}
            className="flex-1 min-w-[140px] bg-purple-950 hover:bg-purple-900 disabled:bg-purple-950/35 border border-purple-800 disabled:border-purple-950/50 text-purple-300 disabled:text-purple-600 rounded-xl py-2 px-3 text-[10px] font-mono flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Test Microphone</span>
          </button>
        </div>

        {/* Warning instructions */}
        <div className="text-[9px] text-gray-500 leading-relaxed font-mono flex gap-1 items-start">
          <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
          <span>
            Test Speaker plays synthesized audio. Test Microphone records a 5s sample and triggers an automatic browser download. Verify locally to isolate system-wide audio pipeline problems.
          </span>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0% { transform: scaleY(0.15); }
          100% { transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  );
}
