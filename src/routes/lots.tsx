import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatusDot } from "@/components/page-header";
import {
  lots, visibleProcessSteps, generateMeasurements, getProcess, getProduct,
  getFamily, getGroup, getOwner, processStatusForLot, violations, lotYield, finalTestResults,
} from "@/lib/mock-data";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot, CartesianGrid } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/lots")({
  head: () => ({ meta: [{ title: "Lot Journey — AKSPC" }] }),
  component: LotJourney,
});

function LotJourney() {
  const [input, setInput] = useState("LOT-2026-0020");
  const [lotId, setLotId] = useState("LOT-2026-0020");
  const [window, setWindow] = useState(5);
  const [openStep, setOpenStep] = useState<string | null>(null);

  const lot = lots.find(l => l.id === lotId);
  const lotIds = lots.map(l => l.id);
  const lotIdx = lotIds.indexOf(lotId);
  const wStart = Math.max(0, lotIdx - window);
  const wEnd = Math.min(lotIds.length, lotIdx + window + 1);
  const lotWindow = lotIds.slice(wStart, wEnd);

  const product = lot ? getProduct(lot.productId) : null;
  const family = product ? getFamily(product.familyId) : null;
  const group = family ? getGroup(family.groupId) : null;
  const lotViolations = useMemo(() => violations.filter(v => v.lotId === lotId), [lotId]);
  const ft = finalTestResults.find(f => f.lotId === lotId);

  function handleSearch() {
    const v = input.trim().toUpperCase();
    if (lotIds.includes(v)) setLotId(v);
  }

  function exportReport() {
    if (!lot || !product) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("AKSPC — Lot Journey Report", 14, 20);
    doc.setFontSize(10); doc.setTextColor(110);
    doc.text(`Generated ${new Date().toLocaleString()} · Read-only from MES (Mock mode)`, 14, 27);
    doc.setTextColor(0);
    autoTable(doc, {
      startY: 34, theme: "plain",
      body: [
        ["Lot", lot.id, "Product", product.name],
        ["Family", family?.name ?? "—", "Group", group?.name ?? "—"],
        ["Current Step", getProcess(lot.currentStepId)?.name ?? "—", "Status", lot.status],
        ["Wafers", String(lot.wafers.length), "OK Wafers", String(lot.wafers.filter(w => w.status === "ok").length)],
        ["FT Yield", ft ? `${((ft.passDies / ft.testedDies) * 100).toFixed(2)}%` : "—",
         "Spec Violations", String(lotViolations.length)],
      ],
      styles: { fontSize: 10 },
    });
    autoTable(doc, {
      head: [["Order", "Process", "Status", "Owner", "USL/LSL Viol.", "UCL/LCL Warn."]],
      body: visibleProcessSteps.map(s => {
        const st = processStatusForLot(s.id, lotId);
        let crit = 0, warn = 0;
        for (const p of s.parameters) {
          const m = generateMeasurements(s.id, p).find(x => x.lotId === lotId);
          if (!m) continue;
          if (m.value > p.usl || m.value < p.lsl) crit++;
          else if (m.value > p.ucl || m.value < p.lcl) warn++;
        }
        return [s.order, s.name, st, getOwner(s.ownerId)?.name ?? "—", crit, warn];
      }),
      styles: { fontSize: 9 }, headStyles: { fillColor: [44, 90, 60] },
    });
    if (lotViolations.length) {
      doc.addPage();
      doc.setFontSize(14); doc.text("Spec Violations (USL/LSL)", 14, 18);
      autoTable(doc, {
        startY: 24,
        head: [["Process", "Parameter", "Value", "LSL", "USL", "Direction", "Severity", "Owner Email"]],
        body: lotViolations.map(v => {
          const proc = getProcess(v.processId)!;
          const param = proc.parameters.find(p => p.id === v.parameterId);
          return [proc.name, param?.name ?? "", v.value, v.lsl, v.usl,
                  v.direction === "above_usl" ? "Above USL" : "Below LSL",
                  v.severity, getOwner(v.ownerId)?.email ?? "—"];
        }),
        styles: { fontSize: 8 }, headStyles: { fillColor: [180, 35, 35] },
      });
    }
    doc.save(`AKSPC-LotJourney-${lot.id}.pdf`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lot Journey"
        subtitle="Trace any lot across the full process flow. Click a process card for parametric details."
        actions={lot && <Button onClick={exportReport} className="gap-2"><FileText className="h-4 w-4" /> Export PDF</Button>}
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[260px]">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lot ID</label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-8 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Context window (N before & after)</label>
            <div className="mt-1 flex gap-1">
              {[5, 10, 20].map(n => (
                <Button key={n} size="sm" variant={window === n ? "default" : "outline"} onClick={() => setWindow(n)}>{n}</Button>
              ))}
              <Input type="number" min={1} max={50} value={window} onChange={(e) => setWindow(Math.max(1, Math.min(50, +e.target.value || 5)))} className="w-20" />
            </div>
          </div>
          <Button onClick={handleSearch}>Recall lot</Button>
          {lotWindow.length > 0 && (
            <Badge variant="outline" className="ml-auto font-mono">{lotWindow[0]} → {lotWindow[lotWindow.length - 1]}</Badge>
          )}
        </CardContent>
      </Card>

      {!lot ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Lot not found in MES. Try one of: {lotIds.slice(0, 3).join(", ")}…</CardContent></Card>
      ) : (
        <>
          {/* Lot summary card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">{group?.name} · {family?.name}</div>
                  <h2 className="mt-1 font-mono text-2xl font-semibold">{lot.id}</h2>
                  <div className="mt-1 text-sm">{product?.name}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <Mini label="Current Step" value={getProcess(lot.currentStepId)?.name ?? "—"} />
                  <Mini label="Status" value={lot.status} />
                  <Mini label="Wafers" value={`${lot.wafers.filter(w => w.status === "ok").length}/${lot.wafers.length}`} />
                  <Mini label="Spec Viol." value={lotViolations.length} tone={lotViolations.length ? "danger" : "ok"} />
                  <Mini label="FT Yield" value={ft ? `${((ft.passDies / ft.testedDies) * 100).toFixed(1)}%` : "Pending"} tone="ok" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Process flow timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Process Flow · Lot {lot.id}</CardTitle>
              <p className="text-xs text-muted-foreground">Click any step for parametric details across {lotWindow.length} surrounding lots.</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 overflow-x-auto pb-2">
                {visibleProcessSteps.map((s, idx) => {
                  const status = processStatusForLot(s.id, lot.id);
                  let crit = 0, warn = 0;
                  for (const p of s.parameters) {
                    const m = generateMeasurements(s.id, p).find(x => x.lotId === lot.id);
                    if (!m) continue;
                    if (m.value > p.usl || m.value < p.lsl) crit++;
                    else if (m.value > p.ucl || m.value < p.lcl) warn++;
                  }
                  const borderCls =
                    status === "critical" ? "border-l-destructive" :
                    status === "warning" ? "border-l-warning" :
                    status === "pending" ? "border-l-muted-foreground/40" :
                    status === "not-measured" ? "border-l-muted" :
                    status === "owner-missing" ? "border-l-muted-foreground" : "border-l-success";
                  const isCurrent = s.id === lot.currentStepId;
                  return (
                    <div key={s.id} className="flex shrink-0 items-center">
                      <button onClick={() => setOpenStep(openStep === s.id ? null : s.id)}
                        className={`min-w-[180px] rounded-md border border-border border-l-4 bg-card p-3 text-left shadow-sm transition hover:bg-muted/40 ${borderCls} ${openStep === s.id ? "ring-2 ring-primary" : ""} ${isCurrent ? "outline outline-2 outline-primary/40" : ""}`}>
                        <div className="text-[9px] font-mono uppercase text-muted-foreground">{s.id} · #{s.order}</div>
                        <div className="text-xs font-semibold truncate">{s.name}</div>
                        <div className="mt-1"><StatusDot status={status === "pending" || status === "not-measured" ? "warning" : status} /></div>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                          <span>{s.parameters.length} params</span>
                          <span><span className="text-destructive">{crit}</span>/<span className="text-warning">{warn}</span></span>
                        </div>
                        <div className="mt-1 text-[10px] text-muted-foreground truncate">{getOwner(s.ownerId)?.name}</div>
                      </button>
                      {idx < visibleProcessSteps.length - 1 && <ArrowRight className="mx-0.5 h-3 w-3 shrink-0 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Process detail */}
          {openStep && (() => {
            const proc = getProcess(openStep)!;
            return (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{proc.order}. {proc.name} <span className="font-mono text-xs text-muted-foreground">· {proc.id} · {proc.tableName}</span></CardTitle>
                  <p className="text-xs text-muted-foreground">Tool: {proc.toolGroup} · Owner: {getOwner(proc.ownerId)?.name ?? "—"}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {proc.parameters.map(p => {
                      const data = generateMeasurements(proc.id, p)
                        .filter(m => lotWindow.includes(m.lotId))
                        .map(m => ({ lot: m.lotId.slice(-4), full: m.lotId, value: m.value }));
                      const targetPoint = data.find(d => d.full === lot.id);
                      const tm = generateMeasurements(proc.id, p).find(m => m.lotId === lot.id);
                      const status = !tm ? "not-measured" :
                        (tm.value > p.usl || tm.value < p.lsl) ? "critical" :
                        (tm.value > p.ucl || tm.value < p.lcl) ? "warning" : "ok";
                      return (
                        <div key={p.id} className="rounded-md border border-border bg-background p-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium">{p.name}</span>
                            <StatusDot status={status === "not-measured" ? "warning" : status} />
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            T={p.target}{p.unit} · LSL={p.lsl} · USL={p.usl}
                          </div>
                          <ResponsiveContainer width="100%" height={120}>
                            <LineChart data={data} margin={{ left: -22, right: 4, top: 8, bottom: 0 }}>
                              <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" />
                              <XAxis dataKey="lot" fontSize={9} stroke="var(--muted-foreground)" />
                              <YAxis fontSize={9} stroke="var(--muted-foreground)" domain={["auto", "auto"]} />
                              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }} />
                              <ReferenceLine y={p.usl} stroke="var(--destructive)" strokeDasharray="4 3" />
                              <ReferenceLine y={p.lsl} stroke="var(--destructive)" strokeDasharray="4 3" />
                              <ReferenceLine y={p.ucl} stroke="var(--warning)" strokeDasharray="2 2" />
                              <ReferenceLine y={p.lcl} stroke="var(--warning)" strokeDasharray="2 2" />
                              <ReferenceLine y={p.target} stroke="var(--success)" />
                              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={1.4} dot={false} />
                              {targetPoint && <ReferenceDot x={targetPoint.lot} y={targetPoint.value} r={4} fill="var(--foreground)" stroke="var(--background)" />}
                            </LineChart>
                          </ResponsiveContainer>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">Value @ {lot.id.slice(-4)}</span>
                            <span className={`font-mono font-semibold ${
                              status === "critical" ? "text-destructive" : status === "warning" ? "text-warning" : "text-foreground"
                            }`}>{tm ? `${tm.value} ${p.unit}` : "—"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}
    </div>
  );
}

function Mini({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "ok" | "warn" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : tone === "ok" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-sm font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
