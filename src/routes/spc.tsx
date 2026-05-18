import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { processes, generateMeasurements, capability, getProcess } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, BarChart, Bar, Cell, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/spc")({
  head: () => ({ meta: [{ title: "Parameter SPC — SNTTW Connect" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    process: (s.process as string) || processes[0].id,
    parameter: (s.parameter as string) || "",
  }),
  component: SpcPage,
});

function exportCSV(filename: string, rows: any[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function SpcPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [processId, setProcessId] = useState(search.process);
  const proc = getProcess(processId)!;
  const [parameterId, setParameterId] = useState(search.parameter || proc.parameters[0].id);
  const param = proc.parameters.find(p => p.id === parameterId) ?? proc.parameters[0];

  const measurements = useMemo(() => generateMeasurements(processId, param), [processId, param.id]);
  const cap = useMemo(() => capability(measurements.map(m => m.value), param.lsl, param.usl), [measurements, param]);

  // Subgroup of size 5 across lots' wafers — for prototype, treat consecutive 5 lots as subgroups
  const subgroups = useMemo(() => {
    const out: { label: string; mean: number; range: number; sd: number }[] = [];
    for (let i = 0; i < measurements.length; i += 5) {
      const g = measurements.slice(i, i + 5);
      if (g.length < 2) break;
      const vals = g.map(x => x.value);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (vals.length - 1);
      out.push({ label: `${g[0].lotId}…${g[g.length - 1].lotId.slice(-2)}`, mean, range: Math.max(...vals) - Math.min(...vals), sd: Math.sqrt(variance) });
    }
    return out;
  }, [measurements]);

  const histogram = useMemo(() => {
    const min = Math.min(param.lsl, ...measurements.map(m => m.value));
    const max = Math.max(param.usl, ...measurements.map(m => m.value));
    const bins = 12;
    const w = (max - min) / bins;
    const arr = Array.from({ length: bins }, (_, i) => ({ x: +(min + i * w + w / 2).toFixed(2), count: 0 }));
    for (const m of measurements) {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor((m.value - min) / w)));
      arr[idx].count++;
    }
    return arr;
  }, [measurements, param]);

  const pointColor = (v: number) => {
    if (v > param.usl || v < param.lsl) return "var(--destructive)";
    if (v > param.ucl || v < param.lcl) return "var(--warning)";
    return "var(--primary)";
  };

  const series = measurements.map(m => ({ lot: m.lotId, value: m.value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parameter SPC"
        subtitle={`${proc.name} · ${param.name} (${param.unit})`}
        actions={
          <Button variant="outline" size="sm" onClick={() => exportCSV(`${proc.id}-${param.id}.csv`, measurements)}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <select value={processId} onChange={(e) => { setProcessId(e.target.value); const np = getProcess(e.target.value)!; setParameterId(np.parameters[0].id); navigate({ search: { process: e.target.value, parameter: np.parameters[0].id } as any }); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {processes.map(p => <option key={p.id} value={p.id}>{p.order}. {p.name}</option>)}
          </select>
          <select value={param.id} onChange={(e) => { setParameterId(e.target.value); navigate({ search: { process: processId, parameter: e.target.value } as any }); }} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {proc.parameters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-destructive font-mono">LSL {param.lsl} · USL {param.usl}</Badge>
            <Badge variant="outline" className="border-warning/40 bg-warning/5 text-warning font-mono">LCL {param.lcl} · UCL {param.ucl}</Badge>
            <Badge variant="outline" className="border-success/40 bg-success/5 text-success font-mono">Target {param.target}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {[
          { label: "Cp", value: cap.cp }, { label: "Cpk", value: cap.cpk },
          { label: "Pp", value: cap.pp }, { label: "Ppk", value: cap.ppk },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <div className={`mt-1 font-mono text-2xl font-semibold ${c.value < 1 ? "text-destructive" : c.value < 1.33 ? "text-warning" : "text-success"}`}>{c.value.toFixed(2)}</div>
              <div className="text-[11px] text-muted-foreground">{c.value < 1 ? "Incapable" : c.value < 1.33 ? "Marginal" : "Capable"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Individual Trend (I-chart)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ left: 6, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="lot" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} domain={["auto", "auto"]} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={param.target} stroke="var(--success)" strokeWidth={1.5} label={{ value: "Target", fontSize: 10, fill: "var(--success)", position: "right" }} />
              <ReferenceLine y={param.usl} stroke="var(--destructive)" strokeDasharray="6 4" label={{ value: "USL", fontSize: 10, fill: "var(--destructive)", position: "right" }} />
              <ReferenceLine y={param.lsl} stroke="var(--destructive)" strokeDasharray="6 4" label={{ value: "LSL", fontSize: 10, fill: "var(--destructive)", position: "right" }} />
              <ReferenceLine y={param.ucl} stroke="var(--warning)" strokeDasharray="3 3" label={{ value: "UCL", fontSize: 10, fill: "var(--warning)", position: "right" }} />
              <ReferenceLine y={param.lcl} stroke="var(--warning)" strokeDasharray="3 3" label={{ value: "LCL", fontSize: 10, fill: "var(--warning)", position: "right" }} />
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={1.5} dot={(props: any) => <circle key={props.index} cx={props.cx} cy={props.cy} r={3.5} fill={pointColor(props.payload.value)} />} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Xbar Chart (subgroup means)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={subgroups} margin={{ left: 6, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={param.target} stroke="var(--success)" />
              <ReferenceLine y={param.usl} stroke="var(--destructive)" strokeDasharray="6 4" />
              <ReferenceLine y={param.lsl} stroke="var(--destructive)" strokeDasharray="6 4" />
              <ReferenceLine y={param.ucl} stroke="var(--warning)" strokeDasharray="3 3" />
              <ReferenceLine y={param.lcl} stroke="var(--warning)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="mean" stroke="var(--primary)" strokeWidth={1.8} dot={{ r: 3, fill: "var(--primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="R Chart (subgroup range)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={subgroups} margin={{ left: 6, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="range" stroke="var(--primary)" strokeWidth={1.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="S Chart (subgroup std-dev)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={subgroups} margin={{ left: 6, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="sd" stroke="var(--primary)" strokeWidth={1.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Histogram with Spec & Control Limits" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={histogram} margin={{ left: 6, right: 16, top: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="x" stroke="var(--muted-foreground)" fontSize={10} />
              <YAxis stroke="var(--muted-foreground)" fontSize={10} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine x={param.lsl} stroke="var(--destructive)" strokeDasharray="6 4" />
              <ReferenceLine x={param.usl} stroke="var(--destructive)" strokeDasharray="6 4" />
              <ReferenceLine x={param.lcl} stroke="var(--warning)" strokeDasharray="3 3" />
              <ReferenceLine x={param.ucl} stroke="var(--warning)" strokeDasharray="3 3" />
              <ReferenceLine x={param.target} stroke="var(--success)" />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histogram.map((h, i) => <Cell key={i} fill={h.x > param.usl || h.x < param.lsl ? "var(--destructive)" : h.x > param.ucl || h.x < param.lcl ? "var(--warning)" : "var(--primary)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Latest Measurements</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 uppercase tracking-wider text-[10px] text-muted-foreground">
                <tr>
                  {["Time","Lot","Wafer","Tool","Chamber","Recipe","Product","Value","Status"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="font-mono">
                {measurements.slice().reverse().slice(0, 12).map(m => {
                  const violated = m.value > param.usl || m.value < param.lsl;
                  const warn = !violated && (m.value > param.ucl || m.value < param.lcl);
                  return (
                    <tr key={m.id} className={`border-t border-border ${violated ? "bg-destructive/5" : warn ? "bg-warning/5" : ""}`}>
                      <td className="px-3 py-1.5">{new Date(m.measurementTime).toLocaleString()}</td>
                      <td className="px-3 py-1.5">{m.lotId}</td>
                      <td className="px-3 py-1.5">{m.waferId}</td>
                      <td className="px-3 py-1.5">{m.toolId}</td>
                      <td className="px-3 py-1.5">{m.chamberId}</td>
                      <td className="px-3 py-1.5">{m.recipeId}</td>
                      <td className="px-3 py-1.5">{m.productId}</td>
                      <td className={`px-3 py-1.5 font-semibold ${violated ? "text-destructive" : warn ? "text-warning" : "text-foreground"}`}>{m.value}</td>
                      <td className="px-3 py-1.5">{violated ? "Spec Violation" : warn ? "Control Warning" : "OK"}</td>
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

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
