import React, { useState, useRef } from "react";
import { Image, Film, RefreshCw, Sparkles, Upload, Sliders, CheckCircle, HelpCircle, Info } from "lucide-react";
import { User } from "firebase/auth";
import { saveGeneratedAsset } from "../firebase";
import { motion, AnimatePresence } from "motion/react";

interface PhotoBoothProps {
  user: User | null;
}

export default function PhotoBooth({ user }: PhotoBoothProps) {
  const [activeTab, setActiveTab] = useState<"image" | "video">("image");

  // Image Generation States
  const [imgPrompt, setImgPrompt] = useState("FIFA 2026 World Cup Match ticket design, futuristic, holographic, neon MetLife background, ticket #82910");
  const [imgModel, setImgModel] = useState<"pro" | "flash">("pro");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageSize, setImageSize] = useState("1K");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string>("image/png");
  const [imgLoading, setImgLoading] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);

  // Video Highlights States (Veo)
  const [vidPrompt, setVidPrompt] = useState("Swooping cinematic aerial drone view of MetLife Stadium at sunset, packed stadium with green laser show");
  const [vidAspectRatio, setVidAspectRatio] = useState("16:9");
  const [vidSourceImg, setVidSourceImg] = useState<string | null>(null);
  const [vidLoading, setVidLoading] = useState(false);
  const [vidProgress, setVidProgress] = useState("");
  const [generatedVid, setGeneratedVid] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const vidImgRef = useRef<HTMLInputElement | null>(null);

  // File drag-and-drop / manual select handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, target: "image" | "video-ref") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === "image") {
          setSelectedFile(reader.result as string);
          setFileMime(file.type);
        } else {
          setVidSourceImg(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate / Edit Image Handler
  const handleGenerateImage = async () => {
    if (!imgPrompt.trim()) return;
    setImgLoading(true);
    setGeneratedImg(null);

    try {
      const endpoint = selectedFile ? "/api/edit-image" : "/api/generate-image";
      const payload = selectedFile
        ? {
            prompt: imgPrompt,
            imageBase64: selectedFile.split(",")[1],
            mimeType: fileMime,
            aspectRatio,
            imageSize,
          }
        : {
            prompt: imgPrompt,
            aspectRatio,
            imageSize,
            modelType: imgModel,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.image) {
        setGeneratedImg(data.image);
        if (user) {
          await saveGeneratedAsset(user.uid, {
            type: "image",
            prompt: imgPrompt,
            url: data.image,
            size: imageSize,
            ratio: aspectRatio,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("Image process failed:", err);
    } finally {
      setImgLoading(false);
    }
  };

  // Veo Video Highlights Handler (POST 3-step Poll)
  const handleGenerateVideo = async () => {
    if (!vidPrompt.trim()) return;
    setVidLoading(true);
    setVidProgress("Initializing operation with Veo-3.1...");
    setGeneratedVid(null);

    try {
      // Step 1: Start
      const resStart = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: vidPrompt,
          imageBase64: vidSourceImg ? vidSourceImg.split(",")[1] : undefined,
          aspectRatio: vidAspectRatio,
        }),
      });
      const dataStart = await resStart.json();

      if (!dataStart.operationName) {
        throw new Error("Could not fetch operation name.");
      }

      const operationName = dataStart.operationName;

      // Step 2: Poll status
      let isDone = false;
      const startTime = Date.now();
      const timeout = 120000; // 2 minutes

      while (!isDone && Date.now() - startTime < timeout) {
        setVidProgress("Rendering video frames... (" + Math.round((Date.now() - startTime) / 1000) + "s)");
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const resStatus = await fetch("/api/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName }),
        });
        const dataStatus = await resStatus.json();
        isDone = dataStatus.done;
      }

      // Step 3: Download
      setVidProgress("Downloading fully-rendered MP4...");
      const resDownload = await fetch("/api/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName }),
      });
      const dataDownload = await resDownload.json();

      if (dataDownload.videoUrl) {
        setGeneratedVid(dataDownload.videoUrl);
        setVidProgress("Video loaded successfully!");
        if (user) {
          await saveGeneratedAsset(user.uid, {
            type: "video",
            prompt: vidPrompt,
            url: dataDownload.videoUrl,
            ratio: vidAspectRatio,
            timestamp: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("Video highlights generation failed:", err);
      setVidProgress("Render failed or timed out.");
    } finally {
      setVidLoading(false);
    }
  };

  return (
    <div className="glass-panel p-4 rounded-2xl border border-gray-900 flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex border-b border-gray-900 pb-2">
        <button
          onClick={() => setActiveTab("image")}
          className={`flex-1 text-xs py-2 font-mono flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === "image" ? "border-purple-500 text-purple-300 font-semibold" : "border-transparent text-gray-500 hover:text-gray-300"}`}
        >
          <Image className="w-4 h-4" />
          AI Photo Booth & Posters
        </button>
        <button
          onClick={() => setActiveTab("video")}
          className={`flex-1 text-xs py-2 font-mono flex items-center justify-center gap-2 border-b-2 transition-all ${activeTab === "video" ? "border-purple-500 text-purple-300 font-semibold" : "border-transparent text-gray-500 hover:text-gray-300"}`}
        >
          <Film className="w-4 h-4" />
          Veo Video Highlights
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "image" ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1">
                FIFA Hype Card Poster Booth
                <span className="text-[8px] bg-purple-900/40 text-purple-300 px-1 rounded uppercase">Image Studio</span>
              </h4>
              <p className="text-[9px] text-gray-500 mt-0.5">
                Generate high-quality stadium tickets or poster art, or upload a photo to edit/extend.
              </p>
            </div>

            {/* Image Setup Panel */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1">Theme / Modification Prompt</label>
                <textarea
                  value={imgPrompt}
                  onChange={(e) => setImgPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-600/40"
                  placeholder="e.g. Add golden sparks around the ticket, majestic stadium spotlight..."
                />
              </div>

              {/* Advanced sliders */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] font-mono text-gray-500 block mb-0.5">Model Grade</span>
                  <select
                    value={imgModel}
                    onChange={(e) => setImgModel(e.target.value as any)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
                  >
                    <option value="pro">Pro (Studio)</option>
                    <option value="flash">Flash (Speed)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-gray-500 block mb-0.5">Aspect Ratio</span>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
                  >
                    {["1:1", "2:3", "3:2", "3:4", "4:3", "9:16", "16:9", "21:9"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-gray-500 block mb-0.5">Resolution Size</span>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
                  >
                    <option>512px</option>
                    <option>1K</option>
                    <option>2K</option>
                    <option>4K</option>
                  </select>
                </div>
              </div>

              {/* Background Edit upload box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-gray-900 hover:border-purple-500/30 p-3 rounded-xl bg-gray-950/40 text-center cursor-pointer transition-all"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileChange(e, "image")}
                  className="hidden"
                  accept="image/*"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-purple-300 font-semibold truncate flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      Original Photo Loaded
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="text-[9px] text-gray-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-5 h-5 mx-auto text-gray-500" />
                    <span className="text-[10px] text-gray-400 block font-sans">
                      Drag & drop / upload photo to **Edit / Modify** it
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateImage}
                disabled={imgLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs py-2.5 transition-all flex items-center justify-center gap-1.5"
              >
                {imgLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Rendering graphic vectors with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    {selectedFile ? "Edit Uploaded Photo" : "Generate Custom Poster"}
                  </>
                )}
              </button>
            </div>

            {/* Generated card preview */}
            {generatedImg && (
              <div className="space-y-2 border-t border-gray-900 pt-3">
                <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block">AI Graphic Preview:</span>
                <div className="relative rounded-xl overflow-hidden border border-gray-800 shadow-2xl group max-h-[300px] flex items-center justify-center bg-gray-950">
                  <img src={generatedImg} alt="AI Fan Art" className="max-h-full object-contain" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <span className="text-[9px] text-gray-400 font-mono">Size: {imageSize} | Ratio: {aspectRatio}</span>
                    <p className="text-[10px] text-white font-semibold truncate mt-0.5">{imgPrompt}</p>
                  </div>
                </div>
                <button
                  onClick={() => setVidSourceImg(generatedImg)}
                  className="w-full bg-cyan-950 hover:bg-cyan-900 border border-cyan-900 text-cyan-300 py-1.5 rounded-lg text-[10px] font-mono transition-all"
                >
                  🎬 Send to Veo Highlights Video Animator
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1">
                Veo AI Highlights Creator
                <span className="text-[8px] bg-cyan-950 text-cyan-300 px-1 rounded uppercase">Veo 3.1</span>
              </h4>
              <p className="text-[9px] text-gray-500 mt-0.5">
                Transform text descriptions or a photo into dynamic 5-second cinematic loops.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-mono text-gray-400 block mb-1">Visual Animation Scene</label>
                <textarea
                  value={vidPrompt}
                  onChange={(e) => setVidPrompt(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-900 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-600/40"
                  placeholder="e.g. Drone camera rises showing soccer star scoring a goal under pouring rain, 4k resolution..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[9px] font-mono text-gray-500 block mb-0.5">Screen Ratio</span>
                  <select
                    value={vidAspectRatio}
                    onChange={(e) => setVidAspectRatio(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-900 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none"
                  >
                    <option value="16:9">16:9 Landscape</option>
                    <option value="9:16">9:16 Portrait</option>
                  </select>
                </div>
                <div>
                  <span className="text-[9px] font-mono text-gray-500 block mb-0.5">Video Resolution</span>
                  <div className="bg-gray-950 border border-gray-900 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-400 font-mono">
                    720p HD (High Frame)
                  </div>
                </div>
              </div>

              {/* Source Photo animator */}
              <div
                onClick={() => vidImgRef.current?.click()}
                className="border border-dashed border-gray-900 hover:border-cyan-500/30 p-3 rounded-xl bg-gray-950/40 text-center cursor-pointer transition-all"
              >
                <input
                  type="file"
                  ref={vidImgRef}
                  onChange={(e) => handleFileChange(e, "video-ref")}
                  className="hidden"
                  accept="image/*"
                />
                {vidSourceImg ? (
                  <div className="flex gap-2 items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold truncate">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      Starting Photo Attached
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVidSourceImg(null);
                      }}
                      className="text-[9px] text-gray-500 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-5 h-5 mx-auto text-gray-500" />
                    <span className="text-[10px] text-gray-400 block font-sans">
                      Attach starting keyframe photo (Optional)
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerateVideo}
                disabled={vidLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl text-xs py-2.5 transition-all flex items-center justify-center gap-1.5"
              >
                {vidLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {vidProgress}
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5" />
                    Render Veo Clip
                  </>
                )}
              </button>
            </div>

            {/* Generated Video Highlights Loop */}
            {generatedVid && (
              <div className="space-y-2 border-t border-gray-900 pt-3">
                <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest block">Veo Highlights render:</span>
                <div className="relative rounded-xl overflow-hidden border border-gray-800 shadow-2xl flex justify-center items-center bg-black max-h-[300px]">
                  <video
                    src={generatedVid}
                    controls
                    autoPlay
                    loop
                    className="max-h-full w-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-1.5 p-2 bg-gray-950/40 rounded-xl border border-gray-900/60 text-[9px] text-gray-500 font-mono leading-relaxed">
        <Info className="w-3.5 h-3.5 text-purple-500 shrink-0" />
        Render time for Veo operations is typically 15-30s. Offline simulation provides cinematic stadium stock sequences.
      </div>
    </div>
  );
}
