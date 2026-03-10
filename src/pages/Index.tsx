import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Trash2, Loader2, CheckCircle, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getSearchResult, type ChatEntry } from "@/lib/mock-data";

const Index = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [hasDocuments] = useState(true); // simulated
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsSearching(true);
    const result = getSearchResult(trimmed);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1000));

    setChatHistory((prev) => [
      {
        id: crypto.randomUUID(),
        query: trimmed,
        result: { ...result, responseTime: +(1 + Math.random() * 2).toFixed(1) },
        timestamp: new Date(),
      },
      ...prev,
    ]);
    setQuery("");
    setIsSearching(false);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3rem)] text-center p-6">
        <div className="text-muted-foreground mb-4">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No documents uploaded yet</h2>
          <p className="text-muted-foreground mb-4">Upload and process documents to start searching.</p>
          <Link to="/upload">
            <Button>
              Go to Upload page <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const latestResult = chatHistory[0];

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)]">
      {/* Header with clear button */}
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="text-xl font-semibold text-foreground">Search Documents</h1>
        {chatHistory.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setChatHistory([])}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear Chat</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Search area */}
      <div className="flex-1 flex flex-col items-center px-6">
        <div className={`w-full max-w-2xl transition-all duration-300 ${!latestResult && !isSearching ? "mt-[20vh]" : "mt-6"}`}>
          <div className="relative">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your documents..."
              className="h-14 pl-5 pr-14 text-base rounded-xl shadow-md border-border"
              disabled={isSearching}
            />
            <Button
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 rounded-lg"
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {!latestResult && !isSearching && (
            <button
              onClick={() => setQuery("What is the travel reimbursement policy?")}
              className="mt-3 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Example: What is the travel reimbursement policy?
            </button>
          )}
        </div>

        {/* Loading state */}
        {isSearching && (
          <div className="mt-8 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Searching documents...</span>
          </div>
        )}

        {/* Latest result */}
        {latestResult && !isSearching && (
          <Card className="w-full max-w-2xl mt-6 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-medium text-muted-foreground">Q: {latestResult.query}</p>
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Answered in {latestResult.result.responseTime}s
                </Badge>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-foreground leading-relaxed">{latestResult.result.answer}</p>
                  <div className="mt-4">
                    {latestResult.result.confidence === "high" ? (
                      <Badge className="bg-success text-success-foreground gap-1">
                        <CheckCircle className="h-3 w-3" /> High Confidence
                      </Badge>
                    ) : (
                      <Badge className="bg-warning text-warning-foreground gap-1">
                        <AlertTriangle className="h-3 w-3" /> Partial Match
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="lg:w-48 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
                  <div className="flex flex-wrap gap-2">
                    {latestResult.result.sources.map((src, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs">
                            Page {src.page} - {src.filename}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Preview of page {src.page} from {src.filename}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat history */}
        {chatHistory.length > 1 && (
          <div className="w-full max-w-2xl mt-6 mb-8">
            <Accordion type="single" collapsible>
              <AccordionItem value="history">
                <AccordionTrigger className="text-sm text-muted-foreground">
                  Previous Questions ({chatHistory.length - 1})
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    {chatHistory.slice(1).map((entry) => (
                      <Card key={entry.id} className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-primary">Q: {entry.query}</p>
                            <span className="text-xs text-muted-foreground">
                              {entry.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm text-foreground line-clamp-3">{entry.result.answer}</p>
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {entry.result.sources.map((s, j) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                p.{s.page} {s.filename}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;