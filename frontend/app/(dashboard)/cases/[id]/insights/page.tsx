"use client";

import { use } from "react";
import { AIPanel } from "@/components/ai-panel";
import { FileSearch, List, BookOpen } from "lucide-react";

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AI Insights</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI-powered analysis of uploaded case documents. Upload documents in the Overview tab first.
        </p>
      </div>

      <AIPanel
        title="Document Summary"
        description="Structured summary of all case documents — parties, facts, relief sought, evidence, applicable laws"
        buttonLabel="Summarize Documents"
        endpoint="summarize"
        body={{ case_id: id }}
        placeholder="Summarizes pleadings, petitions, and affidavits into a structured overview."
      />

      <AIPanel
        title="Legal Issues"
        description="Identify and enumerate all distinct legal issues and questions of fact/law in dispute"
        buttonLabel="Extract Issues"
        endpoint="extract-issues"
        body={{ case_id: id }}
        placeholder="Lists every legal question in dispute with applicable statutes and each party's position."
      />

      <AIPanel
        title="Case Brief"
        description="Generate a complete Indian-format case brief ready for hearing preparation"
        buttonLabel="Generate Brief"
        endpoint="generate-brief"
        body={{ case_id: id }}
        placeholder="Produces a formal brief following Indian court format: parties, jurisdiction, facts, issues, arguments, precedents, and reliefs."
      />
    </div>
  );
}
