// =============================================================================
// MOCK DATA LAYER
// -----------------------------------------------------------------------------
// This module simulates data that would come from MES via a read-only database
// view or REST API. Replace functions in `src/lib/data-source.ts` with real
// fetches when wiring to MES. Schema is intentionally aligned with the MES
// integration spec (see MES Connection Setup page).
// =============================================================================

export type Status = "ok" | "warning" | "critical" | "owner-missing";

export interface ProcessOwner {
  id: string;
  name: string;
  email: string;
  department: string;
  backupName: string;
  backupEmail: string;
  active: boolean;
}

export interface Parameter {
  id: string;
  name: string;
  unit: string;
  lsl: number;
  usl: number;
  lcl: number;
  ucl: number;
  target: number;
}

export interface Process {
  id: string;
  name: string;
  order: number;
  area: string;
  toolGroup: string;
  ownerId: string;
  parameters: Parameter[];
  latestLotId: string;
  status: Status;
  lastViolation: string | null;
  lastUpdated: string;
}

export interface Measurement {
  id: string;
  measurementTime: string;
  processId: string;
  parameterId: string;
  lotId: string;
  waferId: string;
  toolId: string;
  chamberId: string;
  recipeId: string;
  productId: string;
  value: number;
}

export interface Violation {
  id: string;
  lotId: string;
  processId: string;
  parameterId: string;
  value: number;
  lsl: number;
  usl: number;
  direction: "below_lsl" | "above_usl";
  severity: "high" | "medium" | "low";
  ownerId: string;
  emailStatus: "pending" | "sent" | "failed" | "acknowledged";
  timestamp: string;
}

// ---------- Owners ----------
export const owners: ProcessOwner[] = [
  { id: "OWN-01", name: "Dr. Mei Lin", email: "mei.lin@fab.example", department: "Diffusion", backupName: "Arun Patel", backupEmail: "arun.patel@fab.example", active: true },
  { id: "OWN-02", name: "Jonas Berg", email: "jonas.berg@fab.example", department: "Litho", backupName: "Sara Khan", backupEmail: "sara.khan@fab.example", active: true },
  { id: "OWN-03", name: "Hiroshi Tanaka", email: "h.tanaka@fab.example", department: "Etch & Thin Films", backupName: "Lena Müller", backupEmail: "lena.muller@fab.example", active: true },
];

// ---------- Parameter templates ----------
function mkParam(id: string, name: string, unit: string, target: number, spread: number): Parameter {
  return {
    id, name, unit, target,
    lsl: +(target - spread * 2).toFixed(3),
    usl: +(target + spread * 2).toFixed(3),
    lcl: +(target - spread * 1.2).toFixed(3),
    ucl: +(target + spread * 1.2).toFixed(3),
  };
}

const paramTemplates = (prefix: string): Parameter[] => [
  mkParam(`${prefix}-P1`, "Film Thickness", "Å", 1500, 25),
  mkParam(`${prefix}-P2`, "Sheet Resistance", "Ω/sq", 45, 1.5),
  mkParam(`${prefix}-P3`, "Refractive Index", "n", 1.46, 0.012),
  mkParam(`${prefix}-P4`, "Uniformity", "%", 1.8, 0.25),
  mkParam(`${prefix}-P5`, "CD Mean", "nm", 28, 0.6),
  mkParam(`${prefix}-P6`, "Overlay X", "nm", 0, 1.5),
  mkParam(`${prefix}-P7`, "Particle Adders", "#", 8, 2),
  mkParam(`${prefix}-P8`, "Stress", "MPa", -120, 15),
];

// ---------- Processes ----------
const processDefs = [
  { name: "Wet Clean", area: "Diffusion", toolGroup: "DNS-FC3000", owner: "OWN-01" },
  { name: "Gate Oxidation", area: "Diffusion", toolGroup: "TEL-Indy", owner: "OWN-01" },
  { name: "Poly Deposition", area: "Thin Films", toolGroup: "AMAT-Centura", owner: "OWN-03" },
  { name: "Photolithography", area: "Litho", toolGroup: "ASML-NXT2050i", owner: "OWN-02" },
  { name: "Develop", area: "Litho", toolGroup: "TEL-Lithius", owner: "OWN-02" },
  { name: "Gate Etch", area: "Etch", toolGroup: "LAM-Kiyo", owner: "OWN-03" },
  { name: "Ion Implant", area: "Implant", toolGroup: "AMAT-VIISta", owner: "OWN-01" },
  { name: "RTA Anneal", area: "Diffusion", toolGroup: "AMAT-Vantage", owner: "OWN-01" },
  { name: "Metal Deposition", area: "Thin Films", toolGroup: "AMAT-Endura", owner: "OWN-03" },
  { name: "CMP Tungsten", area: "CMP", toolGroup: "AMAT-Reflexion", owner: "OWN-03" },
];

export const processes: Process[] = processDefs.map((p, i) => {
  const id = `PRC-${String(i + 1).padStart(3, "0")}`;
  const statuses: Status[] = ["ok", "ok", "warning", "ok", "critical", "ok", "warning", "ok", "ok", "ok"];
  return {
    id,
    name: p.name,
    order: i + 1,
    area: p.area,
    toolGroup: p.toolGroup,
    ownerId: p.owner,
    parameters: paramTemplates(id),
    latestLotId: "LOT-0020",
    status: statuses[i],
    lastViolation: statuses[i] === "ok" ? null : "2026-05-18T08:24:00Z",
    lastUpdated: "2026-05-18T11:47:00Z",
  };
});

// ---------- Lots ----------
export const lots: string[] = Array.from({ length: 20 }, (_, i) => `LOT-${String(i + 1).padStart(4, "0")}`);

// ---------- Measurements (generated deterministically) ----------
function seedRand(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function generateMeasurements(processId: string, parameter: Parameter): Measurement[] {
  const rnd = seedRand(
    processId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +
      parameter.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  );
  const sigma = (parameter.usl - parameter.lsl) / 8;
  return lots.map((lotId, i) => {
    // Box-Muller
    const u1 = Math.max(rnd(), 1e-9);
    const u2 = rnd();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let value = parameter.target + z * sigma;
    // Inject some excursions
    if ((i + processId.charCodeAt(4)) % 11 === 0) value = parameter.usl + sigma * 0.4;
    if ((i + processId.charCodeAt(5)) % 13 === 0) value = parameter.lsl - sigma * 0.3;
    return {
      id: `${processId}-${parameter.id}-${lotId}`,
      measurementTime: new Date(Date.now() - (20 - i) * 3600 * 1000 * 6).toISOString(),
      processId,
      parameterId: parameter.id,
      lotId,
      waferId: `W${(i % 25) + 1}`,
      toolId: `${processes.find((p) => p.id === processId)?.toolGroup.split("-")[0]}-${(i % 3) + 1}`,
      chamberId: `CH${(i % 4) + 1}`,
      recipeId: `RCP-${parameter.id.slice(-2)}`,
      productId: "PROD-A1",
      value: +value.toFixed(3),
    };
  });
}

// ---------- Violations (USL/LSL only) ----------
export function computeViolations(): Violation[] {
  const out: Violation[] = [];
  for (const proc of processes) {
    for (const param of proc.parameters) {
      const ms = generateMeasurements(proc.id, param);
      for (const m of ms) {
        if (m.value > param.usl || m.value < param.lsl) {
          const dir = m.value > param.usl ? "above_usl" : "below_lsl";
          const distance = dir === "above_usl" ? (m.value - param.usl) / (param.usl - param.target) : (param.lsl - m.value) / (param.target - param.lsl);
          out.push({
            id: `V-${out.length + 1}`,
            lotId: m.lotId,
            processId: proc.id,
            parameterId: param.id,
            value: m.value,
            lsl: param.lsl,
            usl: param.usl,
            direction: dir,
            severity: distance > 0.4 ? "high" : distance > 0.15 ? "medium" : "low",
            ownerId: proc.ownerId,
            emailStatus: (["sent", "sent", "pending", "acknowledged", "failed"] as const)[out.length % 5],
            timestamp: m.measurementTime,
          });
        }
      }
    }
  }
  return out;
}

export const violations = computeViolations();

// ---------- Helpers ----------
export const getOwner = (id: string) => owners.find((o) => o.id === id);
export const getProcess = (id: string) => processes.find((p) => p.id === id);

export const mesStatus = {
  connected: true,
  readOnly: true,
  lastSync: new Date().toISOString(),
  source: "PostgreSQL view: mes.spc_measurements_v",
};

// Capability indices for a series given spec limits
export function capability(values: number[], lsl: number, usl: number) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1 || 1);
  const sd = Math.sqrt(variance);
  const cp = (usl - lsl) / (6 * sd || 1e-9);
  const cpu = (usl - mean) / (3 * sd || 1e-9);
  const cpl = (mean - lsl) / (3 * sd || 1e-9);
  const cpk = Math.min(cpu, cpl);
  // Pp/Ppk use overall SD; with single subgroup equals Cp/Cpk
  return { mean, sd, cp, cpk, pp: cp, ppk: cpk };
}
