import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity, AlertOctagon, Boxes, FlaskConical, Gauge, Layers,
  ShieldAlert, TrendingDown, Users, Workflow,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusDot } from "@/components/page-header";
import {
  visibleProcessSteps, processSteps, owners, violations, spcWarnings, mesStatus,
  lots, products, productFamilies, productGroups, finalTestResults,
  getProcess, getProduct, getFamily, familyYield, groupYield, lotYield,
} from "@/lib/mock-data";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Command Center — AKSPC" }] }),
  component: CommandCenter,
});

function Stat({ icon: Icon, label, value, hint, tone = "default" }: {
  icon: any; label: string; value: string | number; hint?: string; tone?: "default" | "danger" | "warn" | "ok";
}) {
  const toneCls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-primary";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <Icon className={`h-4 w-4 ${toneCls}`} />
        </div>
        <div className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function CommandCenter() {
  const totalParams = visibleProcessSteps.reduce((a, p) => a + p.parameters.length, 0);
  const activeLots = lots.filter(l => l.status !== "complete").length;
  const openViolations = violations.filter(v => !v.acknowledged).length;

  const ftTotalsTested = finalTestResults.reduce((a, r) => a + r.testedDies, 0);
  const ftTotalsPass = finalTestResults.reduce((a, r) => a + r.passDies, 0);
  const avgYield = ftTotalsTested ? ftTotalsPass / ftTotalsTested : 0;

  const familyYields = useMemo(() => productFamilies.map(f => ({
    f, group: productGroups.find(g => g.id === f.groupId)!, y: familyYield(f.id) ?? 0,
  })).sort((a, b) => a.y - b.y), []);
  const worstFamily = familyYields[0];

  const procViolationCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of violations) m.set(v.processId, (m.get(v.processId) ?? 0) + 1);
    return [...m.entries()].map(([id, count]) => ({ id, name: getProcess(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count);
  }, []);
  const worstProcess = procViolationCount[0];

  const topCriticalLots = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of violations) m.set(v.lotId, (m.get(v.lotId) ?? 0) + 1);
    return [...m.entries()].map(([id, count]) => {
      const lot = lots.find(l => l.id === id);
      const prod = lot ? getProduct(lot.productId) : null;
      return { id, count, product: prod?.name ?? "—", y: lotYield(id) };
    }).sort((a, b) => b.count - a.count).slice(0, 10);
  }, []);

  const topParamFails = useMemo(() => {
    const m = new Map<string, { count: number; proc: string; param: string }>();
    for (const v of violations) {
      const key = `${v.processId}:${v.parameterId}`;
      const proc = getProcess(v.processId)!;
      const pname = proc.parameters.find(p => p.id === v.parameterId)?.name ?? v.parameterId;
      m.set(key, { count: (m.get(key)?.count ?? 0) + 1, proc: proc.name, param: pname });
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  }, []);

  const yieldTrend = useMemo(() => finalTestResults.slice(-30).map(r => {
    const lot = lots.find(l => l.id === r.lotId)!;
    return {
      lot: r.lotId.slice(-4),
      yield: +((r.passDies / Math.max(r.testedDies, 1)) * 100).toFixed(2),
      product: getProduct(lot.productId)?.name ?? "",
    };
  }), []);

  const recentViolations = [...violations].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Center"
        subtitle="Fab-wide SPC and final-test yield, sourced read-only from the central MES database."
        actions={
          <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/5 text-primary">
            Last sync {new Date(mesStatus.lastSync).toLocaleString()}
          </Badge>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat icon={Boxes}        label="Products"           value={products.length} hint={`${productFamilies.length} families · ${productGroups.length} groups`} />
        <Stat icon={Workflow}     label="Process Steps"      value={processSteps.length} hint={`${visibleProcessSteps.length} key steps visible`} />
        <Stat icon={FlaskConical} label="Parameters"         value={totalParams} hint="across visible steps" />
        <Stat icon={Layers}       label="Active Lots"        value={activeLots} hint={`${lots.length} total · 25 wafers each`} />
        <Stat icon={ShieldAlert}  label="USL/LSL Open"       value={openViolations} tone="danger" hint="triggers owner email" />
        <Stat icon={AlertOctagon} label="UCL/LCL Warnings"   value={spcWarnings}  tone="warn" hint="SPC only · no email" />
        <Stat icon={Gauge}        label="Avg Final Test Yield" value={`${(avgYield * 100).toFixed(1)}%`} tone="ok" />
        <Stat icon={TrendingDown} label="Worst Family"       value={worstFamily ? `${(worstFamily.y * 100).toFixed(1)}%` : "—"} tone="warn" hint={worstFamily?.f.name} />
        <Stat icon={Activity}     label="Worst Process"      value={worstProcess?.count ?? 0} tone="danger" hint={worstProcess?.name} />
        <Stat icon={Users}        label="Process Owners"     value={owners.filter(o => o.active).length} hint={`${owners.length - owners.filter(o => o.active).length} unassigned`} />
      </div>

      {/* Yield trend + Product group heatmap */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Final Test Yield Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Last 30 lots · electrical test pass rate</p>
            </div>
            <Link to="/yield" className="text-xs font-medium text-primary hover:underline">Open Yield →</Link>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={yieldTrend} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="lot" fontSize={10} stroke="var(--muted-foreground)" />
                <YAxis domain={[60, 100]} fontSize={10} stroke="var(--muted-foreground)" unit="%" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="yield" stroke="var(--primary)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Product Group Yield</CardTitle>
            <p className="text-xs text-muted-foreground">Heatmap by group</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {productGroups.map(g => {
              const y = groupYield(g.id) ?? 0;
              const color = y > 0.9 ? "bg-success" : y > 0.8 ? "bg-warning" : "bg-destructive";
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{g.name}</span>
                    <span className="font-mono tabular-nums">{(y * 100).toFixed(1)}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded bg-muted">
                    <div className={`h-full ${color}`} style={{ width: `${y * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="mt-3 border-t border-border pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Family heatmap</div>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {familyYields.map(({ f, y }) => {
                  const color = y > 0.9 ? "var(--success)" : y > 0.82 ? "var(--warning)" : "var(--destructive)";
                  return (
                    <div key={f.id} title={`${f.name} · ${(y*100).toFixed(1)}%`}
                         className="aspect-square rounded text-center text-[9px] font-mono text-white flex items-end justify-center p-0.5"
                         style={{ background: color, opacity: 0.45 + y * 0.55 }}>
                      {(y * 100).toFixed(0)}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical lots & failing parameters */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top 10 Critical Lots</CardTitle>
            <Link to="/lots" className="text-xs font-medium text-primary hover:underline">Lot Journey →</Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-2 py-1.5 text-left">Lot</th><th className="px-2 py-1.5 text-left">Product</th><th className="px-2 py-1.5 text-right">Spec Violations</th><th className="px-2 py-1.5 text-right">FT Yield</th></tr>
                </thead>
                <tbody>
                  {topCriticalLots.map(l => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-mono">{l.id}</td>
                      <td className="px-2 py-1.5 truncate max-w-[180px]">{l.product}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold text-destructive">{l.count}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{l.y ? `${(l.y * 100).toFixed(1)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Top 10 Failing Parameters</CardTitle>
            <Link to="/spc" className="text-xs font-medium text-primary hover:underline">SPC →</Link>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topParamFails} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis type="number" fontSize={10} stroke="var(--muted-foreground)" />
                <YAxis dataKey="param" type="category" fontSize={10} stroke="var(--muted-foreground)" width={130} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {topParamFails.map((_, i) => <Cell key={i} fill="var(--destructive)" fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Process health matrix */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Process Health Matrix</CardTitle>
            <p className="text-xs text-muted-foreground">Visible flow · click to open Process Intelligence</p>
          </div>
          <Link to="/processes" className="text-xs font-medium text-primary hover:underline">All processes →</Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {visibleProcessSteps.map(p => {
              const count = procViolationCount.find(x => x.id === p.id)?.count ?? 0;
              const status = count > 3 ? "critical" : count > 0 ? "warning" : "ok";
              return (
                <Link key={p.id} to="/processes" className={`block rounded-md border-l-4 bg-card p-2 shadow-sm hover:bg-muted/40 ${
                  status === "critical" ? "border-l-destructive" : status === "warning" ? "border-l-warning" : "border-l-success"
                }`}>
                  <div className="text-[9px] font-mono uppercase text-muted-foreground">{p.id} · #{p.order}</div>
                  <div className="text-xs font-semibold truncate">{p.name}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <StatusDot status={status} />
                    <span className="font-mono text-[10px] text-destructive">{count} viol</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent spec violations */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent Spec Violations (USL/LSL)</CardTitle>
          <Link to="/violations" className="text-xs font-medium text-primary hover:underline">Violation Center →</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Time","Lot","Product","Process","Parameter","Value","Limit","Severity"].map(h =>
                    <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recentViolations.map(v => {
                  const proc = getProcess(v.processId)!;
                  const param = proc.parameters.find(p => p.id === v.parameterId);
                  const fam = getFamily(getProduct(v.productId)?.familyId ?? "");
                  return (
                    <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 text-muted-foreground">{new Date(v.timestamp).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-2 py-1.5 font-mono">{v.lotId}</td>
                      <td className="px-2 py-1.5 truncate max-w-[160px]">{fam?.name}</td>
                      <td className="px-2 py-1.5 truncate max-w-[140px]">{proc.name}</td>
                      <td className="px-2 py-1.5">{param?.name}</td>
                      <td className="px-2 py-1.5 font-mono font-semibold text-destructive">{v.value}</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{v.direction === "above_usl" ? `>USL ${v.usl}` : `<LSL ${v.lsl}`}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className={
                          v.severity === "high" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                          v.severity === "medium" ? "border-warning/40 bg-warning/10 text-warning" :
                          "border-muted text-muted-foreground"
                        }>{v.severity}</Badge>
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
