import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { processes, owners as initialOwners, getOwner } from "@/lib/mock-data";
import { UserPlus, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/owners")({
  head: () => ({ meta: [{ title: "Process Owner Management — SNTTW Connect" }] }),
  component: OwnerMgmt,
});

function OwnerMgmt() {
  const [owners, setOwners] = useState(initialOwners);
  const [assignments, setAssignments] = useState(() => Object.fromEntries(processes.map(p => [p.id, p.ownerId])) as Record<string, string>);

  function update(id: string, patch: Partial<typeof owners[number]>) {
    setOwners(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  }

  const orphans = useMemo(() => processes.filter(p => !assignments[p.id]).length, [assignments]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Process Owner Management"
        subtitle="Every active process must have an owner. Owners receive USL/LSL email alerts."
        actions={<Badge variant="outline" className={orphans ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-success/40 bg-success/10 text-success"}>
          {orphans ? <><AlertTriangle className="mr-1 h-3 w-3" /> {orphans} processes missing owner</> : "All processes have owners"}
        </Badge>}
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">Owners ({owners.length})</div>
            <Button size="sm" variant="outline" className="gap-1"><UserPlus className="h-3 w-3" /> Add owner</Button>
          </div>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["ID","Name","Email","Department","Backup Name","Backup Email","Active"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {owners.map(o => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                    <td className="px-3 py-2"><Input value={o.name} onChange={(e) => update(o.id, { name: e.target.value })} className="h-8" /></td>
                    <td className="px-3 py-2"><Input type="email" value={o.email} onChange={(e) => update(o.id, { email: e.target.value })} className="h-8" /></td>
                    <td className="px-3 py-2"><Input value={o.department} onChange={(e) => update(o.id, { department: e.target.value })} className="h-8" /></td>
                    <td className="px-3 py-2"><Input value={o.backupName} onChange={(e) => update(o.id, { backupName: e.target.value })} className="h-8" /></td>
                    <td className="px-3 py-2"><Input type="email" value={o.backupEmail} onChange={(e) => update(o.id, { backupEmail: e.target.value })} className="h-8" /></td>
                    <td className="px-3 py-2"><input type="checkbox" checked={o.active} onChange={(e) => update(o.id, { active: e.target.checked })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">Process → Owner Assignment</div>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Process ID","Process Name","Area","Owner","Email","Status"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {processes.map(p => {
                  const owner = getOwner(assignments[p.id]);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2">{p.area}</td>
                      <td className="px-3 py-2">
                        <select value={assignments[p.id] ?? ""} onChange={(e) => setAssignments(a => ({ ...a, [p.id]: e.target.value }))} className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                          <option value="">— unassigned —</option>
                          {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{owner?.email ?? "—"}</td>
                      <td className="px-3 py-2">
                        {!owner ? <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">Owner missing</Badge>
                         : !owner.active ? <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">Inactive</Badge>
                         : <Badge variant="outline" className="border-success/40 bg-success/10 text-success">OK</Badge>}
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
