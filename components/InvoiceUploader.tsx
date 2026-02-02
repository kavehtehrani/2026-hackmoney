"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InvoiceUploaderProps {
  onFileUpload: (file: File) => void;
  onTextSubmit: (text: string) => void;
  isLoading: boolean;
}

export default function InvoiceUploader({
  onFileUpload,
  onTextSubmit,
  isLoading,
}: InvoiceUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState<"file" | "text">("file");

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files?.[0]) {
        onFileUpload(e.dataTransfer.files[0]);
      }
    },
    [onFileUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        onFileUpload(e.target.files[0]);
      }
    },
    [onFileUpload]
  );

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-muted p-1">
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "file"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("file")}
        >
          Upload File
        </button>
        <button
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "text"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMode("text")}
        >
          Paste Text
        </button>
      </div>

      {mode === "file" ? (
        <div
          className={`group relative flex min-h-[220px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="text-center space-y-3">
            {isLoading ? (
              <>
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Parsing invoice with AI...
                </p>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div>
                  <p className="text-base font-medium">
                    Drop your invoice here
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PDF, PNG, JPG, or WEBP
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            placeholder="Paste invoice text here... Include recipient, amount, wallet address, token, and chain."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={8}
            className="resize-none"
          />
          <Button
            onClick={() => onTextSubmit(textInput)}
            disabled={!textInput.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? "Parsing..." : "Parse Invoice"}
          </Button>
        </div>
      )}
    </div>
  );
}
