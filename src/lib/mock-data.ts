// =============================================================================
// AKSPC MOCK DATA LAYER
// Power-semiconductor SPC + Final Test Yield architecture.
// Hierarchy: Product Group → Family → Product → Lot → Wafer
// Flow: Process Flow → Process Step → Process Run → Parameter Measurement
// Replace with Supabase read-only views in production (see Database Config).
// =============================================================================

export type Status = "ok" | "warning" | "critical" | "owner-missing" | "pending" | "not-measured";

// ============================ Deterministic RNG ==============================
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let s = seed || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function gauss(r: () => number) { const u1 = Math.max(r(), 1e-9), u2 = r(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }

// ============================ Domain types ===================================
export interface ProductGroup { id: string; name: string; }
export interface ProductFamily { id: string; name: string; groupId: string; }
export interface Product { id: string; name: string; familyId: string; description: string; }
export interface Wafer { id: string; lotId: string; slot: number; status: "ok" | "scrap" | "rework"; }
export interface Lot { id: string; productId: string; startDate: string; currentStepId: string; status: "in-process" | "complete" | "hold"; wafers: Wafer[]; }

export interface ProcessOwner {
  id: string; name: string; email: string; department: string;
  backupName: string; backupEmail: string; active: boolean; escalationHours: number;
}

export interface Parameter {
  id: string; name: string; unit: string;
  lsl: number; usl: number; lcl: number; ucl: number; target: number;
}

export interface ProcessStep {
  id: string;          // e.g. PRC-010
  order: number;
  tableName: string;   // e.g. process_010_incoming_wafer
  name: string;
  area: string;
  toolGroup: string;
  ownerId: string;
  parameters: Parameter[];
  visible: boolean;    // show in main flow (10 key steps)
}

export interface Measurement {
  id: string; processId: string; parameterId: string;
  lotId: string; waferId: string; productId: string;
  toolId: string; chamberId: string; recipeId: string; operatorId: string;
  value: number; measurementTime: string;
}

export interface Violation {
  id: string; lotId: string; waferId: string; productId: string;
  processId: string; parameterId: string;
  value: number; lsl: number; usl: number; target: number;
  direction: "below_lsl" | "above_usl"; severity: "high" | "medium" | "low";
  ownerId: string; emailStatus: "pending" | "sent" | "failed" | "acknowledged";
  acknowledged: boolean; timestamp: string;
}

export interface FinalTestResult {
  lotId: string; waferId: string; productId: string;
  testProgram: string; tester: string;
  testedDies: number; passDies: number;
  bins: { bin: number; name: string; count: number; pass: boolean }[];
  parametricFails: { param: string; failCount: number }[];
  testedAt: string;
}

// ============================ Product hierarchy ==============================
export const productGroups: ProductGroup[] = [
  { id: "PG-THY", name: "Thyristors" },
  { id: "PG-DIO", name: "Power Diodes" },
  { id: "PG-IGBT", name: "IGBT Modules" },
];

export const productFamilies: ProductFamily[] = [
  { id: "PF-MED-THY",   name: "Medical Thyristors",       groupId: "PG-THY"  },
  { id: "PF-IND-THY",   name: "Industrial Thyristors",    groupId: "PG-THY"  },
  { id: "PF-HVDC-THY",  name: "HVDC Phase-Control Thyr.", groupId: "PG-THY"  },
  { id: "PF-FRD",       name: "Fast Recovery Diodes",     groupId: "PG-DIO"  },
  { id: "PF-RECT",      name: "Rectifier Diodes",         groupId: "PG-DIO"  },
  { id: "PF-SCHK",      name: "Schottky Diodes",          groupId: "PG-DIO"  },
  { id: "PF-IGBT-LV",   name: "LV IGBT Modules",          groupId: "PG-IGBT" },
  { id: "PF-IGBT-HV",   name: "HV IGBT Modules",          groupId: "PG-IGBT" },
];

const productSeeds: Array<{ familyId: string; voltage: string; current: string; tag: string }> = [
  { familyId: "PF-MED-THY",  voltage: "3kV",   current: "1200A", tag: "Medical" },
  { familyId: "PF-MED-THY",  voltage: "4.5kV", current: "1500A", tag: "Medical" },
  { familyId: "PF-MED-THY",  voltage: "6kV",   current: "1800A", tag: "Medical" },
  { familyId: "PF-IND-THY",  voltage: "1.8kV", current: "800A",  tag: "Drive" },
  { familyId: "PF-IND-THY",  voltage: "2.5kV", current: "1000A", tag: "Drive" },
  { familyId: "PF-IND-THY",  voltage: "3.3kV", current: "1500A", tag: "Drive" },
  { familyId: "PF-IND-THY",  voltage: "4kV",   current: "2000A", tag: "Welder" },
  { familyId: "PF-HVDC-THY", voltage: "8.5kV", current: "4000A", tag: "HVDC" },
  { familyId: "PF-HVDC-THY", voltage: "10kV",  current: "5000A", tag: "HVDC" },
  { familyId: "PF-HVDC-THY", voltage: "12kV",  current: "5500A", tag: "HVDC" },
  { familyId: "PF-FRD", voltage: "1.2kV", current: "200A", tag: "FRD" },
  { familyId: "PF-FRD", voltage: "1.7kV", current: "400A", tag: "FRD" },
  { familyId: "PF-FRD", voltage: "3.3kV", current: "800A", tag: "FRD" },
  { familyId: "PF-RECT", voltage: "800V", current: "300A", tag: "Rectifier" },
  { familyId: "PF-RECT", voltage: "1.2kV", current: "600A", tag: "Rectifier" },
  { familyId: "PF-RECT", voltage: "1.6kV", current: "1000A", tag: "Rectifier" },
  { familyId: "PF-RECT", voltage: "2.5kV", current: "1500A", tag: "Rectifier" },
  { familyId: "PF-SCHK", voltage: "100V", current: "60A", tag: "Schottky" },
  { familyId: "PF-SCHK", voltage: "200V", current: "100A", tag: "Schottky" },
  { familyId: "PF-SCHK", voltage: "650V", current: "20A", tag: "SiC-Schottky" },
  { familyId: "PF-IGBT-LV", voltage: "600V",  current: "100A", tag: "Module" },
  { familyId: "PF-IGBT-LV", voltage: "1.2kV", current: "150A", tag: "Module" },
  { familyId: "PF-IGBT-LV", voltage: "1.2kV", current: "300A", tag: "Module" },
  { familyId: "PF-IGBT-LV", voltage: "1.7kV", current: "450A", tag: "Module" },
  { familyId: "PF-IGBT-HV", voltage: "3.3kV", current: "800A", tag: "Traction" },
  { familyId: "PF-IGBT-HV", voltage: "3.3kV", current: "1200A", tag: "Traction" },
  { familyId: "PF-IGBT-HV", voltage: "4.5kV", current: "1500A", tag: "Traction" },
  { familyId: "PF-IGBT-HV", voltage: "6.5kV", current: "1000A", tag: "HVDC" },
  { familyId: "PF-IGBT-HV", voltage: "6.5kV", current: "1500A", tag: "HVDC" },
  { familyId: "PF-IGBT-HV", voltage: "6.5kV", current: "2000A", tag: "HVDC" },
];

export const products: Product[] = productSeeds.map((s, i) => ({
  id: `PRD-${String(i + 1).padStart(4, "0")}`,
  name: `${s.voltage}/${s.current} ${s.tag}`,
  familyId: s.familyId,
  description: `${s.voltage} blocking, ${s.current} forward — ${s.tag}-grade qualified`,
}));

// ============================ Owners =========================================
export const owners: ProcessOwner[] = [
  { id: "OWN-01", name: "Dr. Mei Lin",     email: "mei.lin@fab.example",     department: "Diffusion",    backupName: "Arun Patel",   backupEmail: "arun.patel@fab.example",   active: true,  escalationHours: 4 },
  { id: "OWN-02", name: "Jonas Berg",      email: "jonas.berg@fab.example",  department: "Litho",        backupName: "Sara Khan",    backupEmail: "sara.khan@fab.example",    active: true,  escalationHours: 2 },
  { id: "OWN-03", name: "Hiroshi Tanaka",  email: "h.tanaka@fab.example",    department: "Etch",         backupName: "Lena Müller",  backupEmail: "lena.muller@fab.example",  active: true,  escalationHours: 4 },
  { id: "OWN-04", name: "Priya Raman",     email: "priya.raman@fab.example", department: "Metallization", backupName: "Tom Eriksen",  backupEmail: "tom.eriksen@fab.example",  active: true,  escalationHours: 6 },
  { id: "OWN-05", name: "Chen Wei",        email: "chen.wei@fab.example",    department: "Backend",      backupName: "Marco Bianchi", backupEmail: "marco.bianchi@fab.example", active: true,  escalationHours: 8 },
  { id: "OWN-06", name: "Anika Schulz",    email: "anika.schulz@fab.example", department: "Final Test",   backupName: "Yuki Sato",    backupEmail: "yuki.sato@fab.example",    active: true,  escalationHours: 2 },
  { id: "OWN-07", name: "Unassigned",      email: "",                         department: "—",            backupName: "",             backupEmail: "",                          active: false, escalationHours: 24 },
];

// ============================ Process flow (100 steps) =======================
const visibleStepSeeds: Array<{ name: string; area: string; tool: string; owner: string; params: Array<[string, string, number, number]> }> = [
  { name: "Incoming Wafer Inspection", area: "Incoming", tool: "KLA-Surfscan", owner: "OWN-01", params: [
    ["Resistivity", "Ω·cm", 50, 3], ["Wafer Thickness", "µm", 525, 8], ["TTV", "µm", 1.5, 0.4],
    ["Bow", "µm", 0, 10], ["Particles >0.3µm", "#", 12, 5], ["Oxygen Content", "ppma", 14, 1.2],
    ["Carbon Content", "ppma", 0.5, 0.1], ["Edge Defects", "#", 2, 1],
  ]},
  { name: "Diffusion (P-Base)", area: "Diffusion", tool: "TEL-Indy", owner: "OWN-01", params: [
    ["Sheet Resistance", "Ω/sq", 45, 1.5], ["Junction Depth", "µm", 65, 2.5], ["Furnace Temp", "°C", 1250, 8],
    ["O2 Flow", "sccm", 4500, 80], ["N2 Flow", "sccm", 9000, 120], ["Boron Dose", "atm/cm²", 2.5e15, 1.5e14],
    ["Uniformity 49pt", "%", 1.6, 0.3], ["Cycle Time", "min", 240, 6], ["Particle Adders", "#", 6, 2],
    ["Drive-in Time", "min", 180, 4],
  ]},
  { name: "Lithography (Gate Mask)", area: "Litho", tool: "ASML-NXT2050i", owner: "OWN-02", params: [
    ["CD Mean", "nm", 1200, 25], ["CD Sigma", "nm", 8, 1.2], ["Overlay X", "nm", 0, 4],
    ["Overlay Y", "nm", 0, 4], ["Focus Offset", "nm", 0, 12], ["Dose", "mJ/cm²", 28, 0.6],
    ["Resist Thickness", "Å", 8500, 80], ["BARC Thickness", "Å", 350, 8], ["Defects/cm²", "#", 0.08, 0.03],
    ["Reticle Particles", "#", 0, 1],
  ]},
  { name: "Etch (Gate/Trench)", area: "Etch", tool: "LAM-Kiyo", owner: "OWN-03", params: [
    ["Etch Depth", "µm", 6.5, 0.15], ["CD Bias", "nm", -8, 3], ["Sidewall Angle", "°", 88.5, 0.8],
    ["Selectivity", "ratio", 25, 2], ["Microloading", "%", 3, 1], ["RF Power", "W", 1500, 30],
    ["Chamber Pressure", "mT", 12, 0.4], ["Endpoint Variance", "s", 2, 0.6], ["Polymer Residue", "Å", 5, 2],
  ]},
  { name: "Ion Implantation", area: "Implant", tool: "AMAT-VIISta", owner: "OWN-01", params: [
    ["Implant Dose", "atm/cm²", 3.2e15, 1.5e14], ["Implant Energy", "keV", 80, 1.2], ["Beam Current", "mA", 12, 0.4],
    ["Tilt Angle", "°", 7, 0.1], ["Twist", "°", 22, 0.5], ["Uniformity", "%", 0.8, 0.15],
    ["Channeling Risk", "score", 1, 0.4],
  ]},
  { name: "Metallization (Front Al)", area: "Metallization", tool: "AMAT-Endura", owner: "OWN-04", params: [
    ["Al Thickness", "µm", 4.0, 0.12], ["Sheet Resistance", "mΩ/sq", 7.5, 0.3], ["Reflectivity", "%", 92, 1.5],
    ["Hillock Density", "#/mm²", 1.5, 0.5], ["Adhesion Tape Test", "%", 100, 0.5], ["Step Coverage", "%", 78, 2],
    ["Particles", "#", 8, 3], ["Sputter Power", "kW", 8.5, 0.2], ["Ar Flow", "sccm", 40, 1],
    ["Temperature", "°C", 250, 5], ["Deposition Rate", "Å/s", 120, 4], ["Stress", "MPa", -180, 25],
  ]},
  { name: "Passivation (PI/Nitride)", area: "Passivation", tool: "AMAT-Producer", owner: "OWN-04", params: [
    ["Nitride Thickness", "Å", 8000, 150], ["PI Thickness", "µm", 8, 0.4], ["Refractive Index", "n", 2.02, 0.02],
    ["Pinhole Density", "#/cm²", 0.1, 0.05], ["Stress", "MPa", -200, 20], ["HF Etch Rate", "Å/min", 25, 2],
    ["Crack Density", "#/mm", 0, 0.2],
  ]},
  { name: "Backgrind & Backside Metal", area: "Backend", tool: "DISCO-DGP8761", owner: "OWN-05", params: [
    ["Final Thickness", "µm", 180, 4], ["TTV Post-Grind", "µm", 2, 0.5], ["Backside Roughness Ra", "nm", 80, 8],
    ["Backside Al Thickness", "µm", 2.5, 0.1], ["Edge Chipping", "µm", 30, 8], ["Warpage", "µm", 50, 12],
    ["Subsurface Damage", "µm", 4, 1], ["Wafer Breakage Rate", "%", 0.2, 0.1],
  ]},
  { name: "Dicing & Die Sort", area: "Backend", tool: "DISCO-DFD6361", owner: "OWN-05", params: [
    ["Street Width", "µm", 80, 2], ["Chipping Front", "µm", 12, 3], ["Chipping Back", "µm", 25, 5],
    ["Kerf Width", "µm", 50, 2], ["Saw RPM", "krpm", 30, 0.5], ["Feed Rate", "mm/s", 100, 4],
    ["Die Yield Sort", "%", 98, 0.6],
  ]},
  { name: "Assembly & Soldering", area: "Backend", tool: "Besi-Datacon", owner: "OWN-05", params: [
    ["Solder Void %", "%", 2.5, 0.6], ["Die Tilt", "µm", 8, 2], ["BLT", "µm", 35, 3],
    ["Wire Pull Strength", "g", 18, 1.5], ["Bond Shear", "g", 35, 3], ["Solder Reflow Peak", "°C", 245, 3],
    ["Encapsulation Voids", "#", 0, 1], ["Lead Coplanarity", "µm", 50, 8],
  ]},
];

// Visible (key) process steps 010..100 with table names.
const visibleSteps: ProcessStep[] = visibleStepSeeds.map((s, i) => {
  const order = (i + 1) * 10;
  const id = `PRC-${String(order).padStart(3, "0")}`;
  const tableSlug = s.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return {
    id, order, tableName: `process_${String(order).padStart(3, "0")}_${tableSlug}`,
    name: s.name, area: s.area, toolGroup: s.tool, ownerId: s.owner, visible: true,
    parameters: s.params.map(([n, u, t, sp], pi) => ({
      id: `${id}-P${pi + 1}`, name: n, unit: u, target: t,
      lsl: +(t - sp * 2.5).toFixed(4), usl: +(t + sp * 2.5).toFixed(4),
      lcl: +(t - sp * 1.5).toFixed(4), ucl: +(t + sp * 1.5).toFixed(4),
    })),
  };
});

// Generate hidden filler steps to reach 100 total.
const fillerAreas = ["Diffusion", "Litho", "Etch", "Thin Films", "CMP", "Implant", "Clean", "Anneal", "Inspection"];
const fillerOwners = ["OWN-01","OWN-02","OWN-03","OWN-04","OWN-05"];
const hiddenSteps: ProcessStep[] = Array.from({ length: 90 }, (_, k) => {
  const order = 101 + k;
  const id = `PRC-${String(order).padStart(3, "0")}`;
  const area = fillerAreas[k % fillerAreas.length];
  const owner = fillerOwners[k % fillerOwners.length];
  return {
    id, order, tableName: `process_${String(order).padStart(3, "0")}_${area.toLowerCase().replace(/\s+/g, "_")}_${k + 1}`,
    name: `${area} Step ${k + 1}`, area, toolGroup: `${area.toUpperCase()}-${(k % 6) + 1}`,
    ownerId: owner, visible: false,
    parameters: Array.from({ length: 8 }, (_, p) => ({
      id: `${id}-P${p + 1}`, name: `Param ${p + 1}`, unit: "a.u.", target: 100,
      lsl: 92, usl: 108, lcl: 95, ucl: 105,
    })),
  };
});

export const processSteps: ProcessStep[] = [...visibleSteps, ...hiddenSteps];
export const visibleProcessSteps = visibleSteps;
export const finalTestStep = visibleSteps[visibleSteps.length - 1]; // assembly is last visible non-FT
// Add a dedicated Final Test step for status accounting
export const FINAL_TEST_STEP_ID = "PRC-FT";

// ============================ Lots & Wafers ==================================
function pickProduct(i: number) { return products[i % products.length]; }
export const lots: Lot[] = Array.from({ length: 100 }, (_, i) => {
  const prod = pickProduct(i);
  const start = new Date(Date.now() - (100 - i) * 8 * 3600 * 1000).toISOString();
  // Status mostly in-process; some hold/complete
  const status: Lot["status"] = i % 17 === 0 ? "hold" : i > 88 ? "complete" : "in-process";
  const stepIdx = status === "complete" ? visibleSteps.length - 1 : (i * 3) % visibleSteps.length;
  const lotId = `LOT-2026-${String(i + 1).padStart(4, "0")}`;
  const wafers: Wafer[] = Array.from({ length: 25 }, (_, w) => ({
    id: `${lotId}-W${String(w + 1).padStart(2, "0")}`, lotId, slot: w + 1,
    status: (w + i) % 41 === 0 ? "scrap" : (w + i) % 53 === 0 ? "rework" : "ok",
  }));
  return { id: lotId, productId: prod.id, startDate: start, currentStepId: visibleSteps[stepIdx].id, status, wafers };
});

export const lotIds = lots.map(l => l.id);

// ============================ Measurements ===================================
// Generated on demand and cached.
const measurementCache = new Map<string, Measurement[]>();
export function generateMeasurements(processId: string, parameter: Parameter, lotIdsSubset: string[] = lotIds): Measurement[] {
  const key = `${processId}::${parameter.id}::${lotIdsSubset.length}`;
  const hit = measurementCache.get(key);
  if (hit) return hit;
  const proc = processSteps.find(p => p.id === processId);
  const r = rng(hash(processId + parameter.id));
  const sigma = (parameter.usl - parameter.lsl) / 9;
  const out = lotIdsSubset.map((lotId, i) => {
    const lot = lots.find(l => l.id === lotId)!;
    let val = parameter.target + gauss(r) * sigma;
    if ((i + hash(processId)) % 23 === 0) val = parameter.usl + Math.abs(gauss(r)) * sigma * 0.4;
    if ((i + hash(parameter.id)) % 29 === 0) val = parameter.lsl - Math.abs(gauss(r)) * sigma * 0.3;
    return {
      id: `${processId}-${parameter.id}-${lotId}`,
      processId, parameterId: parameter.id, lotId,
      waferId: `${lotId}-W${String((i % 25) + 1).padStart(2, "0")}`,
      productId: lot.productId,
      toolId: `${proc?.toolGroup.split("-")[0] ?? "TOOL"}-${(i % 3) + 1}`,
      chamberId: `CH${(i % 4) + 1}`, recipeId: `RCP-${parameter.id.slice(-3)}`,
      operatorId: `OP-${(i % 8) + 1}`,
      value: +val.toFixed(4),
      measurementTime: new Date(Date.now() - (lotIds.length - i) * 4 * 3600 * 1000).toISOString(),
    };
  });
  measurementCache.set(key, out);
  return out;
}

// ============================ Violations (USL/LSL) ===========================
const _violations: Violation[] = (() => {
  const out: Violation[] = [];
  // Only compute over visible steps to keep this fast.
  for (const proc of visibleSteps) {
    for (const param of proc.parameters) {
      const ms = generateMeasurements(proc.id, param);
      for (const m of ms) {
        if (m.value > param.usl || m.value < param.lsl) {
          const above = m.value > param.usl;
          const distance = above ? (m.value - param.usl) / Math.max(param.usl - param.target, 1e-9)
                                  : (param.lsl - m.value) / Math.max(param.target - param.lsl, 1e-9);
          out.push({
            id: `VIO-${out.length + 1}`,
            lotId: m.lotId, waferId: m.waferId, productId: m.productId,
            processId: proc.id, parameterId: param.id,
            value: m.value, lsl: param.lsl, usl: param.usl, target: param.target,
            direction: above ? "above_usl" : "below_lsl",
            severity: distance > 0.5 ? "high" : distance > 0.2 ? "medium" : "low",
            ownerId: proc.ownerId,
            emailStatus: (["sent","sent","pending","acknowledged","failed"] as const)[out.length % 5],
            acknowledged: out.length % 5 === 3,
            timestamp: m.measurementTime,
          });
        }
      }
    }
  }
  return out;
})();
export const violations = _violations;

// ============================ SPC warnings (UCL/LCL) =========================
export const spcWarnings = (() => {
  let count = 0;
  for (const proc of visibleSteps) {
    for (const param of proc.parameters) {
      const ms = generateMeasurements(proc.id, param);
      for (const m of ms) {
        const inSpec = m.value <= param.usl && m.value >= param.lsl;
        const outCtrl = m.value > param.ucl || m.value < param.lcl;
        if (inSpec && outCtrl) count++;
      }
    }
  }
  return count;
})();

// ============================ Final Test Yield ===============================
const bins = [
  { bin: 1, name: "Pass-Prime", pass: true },
  { bin: 2, name: "Pass-Downbin", pass: true },
  { bin: 11, name: "VBR Low", pass: false },
  { bin: 12, name: "IGT High", pass: false },
  { bin: 13, name: "Leakage IRM", pass: false },
  { bin: 14, name: "VFM High", pass: false },
  { bin: 15, name: "dV/dt Fail", pass: false },
  { bin: 21, name: "Visual Reject", pass: false },
];

const ftParams = ["VFM","IRM","VBR","IGT","VGT","IH","IL","dV/dt","ITSM","Leakage"];

export const finalTestResults: FinalTestResult[] = lots.map((lot, i) => {
  const r = rng(hash("FT" + lot.id));
  const baseYield = 0.86 + gauss(r) * 0.04;          // family/lot variation
  const productSpecial = (hash(lot.productId) % 7) === 0 ? -0.08 : 0;
  const y = Math.max(0.55, Math.min(0.995, baseYield + productSpecial));
  const tested = lot.wafers.filter(w => w.status === "ok").length * 220; // dies per wafer
  const passDies = Math.round(tested * y);
  const fails = tested - passDies;
  const binCounts = bins.map(b => ({ ...b, count: b.pass ? 0 : 0 }));
  binCounts[0].count = Math.round(passDies * 0.92);
  binCounts[1].count = passDies - binCounts[0].count;
  let remaining = fails;
  for (let b = 2; b < binCounts.length; b++) {
    const share = b === binCounts.length - 1 ? remaining : Math.round(remaining * (0.4 - b * 0.04) * (0.6 + r()));
    binCounts[b].count = Math.max(0, share);
    remaining -= binCounts[b].count;
  }
  if (remaining > 0) binCounts[binCounts.length - 1].count += remaining;
  return {
    lotId: lot.id, waferId: lot.wafers[0].id, productId: lot.productId,
    testProgram: `TP-${lot.productId.slice(-3)}-v3`,
    tester: `T${(i % 6) + 1}`,
    testedDies: tested, passDies,
    bins: binCounts,
    parametricFails: ftParams.map(p => ({ param: p, failCount: Math.round((r() * fails) / ftParams.length) })),
    testedAt: new Date(Date.now() - (lots.length - i) * 4 * 3600 * 1000).toISOString(),
  };
});

// ============================ Aggregations ===================================
export function lotYield(lotId: string) {
  const ft = finalTestResults.find(f => f.lotId === lotId);
  if (!ft) return null;
  return ft.passDies / Math.max(ft.testedDies, 1);
}
export function productYield(productId: string) {
  const rs = finalTestResults.filter(f => f.productId === productId);
  const t = rs.reduce((a, b) => a + b.testedDies, 0), p = rs.reduce((a, b) => a + b.passDies, 0);
  return t ? p / t : null;
}
export function familyYield(familyId: string) {
  const prodIds = products.filter(p => p.familyId === familyId).map(p => p.id);
  const rs = finalTestResults.filter(f => prodIds.includes(f.productId));
  const t = rs.reduce((a, b) => a + b.testedDies, 0), p = rs.reduce((a, b) => a + b.passDies, 0);
  return t ? p / t : null;
}
export function groupYield(groupId: string) {
  const famIds = productFamilies.filter(f => f.groupId === groupId).map(f => f.id);
  const prodIds = products.filter(p => famIds.includes(p.familyId)).map(p => p.id);
  const rs = finalTestResults.filter(f => prodIds.includes(f.productId));
  const t = rs.reduce((a, b) => a + b.testedDies, 0), p = rs.reduce((a, b) => a + b.passDies, 0);
  return t ? p / t : null;
}

// ============================ Helpers ========================================
export const getOwner   = (id: string) => owners.find(o => o.id === id);
export const getProcess = (id: string) => processSteps.find(p => p.id === id);
export const getProduct = (id: string) => products.find(p => p.id === id);
export const getFamily  = (id: string) => productFamilies.find(f => f.id === id);
export const getGroup   = (id: string) => productGroups.find(g => g.id === id);
export const getLot     = (id: string) => lots.find(l => l.id === id);

// Process status per the visible flow
export function processStatusForLot(stepId: string, lotId: string): Status {
  const proc = getProcess(stepId);
  if (!proc) return "not-measured";
  const lot = getLot(lotId)!;
  const stepOrderInFlow = visibleSteps.findIndex(s => s.id === stepId);
  const currentOrderInFlow = visibleSteps.findIndex(s => s.id === lot.currentStepId);
  if (stepOrderInFlow > currentOrderInFlow && lot.status !== "complete") return "pending";
  let crit = 0, warn = 0;
  for (const p of proc.parameters) {
    const m = generateMeasurements(proc.id, p).find(x => x.lotId === lotId);
    if (!m) continue;
    if (m.value > p.usl || m.value < p.lsl) crit++;
    else if (m.value > p.ucl || m.value < p.lcl) warn++;
  }
  if (proc.ownerId === "OWN-07") return "owner-missing";
  return crit > 0 ? "critical" : warn > 0 ? "warning" : "ok";
}

export function capability(values: number[], lsl: number, usl: number, target: number) {
  const n = values.length || 1;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1 || 1);
  const sd = Math.sqrt(variance) || 1e-9;
  const cp = (usl - lsl) / (6 * sd);
  const cpk = Math.min((usl - mean) / (3 * sd), (mean - lsl) / (3 * sd));
  return { mean, sd, cp, cpk, pp: cp, ppk: cpk, target };
}

// MES / Database connection state
export const mesStatus = {
  connected: true,
  readOnly: true,
  mode: "Mock" as "Mock" | "Supabase Test" | "Production",
  supabaseUrl: "https://your-project.supabase.co",
  schema: "akspc_ro",
  source: "Supabase view: akspc_ro.process_measurements_v",
  lastSync: new Date(2026, 4, 20, 9, 30, 0).toISOString(),
};

// ============================ Version history ================================
export interface AppVersion {
  version: string; date: string; summary: string;
  dbChanges: string; uiChanges: string;
  validation: "draft" | "in-validation" | "validated" | "deployed";
  deployedBy: string;
}
export const appVersions: AppVersion[] = [
  { version: "v0.1", date: "2026-02-15", summary: "AKSPC Mock UI scaffold",            dbChanges: "—",                              uiChanges: "Initial pages, mock data",            validation: "deployed",      deployedBy: "M. Lin"  },
  { version: "v0.2", date: "2026-03-04", summary: "Product/Lot/Process architecture",  dbChanges: "Defined product hierarchy",      uiChanges: "Product Explorer, Lot Journey",       validation: "deployed",      deployedBy: "J. Berg" },
  { version: "v0.3", date: "2026-04-02", summary: "Supabase read-only connection",     dbChanges: "Read-only views, RLS policies",  uiChanges: "DB config page, sync badge",          validation: "validated",     deployedBy: "H. Tanaka" },
  { version: "v0.4", date: "2026-04-29", summary: "Final test yield module",           dbChanges: "Added final_test_results view",  uiChanges: "Yield dashboards, Pareto charts",     validation: "in-validation", deployedBy: "A. Schulz" },
  { version: "v1.0", date: "2026-05-20", summary: "Validated production demo",         dbChanges: "Versioned schema akspc_ro v1",   uiChanges: "Command Center + version log",        validation: "draft",         deployedBy: "—" },
];

export const currentVersion = appVersions[appVersions.length - 1];
