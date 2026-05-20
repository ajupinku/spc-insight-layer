import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusDot } from "@/components/page-header";
import {
  processSteps, visibleProcessSteps, productFamilies, products, violations, lots,
  getOwner, finalTestResults,
} from "@/lib/mock-data";

export const Route = createFileRoute("/processes")({
  head: () => ({ meta: [{ title: "Process Intelligence — AKSPC" }] }),
  component: ProcessIntelligence,
});

function ProcessIntelligence() {
  const [showAll, setShowAll] = useState(false);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const violByProc = new Map<string, { crit: number; warn: number; lastLot: string | null; lastTime: string | null }>();
    for (const v of violations) {
      const prev = violByProc.get(v.processId) ?? { crit: 0, warn: 0, lastLot: null, lastTime: null };
      prev.crit++;
      if (!prev.lastTime || v.timestamp > prev.lastTime) { prev.lastTime = v.timestamp; prev.lastLot = v.lotId; }
      violByProc.set(v.processId, prev);
    }
    const list = (showAll ? processSteps : visibleProcessSteps).map(p => {
      const stats = violByProc.get(p.id) ?? { crit: 0, warn: 0, lastLot: null, lastTime: null };
      const productsUsing = products.length; // simplification: all products use all steps
      const status: "ok" | "warning" | "critical" | "owner-missing" =
        p.ownerId === "OWN-07" ? "owner-missing" :
        stats.crit > 3 ? "critical" : stats.crit > 0 ? "warning" : "ok";
      return { p, stats, productsUsing, status };
    });
    if (q) {
      const qq = q.toLowerCase();
      return list.filter(r => (r.p.name + r.p.id + r.p.area + r.p.toolGroup).toLowerCase().includes(qq));
    }
    return list;
  }, [showAll, q]);

  // Heatmap: rows = visible processes, columns = product families
  const heatmap = useMemo(() => {
    const familyLotMap = new Map<string, Set<string>>();
    for (const lot of lots) {
      const prod = products.find(p => p.id === lot.productId);
      if (!prod) continue;
      if (!familyLotMap.has(prod.familyId)) familyLotMap.set(prod.familyId, new Set());
      familyLotMap.get(prod.familyId)!.add(lot.id);
    }
    return visibleProcessSteps.map(p => ({
      proc: p,
      cells: productFamilies.map(f => {
        const lotSet = familyLotMap.get(f.id) ?? new Set();
        let crit = 0;
        for (const v of violations) if (v.processId === p.id && lotSet.has(v.lotId)) crit++;
        const intensity = Math.min(1, crit / 8);
        return { fam: f, crit, intensity };
      }),
    }));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Intelligence"
        subtitle={`${processSteps.length} process steps · ${visibleProcessSteps.length} key visible · 100 total in the flow`}
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search process, area, tool…" className="pl-8" />
          </div>
          <Button size="sm" variant={showAll ? "default" : "outline"} onClick={() => setShowAll(s => !s)}>
            {showAll ? "Showing all 100 steps" : "Show all 100 steps"}
          </Button>
          <Badge variant="outline">{rows.length} rows</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Process Matrix</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
                <tr>
                  {["#", "Process ID", "Name", "Area", "Tool", "Owner", "Products", "Params", "Spec Viol.", "Latest Lot", "Status"].map(h =>
                    <th key={h} className="px-2 py-2 text-left whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, stats, productsUsing, status }) => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{p.order}</td>
                    <td className="px-2 py-1.5 font-mono">{p.id}</td>
                    <td className="px-2 py-1.5 font-medium">{p.name}</td>
                    <td className="px-2 py-1.5">{p.area}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px]">{p.toolGroup}</td>
                    <td className="px-2 py-1.5">{getOwner(p.ownerId)?.name ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right">{productsUsing}</td>
                    <td className="px-2 py-1.5 text-right">{p.parameters.length}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-semibold text-destructive">{stats.crit}</td>
                    <td className="px-2 py-1.5 font-mono text-[11px]">{stats.lastLot ?? "—"}</td>
                    <td className="px-2 py-1.5"><StatusDot status={status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Process × Product Family Heatmap</CardTitle>
          <p className="text-xs text-muted-foreground">Cell color = USL/LSL violation count for that process across lots of the family.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="text-[10px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-card px-2 py-1 text-left">Process</th>
                  {productFamilies.map(f => (
                    <th key={f.id} className="px-1 py-1 align-bottom" title={f.name}>
                      <div className="origin-bottom-left -rotate-45 whitespace-nowrap text-[9px]">{f.name}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap.map(row => (
                  <tr key={row.proc.id}>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-2 py-1 font-medium">{row.proc.order}. {row.proc.name}</td>
                    {row.cells.map(c => (
                      <td key={c.fam.id} className="p-0.5">
                        <div title={`${row.proc.name} · ${c.fam.name}: ${c.crit} violations`}
                          className="h-6 w-6 rounded"
                          style={{ background: c.crit === 0 ? "var(--muted)" : `color-mix(in oklab, var(--destructive) ${20 + c.intensity * 80}%, transparent)` }} />
                      </td>
                    ))}
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
