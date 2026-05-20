import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Database, Lock, RefreshCw, CheckCircle2, Server, KeyRound, Network, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mesStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/database")({
  head: () => ({ meta: [{ title: "Database Configuration — AKSPC" }] }),
  component: DatabaseConfig,
});

const requiredObjects = [
  { name: "products",              type: "view", required: ["product_id", "product_name", "family_id"] },
  { name: "product_families",      type: "view", required: ["family_id", "family_name", "group_id"] },
  { name: "product_groups",        type: "view", required: ["group_id", "group_name"] },
  { name: "lots",                  type: "view", required: ["lot_id", "product_id", "start_date", "current_step_id", "status"] },
  { name: "wafers",                type: "view", required: ["wafer_id", "lot_id", "slot", "status"] },
  { name: "process_flows",         type: "view", required: ["flow_id", "step_id", "order_no"] },
  { name: "process_steps",         type: "view", required: ["step_id", "step_name", "table_name", "area", "tool_group"] },
  { name: "process_owners",        type: "view", required: ["owner_id", "name", "email", "escalation_hours"] },
  { name: "process_measurements",  type: "view", required: ["measurement_time", "lot_id", "wafer_id", "step_id", "parameter_name", "measured_value", "lsl", "usl", "lcl", "ucl"] },
  { name: "final_test_results",    type: "view", required: ["lot_id", "wafer_id", "tester", "test_program", "bin", "pass", "tested_dies", "pass_dies"] },
  { name: "spec_violations",       type: "view", required: ["violation_id", "lot_id", "step_id", "parameter_name", "value", "direction", "severity"] },
  { name: "spc_warnings",          type: "view", required: ["warning_id", "lot_id", "step_id", "parameter_name"] },
  { name: "email_alerts",          type: "table", required: ["alert_id", "violation_id", "owner_id", "status", "sent_at"] },
  { name: "app_versions",          type: "table", required: ["version", "date", "summary"] },
];

function DatabaseConfig() {
  const [url, setUrl] = useState(mesStatus.supabaseUrl);
  const [key, setKey] = useState("eyJhbGciOi••••••••••••••••••••• (anon)");
  const [schema, setSchema] = useState(mesStatus.schema);
  const [mode, setMode] = useState(mesStatus.mode);
  const [testing, setTesting] = useState(false);

  function testConnection() {
    setTesting(true);
    setTimeout(() => setTesting(false), 900);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Configuration"
        subtitle="Connect AKSPC to a read-only Supabase / PostgreSQL view layer. The app must never write to MES production tables."
        actions={
          <Badge variant="outline" className="gap-1.5 border-success/40 bg-success/10 text-success">
            <CheckCircle2 className="h-3 w-3" /> {mode} · Read-only
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Connection</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Supabase Project URL" icon={Server} value={url} onChange={setUrl} placeholder="https://your-project.supabase.co" />
              <Field label="Anon Key (read-only)" icon={KeyRound} value={key} onChange={setKey} placeholder="anon JWT" />
              <Field label="Schema" icon={Network} value={schema} onChange={setSchema} placeholder="akspc_ro" />
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option>Mock</option><option>Supabase Test</option><option>Production</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <Button onClick={testConnection} disabled={testing} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${testing ? "animate-spin" : ""}`} /> {testing ? "Testing…" : "Test connection"}
              </Button>
              <Badge variant="outline" className="gap-1 text-muted-foreground"><RefreshCw className="h-3 w-3" /> Last sync {new Date(mesStatus.lastSync).toLocaleString()}</Badge>
              <Badge variant="outline" className="gap-1 border-primary/30 bg-primary/5 text-primary"><Lock className="h-3 w-3" /> RLS read-only</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Setup checklist</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-2 text-xs text-muted-foreground">
              {[
                "Create Supabase project.",
                "Create read-only database views in akspc_ro schema.",
                "Enable Row Level Security on all views.",
                "Use anon key only — never expose service role key.",
                "Map MES fields to AKSPC fields (see required objects).",
                "Test connection from this page.",
                "Validate sample lots via Lot Journey.",
                "Freeze schema version and deploy.",
              ].map((s, i) => (
                <li key={i} className="flex gap-2"><span className="font-mono font-semibold text-primary">{i + 1}.</span><span>{s}</span></li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Required Tables / Views</CardTitle>
          <p className="text-xs text-muted-foreground">All required objects must exist in <span className="font-mono">{schema}</span> and contain at minimum the listed fields. AKSPC reads only — never writes.</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>{["Object","Type","Required fields","Mapping","Status"].map(h => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {requiredObjects.map(o => (
                  <tr key={o.name} className="border-t border-border align-top">
                    <td className="px-2 py-1.5 font-mono">{schema}.{o.name}</td>
                    <td className="px-2 py-1.5"><Badge variant="outline" className="text-[10px]">{o.type}</Badge></td>
                    <td className="px-2 py-1.5 font-mono text-[10px] text-muted-foreground">{o.required.join(", ")}</td>
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary text-[10px]">Mapped</Badge>
                    </td>
                    <td className="px-2 py-1.5">
                      <Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px]">OK</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Schema Diagram</CardTitle></CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted/30 p-4 text-[11px] font-mono leading-relaxed">{`product_groups ──┐
                 ├─< product_families ──< products ──< lots ──< wafers
                                              │           │
                                              │           └─< process_measurements >── process_steps ──> process_owners
                                              │                       │
                                              │                       ├─< spec_violations (USL/LSL)  ──> email_alerts
                                              │                       └─< spc_warnings (UCL/LCL)
                                              └─< final_test_results (bin, parametric)`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: any }) {
  return (
    <div>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative mt-1">
        {Icon && <Icon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />}
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={Icon ? "pl-8 font-mono text-xs" : "font-mono text-xs"} />
      </div>
    </div>
  );
}
