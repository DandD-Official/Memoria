"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function FileDropzone({ onFileSelected, onFilesSelected, accept = ".md,.txt,.pdf,.docx,.pptx,.json", multiple = false }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const selected = Array.from(files ?? []);
      const file = selected[0];
      if (!file) return;
      setFileName(selected.length > 1 ? `${selected.length} files selected` : file.name);
      onFilesSelected?.(selected);
      onFileSelected(file);
    },
    [onFileSelected, onFilesSelected]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-14 text-center transition-colors",
        dragging ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-accent/60"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {fileName ? (
        <>
          <FileText className="mb-3 h-8 w-8 text-accent-dark" />
          <p className="font-medium text-ink">{fileName}</p>
          <p className="mt-1 text-xs text-ink-faint">Click to choose a different file</p>
        </>
      ) : (
        <>
          <UploadCloud className="mb-3 h-8 w-8 text-ink-faint" />
          <p className="font-medium text-ink">Drop your notes here</p>
          <p className="mt-1 text-xs text-ink-faint">Supported: MD, TXT, PDF, DOCX, PPTX, and Memoria JSON exports</p>
        </>
      )}
    </div>
  );
}
