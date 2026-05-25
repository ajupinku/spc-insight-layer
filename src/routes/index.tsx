import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Activity, AlertOctagon, ArrowDownRight, ArrowRight, ArrowUpRight, Boxes,
  ChevronRight, Database, FileDown, FlaskConical, Gauge, Layers, Lock, RefreshCw, Search,
  ShieldAlert, Sparkles, TrendingDown, Workflow,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  visibleProcessSteps, violations, spcWarnings, mesStatus,
  lots, productFamilies, finalTestResults,
  getProcess, getProduct, getFamily, familyYield, lotYield,
} from "@/lib/mock-data";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { ExportMenu, useExportRef } from "@/components/export-menu";
import { exportReportPdf } from "@/lib/export-utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "AKSPC Command Center" }] }),
  component: CommandCenter,
});

// ============================================================
// Compact KPI tile with optional sparkline
// ============================================================
function Kpi({
  icon: Icon, label, value, tone = "default", hint, spark,
}: {
  icon: any; label: string; value: string | number;
  tone?: "default" | "danger" | "warn" | "ok" | "muted";
  hint?: string; spark?: number[];
}) {
  const toneCls =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-warning" :
    tone === "ok" ? "text-success" :
    tone === "muted" ? "text-muted-foreground" : "text-primary";
  const sparkData = spark?.map((v, i) => ({ i, v })) ?? [];
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3" /> {label}
        </div>
        <div className={`mt-0.5 font-mono text-lg font-semibold tabular-nums leading-tight ${toneCls}`}>{value}</div>
        {hint && <div className="text-[10px] text-muted-foreground truncate">{hint}</div>}
      </div>
      {spark && (
        <div className="ml-2 h-10 w-20 shrink-0">
          <ResponsiveContainer>
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5}
                    className={toneCls} fill={`url(#g-${label})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Trend arrow indicator
// ============================================================
function Trend({ dir, value }: { dir: "up" | "down" | "flat"; value: string }) {
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : ArrowRight;
  const cls = dir === "up" ? "text-success" : dir === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" /> {value}
    </span>
  );
}

function CommandCenter() {
  const navigate = useNavigate();
  const [lotQuery, setLotQuery] = useState("");

  const activeLots = lots.filter(l => l.status !== "complete").length;
  const openViolations = violations.filter(v => !v.acknowledged).length;

  const ftTested = finalTestResults.reduce((a, r) => a + r.testedDies, 0);
  const ftPass = finalTestResults.reduce((a, r) => a + r.passDies, 0);
  const avgYield = ftTested ? ftPass / ftTested : 0;

  // ------------ sparklines (last 20 lots) ------------
  const yieldSpark = finalTestResults.slice(-20).map(r => (r.passDies / Math.max(r.testedDies, 1)) * 100);
  const violSpark = useMemo(() => {
    const buckets = new Array(20).fill(0);
    const sorted = [...violations].sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));
    sorted.forEach((v, i) => { buckets[Math.floor((i / sorted.length) * 20)]++; });
    return buckets;
  }, []);
  const warnSpark = violSpark.map(v => Math.max(1, Math.round(v * 1.6)));
  const lotSpark = Array.from({ length: 20 }, (_, i) => activeLots - 10 + (i % 5));

  // ------------ fab health score ------------
  const totalParamRuns = visibleProcessSteps.reduce((a, p) => a + p.parameters.length, 0) * lots.length;
  const fabHealth = Math.max(0, Math.min(100, 100 - (openViolations / Math.max(totalParamRuns, 1)) * 600));
  const yieldScore = avgYield * 100;

  // ------------ family yield ranking ------------
  const familyYields = useMemo(() => productFamilies.map(f => ({
    f, y: familyYield(f.id) ?? 0,
  })).sort((a, b) => a.y - b.y), []);
  const worstFamily = familyYields[0];

  // ------------ process violation counts ------------
  const procViolationCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of violations) m.set(v.processId, (m.get(v.processId) ?? 0) + 1);
    return [...m.entries()].map(([id, count]) => ({ id, name: getProcess(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count);
  }, []);
  const worstProcess = procViolationCount[0];

  // ------------ recent critical lots ------------
  const criticalLots = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of violations) m.set(v.lotId, (m.get(v.lotId) ?? 0) + 1);
    return [...m.entries()].map(([id, count]) => {
      const lot = lots.find(l => l.id === id)!;
      const prod = getProduct(lot.productId);
      const fam = getFamily(prod?.familyId ?? "");
      return { id, count, productName: prod?.name ?? "—", familyName: fam?.name ?? "—", y: lotYield(id) };
    }).sort((a, b) => b.count - a.count).slice(0, 6);
  }, []);

  // ------------ top failing params / processes ------------
  const topParams = useMemo(() => {
    const m = new Map<string, { count: number; proc: string; param: string }>();
    for (const v of violations) {
      const proc = getProcess(v.processId)!;
      const pname = proc.parameters.find(p => p.id === v.parameterId)?.name ?? v.parameterId;
      const key = `${proc.name}::${pname}`;
      m.set(key, { count: (m.get(key)?.count ?? 0) + 1, proc: proc.name, param: pname });
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, []);
  const topProcesses = procViolationCount.slice(0, 5);

  // ------------ recent violations (4) ------------
  const recentViolations = [...violations]
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)).slice(0, 4);

  // ------------ family yield heatmap (8 weeks) ------------
  const heatmapWeeks = 8;
  const familyHeatmap = useMemo(() => {
    return productFamilies.map(f => {
      const prodIds = new Set(lots.filter(l => getProduct(l.productId)?.familyId === f.id).map(l => l.productId));
      const fts = finalTestResults.filter(r => prodIds.has(r.productId));
      const cells = Array.from({ length: heatmapWeeks }, (_, w) => {
        const slice = fts.filter((_, i) => Math.floor((i / fts.length) * heatmapWeeks) === w);
        const t = slice.reduce((a, b) => a + b.testedDies, 0);
        const p = slice.reduce((a, b) => a + b.passDies, 0);
        const fails = t - p;
        return { week: w, y: t ? p / t : 0, lots: slice.length, fails };
      });
      return { family: f, cells };
    });
  }, []);

  // ------------ process × family matrix ------------
  const matrix = useMemo(() => {
    return visibleProcessSteps.map(proc => {
      const row = productFamilies.map(fam => {
        const prodIds = new Set(lots.filter(l => getProduct(l.productId)?.familyId === fam.id).map(l => l.productId));
        const vios = violations.filter(v => v.processId === proc.id && prodIds.has(v.productId));
        const status = vios.length > 3 ? "critical" : vios.length > 0 ? "warning" : "ok";
        return { fam, count: vios.length, status };
      });
      return { proc, row };
    });
  }, []);

  // ------------ FT yield trend (30 lots) with rolling avg ------------
  const yieldTrend = useMemo(() => {
    const arr = finalTestResults.slice(-30).map(r => {
      const y = (r.passDies / Math.max(r.testedDies, 1)) * 100;
      const parametric = y - 1.5 - Math.random() * 1.5;
      return { lot: r.lotId.slice(-4), yield: +y.toFixed(2), parametric: +parametric.toFixed(2) };
    });
    // rolling avg (5)
    return arr.map((d, i) => {
      const window = arr.slice(Math.max(0, i - 4), i + 1);
      const avg = window.reduce((a, b) => a + b.yield, 0) / window.length;
      return { ...d, avg: +avg.toFixed(2) };
    });
  }, []);

  // ------------ lot search ------------
  const matchedLots = useMemo(() => {
    if (!lotQuery.trim()) return [];
    const q = lotQuery.toLowerCase();
    return lots.filter(l => l.id.toLowerCase().includes(q)).slice(0, 5);
  }, [lotQuery]);

  function openLot(_id: string) {
    navigate({ to: "/lots" });
  }

  // Export refs for each major panel
  const kpiRef = useExportRef();
  const heroRef = useExportRef();
  const heatmapRef = useExportRef();
  const matrixRef = useExportRef();
  const trendRef = useExportRef();
  const alertsRef = useExportRef();

  function exportFullReport() {
    const panels = [
      { node: kpiRef.current!,     title: "Top KPIs" },
      { node: heroRef.current!,    title: "Fab Health & Lot Search" },
      { node: heatmapRef.current!, title: "Product Family · Yield Heatmap" },
      { node: matrixRef.current!,  title: "Process Health Matrix" },
      { node: trendRef.current!,   title: "Final Test Yield Trend" },
      { node: alertsRef.current!,  title: "Alert Center" },
    ].filter(p => p.node);
    void exportReportPdf(panels, "akspc-command-center", "AKSPC Command Center Report");
  }

  return (
    <div className="space-y-5">
      {/* ============================================================
          SECTION 1 — Top KPI strip
          ============================================================ */}
      <div>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AKSPC Command Center</h1>
            <p className="text-xs text-muted-foreground">
              Read-only SPC &amp; Yield intelligence — sourced from {mesStatus.source}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-success/40 bg-success/10 text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              Supabase · {mesStatus.mode}
            </Badge>
            <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary">
              <Lock className="h-3 w-3" /> Read-only
            </Badge>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> {new Date(mesStatus.lastSync).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </Badge>
            <Button onClick={exportFullReport} size="sm" className="export-skip h-8 gap-1.5">
              <FileDown className="h-3.5 w-3.5" /> Export Full Report
            </Button>
          </div>
        </div>
        <div ref={kpiRef} className="grid grid-cols-2 gap-2 rounded-lg bg-background p-1 md:grid-cols-3 lg:grid-cols-6">
          <Kpi icon={Layers}       label="Active Lots"          value={activeLots}                spark={lotSpark} />
          <Kpi icon={ShieldAlert}  label="Open USL/LSL"         value={openViolations}            spark={violSpark} tone="danger" hint="triggers owner email" />
          <Kpi icon={AlertOctagon} label="UCL/LCL Warnings"     value={spcWarnings}               spark={warnSpark} tone="warn"   hint="SPC only · no email" />
          <Kpi icon={Gauge}        label="Avg FT Yield"         value={`${yieldScore.toFixed(1)}%`} spark={yieldSpark} tone="ok"  hint="last 100 lots" />
          <Kpi icon={Database}     label="Schema"               value={mesStatus.schema}          tone="muted" hint={`view: ${mesStatus.source.split(":").pop()?.trim()}`} />
          <Kpi icon={RefreshCw}    label="Last Sync"            value={new Date(mesStatus.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} tone="muted" hint={new Date(mesStatus.lastSync).toDateString()} />
        </div>
      </div>

      {/* ============================================================
          SECTION 2 — Hero: Lot Search + Fab Health
          ============================================================ */}
      <div ref={heroRef} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Lot search (5/12) */}
        <Card className="lg:col-span-5 border-primary/20 ring-1 ring-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Search className="h-4 w-4 text-primary" /> Lot Journey · Quick Search
              </CardTitle>
              <Link to="/lots" className="text-[11px] font-medium text-primary hover:underline">Open Lot Journey →</Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={lotQuery}
                onChange={e => setLotQuery(e.target.value)}
                placeholder="Search Lot ID e.g. LOT-2026-0042"
                className="h-10 pl-9 font-mono text-sm"
              />
            </div>

            {/* Matched lots */}
            {matchedLots.length > 0 && (
              <div className="overflow-hidden rounded-md border border-border">
                {matchedLots.map(l => {
                  const prod = getProduct(l.productId);
                  const y = lotYield(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => openLot(l.id)}
                      className="flex w-full items-center justify-between border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted/40"
                    >
                      <div>
                        <div className="font-mono text-xs font-semibold">{l.id}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{prod?.name}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs">{y ? `${(y*100).toFixed(1)}%` : "—"}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Recent critical lots */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Recent Critical Lots</span>
                <span>Spec viol · FT yield</span>
              </div>
              <div className="space-y-1">
                {criticalLots.map(l => (
                  <button
                    key={l.id}
                    onClick={() => openLot(l.id)}
                    className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{l.id}</span>
                        <Badge variant="outline" className="border-destructive/30 bg-destructive/10 px-1.5 py-0 text-[9px] text-destructive">
                          {l.count} viol
                        </Badge>
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">{l.familyName} · {l.productName}</div>
                    </div>
                    <div className="ml-2 text-right">
                      <div className={`font-mono text-xs font-semibold ${(l.y ?? 1) < 0.85 ? "text-destructive" : "text-foreground"}`}>
                        {l.y ? `${(l.y*100).toFixed(1)}%` : "—"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
                <Link to="/lots"><Layers className="mr-1 h-3 w-3" /> Open Lot Journey</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
                <Link to="/products"><Boxes className="mr-1 h-3 w-3" /> Related Lots</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-7 text-[11px]">
                <Link to="/yield"><Gauge className="mr-1 h-3 w-3" /> Final Test Result</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fab Health (7/12) */}
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Fab Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {/* Health gauge */}
              <ScoreRing label="Overall Fab Health" value={fabHealth} suffix="" tone={fabHealth > 85 ? "ok" : fabHealth > 70 ? "warn" : "danger"} />
              {/* Yield gauge */}
              <ScoreRing label="Final Test Yield" value={yieldScore} suffix="%" tone={yieldScore > 90 ? "ok" : yieldScore > 80 ? "warn" : "danger"} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <TrendingDown className="mr-1 inline h-3 w-3" /> Most Critical Family
                  </div>
                  <Trend dir="down" value={`${((worstFamily?.y ?? 0) * 100).toFixed(1)}%`} />
                </div>
                <div className="mt-1 text-sm font-semibold">{worstFamily?.f.name ?? "—"}</div>
                <Link to="/yield" className="mt-1 inline-flex items-center text-[10px] font-medium text-primary hover:underline">
                  Open yield breakdown <ChevronRight className="ml-0.5 h-3 w-3" />
                </Link>
              </div>
              <div className="rounded-md border border-warning/20 bg-warning/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Activity className="mr-1 inline h-3 w-3" /> Most Critical Process
                  </div>
                  <Trend dir="up" value={`${worstProcess?.count ?? 0} viol`} />
                </div>
                <div className="mt-1 truncate text-sm font-semibold">{worstProcess?.name ?? "—"}</div>
                <Link to="/processes" className="mt-1 inline-flex items-center text-[10px] font-medium text-primary hover:underline">
                  Open process intelligence <ChevronRight className="ml-0.5 h-3 w-3" />
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 3 — Graphical panels
          ============================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Panel A — Family yield heatmap */}
        <Card ref={heatmapRef as any} className="lg:col-span-5">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Product Family · Yield Heatmap</CardTitle>
              <p className="text-[11px] text-muted-foreground">last 8 weeks · final test pass rate</p>
            </div>
            <div className="flex items-center gap-1">
              <ExportMenu
                targetRef={heatmapRef}
                name="family-yield-heatmap"
                title="Product Family · Yield Heatmap"
                csvRows={familyHeatmap.flatMap(({ family, cells }) =>
                  cells.map(c => ({ family: family.name, week: `W${c.week + 1}`, yield_pct: +(c.y * 100).toFixed(2), lots: c.lots, failed_dies: c.fails }))
                )}
              />
              <Link to="/yield" className="export-skip text-[11px] font-medium text-primary hover:underline">All →</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="grid grid-cols-[160px_repeat(8,1fr)] gap-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                <div />
                {Array.from({ length: heatmapWeeks }, (_, i) => (
                  <div key={i} className="text-center">W{i + 1}</div>
                ))}
              </div>
              {familyHeatmap.map(({ family, cells }) => (
                <div key={family.id} className="grid grid-cols-[160px_repeat(8,1fr)] items-center gap-1">
                  <div className="truncate text-xs font-medium" title={family.name}>{family.name}</div>
                  {cells.map((c, i) => {
                    const bg =
                      c.y === 0 ? "bg-muted" :
                      c.y > 0.92 ? "bg-success" :
                      c.y > 0.85 ? "bg-success/60" :
                      c.y > 0.78 ? "bg-warning/70" :
                      "bg-destructive/80";
                    return (
                      <div key={i}
                        title={`${family.name} · W${i+1}\nYield: ${(c.y*100).toFixed(1)}%\nLots: ${c.lots} · Failed dies: ${c.fails}`}
                        className={`h-6 rounded-sm ${bg} flex items-center justify-center text-[9px] font-mono font-semibold text-white/90`}>
                        {c.y ? Math.round(c.y * 100) : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="h-2 w-3 rounded-sm bg-destructive/80" /> &lt;78%
              <span className="h-2 w-3 rounded-sm bg-warning/70" /> 78–85%
              <span className="h-2 w-3 rounded-sm bg-success/60" /> 85–92%
              <span className="h-2 w-3 rounded-sm bg-success" /> &gt;92%
            </div>
          </CardContent>
        </Card>

        {/* Panel B — Process × Family matrix */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Process Health Matrix</CardTitle>
              <p className="text-[11px] text-muted-foreground">step × family · OK / Warn / Critical</p>
            </div>
            <Link to="/processes" className="text-[11px] font-medium text-primary hover:underline">Open →</Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[420px] space-y-1">
                <div className="grid grid-cols-[140px_repeat(8,1fr)] gap-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  <div />
                  {productFamilies.map(f => (
                    <div key={f.id} className="truncate text-center" title={f.name}>{f.name.split(" ").pop()}</div>
                  ))}
                </div>
                {matrix.map(({ proc, row }) => (
                  <div key={proc.id} className="grid grid-cols-[140px_repeat(8,1fr)] items-center gap-1">
                    <div className="truncate text-xs font-medium" title={proc.name}>{proc.name}</div>
                    {row.map((cell, i) => {
                      const bg =
                        cell.status === "critical" ? "bg-destructive" :
                        cell.status === "warning" ? "bg-warning" :
                        "bg-success/50";
                      return (
                        <Link key={i} to="/processes"
                          title={`${proc.name} × ${cell.fam.name}: ${cell.count} violations`}
                          className={`h-6 rounded-sm ${bg} hover:ring-2 hover:ring-primary/40 flex items-center justify-center text-[9px] font-mono font-semibold text-white/90`}>
                          {cell.count > 0 ? cell.count : ""}
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel C — FT yield trend */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Final Test Yield Trend</CardTitle>
            <p className="text-[11px] text-muted-foreground">last 30 lots</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={yieldTrend} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="lot" fontSize={9} stroke="var(--muted-foreground)" tickLine={false} />
                <YAxis domain={[60, 100]} fontSize={9} stroke="var(--muted-foreground)" unit="%" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Line type="monotone" dataKey="yield" name="FT Yield" stroke="var(--primary)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="parametric" name="Parametric" stroke="var(--warning)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                <Line type="monotone" dataKey="avg" name="Rolling Avg(5)" stroke="var(--muted-foreground)" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 bg-primary" /> FT</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 bg-warning" /> Param</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-3 bg-muted-foreground" /> Avg5</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 4 — Alert center
          ============================================================ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <RankedList
          title="Top Failing Parameters"
          link={{ to: "/spc", label: "SPC →" }}
          items={topParams.map(p => ({
            primary: p.param, secondary: p.proc, value: p.count, valueColor: "text-destructive",
          }))}
          className="lg:col-span-4"
        />
        <RankedList
          title="Top Failing Processes"
          link={{ to: "/processes", label: "Processes →" }}
          items={topProcesses.map(p => ({
            primary: p.name, secondary: p.id, value: p.count, valueColor: "text-destructive",
          }))}
          className="lg:col-span-4"
        />
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Spec Violations</CardTitle>
            <Link to="/violations" className="text-[11px] font-medium text-primary hover:underline">All →</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentViolations.map(v => {
              const proc = getProcess(v.processId)!;
              const param = proc.parameters.find(p => p.id === v.parameterId);
              return (
                <div key={v.id} className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold">{v.lotId}</span>
                    <Badge variant="outline" className={
                      v.severity === "high" ? "border-destructive/40 bg-destructive/10 px-1.5 py-0 text-[9px] text-destructive" :
                      v.severity === "medium" ? "border-warning/40 bg-warning/10 px-1.5 py-0 text-[9px] text-warning" :
                      "px-1.5 py-0 text-[9px]"
                    }>{v.severity}</Badge>
                  </div>
                  <div className="mt-0.5 text-[11px] truncate"><span className="text-muted-foreground">{proc.name}</span> · {param?.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    val {v.value} · {v.direction === "above_usl" ? `> USL ${v.usl}` : `< LSL ${v.lsl}`}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================
          SECTION 5 — Shortcuts
          ============================================================ */}
      <div>
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drill-down shortcuts</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Shortcut to="/products"   icon={Boxes}        title="Product Explorer"   desc="Group · Family · Product"/>
          <Shortcut to="/lots"       icon={Layers}       title="Lot Journey"        desc="Wafer-level traceability"/>
          <Shortcut to="/processes"  icon={Workflow}     title="Process Intelligence" desc="Step health × family"/>
          <Shortcut to="/spc"        icon={FlaskConical} title="Parameter SPC"      desc="Xbar, R, S, Cpk"/>
          <Shortcut to="/yield"      icon={Gauge}        title="Final Test Yield"   desc="Bin · parametric pareto"/>
          <Shortcut to="/violations" icon={ShieldAlert}  title="Spec Violation Ctr" desc="USL/LSL excursions"/>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Score Ring (SVG)
// ============================================================
function ScoreRing({ label, value, suffix, tone }: {
  label: string; value: number; suffix: string; tone: "ok" | "warn" | "danger";
}) {
  const color = tone === "ok" ? "var(--success)" : tone === "warn" ? "var(--warning)" : "var(--destructive)";
  const pct = Math.max(0, Math.min(100, value));
  const R = 46, C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} stroke="var(--border)" strokeWidth="10" fill="none" />
          <circle cx="60" cy="60" r={R} stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={`${dash} ${C - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums" style={{ color }}>{value.toFixed(1)}{suffix}</span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">score</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {tone === "ok" ? "Within target band" : tone === "warn" ? "Watch — drifting" : "Action required"}
        </div>
        <div className="mt-2 h-1.5 w-32 overflow-hidden rounded bg-muted">
          <div className="h-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Ranked list card
// ============================================================
function RankedList({
  title, link, items, className,
}: {
  title: string;
  link: { to: string; label: string };
  items: { primary: string; secondary: string; value: number; valueColor?: string }[];
  className?: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <Card className={className}>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Link to={link.to} className="text-[11px] font-medium text-primary hover:underline">{link.label}</Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate font-medium">{it.primary}</span>
              <span className={`ml-2 font-mono font-semibold tabular-nums ${it.valueColor ?? ""}`}>{it.value}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                <div className="h-full bg-destructive/70" style={{ width: `${(it.value / max) * 100}%` }} />
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground truncate max-w-[120px]">{it.secondary}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// Shortcut card
// ============================================================
function Shortcut({ to, icon: Icon, title, desc }: { to: string; icon: any; title: string; desc: string }) {
  return (
    <Link to={to} className="group block rounded-lg border border-border bg-card p-3 transition hover:border-primary/40 hover:bg-primary/5">
      <div className="flex items-center gap-2">
        <div className="rounded-md bg-primary/10 p-1.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">{desc}</div>
    </Link>
  );
}
