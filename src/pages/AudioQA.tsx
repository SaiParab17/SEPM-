import { useState, useCallback, useRef } from "react";
import {
  Mic,
  Send,
  Loader2,
  Clock,
  Cpu,
  Sparkles,
  Upload,
  X,
  AlertTriangle,
  Settings2,
  FileText,
  Music,
  Volume2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { queryAudio } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface AudioQAResult {
  answer: string;
  transcript: string;
  audio_duration: number;
  response_time: number;
  model: string;
}

interface ChatEntry {
  id: string;
  query: string;
  result: AudioQAResult;
  timestamp: Date;
}

const ACCEPTED_AUDIO = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/webm",
  "audio/aac",
  "audio/x-m4a",
];
const MAX_AUDIO_SIZE = 50 * 1024 * 1024; // 50MB

const AudioQA = () => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [ngrokUrl, setNgrokUrl] = useState(() => {
    return localStorage.getItem("documind.videoqa.ngrok") || "";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const validExts = [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac", ".webm", ".mp4"];

    if (!ACCEPTED_AUDIO.includes(file.type) && !validExts.includes(ext)) {
      toast({
        title: "Invalid format",
        description: "Please upload MP3, WAV, OGG, FLAC, M4A, or AAC.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_AUDIO_SIZE) {
      toast({
        title: "File too large",
        description: "Audio must be under 50 MB.",
        variant: "destructive",
      });
      return;
    }

    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
    setChatHistory([]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) {
        const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
        handleAudioSelect(fakeEvent);
      }
    },
    [handleAudioSelect]
  );

  const clearAudio = () => {
    setAudioFile(null);
    if (audioPreview) URL.revokeObjectURL(audioPreview);
    setAudioPreview(null);
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
    if (!trimmedQuery || !audioFile) return;

    if (!ngrokUrl) {
      setShowSettings(true);
      toast({
        title: "Ngrok URL required",
        description: "Please set your Kaggle/Colab ngrok URL first.",
        variant: "destructive",
      });
      return;
    }

    setIsQuerying(true);

    try {
      const result = await queryAudio(ngrokUrl, audioFile, trimmedQuery);

      if (result.success && result.answer) {
        const entry: ChatEntry = {
          id: crypto.randomUUID(),
          query: trimmedQuery,
          result: {
            answer: result.answer,
            transcript: result.transcript || "",
            audio_duration: result.audio_duration || 0,
            response_time: result.response_time || 0,
            model: result.model || "Whisper-large-v3 + LLaVA-7B",
          },
          timestamp: new Date(),
        };
        setChatHistory((prev) => [entry, ...prev]);
        setQuery("");
      } else {
        throw new Error(result.error || "Query failed");
      }
    } catch (error) {
      console.error("Audio QA error:", error);
      toast({
        title: "Query failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to process audio. Make sure your Colab/Kaggle notebook is running.",
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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-pink-500 shadow-lg">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold gradient-text">Audio Q&A</h1>
            <p className="text-xs text-muted-foreground">
              Transcribe and ask questions about any audio using Whisper
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
              Kaggle / Colab Ngrok URL
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Same URL used for Video QA (e.g.{" "}
              <code className="text-cyan-400">https://xxxx-xx-xx.ngrok-free.dev</code>)
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
              <p className="text-sm font-medium text-foreground">Endpoint not configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run your Colab/Kaggle notebook and paste the ngrok URL in Settings.
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

      {/* How it works */}
      <motion.div
        className="mb-6 glass-card rounded-2xl p-5"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Volume2 className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-medium text-foreground">How it works</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="glass-panel rounded-xl p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 mx-auto mb-2">
              <Upload className="h-4 w-4 text-amber-400" />
            </div>
            <p className="text-[11px] text-muted-foreground">Upload audio file</p>
          </div>
          <div className="glass-panel rounded-xl p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 mx-auto mb-2">
              <FileText className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-[11px] text-muted-foreground">Whisper transcribes</p>
          </div>
          <div className="glass-panel rounded-xl p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 mx-auto mb-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-[11px] text-muted-foreground">AI answers your question</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left: Audio Upload */}
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
                  <Music className="h-4 w-4 text-amber-400" />
                  Audio
                </span>
                {audioFile && (
                  <button
                    onClick={clearAudio}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4">
              {audioPreview ? (
                <div className="space-y-3">
                  <div className="glass-panel rounded-xl p-4 flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-pink-500/20">
                      <Music className="h-8 w-8 text-amber-400" />
                    </div>
                    <audio
                      src={audioPreview}
                      controls
                      className="w-full"
                      style={{ maxHeight: "40px" }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Music className="h-3 w-3" />
                    <span className="truncate">{audioFile?.name}</span>
                    <span className="shrink-0">
                      ({(audioFile!.size / (1024 * 1024)).toFixed(1)} MB)
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
                  <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border-2 border-dashed border-white/10 hover:border-amber-500/40 transition-all duration-300 group-hover:bg-white/[0.02]">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-panel group-hover:shadow-lg transition-shadow animate-float">
                      <Mic className="h-8 w-8 text-amber-400/40 group-hover:text-amber-400/80 transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-foreground/80 mb-1">
                      Drop audio here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP3, WAV, OGG, FLAC, M4A — up to 50 MB
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
                onChange={handleAudioSelect}
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
                Ask About the Audio
              </span>
            </div>

            {/* Conversation Area */}
            <div className="flex-1 p-4 overflow-y-auto max-h-[500px] space-y-4">
              {chatHistory.length === 0 && !isQuerying && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass-panel">
                    <Mic className="h-8 w-8 text-amber-400/30" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {audioFile
                      ? 'Audio loaded! Try asking "Summarize this audio" or any question.'
                      : "Upload an audio file first, then ask questions about it."}
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-pink-500/20">
                      <Loader2 className="h-4 w-4 text-amber-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        Transcribing & analyzing audio...
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Whisper is converting speech to text, then AI answers your question
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-amber-400"
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
                      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-br from-amber-500/20 to-pink-500/20 border border-amber-500/10 px-4 py-2.5">
                        <p className="text-sm text-foreground">{entry.query}</p>
                      </div>
                    </div>

                    {/* AI Response */}
                    <div className="flex justify-start">
                      <div className="max-w-[95%] glass-panel rounded-2xl rounded-bl-md px-4 py-3 space-y-3">
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {entry.result.answer}
                        </p>

                        {/* Transcript expandable */}
                        {entry.result.transcript && (
                          <div className="border-t border-white/[0.06] pt-2">
                            <button
                              onClick={() =>
                                setExpandedTranscript(
                                  expandedTranscript === entry.id ? null : entry.id
                                )
                              }
                              className="flex items-center gap-2 text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              {expandedTranscript === entry.id
                                ? "Hide full transcript"
                                : "Show full transcript"}
                            </button>
                            <AnimatePresence>
                              {expandedTranscript === entry.id && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2 rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 max-h-48 overflow-y-auto"
                                >
                                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {entry.result.transcript}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground border-t border-white/[0.04] pt-2">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {entry.result.response_time}s
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {entry.result.model}
                          </span>
                          {entry.result.audio_duration > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-400/70">
                              <Volume2 className="h-3 w-3" />
                              {formatDuration(entry.result.audio_duration)}
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
                    audioFile
                      ? 'Ask about the audio (e.g. "Summarize this recording")'
                      : "Upload an audio file first..."
                  }
                  disabled={!audioFile || isQuerying}
                  className="flex-1 rounded-xl glass-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleQuery}
                  disabled={!audioFile || !query.trim() || isQuerying || !ngrokUrl}
                  className="bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
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

export default AudioQA;
