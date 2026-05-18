import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Database, RefreshCw, Activity, ShieldAlert, Mail, History, FileText, Wrench } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help & Workflow Guide — SNTTW Connect" }] }),
  component: Help,
});

const steps = [
  { icon: Database, title: "MES read-only data source", desc: "Connect to MES PostgreSQL view, Supabase schema, REST API, or CSV." },
  { icon: RefreshCw, title: "SNTTW Connect sync", desc: "Pull new measurements at configured frequency. No write-back." },
  { icon: Activity, title: "SPC calculation", desc: "Per process & parameter: Xbar, R, S, I-chart, capability (Cp, Cpk, Pp, Ppk)." },
  { icon: ShieldAlert, title: "USL/LSL violation detection", desc: "Specification violations flagged red. Severity scored by distance to target." },
  { icon: Mail, title: "Email to Process Owner", desc: "USL/LSL only. Cooldown + dedup. Escalation to backup if not acknowledged." },
  { icon: History, title: "Lot History Recall", desc: "Pick a Lot, recall N lots before/after across full process flow." },
  { icon: FileText, title: "PDF investigation report", desc: "Cover + summary + per-process + violations + owners/escalation." },
  { icon: Wrench, title: "Engineering action outside tool", desc: "SNTTW Connect informs; corrective actions remain in MES / engineering systems." },
];

export default function _() {}

function Help() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help & Workflow Guide" subtitle="How SNTTW Connect fits between MES and your engineering workflow." />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">End-to-end workflow</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {steps.map((s, i) => (
              <div key={i} className="flex shrink-0 items-center">
                <div className="w-[200px] rounded-md border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary"><s.icon className="h-4 w-4" /></div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Step {i + 1}</div>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.desc}</div>
                </div>
                {i < steps.length - 1 && <div className="mx-1 text-muted-foreground">→</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FaqCard
          title="USL/LSL vs UCL/LCL — why they're not the same"
          items={[
            ["USL / LSL", "Product specification limits. Crossing them means a real spec violation. Emails the process owner."],
            ["UCL / LCL", "Statistical control limits derived from process variability. Crossing them is a process drift warning. SPC view only — no email by default."],
            ["Recommendation", "Keep email alerts on USL/LSL only. Enable UCL/LCL email only if your team explicitly wants control-limit notifications."],
          ]}
        />
        <FaqCard
          title="Lot History Recall — how the window works"
          items={[
            ["Default N", "5 lots before and 5 lots after the target lot."],
            ["Edge cases", "If the target is the newest lot, only previous lots show. If the oldest, only following lots show. Partial windows are normal — they never block the report."],
            ["Process journey", "Horizontal timeline of every process; each card shows OK/Warning/Critical for that lot window."],
          ]}
        />
        <FaqCard
          title="Owner assignment & escalation"
          items={[
            ["Required", "Each active process must have a named owner with email, department, and backup."],
            ["Missing owner", "Process shows 'Owner missing'. Email alerts cannot fire until assigned."],
            ["Escalation", "If owner does not acknowledge within the configured time, alert is escalated to the backup owner."],
          ]}
        />
        <FaqCard
          title="Validating before production use"
          items={[
            ["1. MES test", "Run 'Test connection' on MES Setup. Confirm all 20 required fields are mapped."],
            ["2. Read-only", "Verify the read-only badge is on every page header. Production tables must remain untouched."],
            ["3. Owner coverage", "Open Process Owner Management — no 'Owner missing' badges should remain."],
            ["4. Alert rules", "Set cooldown + escalation. Send a controlled test violation through the MES staging view."],
            ["5. Audit log", "Confirm sync, email, and config events appear in Validation & Audit Log."],
          ]}
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-xs">
          <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">Capacity</Badge>
          <span>Up to <b>50 processes</b> · up to <b>100 parameters per process</b> · scales horizontally.</span>
          <span className="ml-auto text-muted-foreground">SNTTW Connect — Read-only SPC intelligence layer for MES.</span>
        </CardContent>
      </Card>
    </div>
  );
}

function FaqCard({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent>
        <dl className="space-y-3 text-sm">
          {items.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-primary">{k}</dt>
              <dd className="mt-0.5 text-muted-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
