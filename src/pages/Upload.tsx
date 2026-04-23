import { useState, useCallback, useEffect } from "react";
import { FileText, CheckCircle, Loader2, Trash2, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUploadCard, type UploadedFile as UploadCardFile } from "@/components/ui/file-upload-card";
import { toast } from "@/hooks/use-toast";
import { uploadDocument, getStoredDocuments, clearAllDocuments, type StoredDocument } from "@/lib/api";
import { motion } from "framer-motion";

interface UploadQueueFile {
  id: string;
  file: File;
  status: "pending" | "processing" | "complete" | "error";
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const Upload = () => {
  const [files, setFiles] = useState<UploadQueueFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [isLoadingStored, setIsLoadingStored] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  // Load stored documents on mount
  useEffect(() => {
    loadStoredDocuments();
  }, []);

  const loadStoredDocuments = async () => {
    try {
      setIsLoadingStored(true);
      const response = await getStoredDocuments();
      setStoredDocuments(response.documents);
    } catch (error) {
      console.error("Error loading stored documents:", error);
      toast({
        title: "Failed to load documents",
        description: "Could not retrieve stored documents from database.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStored(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all stored documents? This cannot be undone.")) {
      return;
    }

    try {
      setIsClearing(true);
      const response = await clearAllDocuments();
      setStoredDocuments([]);
      toast({
        title: "Documents cleared",
        description: response.message,
      });
    } catch (error) {
      console.error("Error clearing documents:", error);
      toast({
        title: "Failed to clear documents",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadQueueFile[] = [];
    Array.from(fileList).forEach((file) => {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file type", description: `${file.name} is not a PDF.`, variant: "destructive" });
        return;
      }
      if (file.size > MAX_SIZE) {
        toast({ title: "File too large", description: `${file.name} exceeds 10MB limit.`, variant: "destructive" });
        return;
      }
      newFiles.push({ id: crypto.randomUUID(), file, status: "pending" });
    });
    setFiles((prev) => [...prev, ...newFiles]);
    setProcessedCount(null);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const cardFiles: UploadCardFile[] = files.map((file) => ({
    id: file.id,
    file: file.file,
    progress: file.status === "complete" ? 100 : file.status === "processing" ? Math.max(progress, 5) : 0,
    status: file.status === "complete" ? "completed" : file.status === "error" ? "error" : "uploading",
  }));

  const processDocuments = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(null);

    const pendingFilesToProcess = files.filter((f) => f.status === "pending");
    const total = pendingFilesToProcess.length;
    let successCount = 0;

    for (let i = 0; i < total; i++) {
      const fileToProcess = pendingFilesToProcess[i];
      
      setFiles((prev) =>
        prev.map((f) => (f.id === fileToProcess.id ? { ...f, status: "processing" } : f))
      );

      try {
        // Upload and process the document
        const response = await uploadDocument(fileToProcess.file);
        
        if (response.success) {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileToProcess.id ? { ...f, status: "complete" } : f))
          );
          successCount++;
          toast({
            title: "Document processed",
            description: `${fileToProcess.file.name} has been indexed successfully.`,
          });
        } else {
          throw new Error(response.error || "Upload failed");
        }
      } catch (error) {
        console.error("Processing error:", error);
        setFiles((prev) =>
          prev.map((f) => (f.id === fileToProcess.id ? { ...f, status: "error" } : f))
        );
        toast({
          title: "Processing failed",
          description: `Failed to process ${fileToProcess.file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
      
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setProgress(100);
    setProcessedCount(successCount);
    setIsProcessing(false);

    // Reload stored documents after processing
    await loadStoredDocuments();

    if (successCount === total) {
      toast({
        title: "All documents processed",
        description: `Successfully processed ${successCount} document${successCount > 1 ? 's' : ''}.`,
      });
    }
  };

  const pendingFiles = files.filter((f) => f.status === "pending");

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold gradient-text mb-6">Upload Documents</h1>

      {/* Stored Documents Section */}
      <motion.div
        className="mb-6 glass-card rounded-2xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Database className="h-4 w-4 text-cyan-400" />
            Stored Documents ({storedDocuments.length})
          </div>
          {storedDocuments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={isClearing}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              {isClearing ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Clear All
                </>
              )}
            </Button>
          )}
        </div>
        <div className="p-5">
          {isLoadingStored ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading stored documents...
            </div>
          ) : storedDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl glass-panel">
                <Database className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <p className="text-sm">No documents stored yet</p>
              <p className="text-xs mt-1 text-muted-foreground">Upload and process PDFs to add them to the database</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {storedDocuments.map((doc, i) => (
                <motion.div
                  key={doc.documentId}
                  className="flex items-center justify-between glass-panel hover-lift rounded-xl p-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                      <FileText className="h-5 w-5 text-cyan-400" />
                    </div>
                    <span className="truncate text-sm font-medium text-foreground">{doc.filename}</span>
                  </div>
                  <span className="badge-complete rounded-full px-3 py-1 text-xs font-medium">
                    {doc.chunkCount} chunks
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-2">
        <FileUploadCard
          files={cardFiles}
          onFilesChange={addFiles}
          onFileRemove={removeFile}
        />
      </div>

      {/* Process button & progress */}
      <div className="mt-6 space-y-4">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vectorizing...</span>
              <span className="font-medium text-cyan-400">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {processedCount !== null && !isProcessing && (
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{processedCount} documents indexed</span>
          </div>
        )}

        <button
          onClick={processDocuments}
          disabled={pendingFiles.length === 0 || isProcessing}
          className="inline-flex items-center gap-2 btn-gradient rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            "Process Documents"
          )}
        </button>

        <p className="text-xs text-muted-foreground">Processing time: ~30s per document</p>
      </div>
    </div>
  );
};

export default Upload;