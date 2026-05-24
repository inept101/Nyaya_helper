"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { streamAI } from "@/lib/api";
import { Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AIPanelProps {
  title: string;
  description?: string;
  buttonLabel: string;
  endpoint: string;
  body: Record<string, unknown>;
  placeholder?: string;
}

export function AIPanel({ title, description, buttonLabel, endpoint, body, placeholder }: AIPanelProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<boolean>(false);

  async function run() {
    setContent("");
    setLoading(true);
    abortRef.current = false;
    try {
      for await (const chunk of streamAI(endpoint, body)) {
        if (abortRef.current) break;
        setContent((prev) => prev + chunk);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {content && (
            <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!content && !loading && (
          <p className="text-sm text-muted-foreground italic">
            {placeholder ?? `Click "${buttonLabel}" to generate.`}
          </p>
        )}
        {loading && !content && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}
        {content && (
          <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{content}</pre>
        )}
      </CardContent>
    </Card>
  );
}
