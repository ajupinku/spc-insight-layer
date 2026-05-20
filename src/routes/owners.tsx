import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ShieldAlert, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { owners as initialOwners, processSteps, visibleProcessSteps } from "@/lib/mock-data";

export const Route = createFileRoute("/owners")({
  head: () => ({ meta: [{ title: "Process Owner Matrix — AKSPC" }] }),
  component: OwnerMatrix,
});

function OwnerMatrix() {
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? processSteps : visibleProcessSteps;

  const ownerOptions = initialOwners;
  const unassigned = list.filter(p => p.ownerId === "OWN-07").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Owner Matrix"
        subtitle="Every process must have an owner. Missing owners block email alerts and surface in the matrix."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users}       label="Active Owners"   value={ownerOptions.filter(o => o.active).length} />
        <Stat icon={ShieldAlert} label="Unassigned Steps" value={unassigned} tone={unassigned ? "warn" : "ok"} />
        <Stat icon={Mail}        label="With Backup"     value={ownerOptions.filter(o => o.backupName).length} />
        <Stat icon={Users}       label="Total Owners"    value={ownerOptions.length} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Owners</h3>
          </div>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>{["ID","Name","Email","Department","Backup","Backup Email","Escalation","Status"].map(h =>
                  <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {ownerOptions.map(o => (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-mono">{o.id}</td>
                    <td className="px-2 py-1.5 font-medium">{o.name}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{o.email || "—"}</td>
                    <td className="px-2 py-1.5">{o.department}</td>
                    <td className="px-2 py-1.5">{o.backupName || "—"}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">{o.backupEmail || "—"}</td>
                    <td className="px-2 py-1.5 font-mono">{o.escalationHours}h</td>
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className={o.active ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"}>
                        {o.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Process → Owner Assignment</h3>
            <button onClick={() => setShowAll(s => !s)} className="text-xs font-medium text-primary hover:underline">
              {showAll ? "Visible flow only" : `Show all ${processSteps.length} steps`}
            </button>
          </div>
          <div className="overflow-auto rounded-md border border-border max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                <tr>{["#","Process","Area","Tool","Owner","Email Alerts"].map(h =>
                  <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {list.map(p => {
                  const o = ownerOptions.find(x => x.id === p.ownerId);
                  const ok = !!o && o.active && o.email;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{p.order}</td>
                      <td className="px-2 py-1.5"><div className="font-medium">{p.name}</div><div className="text-[10px] text-muted-foreground font-mono">{p.id} · {p.tableName}</div></td>
                      <td className="px-2 py-1.5">{p.area}</td>
                      <td className="px-2 py-1.5 font-mono text-[10px]">{p.toolGroup}</td>
                      <td className="px-2 py-1.5">{o?.name ?? <span className="text-warning">Owner missing</span>}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className={ok ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"}>
                          {ok ? "Enabled" : "Disabled — fix owner"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = "default" }: { icon: any; label: string; value: string | number; tone?: "default" | "ok" | "warn" }) {
  const cls = tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-primary";
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${cls}`} />
      </div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}
