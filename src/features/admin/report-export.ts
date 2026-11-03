/* The consultation report as files: a PDF (jsPDF + autoTable, the same pair the
   CCPL frontends use) and a formatted Excel workbook (ExcelJS — bold headers,
   fills, widths, number formats, one sheet per table). Both libraries load only
   when a download is clicked. The screen, the PDF and the workbook all read the
   same ReportData, so they always agree. */

import { BRAND } from "@/config/app.constants";

export interface ReportData {
  period: string;
  generated: string;
  fileBase: string;
  totals: { label: string; value: string | number }[];
  doctors: { name: string; pmdc: string; received: number; patients: number; callMin: number; avgCallMin: number; avgWaitMin: number; released: number; share: number }[];
  complaints: { label: string; n: number; share: number }[];
  days: { date: string; started: number; seen: number; released: number }[];
}

const NAVY: [number, number, number] = [22, 52, 99];
const BLUE: [number, number, number] = [45, 111, 200];
const MUTE: [number, number, number] = [102, 112, 133];
const LINE: [number, number, number] = [225, 230, 238];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export async function downloadReportPdf(r: ReportData) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  // Landscape: the per-doctor table has nine columns and names must stay on one line.
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;

  // Letterhead
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 6, "F");
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...MUTE);
  doc.text(BRAND.toUpperCase(), M, 40);
  doc.setFontSize(20).setTextColor(...NAVY);
  doc.text("Consultation report", M, 64);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...MUTE);
  doc.text(r.period, W - M, 44, { align: "right" });
  doc.text(`Generated ${r.generated}`, W - M, 60, { align: "right" });
  doc.setDrawColor(...LINE).line(M, 78, W - M, 78);

  // Totals — a 4-across grid of label / value
  const cells = r.totals.map((t) => `${t.label}\n${t.value}`);
  const grid: string[][] = [];
  for (let i = 0; i < cells.length; i += 4) grid.push(cells.slice(i, i + 4));
  autoTable(doc, {
    startY: 92,
    margin: { left: M, right: M },
    body: grid,
    theme: "plain",
    styles: { fontSize: 9, textColor: NAVY, cellPadding: { top: 8, bottom: 8, left: 10, right: 10 }, lineColor: LINE, lineWidth: 0.6 },
    didParseCell: (d) => {
      d.cell.styles.fillColor = [244, 246, 250];
      d.cell.text = []; // drawn by hand below: a small label over a big bold value
    },
    didDrawCell: (d) => {
      const [label, value] = String(d.cell.raw ?? "").split("\n");
      if (!label) return;
      doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTE).text(label, d.cell.x + 10, d.cell.y + 16);
      doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(...NAVY).text(String(value ?? ""), d.cell.x + 10, d.cell.y + 34);
    },
    bodyStyles: { minCellHeight: 46 },
  });

  const section = (title: string, y: number) => {
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY).text(title, M, y);
    return y + 8;
  };
  const tableStyle = {
    margin: { left: M, right: M },
    theme: "grid" as const,
    styles: { fontSize: 9, textColor: [24, 32, 47] as [number, number, number], lineColor: LINE, lineWidth: 0.6, cellPadding: 6 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
  };
  const after = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  autoTable(doc, {
    ...tableStyle,
    startY: section("By doctor", after() + 28),
    head: [["Doctor", "PMDC", "Patients received", "Unique", "Call time (min)", "Avg call (min)", "Avg wait (min)", "Released", "Share"]],
    body: r.doctors.map((d) => [d.name, d.pmdc, d.received, d.patients, d.callMin, d.avgCallMin, d.avgWaitMin, d.released, pct(d.share)]),
    columnStyles: { 0: { fontStyle: "bold", minCellWidth: 120 }, 1: { minCellWidth: 86 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" }, 8: { halign: "right" } },
  });
  autoTable(doc, {
    ...tableStyle,
    startY: section("By complaint", after() + 28),
    head: [["Complaint", "Consultations", "Share"]],
    body: r.complaints.length ? r.complaints.map((c) => [c.label, c.n, pct(c.share)]) : [["No consultations in this period", "", ""]],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
  });
  autoTable(doc, {
    ...tableStyle,
    startY: section("By day", after() + 28),
    head: [["Date", "Started", "Seen by a doctor", "Prescriptions released"]],
    body: r.days.length ? r.days.map((d) => [d.date, d.started, d.seen, d.released]) : [["No consultations in this period", "", "", ""]],
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    const H = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTE);
    doc.text(`${BRAND} · Digital Consultation · ${r.period}`, M, H - 24);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 24, { align: "right" });
  }
  doc.save(`${r.fileBase}.pdf`);
}

export async function downloadReportXlsx(r: ReportData) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = BRAND;
  wb.created = new Date();
  const headFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF2D6FC8" } };
  const zebra = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF4F6FA" } };
  const border = { style: "thin" as const, color: { argb: "FFE1E6EE" } };

  /** A sheet with the report title block, then one styled table. */
  const sheet = (name: string, head: string[], rows: (string | number)[][], widths: number[], formats: (string | undefined)[] = []) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 5 }] });
    ws.columns = widths.map((w) => ({ width: w }));
    ws.mergeCells(1, 1, 1, head.length);
    Object.assign(ws.getCell(1, 1), { value: `${BRAND} — Consultation report` });
    ws.getCell(1, 1).font = { bold: true, size: 15, color: { argb: "FF163463" } };
    ws.getCell(2, 1).value = `Period: ${r.period}`;
    ws.getCell(3, 1).value = `Generated: ${r.generated}`;
    ws.getRow(2).font = ws.getRow(3).font = { color: { argb: "FF667085" }, size: 10 };
    const hr = ws.getRow(5);
    hr.values = head;
    hr.height = 22;
    hr.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = headFill;
      c.alignment = { vertical: "middle" };
      c.border = { top: border, bottom: border, left: border, right: border };
    });
    rows.forEach((values, i) => {
      const row = ws.getRow(6 + i);
      row.values = values;
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = { top: border, bottom: border, left: border, right: border };
        if (i % 2 === 1) c.fill = zebra;
        const fmt = formats[col - 1];
        if (fmt) c.numFmt = fmt;
      });
    });
    if (rows.length) ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: head.length } };
    return ws;
  };

  sheet("Summary", ["Measure", "Value"], r.totals.map((t) => [t.label, t.value]), [34, 18]);
  const byDoc = sheet(
    "By doctor",
    ["Doctor", "PMDC", "Patients received", "Unique patients", "Call time (min)", "Avg call (min)", "Avg wait (min)", "Prescriptions released", "Share"],
    r.doctors.map((d) => [d.name, d.pmdc, d.received, d.patients, d.callMin, d.avgCallMin, d.avgWaitMin, d.released, d.share]),
    [24, 16, 18, 16, 16, 15, 15, 22, 10],
    [undefined, undefined, "0", "0", "0", "0.0", "0.0", "0", "0%"],
  );
  // Totals row under the per-doctor table.
  if (r.doctors.length) {
    const first = 6;
    const last = 5 + r.doctors.length;
    const t = byDoc.getRow(last + 1);
    t.values = ["Total", "", { formula: `SUM(C${first}:C${last})` }, "", { formula: `SUM(E${first}:E${last})` }, "", "", { formula: `SUM(H${first}:H${last})` }, ""];
    t.font = { bold: true };
    t.eachCell({ includeEmpty: true }, (c) => (c.border = { top: { style: "medium", color: { argb: "FF163463" } } }));
  }
  sheet("By complaint", ["Complaint", "Consultations", "Share"], r.complaints.map((c) => [c.label, c.n, c.share]), [28, 16, 10], [undefined, "0", "0%"]);
  sheet("By day", ["Date", "Started", "Seen by a doctor", "Prescriptions released"], r.days.map((d) => [d.date, d.started, d.seen, d.released]), [22, 12, 18, 22], [undefined, "0", "0", "0"]);

  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${r.fileBase}.xlsx` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
