"use client";

import { use, useEffect, useState } from "react";
import { getCase, type CaseDetailOut, type DocumentOut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentUpload, DocumentCard } from "@/components/document-upload";
import { toast } from "sonner";

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
      <dd className="text-sm mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}

export default function CaseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [caseData, setCaseData] = useState<CaseDetailOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCase(id)
      .then(setCaseData)
      .catch(() => toast.error("Failed to load case"))
      .finally(() => setLoading(false));
  }, [id]);

  function handleDocUploaded(doc: DocumentOut) {
    setCaseData((prev) => prev ? { ...prev, documents: [...prev.documents, doc] } : prev);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!caseData) return null;

  const statusColors: Record<string, string> = {
    active: "text-green-700 bg-green-100",
    pending: "text-yellow-700 bg-yellow-100",
    closed: "text-gray-600 bg-gray-100",
  };

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <div className="flex items-start gap-3">
          <h1 className="text-xl font-bold leading-tight">{caseData.title}</h1>
          <span className={`flex-shrink-0 mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[caseData.status] ?? "text-blue-700 bg-blue-100"}`}>
            {caseData.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{caseData.case_number}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Case Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <InfoRow label="Court" value={caseData.court} />
            <InfoRow label="Case Type" value={caseData.case_type} />
            <InfoRow label="Petitioner / Plaintiff" value={caseData.petitioner} />
            <InfoRow label="Respondent / Defendant" value={caseData.respondent} />
            <InfoRow
              label="Filed on"
              value={new Date(caseData.created_at).toLocaleDateString("en-IN", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
            <InfoRow
              label="Last updated"
              value={new Date(caseData.updated_at).toLocaleDateString("en-IN", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </dl>
          {caseData.notes && (
            <div className="mt-4 pt-4 border-t">
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Judge&apos;s Notes</dt>
              <dd className="text-sm mt-1 whitespace-pre-wrap">{caseData.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Documents ({caseData.documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DocumentUpload caseId={id} onUploaded={handleDocUploaded} />
          {caseData.documents.length > 0 && (
            <div className="space-y-2 mt-2">
              {caseData.documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
