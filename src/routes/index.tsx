import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity, AlertOctagon, Database, FlaskConical, Lock, ShieldAlert, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusDot } from "@/components/page-header";
import { processes, owners, violations, mesStatus, lots, getProcess } from "@/lib/mock-data";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie, Legend,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Executive Dashboard — SNTTW Connect" },
      { name: "description", content: "Fab-wide SPC health: active processes, parameters monitored, USL/LSL violations, top risky processes." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, hint, tone = "default" }: { icon: any; label: string; value: string | number; hint?: string; tone?: "default" | "danger" | "warn" | "ok" }) {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-primary";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${toneCls}`} />
        </div>
        <div className="mt-2 font-mono text-3xl font-semibold text-foreground tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const totalParams = processes.reduce((a, p) => a + p.parameters.length, 0);
  const uslLslViolations = violations.length;
  const investigationLots = useMemo(() => new Set(violations.filter(v => v.emailStatus !== "acknowledged").map(v => v.lotId)).size, []);

  const riskyProcesses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of violations) counts.set(v.processId, (counts.get(v.processId) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, count]) => ({ id, name: getProcess(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count).slice(0, 10);
  }, []);

  const riskyParams = useMemo(() => {
    const counts = new Map<string, { count: number; process: string; param: string }>();
    for (const v of violations) {
      const key = `${v.processId}::${v.parameterId}`;
      const prev = counts.get(key);
      const proc = getProcess(v.processId)!;
      const pname = proc.parameters.find(p => p.id === v.parameterId)?.name ?? v.parameterId;
      counts.set(key, { count: (prev?.count ?? 0) + 1, process: proc.name, param: pname });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, []);

  const statusDist = useMemo(() => {
    const d = { ok: 0, warning: 0, critical: 0 };
    for (const p of processes) (d as any)[p.status === "owner-missing" ? "warning" : p.status]++;
    return [
      { name: "OK", value: d.ok, color: "var(--success)" },
      { name: "Warning", value: d.warning, color: "var(--warning)" },
      { name: "Critical", value: d.critical, color: "var(--destructive)" },
    ];
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Fab-wide SPC intelligence — sourced read-only from MES."
        actions={
          <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
            <Lock className="h-3 w-3" /> Read-only MES · Sync {new Date(mesStatus.lastSync).toLocaleString()}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Activity} label="Active Processes" value={`${processes.length} / 50`} hint="Capacity 50" />
        <Stat icon={FlaskConical} label="Monitored Parameters" value={totalParams} hint="Up to 100 per process" />
        <Stat icon={Users} label="Process Owners" value={owners.length} />
        <Stat icon={ShieldAlert} label="USL / LSL Violations" value={uslLslViolations} tone="danger" hint="Triggers owner email" />
        <Stat icon={AlertOctagon} label="Lots Under Investigation" value={investigationLots} tone="warn" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top 10 Risky Processes</CardTitle>
            <p className="text-xs text-muted-foreground">By count of USL/LSL violations across all parameters.</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={riskyProcesses} layout="vertical" margin={{ left: 20, right: 16 }}>
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--muted-foreground)" fontSize={11} width={120} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {riskyProcesses.map((_, i) => <Cell key={i} fill="var(--destructive)" fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Process Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {statusDist.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Top 10 Parameters with Most Spec Violations</CardTitle>
          <p className="text-xs text-muted-foreground">USL/LSL only. UCL/LCL warnings tracked separately in SPC.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Process</th>
                  <th className="px-3 py-2 text-left">Parameter</th>
                  <th className="px-3 py-2 text-right">Violations</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {riskyParams.map((r, i) => (
                  <tr key={i} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2">{r.process}</td>
                    <td className="px-3 py-2 font-medium">{r.param}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">{r.count}</td>
                    <td className="px-3 py-2"><StatusDot status={r.count > 3 ? "critical" : r.count > 1 ? "warning" : "ok"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {lots.length} most recent lots across {processes.length} processes.</span>
            <Link to="/violations" className="font-medium text-primary hover:underline">Open Spec Violation Center →</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
