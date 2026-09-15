import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calcAll, migrateState, documentPricing, MACHINE_SIZES, LAMINATION_OPTIONS, FOILING_SIZES, UV_OPTIONS, PASTING_OPTIONS } from './calc';
import { assertExportable } from './validation';
import { loadPDFLogo } from './pdfLogo';
import { registerPDFFont } from './pdfFont';

/* ─────────────────────────────────────────────────────────────
   COLOURS  (RGB arrays for jsPDF)
───────────────────────────────────────────────────────────── */
const CU = [200, 149, 108];   // copper
const CUL = [253, 244, 238];   // copper-light tint
const BK = [26, 26, 26];   // near-black
const WH = [255, 255, 255];   // white
const GR = [130, 125, 120];   // medium gray
const LGR = [246, 245, 242];   // light gray
const W = 210;               // page width mm
const ML = 14;                // left margin
const MR = 196;               // right edge (W - ML)

/* ─────────────────────────────────────────────────────────────
   LOCAL MONEY FORMATTER
───────────────────────────────────────────────────────────── */
function pdfMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return 'Rs. --';
  return 'Rs. ' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ─────────────────────────────────────────────────────────────
   TINY HELPERS
───────────────────────────────────────────────────────────── */
const tc = (d, c) => d.setTextColor(...c);
const dc = (d, c) => d.setDrawColor(...c);
const fc = (d, c) => d.setFillColor(...c);
const lw = (d, w) => d.setLineWidth(w);
const fnt = (d, sz, fam = 'helvetica', sty = 'normal') => {
  d.setFont(fam, sty); d.setFontSize(sz);
};
const today = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const rightText = (doc, text, x, y) => doc.text(text, x, y, { align: 'right' });

/* ─────────────────────────────────────────────────────────────
   MAIN EXPORT
───────────────────────────────────────────────────────────── */
export async function generatePDF(state, client, logoBase64, version = 1) {
  state = migrateState(state);
  assertExportable(state);
  const snapshot = state.issueSnapshot;
  if (snapshot) state = { ...snapshot.state, _quoteNumber: state._quoteNumber };
  const calc = snapshot?.calc || calcAll(state);
  const pricing = documentPricing(state, calc);

  // Resolve client name
  const clientName = state.clientName || client?.name || 'Client Name';

  // ── Load logo (from import if not supplied as base64) ──
  const resolvedLogo = logoBase64 ? { data: logoBase64, width: 14, height: 14 } : await loadPDFLogo();

  /* ── section guards ── */
  const hasBreakdown = calc.breakdown.length > 0;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const unicode = await registerPDFFont(doc, `${clientName} ${state.jobName || ''}`);
  const qNum = state._quoteNumber || state.quoteNumber || 'QT-DRAFT';
  let y = 0;

  /* ════════════════════════════════════════════════════════
     SECTION 1 — HEADER BAND  (from copy3.js, adapted)
  ════════════════════════════════════════════════════════ */

  // ── Top copper accent strip ──
  fc(doc, CU);
  doc.rect(0, 0, W, 2, 'F');

  y = 10;

  // ── LEFT: Logo + Company Name ──
  if (resolvedLogo) {
    doc.addImage(resolvedLogo.data, 'PNG', ML, y, 14 * resolvedLogo.width / resolvedLogo.height, 14, undefined, 'FAST');
    const nameX = ML + 18;
    fnt(doc, 13, 'helvetica', 'bold'); tc(doc, BK);
    doc.setCharSpace(0.8);
    doc.text('DAT PACK CO.', nameX, y + 6);
    doc.setCharSpace(0);
    fnt(doc, 7, 'helvetica', 'normal'); tc(doc, GR);
    doc.text('Premium Packaging Solutions', nameX, y + 11);
  } else {
    fnt(doc, 13, 'helvetica', 'bold'); tc(doc, BK);
    doc.setCharSpace(0.8);
    doc.text('DAT PACK CO.', ML, y + 6);
    doc.setCharSpace(0);
    fnt(doc, 7, 'helvetica', 'normal'); tc(doc, GR);
    doc.text('Premium Packaging Solutions', ML, y + 11);
  }

  // ── RIGHT: Contact block (ASCII only) ──
  const contactLines = [
    'B-412, Sussex Industrial Estate, Byculla East, Mumbai - 400027',
    '72 D.C. Road, Gandhi Nagar, Upper Worli, Mumbai - 400018',
    'Tel: +91 85911 27248',
    'E: datbagco@gmail.com | info@datpackco.in',
    'W: datpackco.in | IG: @datpackco',
  ];
  fnt(doc, 6.5, 'helvetica', 'normal'); tc(doc, GR);
  contactLines.forEach((line, i) => {
    rightText(doc, line, MR, y + 3 + (i * 4.2));
  });

  y += 26;

  // ── Full-width copper rule ──
  dc(doc, CU); lw(doc, 0.7);
  doc.line(ML, y, MR, y);

  /* ════════════════════════════════════════════════════════
     SECTION 2 — QUOTATION META
  ════════════════════════════════════════════════════════ */
  y += 8;

  // LEFT: QUOTATION title block
  fnt(doc, 19, 'helvetica', 'bold'); tc(doc, BK);
  doc.text('QUOTATION', ML, y + 8);

  fnt(doc, 7.5, 'helvetica', 'normal'); tc(doc, GR);
  doc.text(qNum + ' | Version ' + version, ML, y + 15);
  doc.text('Issued: ' + (state.issuedAt ? new Date(state.issuedAt).toLocaleDateString('en-IN') : 'Not issued'), ML, y + 19.5);
  fnt(doc, 7, 'helvetica', 'italic'); tc(doc, GR);
  doc.text('Valid for 30 days from date of issue.', ML, y + 24);

  // RIGHT: Client card
  const cardX = W / 2 + 8;
  const cardW = MR - cardX;
  const cardH = 30;
  doc.setFillColor(253, 248, 244);
  doc.setDrawColor(...CU);
  lw(doc, 0.4);
  doc.roundedRect(cardX, y, cardW, cardH, 3, 3, 'FD');

  // Left copper accent bar inside card
  dc(doc, CU); lw(doc, 2);
  doc.line(cardX + 1, y + 3, cardX + 1, y + cardH - 3);
  lw(doc, 0.3);

  const cx = cardX + 6;
  fnt(doc, 6.5, 'helvetica', 'bold'); tc(doc, CU);
  doc.text('PREPARED FOR', cx, y + 7);

  fnt(doc, 11, 'helvetica', 'bold'); tc(doc, BK);
  const displayName = clientName.length > 22 ? clientName.slice(0, 22) + '...' : clientName;
  doc.text(displayName, cx, y + 14);

  fnt(doc, 8, 'helvetica', 'normal'); tc(doc, GR);
  const jobName = state.jobName || '';
  doc.text(jobName.length > 26 ? jobName.slice(0, 26) + '...' : jobName, cx, y + 19);

  fnt(doc, 7.5, 'helvetica', 'normal'); tc(doc, BK);
  const qty = (state.orderQty || 0).toLocaleString('en-IN');
  doc.text('Order Qty: ' + qty + ' pcs', cx, y + 25);

  y += cardH + 8;

  /* ════════════════════════════════════════════════════════
     SECTION 3 — QUOTE LINE ITEMS TABLE
  ════════════════════════════════════════════════════════ */

  const gsm = state.gsm || 0;
  const descLine1 = 'Custom Packaging Box';
  const descLine2 = gsm + ' GSM  |  Qty: ' + qty + ' pcs';
  const selections = [
    MACHINE_SIZES[state.machineSize]?.label,
    LAMINATION_OPTIONS[state.laminationType]?.label,
    FOILING_SIZES[state.foilingSize] ? 'Foiling: ' + FOILING_SIZES[state.foilingSize].label : '',
    UV_OPTIONS[state.uvType]?.label,
    PASTING_OPTIONS[state.pastingType]?.label,
  ].filter(Boolean).join(' | ');

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML, bottom: 26, top: 14 },
    columns: [
      { header: '#', dataKey: 'no' },
      { header: 'Description', dataKey: 'desc' },
      { header: 'Qty', dataKey: 'qty' },
      { header: 'Unit Price', dataKey: 'unit' },
      { header: 'Amount', dataKey: 'total' },
    ],
    body: [{
      no: '01',
      desc: clientName + '\n' + descLine1 + '\n' + (jobName ? jobName + '\n' : '') + descLine2 + (selections ? '\n' + selections : ''),
      qty: qty,
      unit: pdfMoney(pricing.unitPrice),
      total: pdfMoney(pricing.extension),
    }, ...(pricing.rateAdjustment ? [{ no: '', desc: 'Rate rounding adjustment (full-precision quotation total)', qty: '', unit: '', total: pdfMoney(pricing.rateAdjustment) }] : [])],
    headStyles: {
      fillColor: BK, textColor: WH,
      fontSize: 8.5, fontStyle: 'bold',
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      textColor: BK,
    },
    alternateRowStyles: { fillColor: LGR },
    columnStyles: {
      no: { halign: 'center', cellWidth: 10 },
      desc: { halign: 'left', cellWidth: 'auto', ...(unicode ? { font: 'NotoDevanagari', fontStyle: 'normal' } : {}) },
      qty: { halign: 'center', cellWidth: 22 },
      unit: { halign: 'right', cellWidth: 30 },
      total: { halign: 'right', cellWidth: 30 },
    },
    didDrawCell: (data) => {
      if (data.column.dataKey === 'total' && data.row.section === 'body') {
        dc(doc, CU); lw(doc, 0.4);
        doc.line(
          data.cell.x, data.cell.y + data.cell.height,
          data.cell.x + data.cell.width, data.cell.y + data.cell.height
        );
      }
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Dynamic page-break helpers ──
  const PAGE_H = doc.internal.pageSize.getHeight();
  const BODY_BOTTOM = PAGE_H - 22; // 22 mm reserved for footer

  const drawFooter = () => {
    const footY = PAGE_H - 18;
    dc(doc, CU); lw(doc, 0.5);
    doc.line(ML, footY, MR, footY);
    fnt(doc, 7.5, 'helvetica', 'italic'); tc(doc, GR);
    doc.text('Thank you for your business.', ML, footY + 5);
    fnt(doc, 7.5, 'helvetica', 'normal');
    doc.text('datpackco.in  |  datbagco@gmail.com', MR, footY + 5, { align: 'right' });
    fnt(doc, 6, 'helvetica', 'normal'); tc(doc, [170, 165, 160]);
    doc.text('Dat Pack Co.  |  Mumbai', W / 2, footY + 9, { align: 'center' });
  };

  const checkPageBreak = (neededH) => {
    if (y + neededH > BODY_BOTTOM) {
      drawFooter();
      doc.addPage();
      fc(doc, CU); doc.rect(0, 0, W, 2, 'F'); // copper strip on new page
      y = 14;
    }
  };

  /* ════════════════════════════════════════════════════════
     SECTION 4 — COST BREAKDOWN (conditional)
  ════════════════════════════════════════════════════════ */
  if (hasBreakdown) {
    checkPageBreak(50);
    fnt(doc, 7, 'helvetica', 'bold'); tc(doc, CU);
    doc.text('COST BREAKDOWN', ML, y + 4);
    dc(doc, CU); lw(doc, 0.35);
    doc.line(ML, y + 5.5, ML + 44, y + 5.5);
    y += 10;

    const marginPct = +(Number(state.margin || 0) * 100).toFixed(4);
    const rows = pricing.costs.map(item => [item.name, pdfMoney(item.value)]);
    if (pricing.costAdjustment) rows.push(['Cost rounding adjustment', pdfMoney(pricing.costAdjustment)]);
    const totalRow = rows.length;
    rows.push(['Total Production Cost', pdfMoney(calc.totalProductionCost)]);
    rows.push(['Margin Applied', marginPct + '%']);

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: ML, bottom: 26, top: 14 },
      body: rows,
      showHead: false,
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        textColor: BK,
      },
      columnStyles: {
        0: { halign: 'left', textColor: GR, cellWidth: 100 },
        1: { halign: 'right', textColor: BK, cellWidth: 40 },
      },
      didParseCell: (data) => {
        if (data.row.index >= totalRow) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawCell: (data) => {
        if (data.row.index === totalRow && data.row.section === 'body' && data.column.index === 0) {
          dc(doc, CU); lw(doc, 0.4);
          doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width + 40, data.cell.y);
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  /* ════════════════════════════════════════════════════════
     SECTION 6 — PRICING SUMMARY (right-aligned)
  ════════════════════════════════════════════════════════ */
  const gstPct = +(Number(state.gst || 0) * 100).toFixed(4);
  const sumX = W / 2 + 14;
  const sumW = MR - sumX;

  checkPageBreak(45);
  autoTable(doc, {
    startY: y,
    margin: { left: sumX, right: ML, bottom: 26, top: 14 },
    tableWidth: sumW,
    body: [
      ['Subtotal', pdfMoney(calc.totalQuoteValue)],
      ['GST (' + gstPct + '%)', pdfMoney(calc.gstAmount)],
      ['Grand Total', pdfMoney(calc.grandTotal)],
      ...(pricing.taxAdjustment ? [['Tax rounding adjustment included', pdfMoney(pricing.taxAdjustment)]] : []),
    ],
    showHead: false,
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      textColor: BK,
    },
    columnStyles: {
      0: { halign: 'left', textColor: GR },
      1: { halign: 'right', textColor: BK },
    },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
        data.cell.styles.fillColor = CUL;
        data.cell.styles.textColor = data.column.index === 1 ? CU : BK;
      }
    },
    didDrawCell: (data) => {
      if (data.row.index === 2 && data.column.index === 0 && data.row.section === 'body') {
        dc(doc, CU); lw(doc, 2);
        doc.line(data.cell.x, data.cell.y + 1, data.cell.x, data.cell.y + data.cell.height - 1);
        lw(doc, 0.3);
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  /* ════════════════════════════════════════════════════════
     SECTION 8 — TERMS & NOTES
  ════════════════════════════════════════════════════════ */
  const notes = [
    'Generated: ' + today() + (state.revisedAt ? ' | Revised: ' + new Date(state.revisedAt).toLocaleDateString('en-IN') : ''),
    'This quotation is valid for 30 days from the date of issue.',
    'Prices are subject to revision based on prevailing material costs at time of order.',
    'GST is applicable as per government regulations at the rate specified above.',
  ];
  const noteH = 8 + notes.length * 5;

  checkPageBreak(noteH + 10);
  doc.setFillColor(...LGR);
  doc.roundedRect(ML, y, W - ML * 2, noteH, 3, 3, 'F');

  fnt(doc, 7, 'helvetica', 'bold'); tc(doc, CU);
  doc.text('TERMS & NOTES', ML + 5, y + 6);

  fnt(doc, 7, 'helvetica', 'normal'); tc(doc, GR);
  notes.forEach((note, i) => {
    doc.text('- ' + note, ML + 5, y + 12 + i * 5);
  });

  /* ════════════════════════════════════════════════════════
     FOOTER (pinned to bottom of current page)
  ════════════════════════════════════════════════════════ */
  drawFooter();

  if (doc.getNumberOfPages && doc.setPage) {
    for (let pageNumber = 1; pageNumber <= doc.getNumberOfPages(); pageNumber++) {
      doc.setPage(pageNumber);
      drawFooter();
    }
  }

  /* ════════════════════════════════════════════════════════
     SAVE
  ════════════════════════════════════════════════════════ */
  const safeName = (state.jobName || 'Quote').replace(/[^a-zA-Z0-9]/g, '-');
  doc.save('DatPackCo_' + safeName + '_' + qNum + '_v' + version + '.pdf');
}

export default generatePDF;