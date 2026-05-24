"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const tabs = [
  { label: "Overview", href: "" },
  { label: "AI Insights", href: "/insights" },
  { label: "Research", href: "/research" },
  { label: "Draft Judgment", href: "/draft" },
];

export default function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const base = `/cases/${id}`;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b bg-card px-6 pt-4 pb-0">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" /> All Cases
        </Link>
        <div className="flex gap-1">
          {tabs.map(({ label, href }) => {
            const fullHref = `${base}${href}`;
            const active = pathname === fullHref;
            return (
              <Link
                key={href}
                href={fullHref}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
