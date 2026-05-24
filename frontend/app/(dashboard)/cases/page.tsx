"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCases, type CaseOut } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "text-green-700 bg-green-100",
    pending: "text-yellow-700 bg-yellow-100",
    closed: "text-gray-600 bg-gray-100",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "text-blue-700 bg-blue-100"}`}>
      {status}
    </span>
  );
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    listCases()
      .then(setCases)
      .catch(() => toast.error("Failed to load cases"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.case_number.toLowerCase().includes(search.toLowerCase()) ||
      c.petitioner.toLowerCase().includes(search.toLowerCase()) ||
      c.respondent.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cases</h1>
        <Link href="/cases/new" className={cn(buttonVariants())}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Case
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search cases..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Case Number</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Petitioner</TableHead>
              <TableHead>Respondent</TableHead>
              <TableHead>Court</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Filed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  {cases.length === 0 ? "No cases yet. Create your first case." : "No cases match your search."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/cases/${c.id}`} className="font-mono text-xs hover:underline">
                      {c.case_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/cases/${c.id}`} className="font-medium hover:underline">
                      {c.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{c.petitioner}</TableCell>
                  <TableCell className="text-sm">{c.respondent}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.court}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("en-IN")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
