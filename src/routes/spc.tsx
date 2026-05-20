import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  visibleProcessSteps, generateMeasurements, capability, lots, products, productFamilies, productGroups,
} from "@/lib/mock-data";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/spc")({
  head: () => ({ meta: [{ title: "Parameter SPC — AKSPC" }] }),
  component: ParameterSPC,
});

function ParameterSPC() {
  const [groupId, setGroupId] = useState<string>("all");
  const [familyId, setFamilyId] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const [procId, setProcId] = useState(visibleProcessSteps[1].id);
  const proc = visibleProcessSteps.find(p => p.id === procId)!;
  const [paramId, setParamId] = useState(proc.parameters[0].id);
  const param = proc.parameters.find(p => p.id === paramId) ?? proc.parameters[0];

  const filteredLotIds = useMemo(() => {
    let prodIds = products.map(p => p.id);
    if (groupId !== "all") {
      const famIds = productFamilies.filter(f => f.groupId === groupId).map(f => f.id);
      prodIds = products.filter(p => famIds.includes(p.familyId)).map(p => p.id);
    }
    if (familyId !== "all") prodIds = products.filter(p => p.familyId === familyId).map(p => p.id);
    if (productId !== "all") prodIds = [productId];
    return new Set(lots.filter(l => prodIds.includes(l.productId)).map(l => l.id));
  }, [groupId, familyId, productId]);

  const series = useMemo(() => generateMeasurements(proc.id, param).filter(m => filteredLotIds.has(m.lotId)), [proc.id, param.id, filteredLotIds]);

  const values = series.map(m => m.value);
  const cap = capability(values, param.lsl, param.usl, param.target);

  // Xbar/R chart by subgroup of 5
  const subgroupData = useMemo(() => {
    const groups: number[][] = [];
    for (let i = 0; i < series.length; i += 5) groups.push(series.slice(i, i + 5).map(s => s.value));
    return groups.map((g, i) => {
      const mean = g.reduce((a, b) => a + b, 0) / g.length;
      const range = Math.max(...g) - Math.min(...g);
      const sd = Math.sqrt(g.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(g.length - 1, 1));
      return { sg: `SG${i + 1}`, mean: +mean.toFixed(4), range: +range.toFixed(4), sd: +sd.toFixed(4) };
    });
  }, [series]);

  // Histogram
  const histo = useMemo(() => {
    const bins = 14;
    const lo = Math.min(...values, param.lsl), hi = Math.max(...values, param.usl);
    const step = (hi - lo) / bins || 1;
    const buckets = Array.from({ length: bins }, (_, i) => ({ x: +(lo + step * (i + 0.5)).toFixed(3), count: 0 }));
    for (const v of values) {
      const b = Math.min(bins - 1, Math.max(0, Math.floor((v - lo) / step)));
      buckets[b].count++;
    }
    return buckets;
  }, [values, param]);

  const violCount = series.filter(m => m.value > param.usl || m.value < param.lsl).length;
  const warnCount = series.filter(m => (m.value > param.ucl || m.value < param.lcl) && m.value <= param.usl && m.value >= param.lsl).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Parameter SPC" subtitle="Control charts, capability indices, and parametric distribution by product / process." />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <FilterSelect label="Product Group" value={groupId} onChange={(v) => { setGroupId(v); setFamilyId("all"); setProductId("all"); }}
            options={[{ value: "all", label: "All groups" }, ...productGroups.map(g => ({ value: g.id, label: g.name }))]} />
          <FilterSelect label="Family" value={familyId} onChange={(v) => { setFamilyId(v); setProductId("all"); }}
            options={[{ value: "all", label: "All families" },
              ...productFamilies.filter(f => groupId === "all" || f.groupId === groupId).map(f => ({ value: f.id, label: f.name }))]} />
          <FilterSelect label="Product" value={productId} onChange={setProductId}
            options={[{ value: "all", label: "All products" },
              ...products.filter(p => (familyId === "all" || p.familyId === familyId)).map(p => ({ value: p.id, label: p.name }))]} />
          <FilterSelect label="Process" value={procId} onChange={(v) => { setProcId(v); const np = visibleProcessSteps.find(p => p.id === v)!; setParamId(np.parameters[0].id); }}
            options={visibleProcessSteps.map(p => ({ value: p.id, label: `${p.order}. ${p.name}` }))} />
          <FilterSelect label="Parameter" value={paramId} onChange={setParamId}
            options={proc.parameters.map(p => ({ value: p.id, label: p.name }))} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <Kpi label="N" value={values.length} />
        <Kpi label="Mean" value={cap.mean.toFixed(3)} />
        <Kpi label="Sigma" value={cap.sd.toFixed(3)} />
        <Kpi label="Cp" value={cap.cp.toFixed(2)} tone={cap.cp > 1.33 ? "ok" : cap.cp > 1 ? "warn" : "danger"} />
        <Kpi label="Cpk" value={cap.cpk.toFixed(2)} tone={cap.cpk > 1.33 ? "ok" : cap.cpk > 1 ? "warn" : "danger"} />
        <Kpi label="USL/LSL Viol." value={violCount} tone={violCount ? "danger" : "ok"} />
        <Kpi label="UCL/LCL Warn." value={warnCount} tone={warnCount ? "warn" : "ok"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Individual Chart · {param.name} ({param.unit})</CardTitle>
          <p className="text-xs text-muted-foreground">Red dashed = Spec (USL/LSL) · Amber dashed = Control (UCL/LCL) · Green = Target</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series.map(s => ({ lot: s.lotId.slice(-4), value: s.value }))} margin={{ left: -10, right: 10, top: 8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="lot" fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis fontSize={10} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <ReferenceLine y={param.usl} stroke="var(--destructive)" strokeDasharray="5 3" label={{ value: "USL", fontSize: 10, fill: "var(--destructive)" }} />
              <ReferenceLine y={param.lsl} stroke="var(--destructive)" strokeDasharray="5 3" label={{ value: "LSL", fontSize: 10, fill: "var(--destructive)" }} />
              <ReferenceLine y={param.ucl} stroke="var(--warning)" strokeDasharray="2 2" />
              <ReferenceLine y={param.lcl} stroke="var(--warning)" strokeDasharray="2 2" />
              <ReferenceLine y={param.target} stroke="var(--success)" />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={1.5}
                dot={(d: any) => {
                  const v = d.payload.value;
                  const c = v > param.usl || v < param.lsl ? "var(--destructive)" :
                            v > param.ucl || v < param.lcl ? "var(--warning)" : "var(--primary)";
                  return <circle key={d.index} cx={d.cx} cy={d.cy} r={2.5} fill={c} />;
                }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Xbar Chart</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={subgroupData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="sg" fontSize={9} stroke="var(--muted-foreground)" />
                <YAxis fontSize={9} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <ReferenceLine y={param.target} stroke="var(--success)" />
                <ReferenceLine y={param.ucl} stroke="var(--warning)" strokeDasharray="2 2" />
                <ReferenceLine y={param.lcl} stroke="var(--warning)" strokeDasharray="2 2" />
                <Line type="monotone" dataKey="mean" stroke="var(--primary)" strokeWidth={1.5} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">R Chart</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subgroupData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="sg" fontSize={9} stroke="var(--muted-foreground)" />
                <YAxis fontSize={9} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="range" fill="var(--primary)" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">S Chart</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={subgroupData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="sg" fontSize={9} stroke="var(--muted-foreground)" />
                <YAxis fontSize={9} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="sd" fill="var(--accent-foreground)" fillOpacity={0.75} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Distribution · Histogram</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={histo}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="x" fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis fontSize={10} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <ReferenceLine x={param.target} stroke="var(--success)" />
              <ReferenceLine x={param.usl} stroke="var(--destructive)" strokeDasharray="4 3" />
              <ReferenceLine x={param.lsl} stroke="var(--destructive)" strokeDasharray="4 3" />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histo.map((d, i) => (
                  <Cell key={i} fill={d.x > param.usl || d.x < param.lsl ? "var(--destructive)" : d.x > param.ucl || d.x < param.lcl ? "var(--warning)" : "var(--primary)"} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-foreground";
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold tabular-nums ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 block h-9 min-w-[160px] rounded-md border border-input bg-background px-2 text-sm">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
