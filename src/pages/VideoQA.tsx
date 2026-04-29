import { useState, useCallback, useRef } from "react";
import {
  Video,
  Send,
  Loader2,
  Clock,
  Cpu,
  Film,
  Sparkles,
  Upload,
  X,
  AlertTriangle,
  Settings2,
  Gauge,
  Zap,
  Target,
  Microscope,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queryVideo, type VideoQAQuality } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface VideoQAResult {
  answer: string;
  frames_extracted: number;
  response_time: number;
  model: string;
  quality: string;
  video_duration?: number;
  video_resolution?: string;
}

interface ChatEntry {
  id: string;
  query: string;
  result: VideoQAResult;
  timestamp: Date;
}

const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const QUALITY_OPTIONS: {
  value: VideoQAQuality;
  label: string;
  description: string;
  icon: typeof Zap;
  color: string;
  frames: string;
  eta: string;
}[] = [
  {
    value: "fast",
    label: "Fast",
    description: "16 uniform frames, quick scan",
    icon: Zap,
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    frames: "16",
    eta: "~10s",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "32 keyframes with scene-change detection",
    icon: Target,
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/5",
    frames: "32",
    eta: "~20s",
  },
  {
    value: "thorough",
    label: "Thorough",
    description: "Multi-segment dense analysis, covers entire video",
    icon: Microscope,
    color: "text-violet-400 border-violet-500/30 bg-violet-500/5",
    frames: "96-192",
    eta: "~45-90s",
  },
];

const VideoQA = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [quality, setQuality] = useState<VideoQAQuality>("balanced");
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [ngrokUrl, setNgrokUrl] = useState(() => {
    return localStorage.getItem("documind.videoqa.ngrok") || "";
  });
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid format",
        description: "Please upload MP4, WebM, MOV, or AVI.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      toast({
        title: "File too large",
        description: "Video must be under 100 MB.",
        variant: "destructive",
      });
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setChatHistory([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleVideoSelect(fakeEvent);
      }
    },
    [handleVideoSelect]
  );

  const clearVideo = () => {
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
    setChatHistory([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveNgrokUrl = (url: string) => {
    const trimmed = url.trim().replace(/\/+$/, "");
    setNgrokUrl(trimmed);
    localStorage.setItem("documind.videoqa.ngrok", trimmed);
  };

  const handleQuery = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !videoFile) return;

    if (!ngrokUrl) {
      setShowSettings(true);
      toast({
        title: "Ngrok URL required",
        description: "Please set your Kaggle ngrok URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsQuerying(true);

    try {
      const result = await queryVideo(ngrokUrl, videoFile, trimmedQuery, quality);

      if (result.success && result.answer) {
        const entry: ChatEntry = {
          id: crypto.randomUUID(),
          query: trimmedQuery,
          result: {
            answer: result.answer,
            frames_extracted: result.frames_extracted || 32,
            response_time: result.response_time || 0,
            model: result.model || "LLaVA-NeXT-Video-7B",
            quality: result.quality || quality,
            video_duration: result.video_duration,
            video_resolution: result.video_resolution,
          },
          timestamp: new Date(),
        };
        setChatHistory((prev) => [entry, ...prev]);
        setQuery("");
      } else {
        throw new Error(result.error || "Query failed");
      }
    } catch (error) {
      console.error("Video QA error:", error);
      toast({
        title: "Query failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to process video query. Make sure your Kaggle notebook is running.",
        variant: "destructive",
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const currentQuality = QUALITY_OPTIONS.find((q) => q.value === quality)!;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 shadow-lg">
            <Video className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold gradient-text">Video Q&A</h1>
            <p className="text-xs text-muted-foreground">
              Ask questions about any video using LLaVA-NeXT
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
            showSettings
              ? "bg-primary/10 text-primary glow-cyan"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </button>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="mb-6 glass-card rounded-2xl p-5"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <label className="block text-sm font-medium text-foreground mb-2">
              Kaggle Ngrok URL
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Paste the public URL from your Kaggle notebook (e.g.{" "}
              <code className="text-cyan-400">https://xxxx-xx-xx.ngrok-free.app</code>)
            </p>
            <div className="flex gap-3">
              <input
                type="url"
                value={ngrokUrl}
                onChange={(e) => saveNgrokUrl(e.target.value)}
                placeholder="https://xxxx.ngrok-free.app"
                className="flex-1 rounded-xl glass-input px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
              />
              <button
                onClick={() => setShowSettings(false)}
                className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-semibold"
              >
                Save
              </button>
            </div>
            {ngrokUrl && (
              <p className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected to: {ngrokUrl}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No ngrok URL warning */}
      {!ngrokUrl && !showSettings && (
        <motion.div
          className="mb-6 glass-card rounded-2xl p-5 border border-orange-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Kaggle endpoint not configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run your Kaggle notebook and paste the ngrok URL in Settings to get started.
              </p>
              <button
                onClick={() => setShowSettings(true)}
                className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                Open Settings →
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quality Selector */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Analysis Quality</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUALITY_OPTIONS.map((opt) => {
            const isActive = quality === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => setQuality(opt.value)}
                disabled={isQuerying}
                className={`relative rounded-xl p-4 text-left transition-all duration-300 border ${
                  isActive
                    ? `${opt.color} shadow-lg`
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.12]"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    layoutId="quality-ring"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    style={{
                      border: "1px solid currentColor",
                      opacity: 0.3,
                    }}
                  />
                )}
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`h-4 w-4 ${isActive ? "" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-semibold ${isActive ? "" : "text-foreground/80"}`}>
                    {opt.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug mb-2">
                  {opt.description}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Film className="h-2.5 w-2.5" />
                    {opt.frames} frames
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {opt.eta}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Video Upload */}
        <div className="lg:col-span-2">
          <motion.div
            className="glass-card rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Film className="h-4 w-4 text-cyan-400" />
                  Video
                </span>
                {videoFile && (
                  <button
                    onClick={clearVideo}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4">
              {videoPreview ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    src={videoPreview}
                    controls
                    className="w-full rounded-xl border border-white/[0.06] max-h-[280px] object-contain bg-black/50"
                  />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Film className="h-3 w-3" />
                    <span className="truncate">{videoFile?.name}</span>
                    <span className="shrink-0">
                      ({(videoFile!.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="group cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-white/10 hover:border-cyan-500/40 transition-all duration-300 group-hover:bg-white/[0.02]">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-panel group-hover:shadow-glow-cyan transition-shadow animate-float">
                      <Upload className="h-8 w-8 text-cyan-400/40 group-hover:text-cyan-400/80 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-foreground/80 mb-1">
                      Drop video here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP4, WebM, MOV, AVI — up to 100 MB
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
            </div>
          </motion.div>
        </div>

        {/* Right: Chat */}
        <div className="lg:col-span-3 flex flex-col">
          <motion.div
            className="glass-card rounded-2xl flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="p-4 border-b border-white/[0.06]">
              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" />
                Ask About the Video
              </span>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[400px] space-y-4">
              {chatHistory.length === 0 && !isQuerying && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-panel">
                    <Sparkles className="h-8 w-8 text-violet-400/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {videoFile
                      ? "Video loaded! Ask your first question below."
                      : "Upload a video first, then ask questions about it."}
                  </p>
                </div>
              )}

              {isQuerying && (
                <motion.div
                  className="glass-panel rounded-xl p-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                      <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        Analyzing video ({currentQuality.label} mode)...
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {quality === "fast" && "Extracting 16 frames and generating response"}
                        {quality === "balanced" && "Detecting scene changes across 32 keyframes"}
                        {quality === "thorough" && "Processing video in multiple segments for full coverage"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {chatHistory.map((entry) => (
                  <motion.div
                    key={entry.id}
                    className="space-y-3"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    {/* User Query */}
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/10 px-4 py-2.5">
                        <p className="text-sm text-foreground">{entry.query}</p>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="max-w-[90%] glass-panel rounded-2xl rounded-bl-md px-4 py-3">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {entry.result.answer}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.result.response_time}s
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Film className="h-3 w-3" />
                            {entry.result.frames_extracted} frames
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {entry.result.model}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Gauge className="h-3 w-3" />
                            {entry.result.quality}
                          </span>
                          {entry.result.video_duration && (
                            <span className="inline-flex items-center gap-1">
                              {entry.result.video_duration}s video
                            </span>
                          )}
                          {entry.result.video_resolution && (
                            <span className="inline-flex items-center gap-1">
                              {entry.result.video_resolution}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    videoFile
                      ? "Ask a question about the video..."
                      : "Upload a video first..."
                  }
                  disabled={!videoFile || isQuerying}
                  className="flex-1 rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleQuery}
                  disabled={!videoFile || !query.trim() || isQuerying || !ngrokUrl}
                  className="btn-gradient rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2"
                >
                  {isQuerying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VideoQA;
