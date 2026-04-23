import { useState, useEffect } from "react";
import { Search, Clock, FileText, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface HistoryEntry {
  id: string;
  query: string;
  answer: string;
  sources: { page: number; filename: string }[];
  confidence: "high" | "partial" | "low";
  responseTime: number;
  timestamp: string;
}

const HISTORY_STORAGE_KEY = "documind.query.history";

function getStoredHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function clearStoredHistory() {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const filteredHistory = history.filter(
    (entry) =>
      entry.query.toLowerCase().includes(searchFilter.toLowerCase()) ||
      entry.answer.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleClear = () => {
    if (confirm("Clear all query history? This cannot be undone.")) {
      clearStoredHistory();
      setHistory([]);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold gradient-text">Query History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Search Filter */}
      <div className="mb-8">
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search past queries..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full rounded-full glass-input pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* History Grid */}
      {filteredHistory.length === 0 ? (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl glass-panel animate-float">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {history.length === 0 ? "No query history yet" : "No matching queries"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {history.length === 0
              ? "Your search queries will appear here after you ask questions on the Search page."
              : "Try a different search term."}
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredHistory.map((entry, index) => (
            <motion.div
              key={entry.id}
              className="glass-card card-3d rounded-2xl p-5 group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
            >
              {/* Query */}
              <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-2">
                {entry.query}
              </h3>

              {/* Answer Preview */}
              <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                {entry.answer}
              </p>

              {/* Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Confidence */}
                  {entry.confidence === "high" ? (
                    <span className="inline-flex items-center gap-1 badge-complete rounded-full px-2 py-0.5 text-[10px] font-medium">
                      <CheckCircle className="h-2.5 w-2.5" /> High
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 badge-processing rounded-full px-2 py-0.5 text-[10px] font-medium">
                      <AlertTriangle className="h-2.5 w-2.5" /> Partial
                    </span>
                  )}

                  {/* Response Time */}
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {entry.responseTime}s
                  </span>
                </div>

                {/* Timestamp */}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Sources */}
              {entry.sources.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {entry.sources.slice(0, 3).map((src, i) => (
                    <span key={i} className="source-pill !text-[10px]">
                      <FileText className="h-2.5 w-2.5" />
                      p.{src.page} — {src.filename}
                    </span>
                  ))}
                  {entry.sources.length > 3 && (
                    <span className="text-[10px] text-muted-foreground self-center">
                      +{entry.sources.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
