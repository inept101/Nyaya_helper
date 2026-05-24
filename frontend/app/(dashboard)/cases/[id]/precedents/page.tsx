"use client";

import { use, useState } from "react";
import { searchLegalDb, getLegalDoc, type LegalSearchHit, type LegalDocResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, ExternalLink, BookOpen, Info } from "lucide-react";
import { toast } from "sonner";

const COURT_OPTIONS = [
  { value: "all", label: "All Courts" },
  { value: "supremecourt", label: "Supreme Court" },
  { value: "highcourts", label: "All High Courts" },
  { value: "delhi", label: "Delhi HC" },
  { value: "bombay", label: "Bombay HC" },
  { value: "calcutta", label: "Calcutta HC" },
  { value: "madras", label: "Madras HC" },
  { value: "karnataka", label: "Karnataka HC" },
];

const SUGGESTED_QUERIES = [
  "specific performance readiness willingness",
  "Order VII Rule 11 CPC rejection of plaint",
  "Section 16(c) Specific Relief Act",
  "adverse possession requirements",
  "permanent injunction possession title",
];

export default function PrecedentsPage({ params }: { params: Promise<{ id: string }> }) {
  // params unused for now — could be used to scope cache by case later
  use(params);
  const [query, setQuery] = useState("");
  const [court, setCourt] = useState("all");
  const [hits, setHits] = useState<LegalSearchHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const [openDoc, setOpenDoc] = useState<LegalDocResponse | null>(null);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  async function runSearch(q: string = query) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchLegalDb({
        query: q,
        doctypes: court === "all" ? undefined : court,
      });
      setHits(res.hits);
      setIsMock(res.mock);
      setFromCache(res.from_cache);
      if (res.hits.length === 0) toast.info("No precedents found for this query");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
      setHits([]);
    } finally {
      setLoading(false);
    }
  }

  async function viewDoc(docid: string) {
    setLoadingDoc(docid);
    try {
      const doc = await getLegalDoc(docid);
      setOpenDoc(doc);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load document");
    } finally {
      setLoadingDoc(null);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Precedent Search</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Search Indian Kanoon for Supreme Court &amp; High Court judgments.
            </p>
          </div>
          {isMock && (
            <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
              <Info className="h-3 w-3" /> Mock mode
            </Badge>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 pb-3">
        <form
          onSubmit={(e) => { e.preventDefault(); runSearch(); }}
          className="flex gap-2"
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search judgments — e.g. "specific performance time essence"'
            disabled={loading}
            className="flex-1"
          />
          <Select value={court} onValueChange={(v) => setCourt(v ?? "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COURT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Search className="h-4 w-4 mr-1" /> Search</>}
          </Button>
        </form>
      </div>

      {/* Suggested */}
      {!searched && (
        <div className="px-6 pb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            Try a sample query
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); runSearch(q); }}
                className="text-xs border rounded-full px-3 py-1.5 hover:bg-muted transition-colors text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {searched && !loading && hits.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No judgments matched your query. Try broader keywords.
          </div>
        )}

        {hits.length > 0 && (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span>{hits.length} result{hits.length === 1 ? "" : "s"}</span>
              {fromCache && <Badge variant="secondary" className="text-[10px]">cached</Badge>}
            </div>
            <div className="space-y-3">
              {hits.map((h) => (
                <div
                  key={h.docid}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-medium text-sm leading-snug flex-1">{h.title}</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={loadingDoc === h.docid}
                      onClick={() => viewDoc(h.docid)}
                      className="shrink-0"
                    >
                      {loadingDoc === h.docid
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <><BookOpen className="h-3.5 w-3.5 mr-1" /> Read</>}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2 text-[11px]">
                    {h.court && <Badge variant="secondary">{h.court}</Badge>}
                    {h.publishdate && <Badge variant="outline">{h.publishdate}</Badge>}
                    {h.citation && <Badge variant="outline" className="font-mono">{h.citation}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {h.headline}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Doc viewer modal */}
      <Dialog open={!!openDoc} onOpenChange={(o) => !o && setOpenDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base pr-8">{openDoc?.title}</DialogTitle>
            <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
              {openDoc?.court && <Badge variant="secondary">{openDoc.court}</Badge>}
              {openDoc?.publishdate && <Badge variant="outline">{openDoc.publishdate}</Badge>}
              {openDoc?.from_cache && <Badge variant="outline">cached</Badge>}
              {openDoc?.mock && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">mock</Badge>
              )}
            </div>
          </DialogHeader>
          <div className="mt-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {openDoc?.doc}
            </pre>
            {openDoc && !openDoc.mock && (
              <a
                href={`https://indiankanoon.org/doc/${openDoc.docid}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-4 hover:underline"
              >
                View on Indian Kanoon <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
