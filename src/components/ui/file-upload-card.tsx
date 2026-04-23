import * as React from "react";
import { UploadCloud, X, CheckCircle2, Trash2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
}

interface FileUploadCardProps extends React.HTMLAttributes<HTMLDivElement> {
  files: UploadedFile[];
  onFilesChange: (files: File[]) => void;
  onFileRemove: (id: string) => void;
  onClose?: () => void;
}

export const FileUploadCard = React.forwardRef<HTMLDivElement, FileUploadCardProps>(
  ({ className, files = [], onFilesChange, onFileRemove, onClose, ...props }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesChange(droppedFiles);
      }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length > 0) {
        onFilesChange(selectedFiles);
      }
      e.target.value = "";
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return "0 KB";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const cardVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    };

    const fileItemVariants = {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0 },
    };

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.3 }}
        className={cn("w-full max-w-3xl rounded-2xl glass-card", className)}
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
                <UploadCloud className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Upload files</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select and upload the files of your choice
                </p>
              </div>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={cn(
              "mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300",
              isDragging
                ? "border-cyan-400 bg-cyan-500/10 shadow-glow-cyan"
                : "border-white/10 hover:border-cyan-500/40 hover:bg-white/[0.02]"
            )}
          >
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
            <div className={cn(
              "mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
              isDragging ? "bg-cyan-500/20 animate-pulse" : "glass-panel"
            )}>
              <UploadCloud className={cn("h-8 w-8 transition-colors", isDragging ? "text-cyan-400" : "text-muted-foreground")} />
            </div>
            <p className="font-semibold text-foreground">Choose a file or drag and drop it here</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF format up to 10 MB per file</p>
            <button className="pointer-events-none mt-4 rounded-xl btn-gradient-outline px-4 py-2 text-xs font-semibold">
              Browse File
            </button>
          </div>
        </div>

        {files.length > 0 && (
          <div className="border-t border-white/[0.06] p-6">
            <ul className="space-y-4">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.li
                    key={file.id}
                    variants={fileItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    layout
                    className="flex items-center justify-between glass-panel hover-lift rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/10 to-violet-500/10 text-sm font-bold text-cyan-400">
                        {file.file.type.split("/")[1]?.toUpperCase().substring(0, 3) || "FILE"}
                      </div>
                      <div className="flex-1">
                        <p className="max-w-[150px] truncate text-sm font-medium text-foreground sm:max-w-xs">
                          {file.file.name}
                        </p>
                        <div className="text-xs text-muted-foreground">
                          {file.status === "uploading" && (
                            <span>
                              {formatFileSize((file.file.size * file.progress) / 100)} of {formatFileSize(file.file.size)}
                            </span>
                          )}
                          {(file.status === "completed" || file.status === "error") && (
                            <span>{formatFileSize(file.file.size)}</span>
                          )}
                          <span className="mx-1">•</span>
                          <span
                            className={cn(
                              file.status === "uploading" && "text-cyan-400",
                              file.status === "completed" && "text-emerald-400",
                              file.status === "error" && "text-red-400"
                            )}
                          >
                            {file.status === "uploading" && "Processing..."}
                            {file.status === "completed" && "Completed"}
                            {file.status === "error" && "Error"}
                          </span>
                        </div>
                        {file.status === "uploading" && (
                          <div className="mt-1.5 h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {file.status === "completed" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                      {file.status === "error" && <AlertCircle className="h-5 w-5 text-red-400" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                        onClick={() => onFileRemove(file.id)}
                      >
                        {file.status === "completed" ? <Trash2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}
      </motion.div>
    );
  }
);

FileUploadCard.displayName = "FileUploadCard";
