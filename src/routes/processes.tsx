import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, Fragment } from "react";
import { ChevronRight, Search, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusDot } from "@/components/page-header";
import { processes, owners, getOwner } from "@/lib/mock-data";

export const Route = createFileRoute("/processes")({
  head: () => ({ meta: [{ title: "Process Matrix — SNTTW Connect" }] }),
  component: ProcessMatrix,
});

type SortKey = "order" | "name" | "area" | "status";

function ProcessMatrix() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("order");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const areas = useMemo(() => ["all", ...Array.from(new Set(processes.map(p => p.area)))], []);

  const rows = useMemo(() => {
    let r = processes.filter(p => {
      const o = getOwner(p.ownerId);
      const hay = `${p.id} ${p.name} ${p.area} ${p.toolGroup} ${o?.name ?? ""} ${o?.email ?? ""}`.toLowerCase();
      return hay.includes(query.toLowerCase()) && (areaFilter === "all" || p.area === areaFilter);
    });
    r = [...r].sort((a, b) => {
      if (sort === "order") return a.order - b.order;
      if (sort === "status") {
        const w = { critical: 0, warning: 1, "owner-missing": 2, ok: 3 } as const;
        return (w as any)[a.status] - (w as any)[b.status];
      }
      return String(a[sort]).localeCompare(String(b[sort]));
    });
    return r;
  }, [query, sort, areaFilter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Matrix"
        subtitle={`${processes.length} of 50 processes active · max 100 parameters per process`}
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by process, owner, tool group…" className="pl-8" />
            </div>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              {areas.map(a => <option key={a} value={a}>{a === "all" ? "All areas" : a}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="order">Sort: Step order</option>
              <option value="name">Sort: Name</option>
              <option value="area">Sort: Area</option>
              <option value="status">Sort: Status (worst first)</option>
            </select>
            <Badge variant="outline" className="ml-auto">{rows.length} shown</Badge>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2"></th>
                  <th className="px-3 py-2 text-left">Process ID</th>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-right">#</th>
                  <th className="px-3 py-2 text-left">Area</th>
                  <th className="px-3 py-2 text-left">Tool Group</th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2 text-right">Params</th>
                  <th className="px-3 py-2 text-left">Latest Lot</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Last Violation</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const owner = getOwner(p.ownerId);
                  const isOpen = expanded === p.id;
                  return (
                    <Fragment key={p.id}>
                      <tr className="border-t border-border hover:bg-muted/30">
                        <td className="px-2 py-2">
                          <button onClick={() => setExpanded(isOpen ? null : p.id)} className="rounded p-1 hover:bg-muted">
                            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          </button>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.order}</td>
                        <td className="px-3 py-2">{p.area}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.toolGroup}</td>
                        <td className="px-3 py-2">
                          <div className="text-foreground">{owner?.name}</div>
                          <div className="text-xs text-muted-foreground">{owner?.email}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{p.parameters.length}</td>
                        <td className="px-3 py-2 font-mono text-xs">{p.latestLotId}</td>
                        <td className="px-3 py-2"><StatusDot status={p.status} /></td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.lastViolation ? new Date(p.lastViolation).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2">
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/spc" search={{ process: p.id } as any}>Open <ExternalLink className="ml-1 h-3 w-3" /></Link>
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-border bg-muted/20">
                          <td colSpan={12} className="p-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monitored parameters ({p.parameters.length})</div>
                            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                              {p.parameters.map(param => (
                                <Link key={param.id} to="/spc" search={{ process: p.id, parameter: param.id } as any} className="rounded-md border border-border bg-card p-2 text-xs hover:border-primary/40">
                                  <div className="font-medium text-foreground">{param.name}</div>
                                  <div className="font-mono text-[11px] text-muted-foreground">
                                    LSL {param.lsl} · USL {param.usl} {param.unit}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
