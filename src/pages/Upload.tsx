import { useState, useCallback, useRef } from "react";
import { CloudUpload, FileText, CheckCircle, Loader2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  file: File;
  status: "pending" | "processing" | "complete" | "error";
}

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const Upload = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processDocuments = async () => {
    setIsProcessing(true);
    setProgress(0);
    setProcessedCount(null);

    const total = files.length;
    for (let i = 0; i < total; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "processing" } : f))
      );

      // Simulate processing per file
      const steps = 10;
      for (let s = 0; s <= steps; s++) {
        await new Promise((r) => setTimeout(r, 80));
        setProgress(Math.round(((i * steps + s) / (total * steps)) * 100));
      }

      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "complete" } : f))
      );
    }

    setProgress(100);
    setProcessedCount(total);
    setIsProcessing(false);
  };

  const pendingFiles = files.filter((f) => f.status === "pending");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-6">Upload Documents</h1>

      {/* Drop zone */}
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CloudUpload className="h-12 w-12 text-primary/60 mb-4" />
          <p className="text-foreground font-medium">Drop PDF files here or click to browse</p>
          <p className="text-sm text-muted-foreground mt-1">PDF only, max 10MB per file</p>
        </CardContent>
      </Card>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      {/* File list */}
      {files.length > 0 && (
        <Card className="mt-6 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead className="w-24">Size</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary/60 shrink-0" />
                        <span className="truncate">{f.file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatSize(f.file.size)}</TableCell>
                    <TableCell>
                      {f.status === "pending" && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <AlertCircle className="h-3 w-3" /> Pending
                        </Badge>
                      )}
                      {f.status === "processing" && (
                        <Badge className="bg-primary text-primary-foreground gap-1 text-xs">
                          <Loader2 className="h-3 w-3 animate-spin" /> Processing
                        </Badge>
                      )}
                      {f.status === "complete" && (
                        <Badge className="bg-success text-success-foreground gap-1 text-xs">
                          <CheckCircle className="h-3 w-3" /> Complete
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {f.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(f.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Process button & progress */}
      <div className="mt-6 space-y-4">
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Vectorizing...</span>
              <span className="font-medium text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {processedCount !== null && !isProcessing && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{processedCount} documents indexed</span>
          </div>
        )}

        <Button
          onClick={processDocuments}
          disabled={pendingFiles.length === 0 || isProcessing}
          className="w-full sm:w-auto"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            "Process Documents"
          )}
        </Button>

        <p className="text-xs text-muted-foreground">Processing time: ~30s per document</p>
      </div>
    </div>
  );
};

export default Upload;