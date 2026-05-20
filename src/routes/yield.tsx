import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import {
  finalTestResults, lots, products, productFamilies, productGroups,
  familyYield, groupYield, getProduct, getFamily,
} from "@/lib/mock-data";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";

export const Route = createFileRoute("/yield")({
  head: () => ({ meta: [{ title: "Final Test Yield — AKSPC" }] }),
  component: FinalTestYield,
});

function FinalTestYield() {
  const [groupId, setGroupId] = useState("all");
  const [familyId, setFamilyId] = useState("all");
  const [productId, setProductId] = useState("all");

  const filteredResults = useMemo(() => {
    let prodIds = new Set(products.map(p => p.id));
    if (groupId !== "all") {
      const famIds = productFamilies.filter(f => f.groupId === groupId).map(f => f.id);
      prodIds = new Set(products.filter(p => famIds.includes(p.familyId)).map(p => p.id));
    }
    if (familyId !== "all") prodIds = new Set(products.filter(p => p.familyId === familyId).map(p => p.id));
    if (productId !== "all") prodIds = new Set([productId]);
    return finalTestResults.filter(r => prodIds.has(r.productId));
  }, [groupId, familyId, productId]);

  const totalTested = filteredResults.reduce((a, r) => a + r.testedDies, 0);
  const totalPass = filteredResults.reduce((a, r) => a + r.passDies, 0);
  const avgYield = totalTested ? totalPass / totalTested : 0;

  const trend = useMemo(() => filteredResults.slice(-40).map(r => ({
    lot: r.lotId.slice(-4),
    yield: +(r.passDies / Math.max(r.testedDies, 1) * 100).toFixed(2),
  })), [filteredResults]);

  const familyCompare = useMemo(() => productFamilies.map(f => ({
    name: f.name, yield: +((familyYield(f.id) ?? 0) * 100).toFixed(1),
    group: productGroups.find(g => g.id === f.groupId)?.name ?? "",
  })).sort((a, b) => a.yield - b.yield), []);

  const binPareto = useMemo(() => {
    const m = new Map<string, { name: string; count: number; pass: boolean }>();
    for (const r of filteredResults) for (const b of r.bins) {
      const key = `${b.bin}-${b.name}`;
      const prev = m.get(key);
      m.set(key, { name: `${b.bin} · ${b.name}`, count: (prev?.count ?? 0) + b.count, pass: b.pass });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [filteredResults]);

  const paramPareto = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filteredResults) for (const pf of r.parametricFails) {
      m.set(pf.param, (m.get(pf.param) ?? 0) + pf.failCount);
    }
    return [...m.entries()].map(([param, count]) => ({ param, count })).sort((a, b) => b.count - a.count);
  }, [filteredResults]);

  return (
    <div className="space-y-6">
      <PageHeader title="Final Test Yield" subtitle="Electrical test parametric yield, bin Pareto, and product/family/group rollups for power semiconductor devices." />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <FilterSelect label="Product Group" value={groupId} onChange={v => { setGroupId(v); setFamilyId("all"); setProductId("all"); }}
            options={[{ value: "all", label: "All groups" }, ...productGroups.map(g => ({ value: g.id, label: g.name }))]} />
          <FilterSelect label="Family" value={familyId} onChange={v => { setFamilyId(v); setProductId("all"); }}
            options={[{ value: "all", label: "All families" },
              ...productFamilies.filter(f => groupId === "all" || f.groupId === groupId).map(f => ({ value: f.id, label: f.name }))]} />
          <FilterSelect label="Product" value={productId} onChange={setProductId}
            options={[{ value: "all", label: "All products" },
              ...products.filter(p => familyId === "all" || p.familyId === familyId).map(p => ({ value: p.id, label: p.name }))]} />
          <Badge variant="outline" className="ml-auto">{filteredResults.length} lots · {totalTested.toLocaleString()} dies</Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Avg FT Yield" value={`${(avgYield * 100).toFixed(2)}%`} tone="ok" />
        <Kpi label="Total Dies Tested" value={totalTested.toLocaleString()} />
        <Kpi label="Pass Dies" value={totalPass.toLocaleString()} tone="ok" />
        <Kpi label="Fail Dies" value={(totalTested - totalPass).toLocaleString()} tone="danger" />
        <Kpi label="Lots Reported" value={filteredResults.length} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Yield Trend (Last 40 Lots)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ left: -10, right: 10 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="lot" fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis domain={[60, 100]} unit="%" fontSize={10} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Line type="monotone" dataKey="yield" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Bin Pareto</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={binPareto} layout="vertical" margin={{ left: 8, right: 12 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis type="number" fontSize={10} stroke="var(--muted-foreground)" />
                <YAxis dataKey="name" type="category" fontSize={10} width={130} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                  {binPareto.map((b, i) => <Cell key={i} fill={b.pass ? "var(--success)" : "var(--destructive)"} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Failed Parameter Pareto</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paramPareto} margin={{ left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                <XAxis dataKey="param" fontSize={10} stroke="var(--muted-foreground)" />
                <YAxis fontSize={10} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                <Bar dataKey="count" fill="var(--warning)" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Family Yield Comparison</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={familyCompare} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis type="number" domain={[60, 100]} unit="%" fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis dataKey="name" type="category" fontSize={10} width={180} stroke="var(--muted-foreground)" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="yield" radius={[0, 3, 3, 0]}>
                {familyCompare.map((f, i) =>
                  <Cell key={i} fill={f.yield > 90 ? "var(--success)" : f.yield > 82 ? "var(--warning)" : "var(--destructive)"} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Lot Final Test Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-2 py-1.5 text-left">Lot</th><th className="px-2 py-1.5 text-left">Product</th><th className="px-2 py-1.5 text-left">Family</th><th className="px-2 py-1.5 text-left">Tester</th><th className="px-2 py-1.5 text-right">Tested</th><th className="px-2 py-1.5 text-right">Pass</th><th className="px-2 py-1.5 text-right">Yield</th><th className="px-2 py-1.5 text-left">Top Fail Bin</th></tr>
              </thead>
              <tbody>
                {filteredResults.slice(-15).reverse().map(r => {
                  const y = r.passDies / Math.max(r.testedDies, 1);
                  const prod = getProduct(r.productId);
                  const fam = prod ? getFamily(prod.familyId) : null;
                  const topFail = [...r.bins].filter(b => !b.pass).sort((a, b) => b.count - a.count)[0];
                  return (
                    <tr key={r.lotId} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-mono">{r.lotId}</td>
                      <td className="px-2 py-1.5 truncate max-w-[180px]">{prod?.name}</td>
                      <td className="px-2 py-1.5 truncate max-w-[140px] text-muted-foreground">{fam?.name}</td>
                      <td className="px-2 py-1.5 font-mono">{r.tester}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.testedDies.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{r.passDies.toLocaleString()}</td>
                      <td className={`px-2 py-1.5 text-right font-mono font-semibold ${y > 0.9 ? "text-success" : y > 0.82 ? "text-warning" : "text-destructive"}`}>{(y * 100).toFixed(1)}%</td>
                      <td className="px-2 py-1.5 text-[11px]">{topFail ? `Bin ${topFail.bin} · ${topFail.name} (${topFail.count})` : "—"}</td>
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
