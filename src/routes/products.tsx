import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Boxes, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import {
  productGroups, productFamilies, products, lots, finalTestResults,
  groupYield, familyYield, productYield, lotYield, violations, getProcess,
} from "@/lib/mock-data";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Cell } from "recharts";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Product Explorer — AKSPC" }] }),
  component: ProductExplorer,
});

function ProductExplorer() {
  const [selectedProductId, setSelectedProductId] = useState(products[0].id);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(productGroups.map(g => g.id)));
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set([productFamilies[0].id]));
  const [q, setQ] = useState("");

  const product = products.find(p => p.id === selectedProductId)!;
  const family = productFamilies.find(f => f.id === product.familyId)!;
  const group = productGroups.find(g => g.id === family.groupId)!;
  const productLots = lots.filter(l => l.productId === product.id);
  const productResults = finalTestResults.filter(r => r.productId === product.id);

  const yieldTrend = productResults.map(r => ({
    lot: r.lotId.slice(-4),
    yield: +((r.passDies / Math.max(r.testedDies, 1)) * 100).toFixed(2),
  }));

  const topFailingProcesses = useMemo(() => {
    const lotIds = new Set(productLots.map(l => l.id));
    const m = new Map<string, number>();
    for (const v of violations) if (lotIds.has(v.lotId)) m.set(v.processId, (m.get(v.processId) ?? 0) + 1);
    return [...m.entries()].map(([id, count]) => ({ name: getProcess(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
  }, [productLots]);

  const topFailingParams = useMemo(() => {
    const lotIds = new Set(productLots.map(l => l.id));
    const m = new Map<string, number>();
    for (const v of violations) if (lotIds.has(v.lotId)) {
      const proc = getProcess(v.processId)!;
      const name = proc.parameters.find(p => p.id === v.parameterId)?.name ?? v.parameterId;
      m.set(name, (m.get(name) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
  }, [productLots]);

  function toggle<T>(set: Set<T>, v: T, fn: (s: Set<T>) => void) {
    const ns = new Set(set); ns.has(v) ? ns.delete(v) : ns.add(v); fn(ns);
  }

  const filteredProducts = q
    ? products.filter(p => (p.name + p.id).toLowerCase().includes(q.toLowerCase()))
    : products;

  return (
    <div className="space-y-6">
      <PageHeader title="Product Explorer" subtitle="Hierarchical view: Group → Family → Product. Select a product to drill down." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Tree */}
        <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Boxes className="h-4 w-4 text-primary" /> Hierarchy</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-8 h-8 text-xs" />
            </div>
          </CardHeader>
          <CardContent className="text-sm">
            {q ? (
              <div className="space-y-1">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => setSelectedProductId(p.id)}
                    className={`block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted ${p.id === selectedProductId ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                    <span className="font-mono text-[10px] text-muted-foreground mr-1">{p.id}</span>{p.name}
                  </button>
                ))}
              </div>
            ) : productGroups.map(g => {
              const gExp = expandedGroups.has(g.id);
              const families = productFamilies.filter(f => f.groupId === g.id);
              const gy = groupYield(g.id) ?? 0;
              return (
                <div key={g.id} className="mb-1">
                  <button onClick={() => toggle(expandedGroups, g.id, setExpandedGroups)}
                    className="flex w-full items-center gap-1 rounded px-1 py-1 text-xs font-bold uppercase tracking-wider hover:bg-muted">
                    <ChevronRight className={`h-3 w-3 transition-transform ${gExp ? "rotate-90" : ""}`} />
                    <span className="flex-1 text-left">{g.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{(gy * 100).toFixed(0)}%</span>
                  </button>
                  {gExp && families.map(f => {
                    const fExp = expandedFamilies.has(f.id);
                    const prods = products.filter(p => p.familyId === f.id);
                    const fy = familyYield(f.id) ?? 0;
                    return (
                      <div key={f.id} className="ml-3">
                        <button onClick={() => toggle(expandedFamilies, f.id, setExpandedFamilies)}
                          className="flex w-full items-center gap-1 rounded px-1 py-1 text-xs hover:bg-muted">
                          <ChevronRight className={`h-3 w-3 transition-transform ${fExp ? "rotate-90" : ""}`} />
                          <span className="flex-1 truncate text-left">{f.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">{(fy * 100).toFixed(0)}%</span>
                        </button>
                        {fExp && (
                          <div className="ml-4 border-l border-border pl-2">
                            {prods.map(p => (
                              <button key={p.id} onClick={() => setSelectedProductId(p.id)}
                                className={`block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted ${p.id === selectedProductId ? "bg-primary/10 text-primary font-semibold" : ""}`}>
                                {p.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Detail */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{group.name}</span><ChevronRight className="h-3 w-3" />
                <span>{family.name}</span><ChevronRight className="h-3 w-3" />
                <span className="font-mono">{product.id}</span>
              </div>
              <h2 className="mt-1 text-2xl font-semibold">{product.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metric label="Lots" value={productLots.length} />
                <Metric label="Avg FT Yield" value={`${((productYield(product.id) ?? 0) * 100).toFixed(1)}%`} />
                <Metric label="Family Yield" value={`${((familyYield(family.id) ?? 0) * 100).toFixed(1)}%`} />
                <Metric label="Group Yield" value={`${((groupYield(group.id) ?? 0) * 100).toFixed(1)}%`} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Yield Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={yieldTrend} margin={{ left: -10, right: 10, top: 4, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                  <XAxis dataKey="lot" fontSize={10} stroke="var(--muted-foreground)" />
                  <YAxis domain={[60, 100]} fontSize={10} unit="%" stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                  <Line type="monotone" dataKey="yield" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Failing Processes</CardTitle></CardHeader>
              <CardContent>
                {topFailingProcesses.length ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topFailingProcesses} layout="vertical" margin={{ left: 8 }}>
                      <XAxis type="number" fontSize={10} stroke="var(--muted-foreground)" />
                      <YAxis dataKey="name" type="category" fontSize={10} width={120} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                        {topFailingProcesses.map((_, i) => <Cell key={i} fill="var(--destructive)" fillOpacity={0.8} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="text-xs text-muted-foreground">No violations</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Top Failing Parameters</CardTitle></CardHeader>
              <CardContent>
                {topFailingParams.length ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topFailingParams} layout="vertical" margin={{ left: 8 }}>
                      <XAxis type="number" fontSize={10} stroke="var(--muted-foreground)" />
                      <YAxis dataKey="name" type="category" fontSize={10} width={120} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                        {topFailingParams.map((_, i) => <Cell key={i} fill="var(--warning)" fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="text-xs text-muted-foreground">No violations</div>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Recent Lots ({productLots.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr><th className="px-2 py-1.5 text-left">Lot</th><th className="px-2 py-1.5 text-left">Start</th><th className="px-2 py-1.5 text-left">Status</th><th className="px-2 py-1.5 text-left">Current Step</th><th className="px-2 py-1.5 text-right">Wafers OK</th><th className="px-2 py-1.5 text-right">FT Yield</th><th /></tr>
                  </thead>
                  <tbody>
                    {productLots.slice(-15).reverse().map(l => {
                      const y = lotYield(l.id);
                      const okW = l.wafers.filter(w => w.status === "ok").length;
                      return (
                        <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-2 py-1.5 font-mono">{l.id}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{new Date(l.startDate).toLocaleDateString()}</td>
                          <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{l.status}</Badge></td>
                          <td className="px-2 py-1.5 truncate max-w-[180px]">{getProcess(l.currentStepId)?.name}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{okW}/25</td>
                          <td className="px-2 py-1.5 text-right font-mono">{y ? `${(y * 100).toFixed(1)}%` : "—"}</td>
                          <td className="px-2 py-1.5"><Link to="/lots" search={{ lot: l.id } as any} className="text-primary text-xs hover:underline">Journey →</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
