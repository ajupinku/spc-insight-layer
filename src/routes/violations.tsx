import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, MailCheck, Search, Send, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { violations as initialViolations, getProcess, getOwner, getProduct, getFamily } from "@/lib/mock-data";

export const Route = createFileRoute("/violations")({
  head: () => ({ meta: [{ title: "Spec Violation Center — AKSPC" }] }),
  component: ViolationCenter,
});

function statusBadge(s: string) {
  const map: Record<string, string> = {
    sent: "border-success/40 bg-success/10 text-success",
    pending: "border-warning/40 bg-warning/10 text-warning",
    failed: "border-destructive/40 bg-destructive/10 text-destructive",
    acknowledged: "border-primary/40 bg-primary/10 text-primary",
  };
  return <Badge variant="outline" className={`${map[s] ?? ""} text-[10px]`}>{s}</Badge>;
}

function ViolationCenter() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "sent" | "pending" | "failed" | "acknowledged">("all");
  const [sortDesc, setSortDesc] = useState(true);
  const [list, setList] = useState(initialViolations);

  const rows = useMemo(() => {
    let r = list.filter(v => {
      const proc = getProcess(v.processId);
      const owner = getOwner(v.ownerId);
      const param = proc?.parameters.find(p => p.id === v.parameterId);
      const product = getProduct(v.productId);
      const hay = `${v.id} ${v.lotId} ${proc?.name} ${param?.name} ${owner?.name} ${owner?.email} ${product?.name}`.toLowerCase();
      return hay.includes(q.toLowerCase()) && (filter === "all" || v.emailStatus === filter);
    });
    r = [...r].sort((a, b) => sortDesc ? +new Date(b.timestamp) - +new Date(a.timestamp) : +new Date(a.timestamp) - +new Date(b.timestamp));
    return r;
  }, [list, q, filter, sortDesc]);

  function resend(id: string) {
    setList(prev => prev.map(v => v.id === id ? { ...v, emailStatus: "sent" } : v));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Spec Violation Center" subtitle="USL/LSL violations only · trigger owner emails. UCL/LCL warnings live in Parameter SPC." />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lot, product, process, owner…" className="pl-8" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="all">All email statuses</option>
              <option value="sent">Sent</option><option value="pending">Pending</option>
              <option value="failed">Failed</option><option value="acknowledged">Acknowledged</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setSortDesc(s => !s)} className="gap-1"><ArrowUpDown className="h-3 w-3" /> Time</Button>
            <Badge variant="outline" className="ml-auto">{rows.length} violations</Badge>
          </div>

          <div className="mt-4 overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["ID","Lot","Product","Family","Process","Parameter","Value","LSL","USL","Dir.","Sev.","Owner","Email","Time","Acts"].map(h =>
                    <th key={h} className="px-2 py-1.5 text-left whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(v => {
                  const proc = getProcess(v.processId)!;
                  const param = proc.parameters.find(p => p.id === v.parameterId)!;
                  const owner = getOwner(v.ownerId)!;
                  const product = getProduct(v.productId);
                  const family = product ? getFamily(product.familyId) : null;
                  return (
                    <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-mono">{v.id}</td>
                      <td className="px-2 py-1.5 font-mono">{v.lotId}</td>
                      <td className="px-2 py-1.5 truncate max-w-[160px]">{product?.name ?? "—"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground truncate max-w-[120px]">{family?.name ?? "—"}</td>
                      <td className="px-2 py-1.5">{proc.name}</td>
                      <td className="px-2 py-1.5">{param.name}</td>
                      <td className="px-2 py-1.5 font-mono font-semibold text-destructive">{v.value}</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{v.lsl}</td>
                      <td className="px-2 py-1.5 font-mono text-muted-foreground">{v.usl}</td>
                      <td className="px-2 py-1.5">{v.direction === "above_usl" ? "↑USL" : "↓LSL"}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className={
                          v.severity === "high" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                          v.severity === "medium" ? "border-warning/40 bg-warning/10 text-warning" :
                          "border-muted text-muted-foreground"
                        }>{v.severity}</Badge>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="font-medium">{owner.name}</div>
                        <div className="text-[10px] text-muted-foreground">{owner.email || "—"}</div>
                      </td>
                      <td className="px-2 py-1.5">{statusBadge(v.emailStatus)}</td>
                      <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{new Date(v.timestamp).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link to="/lots">Journey<ExternalLink className="ml-1 h-3 w-3" /></Link>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => resend(v.id)}>
                            {v.emailStatus === "sent" ? <MailCheck className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                          </Button>
                        </div>
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
