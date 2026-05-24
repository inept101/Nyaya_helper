"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCase, type CaseCreate } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CASE_TYPES = [
  "Civil Suit", "Original Suit", "Title Suit", "Money Suit",
  "Injunction Suit", "Partition Suit", "Matrimonial Petition",
  "Probate Petition", "Execution Petition", "Appeal", "Revision",
  "Writ Petition", "Other",
];

const COURTS = [
  "District Court", "Civil Court", "Family Court",
  "Motor Accident Claims Tribunal", "Consumer Disputes Redressal Forum",
  "High Court", "Other",
];

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CaseCreate>({
    title: "", case_number: "", court: "", case_type: "",
    petitioner: "", respondent: "", notes: "",
  });

  function setField(field: keyof CaseCreate, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createCase(form);
      toast.success("Case created successfully");
      router.push(`/cases/${created.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create case");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/cases" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-4 -ml-2")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> All Cases
        </Link>
        <h1 className="text-2xl font-bold">New Case</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Enter case details to get started</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="case_number">Case Number *</Label>
                <Input
                  id="case_number"
                  value={form.case_number}
                  onChange={(e) => setField("case_number", e.target.value)}
                  placeholder="CS/123/2024"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="case_type">Case Type *</Label>
                <Select value={form.case_type} onValueChange={(v) => setField("case_type", v ?? "")}>
                  <SelectTrigger id="case_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Case Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Sharma vs State of Maharashtra — Property Dispute"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="court">Court *</Label>
              <Select value={form.court} onValueChange={(v) => setField("court", v ?? "")}>
                <SelectTrigger id="court">
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  {COURTS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="petitioner">Petitioner / Plaintiff *</Label>
                <Input
                  id="petitioner"
                  value={form.petitioner}
                  onChange={(e) => setField("petitioner", e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="respondent">Respondent / Defendant *</Label>
                <Input
                  id="respondent"
                  value={form.respondent}
                  onChange={(e) => setField("respondent", e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Judge's Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Any initial observations, complexity notes, related cases..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Case"}
          </Button>
          <Link href="/cases" className={cn(buttonVariants({ variant: "outline" }))}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
