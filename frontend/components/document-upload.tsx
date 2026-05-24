"use client";

import { useCallback, useState } from "react";
import { uploadDocument, type DocumentOut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Languages } from "lucide-react";
import { toast } from "sonner";

const LANG_NAMES: Record<string, string> = {
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  gu: "Gujarati",
  pa: "Punjabi",
  bn: "Bengali",
  ur: "Urdu",
};

interface DocumentUploadProps {
  caseId: string;
  onUploaded: (doc: DocumentOut) => void;
}

export function DocumentUpload({ caseId, onUploaded }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    try {
      const doc = await uploadDocument(caseId, file);
      toast.success(`${file.name} uploaded and indexed`);
      onUploaded(doc);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((f) => upload(f));
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [caseId]
  );

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        ) : (
          <Upload className="h-8 w-8 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploading ? "Uploading and indexing..." : "Drop files here or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">PDF, DOCX, DOC, TXT · Hindi/regional docs auto-translated</p>
        </div>
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    </div>
  );
}

export function DocumentCard({ doc }: { doc: DocumentOut }) {
  const langName = doc.language_detected ? LANG_NAMES[doc.language_detected] : null;

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{doc.filename}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {doc.processed ? (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 text-green-700 bg-green-100">Indexed</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">Processing</Badge>
          )}
          {langName && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 gap-1">
              <Languages className="h-3 w-3" />
              {langName}
              {doc.is_translated && " → EN"}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
