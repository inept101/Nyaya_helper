"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listCases, type CaseOut } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Scale, FolderOpen, Clock, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    closed: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${variants[status] ?? "bg-blue-100 text-blue-800"}`}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const [cases, setCases] = useState<CaseOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCases()
      .then(setCases)
      .catch(() => toast.error("Failed to load cases"))
      .finally(() => setLoading(false));
  }, []);

  const active = cases.filter((c) => c.status === "active").length;
  const recent = cases.slice(0, 5);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Welcome back, Your Honour</p>
        </div>
        <Link href="/cases/new" className={cn(buttonVariants())}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Case
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{cases.length}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold text-green-600">{active}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-16" /> : (
              <p className="text-3xl font-bold">
                {cases.filter((c) => Date.now() - new Date(c.created_at).getTime() < 7 * 86400000).length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent cases */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Cases</CardTitle>
          <Link href="/cases" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
          ) : recent.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No cases yet.</p>
              <Link href="/cases/new" className={cn(buttonVariants({ variant: "link" }), "mt-1")}>
                Create your first case
              </Link>
            </div>
          ) : (
            recent.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.case_number} · {c.court}</p>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
