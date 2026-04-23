"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Figma,
  MonitorIcon,
  Paperclip,
  SendIcon,
  XIcon,
  LoaderIcon,
  Sparkles,
  Command,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Number.POSITIVE_INFINITY)
      );

      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = `${minHeight}px`;
    }
  }, [minHeight]);

  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustHeight]);

  return { textareaRef, adjustHeight };
}

interface CommandSuggestion {
  icon: React.ReactNode;
  label: string;
  description: string;
  prefix: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
  showRing?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, showRing = true, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className={cn("relative", containerClassName)}>
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md bg-transparent px-3 py-2 text-sm",
            "transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "border-none focus:outline-none focus:ring-0",
            className
          )}
          ref={ref}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {showRing && isFocused && (
          <motion.span
            className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-cyan-500/30 ring-offset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

interface AnimatedAIChatProps {
  onSendMessage: (message: string) => Promise<void> | void;
  isTyping?: boolean;
}

export function AnimatedAIChat({ onSendMessage, isTyping = false }: AnimatedAIChatProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<number>(-1);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [recentCommand, setRecentCommand] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 60,
    maxHeight: 200,
  });
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  const commandSuggestions: CommandSuggestion[] = [
    {
      icon: <ImageIcon className="h-4 w-4" />,
      label: "Summarize",
      description: "Summarize the document",
      prefix: "/summarize",
    },
    {
      icon: <Figma className="h-4 w-4" />,
      label: "Compare",
      description: "Compare key sections",
      prefix: "/compare",
    },
    {
      icon: <MonitorIcon className="h-4 w-4" />,
      label: "Extract Tasks",
      description: "Extract actionable points",
      prefix: "/tasks",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      label: "Improve Query",
      description: "Rewrite your question",
      prefix: "/improve",
    },
  ];

  useEffect(() => {
    if (value.startsWith("/") && !value.includes(" ")) {
      setShowCommandPalette(true);
      const matchingSuggestionIndex = commandSuggestions.findIndex((cmd) => cmd.prefix.startsWith(value));
      setActiveSuggestion(matchingSuggestionIndex >= 0 ? matchingSuggestionIndex : -1);
    } else {
      setShowCommandPalette(false);
    }
  }, [value]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const commandButton = document.querySelector("[data-command-button]");

      if (commandPaletteRef.current && !commandPaletteRef.current.contains(target) && !commandButton?.contains(target)) {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = async () => {
    const message = value.trim();
    if (!message || isTyping) return;

    await onSendMessage(message);
    setValue("");
    setAttachments([]);
    adjustHeight(true);
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev < commandSuggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : commandSuggestions.length - 1));
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        if (activeSuggestion >= 0) {
          const selectedCommand = commandSuggestions[activeSuggestion];
          setValue(selectedCommand.prefix + " ");
          setShowCommandPalette(false);
          setRecentCommand(selectedCommand.label);
          setTimeout(() => setRecentCommand(null), 2500);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowCommandPalette(false);
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  const handleAttachFile = () => {
    const mockFileName = `attachment-${Math.floor(Math.random() * 1000)}.pdf`;
    setAttachments((prev) => [...prev, mockFileName]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectCommandSuggestion = (index: number) => {
    const selectedCommand = commandSuggestions[index];
    setValue(selectedCommand.prefix + " ");
    setShowCommandPalette(false);
    setRecentCommand(selectedCommand.label);
    setTimeout(() => setRecentCommand(null), 2000);
  };

  return (
    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl glass-card p-6 text-foreground">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden">
        <div className="absolute left-1/4 top-0 h-64 w-64 animate-pulse rounded-full bg-cyan-500/[0.06] blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 animate-pulse rounded-full bg-violet-500/[0.06] blur-[100px] delay-700" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight gradient-text pb-1">
            Ask your documents anything
          </h1>
          <p className="text-sm text-muted-foreground">Type a command or ask a question</p>
          {recentCommand && <p className="text-xs text-cyan-400">Applied command: {recentCommand}</p>}
        </div>

        <motion.div
          className="relative rounded-2xl glass-panel shadow-3d"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Command Palette */}
          <AnimatePresence>
            {showCommandPalette && (
              <motion.div
                ref={commandPaletteRef}
                className="absolute bottom-full left-4 right-4 z-50 mb-2 overflow-hidden rounded-xl glass-card shadow-3d"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.15 }}
              >
                <div className="py-1">
                  {commandSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.prefix}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors",
                        activeSuggestion === index
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                      )}
                      onClick={() => selectCommandSuggestion(index)}
                    >
                      <div className="flex h-5 w-5 items-center justify-center text-muted-foreground">{suggestion.icon}</div>
                      <div className="font-medium">{suggestion.label}</div>
                      <div className="ml-1 text-xs text-muted-foreground">{suggestion.prefix}</div>
                      <div className="ml-auto text-[10px] text-muted-foreground">{suggestion.description}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                adjustHeight();
              }}
              onKeyDown={(e) => {
                void handleKeyDown(e);
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Ask DocuMind about your uploaded documents..."
              containerClassName="w-full"
              className={cn(
                "min-h-[60px] w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground",
                "focus:outline-none placeholder:text-muted-foreground"
              )}
              style={{ overflow: "hidden" }}
              showRing={false}
            />
          </div>

          {/* Attachments */}
          <AnimatePresence>
            {attachments.length > 0 && (
              <motion.div
                className="flex flex-wrap gap-2 px-4 pb-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {attachments.map((file, index) => (
                  <motion.div
                    key={`${file}-${index}`}
                    className="flex items-center gap-2 rounded-lg glass-panel px-3 py-1.5 text-xs text-muted-foreground"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <span>{file}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Bar */}
          <div className="flex items-center justify-between gap-4 border-t border-white/[0.06] p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAttachFile}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-cyan-400 hover:bg-cyan-500/10"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-command-button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCommandPalette((prev) => !prev);
                }}
                className={cn(
                  "rounded-lg p-2 text-muted-foreground transition-colors hover:text-cyan-400 hover:bg-cyan-500/10",
                  showCommandPalette && "bg-cyan-500/10 text-cyan-400"
                )}
              >
                <Command className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleSend();
              }}
              disabled={isTyping || !value.trim()}
              className={cn(
                "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all",
                value.trim()
                  ? "btn-gradient"
                  : "glass-panel text-muted-foreground"
              )}
            >
              {isTyping ? (
                <LoaderIcon className="h-4 w-4 animate-[spin_2s_linear_infinite]" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              <span>Send</span>
            </button>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {commandSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.prefix}
              onClick={() => selectCommandSuggestion(index)}
              className="flex items-center gap-2 rounded-xl glass-panel px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-cyan-500/10 hover:text-cyan-400"
            >
              {suggestion.icon}
              <span>{suggestion.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {isTyping && (
          <motion.div
            className="fixed bottom-8 z-20 rounded-full glass-card px-4 py-2 shadow-glow-cyan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-center">
                <span className="mb-0.5 text-xs font-medium text-white">AI</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Thinking</span>
                <TypingDots />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mouse glow */}
      {inputFocused && (
        <motion.div
          className="pointer-events-none fixed z-0 h-[40rem] w-[40rem] rounded-full bg-cyan-500/20 opacity-[0.04] blur-[110px]"
          animate={{
            x: mousePosition.x - 320,
            y: mousePosition.y - 320,
          }}
          transition={{
            type: "spring",
            damping: 25,
            stiffness: 150,
            mass: 0.5,
          }}
        />
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="ml-1 flex items-center">
      {[1, 2, 3].map((dot) => (
        <motion.div
          key={dot}
          className="mx-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
          style={{ boxShadow: "0 0 4px rgba(6, 182, 212, 0.35)" }}
        />
      ))}
    </div>
  );
}
