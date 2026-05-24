"use client";

import { use, useState } from "react";
import { streamAI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Loader2, FileEdit } from "lucide-react";
import { toast } from "sonner";

export default function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);

  async function generate() {
    setContent("");
    setLoading(true);
    setGenerated(false);
    try {
      let full = "";
      for await (const chunk of streamAI("draft-judgment", { case_id: id })) {
        full += chunk;
        setContent(full);
      }
      setGenerated(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Draft generation failed");
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
    <div className="p-6 max-w-4xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Draft Judgment</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate a structured Indian judgment template. The AI fills factual details; legal reasoning sections are left for Your Honour to complete.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {content && (
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
              Copy
            </Button>
          )}
          <Button size="sm" onClick={generate} disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Generating...</>
            ) : (
              <><FileEdit className="h-4 w-4 mr-1.5" />Generate Draft</>
            )}
          </Button>
        </div>
      </div>

      {!content && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileEdit className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Generate Draft&quot; to create an Indian court judgment skeleton.<br />
              Sections marked <span className="font-mono text-xs">[JUDGE TO COMPLETE]</span> require Your Honour's analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {(content || loading) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {generated ? "Judgment Template (Editable)" : "Generating..."}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {generated ? (
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[600px] font-mono text-sm resize-none border-0 p-0 shadow-none focus-visible:ring-0"
                placeholder="Generating..."
              />
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                {content}
                <span className="inline-block w-1.5 h-4 bg-foreground ml-0.5 animate-pulse" />
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {generated && (
        <p className="text-xs text-muted-foreground">
          This draft is editable. Look for <span className="font-mono">[JUDGE TO COMPLETE: ...]</span> sections and fill in your analysis and findings.
        </p>
      )}
    </div>
  );
}
