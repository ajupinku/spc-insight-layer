import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { mesStatus } from "@/lib/mock-data";
import { Lock, CheckCircle2, Database } from "lucide-react";

export const Route = createFileRoute("/mes")({
  head: () => ({ meta: [{ title: "MES Connection Setup — SNTTW Connect" }] }),
  component: MesSetup,
});

const REQUIRED_FIELDS = [
  "measurement_time","process_id","process_name","process_order","parameter_id","parameter_name",
  "lot_id","wafer_id","tool_id","chamber_id","recipe_id","product_id",
  "measured_value","unit","lsl","usl","ucl","lcl","target","owner_email",
];

function MesSetup() {
  const [connType, setConnType] = useState<"postgres" | "supabase" | "rest" | "csv">("postgres");
  const [view, setView] = useState("mes.spc_measurements_v");
  const [freq, setFreq] = useState(60);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function testConnection() {
    setTesting(true); setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult("OK · 20 sample rows read · all required fields present");
    }, 900);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="MES Connection Setup"
        subtitle="Read-only by design. SNTTW Connect never writes back to MES production tables."
        actions={<Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary gap-1"><Lock className="h-3 w-3" /> Read-only enforced</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Connection</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Field label="Connection type">
              <select value={connType} onChange={(e) => setConnType(e.target.value as any)} className="h-9 w-full rounded-md border border-input bg-background px-2">
                <option value="postgres">PostgreSQL (direct view)</option>
                <option value="supabase">Supabase (read-only schema)</option>
                <option value="rest">REST API (MES gateway)</option>
                <option value="csv">CSV simulation (offline)</option>
              </select>
            </Field>
            <Field label="Database view / endpoint">
              <Input value={view} onChange={(e) => setView(e.target.value)} className="font-mono" />
            </Field>
            <Field label="Read-only mode">
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                <span className="text-xs text-muted-foreground">Permanently enforced. UI cannot disable.</span>
                <Badge className="bg-primary text-primary-foreground gap-1"><Lock className="h-3 w-3" /> ON</Badge>
              </div>
            </Field>
            <Field label="Sync frequency (seconds)">
              <Input type="number" value={freq} onChange={(e) => setFreq(Number(e.target.value))} />
            </Field>
            <div className="flex items-center gap-2">
              <Button onClick={testConnection} disabled={testing}>{testing ? "Testing…" : "Test connection"}</Button>
              {testResult && <span className="text-xs text-success flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {testResult}</span>}
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs">
              <div className="font-medium">Last successful sync</div>
              <div className="font-mono text-muted-foreground">{new Date(mesStatus.lastSync).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Data Mapping Preview</CardTitle>
            <p className="text-xs text-muted-foreground">Required minimum fields. Map each MES column → SNTTW field.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">SNTTW Field</th><th className="px-3 py-2 text-left">MES Source Column</th><th className="px-3 py-2 text-left">Status</th></tr>
                </thead>
                <tbody>
                  {REQUIRED_FIELDS.map(f => (
                    <tr key={f} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono text-xs">{f}</td>
                      <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{f}</td>
                      <td className="px-3 py-1.5"><Badge variant="outline" className="border-success/40 bg-success/10 text-success text-[10px]">Mapped</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
