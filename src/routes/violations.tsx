import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, MailCheck, Search, Send, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { violations, getProcess, getOwner } from "@/lib/mock-data";

export const Route = createFileRoute("/violations")({
  head: () => ({ meta: [{ title: "Spec Violation Center — SNTTW Connect" }] }),
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
  const [list, setList] = useState(violations);

  const rows = useMemo(() => {
    let r = list.filter(v => {
      const proc = getProcess(v.processId);
      const owner = getOwner(v.ownerId);
      const param = proc?.parameters.find(p => p.id === v.parameterId);
      const hay = `${v.id} ${v.lotId} ${proc?.name} ${param?.name} ${owner?.name} ${owner?.email}`.toLowerCase();
      return hay.includes(q.toLowerCase()) && (filter === "all" || v.emailStatus === filter);
    });
    r = [...r].sort((a, b) => sortDesc ? +new Date(b.timestamp) - +new Date(a.timestamp) : +new Date(a.timestamp) - +new Date(b.timestamp));
    return r;
  }, [list, q, filter, sortDesc]);

  function resend(id: string) {
    setList(prev => prev.map(v => v.id === id ? { ...v, emailStatus: "sent" } : v));
    // TODO: call backend sendOwnerSpecViolationEmail(violation)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Spec Violation Center"
        subtitle="USL / LSL violations only. UCL/LCL warnings are tracked in Parameter SPC."
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[260px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lot, process, parameter, owner…" className="pl-8" />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="all">All email statuses</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setSortDesc(s => !s)} className="gap-1"><ArrowUpDown className="h-3 w-3" /> Time</Button>
            <Badge variant="outline" className="ml-auto">{rows.length} violations</Badge>
          </div>

          <div className="mt-4 overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["ID","Lot","Process","Parameter","Value","LSL","USL","Direction","Severity","Owner","Email","Time","Actions"].map(h =>
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(v => {
                  const proc = getProcess(v.processId)!;
                  const param = proc.parameters.find(p => p.id === v.parameterId)!;
                  const owner = getOwner(v.ownerId)!;
                  return (
                    <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{v.id}</td>
                      <td className="px-3 py-2 font-mono text-xs">{v.lotId}</td>
                      <td className="px-3 py-2">{proc.name}</td>
                      <td className="px-3 py-2">{param.name}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-destructive">{v.value}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{v.lsl}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{v.usl}</td>
                      <td className="px-3 py-2 text-xs">{v.direction === "above_usl" ? "Above USL" : "Below LSL"}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={
                          v.severity === "high" ? "border-destructive/40 bg-destructive/10 text-destructive" :
                          v.severity === "medium" ? "border-warning/40 bg-warning/10 text-warning" :
                          "border-muted text-muted-foreground"
                        }>{v.severity}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div>{owner.name}</div>
                        <div className="text-[11px] text-muted-foreground">{owner.email}</div>
                      </td>
                      <td className="px-3 py-2">{statusBadge(v.emailStatus)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(v.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link to="/lot-history">View <ExternalLink className="ml-1 h-3 w-3" /></Link>
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
