import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: "ok" | "warning" | "critical" | "owner-missing" }) {
  const color =
    status === "ok" ? "bg-success" :
    status === "warning" ? "bg-warning" :
    status === "critical" ? "bg-destructive" : "bg-muted-foreground";
  const label =
    status === "ok" ? "OK" :
    status === "warning" ? "Warning" :
    status === "critical" ? "Critical" : "Owner missing";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span className={`h-2 w-2 rounded-full ${color}`} /> {label}
    </span>
  );
}
