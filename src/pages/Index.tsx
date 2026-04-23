import { useState, useEffect, useCallback } from "react";
import { Search, Trash2, CheckCircle, AlertTriangle, Clock, ArrowRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AnimatedAIChat } from "@/components/ui/animated-ai-chat";
import { searchDocuments, checkHealth } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  answer: string;
  sources: { page: number; filename: string; score?: number }[];
  confidence: 'high' | 'partial' | 'low';
  responseTime: number;
}

interface ChatEntry {
  id: string;
  query: string;
  result: SearchResult;
  timestamp: Date;
}

const Index = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [hasDocuments, setHasDocuments] = useState(true);

  useEffect(() => {
    checkHealth()
      .then((health) => {
        setHasDocuments(health.documentChunks > 0);
      })
      .catch(() => {
        setHasDocuments(false);
      });
  }, []);

  const handleSearch = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setIsSearching(true);

    try {
      const response = await searchDocuments(trimmed);
      
      if (response.success && response.result) {
        const newEntry = {
          id: crypto.randomUUID(),
          query: trimmed,
          result: response.result!,
          timestamp: new Date(),
        };
        setChatHistory((prev) => [newEntry, ...prev]);

        // Persist to localStorage for History page
        try {
          const HISTORY_KEY = "documind.query.history";
          const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
          const historyItem = {
            id: newEntry.id,
            query: newEntry.query,
            answer: newEntry.result.answer,
            sources: newEntry.result.sources,
            confidence: newEntry.result.confidence,
            responseTime: newEntry.result.responseTime,
            timestamp: newEntry.timestamp.toISOString(),
          };
          localStorage.setItem(HISTORY_KEY, JSON.stringify([historyItem, ...existing].slice(0, 100)));
        } catch { /* ignore storage errors */ }
      } else {
        throw new Error(response.error || "Search failed");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Unable to search documents",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, []);

  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] text-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-2xl p-12 max-w-md"
        >
          <div className="mb-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl glass-panel animate-float">
              <Search className="h-10 w-10 text-cyan-400/40" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No documents uploaded yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Upload and process documents to start searching.</p>
          <Link to="/upload">
            <button className="inline-flex items-center gap-2 btn-gradient rounded-xl px-6 py-3 text-sm font-semibold">
              Go to Upload page <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const latestResult = chatHistory[0];

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full">
        <h1 className="text-xl font-semibold gradient-text">Search Documents</h1>
        {chatHistory.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setChatHistory([])}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Clear Chat</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center px-4 sm:px-6 pb-8">
        <div className="w-full max-w-4xl mt-2">
          <AnimatedAIChat onSendMessage={handleSearch} isTyping={isSearching} />
        </div>

        {/* Latest Result */}
        <AnimatePresence>
          {latestResult && !isSearching && (
            <motion.div
              className="w-full max-w-4xl mt-6 glass-card card-3d rounded-2xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Q: {latestResult.query}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full glass-panel px-3 py-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {latestResult.result.responseTime}s
                </span>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-foreground leading-relaxed">{latestResult.result.answer}</p>
                  <div className="mt-4">
                    {latestResult.result.confidence === "high" ? (
                      <span className="inline-flex items-center gap-1.5 badge-complete rounded-full px-3 py-1 text-xs font-medium">
                        <CheckCircle className="h-3 w-3" /> High Confidence
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 badge-processing rounded-full px-3 py-1 text-xs font-medium">
                        <AlertTriangle className="h-3 w-3" /> Partial Match
                      </span>
                    )}
                  </div>
                </div>

                <div className="lg:w-52 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {latestResult.result.sources.map((src, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <span className="source-pill">
                            <FileText className="h-3 w-3" />
                            p.{src.page} — {src.filename}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Page {src.page} from {src.filename}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat History */}
        {chatHistory.length > 1 && (
          <div className="w-full max-w-4xl mt-6 mb-8 space-y-3">
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                const el = document.getElementById('prev-questions');
                if (el) el.classList.toggle('hidden');
              }}
            >
              Previous Questions ({chatHistory.length - 1})
            </button>
            <div id="prev-questions" className="space-y-3">
              {chatHistory.slice(1).map((entry) => (
                <motion.div
                  key={entry.id}
                  className="glass-panel hover-lift rounded-xl p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-cyan-400">Q: {entry.query}</p>
                    <span className="text-xs text-muted-foreground">
                      {entry.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 line-clamp-3">{entry.result.answer}</p>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {entry.result.sources.map((s, j) => (
                      <span key={j} className="source-pill !text-[10px]">
                        p.{s.page} {s.filename}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;