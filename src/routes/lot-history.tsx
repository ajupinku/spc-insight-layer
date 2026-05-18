import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusDot } from "@/components/page-header";
import { processes, generateMeasurements, lots, getOwner, mesStatus } from "@/lib/mock-data";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, CartesianGrid, ReferenceDot,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/lot-history")({
  head: () => ({ meta: [{ title: "Lot History Recall — SNTTW Connect" }] }),
  component: LotHistory,
});

function LotHistory() {
  const [lotInput, setLotInput] = useState("LOT-0010");
  const [n, setN] = useState(5);
  const [confirmedLot, setConfirmedLot] = useState("LOT-0010");

  const { window, targetIdx } = useMemo(() => {
    const idx = lots.indexOf(confirmedLot);
    if (idx < 0) return { window: [] as string[], targetIdx: -1 };
    const start = Math.max(0, idx - n);
    const end = Math.min(lots.length, idx + n + 1);
    return { window: lots.slice(start, end), targetIdx: idx - start };
  }, [confirmedLot, n]);

  // Compute status per process for this lot window
  const journey = useMemo(() => processes.map(proc => {
    let critical = 0, warning = 0;
    for (const param of proc.parameters) {
      const ms = generateMeasurements(proc.id, param).filter(m => window.includes(m.lotId));
      for (const m of ms) {
        if (m.value > param.usl || m.value < param.lsl) critical++;
        else if (m.value > param.ucl || m.value < param.lcl) warning++;
      }
    }
    const status: "ok" | "warning" | "critical" = critical > 0 ? "critical" : warning > 0 ? "warning" : "ok";
    return { proc, status, critical, warning };
  }), [window]);

  function handleSearch() {
    const v = lotInput.trim().toUpperCase();
    if (lots.includes(v)) setConfirmedLot(v);
  }

  function exportPdf() {
    const doc = new jsPDF();
    // Cover
    doc.setFontSize(18); doc.text("Lot History Recall Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Lot: ${confirmedLot}`, 14, 32);
    doc.text(`Window: ${window[0]} → ${window[window.length - 1]} (N=${n} before/after)`, 14, 38);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 44);
    doc.text(`MES source: ${mesStatus.source}`, 14, 50);
    doc.setFont("helvetica", "italic"); doc.text("Read-only MES integration. This report is for investigation only.", 14, 56);
    doc.setFont("helvetica", "normal");

    // Summary table
    autoTable(doc, {
      startY: 64,
      head: [["Process", "Owner", "Critical (USL/LSL)", "Warning (UCL/LCL)", "Status"]],
      body: journey.map(j => {
        const o = getOwner(j.proc.ownerId);
        return [j.proc.name, o?.name ?? "—", j.critical, j.warning, j.status.toUpperCase()];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 90, 60] },
    });

    // Violations
    const rows: any[] = [];
    for (const proc of processes) {
      for (const param of proc.parameters) {
        const ms = generateMeasurements(proc.id, param).filter(m => window.includes(m.lotId));
        for (const m of ms) {
          if (m.value > param.usl || m.value < param.lsl) {
            rows.push([m.lotId, proc.name, param.name, m.value, param.lsl, param.usl, m.toolId, m.chamberId]);
          }
        }
      }
    }
    if (rows.length) {
      doc.addPage();
      doc.setFontSize(14); doc.text("USL / LSL Violations", 14, 18);
      autoTable(doc, {
        startY: 24,
        head: [["Lot", "Process", "Parameter", "Value", "LSL", "USL", "Tool", "Chamber"]],
        body: rows,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [180, 35, 35] },
      });
    }

    // Owners
    doc.addPage();
    doc.setFontSize(14); doc.text("Process Owners & Escalation", 14, 18);
    autoTable(doc, {
      startY: 24,
      head: [["Process", "Owner", "Email", "Backup", "Backup Email"]],
      body: journey.map(j => {
        const o = getOwner(j.proc.ownerId);
        return [j.proc.name, o?.name ?? "—", o?.email ?? "—", o?.backupName ?? "—", o?.backupEmail ?? "—"];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [44, 90, 60] },
    });

    doc.save(`lot-history-${confirmedLot}.pdf`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lot History Recall"
        subtitle="Recall target lot with N lots before and after across full process flow."
        actions={
          <Button onClick={exportPdf} className="gap-2">
            <FileText className="h-4 w-4" /> Export PDF Report
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Lot ID</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={lotInput} onChange={(e) => setLotInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="LOT-0010" className="pl-8 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">N (before & after)</label>
            <div className="mt-1 flex gap-1">
              {[5, 10, 20].map(v => (
                <Button key={v} type="button" size="sm" variant={n === v ? "default" : "outline"} onClick={() => setN(v)}>{v}</Button>
              ))}
              <Input type="number" min={1} max={100} value={n} onChange={(e) => setN(Math.max(1, Math.min(100, Number(e.target.value) || 5)))} className="w-20" />
            </div>
          </div>
          <Button onClick={handleSearch}>Recall</Button>
          <div className="ml-auto">
            <Badge variant="outline" className="font-mono">{window.length ? `${window[0]} → ${window[window.length - 1]}` : "—"}</Badge>
          </div>
        </CardContent>
      </Card>

      {window.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Process Journey · Lot {confirmedLot}</CardTitle>
              <p className="text-xs text-muted-foreground">Horizontal timeline. Click a process to see SPC charts for the lot window.</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {journey.map((j, idx) => (
                  <div key={j.proc.id} className="flex shrink-0 items-center">
                    <div className={`min-w-[170px] rounded-md border-l-4 bg-card p-3 shadow-sm ${
                      j.status === "critical" ? "border-l-destructive" : j.status === "warning" ? "border-l-warning" : "border-l-success"
                    }`}>
                      <div className="text-[10px] font-mono uppercase text-muted-foreground">{j.proc.id}</div>
                      <div className="text-sm font-semibold">{j.proc.name}</div>
                      <div className="mt-1"><StatusDot status={j.status} /></div>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {j.critical} spec · {j.warning} ctrl
                      </div>
                    </div>
                    {idx < journey.length - 1 && <div className="mx-1 h-px w-4 bg-border" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {journey.map(({ proc }) => (
              <ProcessTrendCard key={proc.id} proc={proc} window={window} targetIdx={targetIdx} targetLot={confirmedLot} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProcessTrendCard({ proc, window, targetIdx, targetLot }: { proc: typeof processes[number]; window: string[]; targetIdx: number; targetLot: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{proc.order}. {proc.name} <span className="font-mono text-xs text-muted-foreground">· {proc.id}</span></CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {proc.parameters.map(param => {
            const data = generateMeasurements(proc.id, param)
              .filter(m => window.includes(m.lotId))
              .map(m => ({ lot: m.lotId, value: m.value }));
            const target = data[targetIdx];
            return (
              <div key={param.id} className="rounded-md border border-border bg-background p-2">
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-foreground">{param.name}</span>
                  <span className="font-mono text-muted-foreground">{param.unit}</span>
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={data} margin={{ left: -20, right: 6, top: 4, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                    <XAxis dataKey="lot" hide />
                    <YAxis fontSize={9} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                    <ReferenceLine y={param.usl} stroke="var(--destructive)" strokeDasharray="4 3" />
                    <ReferenceLine y={param.lsl} stroke="var(--destructive)" strokeDasharray="4 3" />
                    <ReferenceLine y={param.ucl} stroke="var(--warning)" strokeDasharray="2 2" />
                    <ReferenceLine y={param.lcl} stroke="var(--warning)" strokeDasharray="2 2" />
                    <ReferenceLine x={targetLot} stroke="var(--primary)" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={1.2} dot={(p: any) => {
                      const v = p.payload.value;
                      const color = v > param.usl || v < param.lsl ? "var(--destructive)" : v > param.ucl || v < param.lcl ? "var(--warning)" : "var(--primary)";
                      return <circle key={p.index} cx={p.cx} cy={p.cy} r={2.5} fill={color} />;
                    }} />
                    {target && <ReferenceDot x={target.lot} y={target.value} r={4} fill="var(--foreground)" stroke="var(--background)" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
