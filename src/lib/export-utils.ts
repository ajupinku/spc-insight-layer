import { toPng, toSvg, toJpeg } from "html-to-image";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

const FILTER = (node: HTMLElement) => {
  // Skip the export menu itself when capturing
  return !node.classList?.contains?.("export-skip");
};

const OPTS = {
  cacheBust: true,
  pixelRatio: 2,
  backgroundColor: "#ffffff",
  filter: FILTER as (n: HTMLElement) => boolean,
};

function ts() {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export async function exportNodePng(node: HTMLElement, name: string) {
  const url = await toPng(node, OPTS);
  saveAs(url, `${name}-${ts()}.png`);
}

export async function exportNodeJpeg(node: HTMLElement, name: string) {
  const url = await toJpeg(node, { ...OPTS, quality: 0.95 });
  saveAs(url, `${name}-${ts()}.jpg`);
}

export async function exportNodeSvg(node: HTMLElement, name: string) {
  const url = await toSvg(node, OPTS);
  saveAs(url, `${name}-${ts()}.svg`);
}

export async function exportNodePdf(node: HTMLElement, name: string, title?: string) {
  const dataUrl = await toPng(node, OPTS);
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
  const orientation = img.width >= img.height ? "landscape" : "portrait";
  const pdf = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 32;
  let y = margin;
  if (title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(title, margin, y + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(`AKSPC · exported ${new Date().toLocaleString()}`, margin, y + 20);
    pdf.setTextColor(0);
    y += 36;
  }
  const maxW = pw - margin * 2;
  const maxH = ph - y - margin;
  const ratio = Math.min(maxW / img.width, maxH / img.height);
  const w = img.width * ratio, h = img.height * ratio;
  pdf.addImage(dataUrl, "PNG", margin, y, w, h);
  pdf.save(`${name}-${ts()}.pdf`);
}

export function exportCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${name}-${ts()}.csv`);
}

/** Capture multiple nodes into a single multi-page PDF report. */
export async function exportReportPdf(
  panels: { node: HTMLElement; title: string }[],
  reportName: string,
  reportTitle: string,
) {
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pw = pdf.internal.pageSize.getWidth();
  const ph = pdf.internal.pageSize.getHeight();
  const margin = 32;

  // Cover page
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text(reportTitle, margin, 80);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(110);
  pdf.text(`Generated ${new Date().toLocaleString()}`, margin, 102);
  pdf.text(`Panels included: ${panels.length}`, margin, 118);
  pdf.setTextColor(0);
  pdf.setFontSize(10);
  let ly = 150;
  panels.forEach((p, i) => { pdf.text(`${i + 1}.  ${p.title}`, margin + 8, ly); ly += 16; });

  for (const p of panels) {
    try {
      const dataUrl = await toPng(p.node, OPTS);
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = dataUrl; });
      pdf.addPage();
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(p.title, margin, margin + 4);
      const top = margin + 22;
      const maxW = pw - margin * 2;
      const maxH = ph - top - margin;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      pdf.addImage(dataUrl, "PNG", margin, top, img.width * ratio, img.height * ratio);
    } catch (e) {
      console.error("Panel export failed", p.title, e);
    }
  }
  pdf.save(`${reportName}-${ts()}.pdf`);
}
