import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Search } from "lucide-react";

export const Route = createFileRoute("/audit")({
  head: () => ({ meta: [{ title: "Validation & Audit Log — SNTTW Connect" }] }),
  component: Audit,
});

type EventType = "login" | "sync" | "email_sent" | "email_failed" | "report_generated" | "config_change" | "owner_change" | "alert_rule_change";

const EVENTS: { time: string; type: EventType; user: string; detail: string }[] = [
  { time: "2026-05-18T11:47:00Z", type: "sync", user: "system", detail: "MES sync OK · 142 measurements ingested · view mes.spc_measurements_v" },
  { time: "2026-05-18T11:42:11Z", type: "email_sent", user: "system", detail: "Spec violation email → mei.lin@fab.example · Lot LOT-0018 · CD Mean above USL" },
  { time: "2026-05-18T11:40:02Z", type: "report_generated", user: "j.berg", detail: "Lot history PDF for LOT-0018 (N=5)" },
  { time: "2026-05-18T10:30:00Z", type: "owner_change", user: "admin", detail: "PRC-006 owner changed Hiroshi Tanaka → Hiroshi Tanaka (backup updated)" },
  { time: "2026-05-18T09:14:55Z", type: "alert_rule_change", user: "admin", detail: "Cooldown changed 60 → 30 minutes" },
  { time: "2026-05-18T08:58:21Z", type: "email_failed", user: "system", detail: "SMTP 550 rejected · queued for retry" },
  { time: "2026-05-18T08:24:00Z", type: "email_sent", user: "system", detail: "Spec violation email → h.tanaka@fab.example · Lot LOT-0013 · Stress below LSL" },
  { time: "2026-05-18T08:00:00Z", type: "login", user: "mei.lin", detail: "SSO login from 10.42.1.18" },
  { time: "2026-05-18T07:55:10Z", type: "config_change", user: "admin", detail: "MES read-only mode verified ON" },
  { time: "2026-05-18T07:30:00Z", type: "sync", user: "system", detail: "MES sync OK · 96 measurements ingested" },
];

const colorOf: Record<EventType, string> = {
  login: "border-muted text-muted-foreground",
  sync: "border-primary/40 bg-primary/5 text-primary",
  email_sent: "border-success/40 bg-success/10 text-success",
  email_failed: "border-destructive/40 bg-destructive/10 text-destructive",
  report_generated: "border-primary/40 bg-primary/5 text-primary",
  config_change: "border-warning/40 bg-warning/10 text-warning",
  owner_change: "border-warning/40 bg-warning/10 text-warning",
  alert_rule_change: "border-warning/40 bg-warning/10 text-warning",
};

function Audit() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<EventType | "all">("all");
  const rows = useMemo(() => EVENTS.filter(e => (type === "all" || e.type === type) && (e.user + e.detail).toLowerCase().includes(q.toLowerCase())), [q, type]);

  return (
    <div className="space-y-6">
      <PageHeader title="Validation & Audit Log" subtitle="Audit-friendly event trail for quality teams. Immutable in production." />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events…" className="pl-8" />
            </div>
            <select value={type} onChange={(e) => setType(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {(["all","login","sync","email_sent","email_failed","report_generated","config_change","owner_change","alert_rule_change"] as const).map(t =>
                <option key={t} value={t}>{t}</option>)}
            </select>
            <Badge variant="outline" className="ml-auto">{rows.length} events</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">Timestamp</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">User</th><th className="px-3 py-2 text-left">Detail</th></tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-xs">{new Date(e.time).toLocaleString()}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className={`text-[10px] ${colorOf[e.type]}`}>{e.type}</Badge></td>
                    <td className="px-3 py-2 font-mono text-xs">{e.user}</td>
                    <td className="px-3 py-2">{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
