import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { calcAll } from './calc';

const CU = '#C8956C';
const BK = '#1A1A1A';
const GY = '#555555';
const LG = '#F5F3F0';
const WH = '#FFFFFF';

const fmt = (v) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

export const generatePDF = (state, client) => {
  const calc = calcAll(state);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 14;

  // ── Header ─────────────────────────────────────────
  // Logo placeholder
  doc.setDrawColor(CU);
  doc.setLineWidth(0.3);
  doc.setLineDash([2, 2]);
  doc.roundedRect(14, y, 32, 20, 2, 2);
  doc.setLineDash([]);
  doc.setFontSize(8); doc.setTextColor(GY);
  doc.text('Company Logo', 30, y + 11, { align: 'center' });

  // Company name
  doc.setFontSize(16); doc.setTextColor(BK); doc.setFont('helvetica', 'bold');
  doc.text('Dat Pack Co.', 50, y + 7);

  // Right side contact info
  const contactLines = [
    'Dat Pack Co.',
    'Office: Sussex Industrial Estate, B-412, Byculla East, Mumbai – 400027',
    'Factory: 72, D.C. Road, Gandhi Nagar, Upper Worli, Mumbai, MH 400018',
    'Phone: +91 8591127248',
    'Email: datbagco@gmail.com | info@datpackco.in',
    'Instagram: @datpackco',
  ];
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(GY);
  contactLines.forEach((line, i) => {
    doc.text(line, W - 14, y + 4 + i * 3.5, { align: 'right' });
  });

  y += 24;
  // Copper rule
  doc.setDrawColor(CU); doc.setLineWidth(0.5);
  doc.line(14, y, W - 14, y);
  y += 8;

  // ── Document Meta ──────────────────────────────────
  // Left
  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(BK);
  doc.text('QUOTATION', 14, y + 8);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(GY);
  const quoteNo = state._quoteNumber || 'QT-DRAFT';
  doc.text(`Quotation No: ${quoteNo}`, 14, y + 15);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, y + 20);

  // Right
  doc.setFontSize(8); doc.setTextColor(CU); doc.setFont('helvetica', 'bold');
  doc.text('Prepared for:', W - 14, y + 4, { align: 'right' });
  doc.setFontSize(10); doc.setTextColor(BK); doc.setFont('helvetica', 'bold');
  doc.text(client?.name || state.clientName || 'Client', W - 14, y + 10, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(GY);
  doc.text(`Job Reference: ${state.jobName || '—'}`, W - 14, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.text('Valid for 30 days from date of issue.', W - 14, y + 22, { align: 'right' });

  y += 30;

  // ── Main Items Table ───────────────────────────────
  doc.autoTable({
    startY: y,
    head: [['#', 'Item Description', 'Qty', 'Unit Price', 'Total']],
    body: [[
      '1',
      `Custom Packaging Box — ${state.flatLength || 0}×${state.flatWidth || 0}mm, ${state.gsm || 0}gsm`,
      String(state.orderQty || 0),
      `₹${fmt(calc.sellingPricePerUnit)}`,
      `₹${fmt(calc.subtotal)}`,
    ]],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, textColor: BK },
    headStyles: { fillColor: [26, 26, 26], textColor: [250, 250, 250], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 243, 240] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { halign: 'left' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
      4: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Tooling Line Item ──────────────────────────────
  doc.setFillColor(255, 253, 250);
  doc.rect(14, y, W - 28, 16, 'F');
  doc.setDrawColor(CU); doc.setLineWidth(2);
  doc.line(14, y, 14, y + 16);
  doc.setLineWidth(0.3); doc.setDrawColor('#E8E8E6');
  doc.rect(14, y, W - 28, 16);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(BK);
  doc.text('One-Time Tooling Setup (Dies, Foil Blocks, UV Screens)', 20, y + 6);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(GY);
  doc.text('Fully deductible on all repeat orders.', 20, y + 11);
  doc.setFontSize(9); doc.setTextColor(CU); doc.setFont('helvetica', 'bold');
  doc.text(`₹${fmt(calc.oneTimeTooling)}`, W - 18, y + 8, { align: 'right' });
  y += 22;

  // ── Pricing Summary ────────────────────────────────
  const gstAmt = calc.subtotal * (parseFloat(state.gst) / 100);
  doc.autoTable({
    startY: y,
    body: [
      ['Subtotal', `₹${fmt(calc.subtotal)}`],
      [`GST (${state.gst || 18}%)`, `₹${fmt(gstAmt)}`],
      ['Grand Total', `₹${fmt(calc.finalTotal)}`],
    ],
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 40, halign: 'left', textColor: GY },
      1: { cellWidth: 40, halign: 'right', textColor: BK },
    },
    bodyStyles: { fillColor: false },
    didParseCell: function (data) {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 11;
        data.cell.styles.textColor = data.column.index === 1 ? [200, 149, 108] : [26, 26, 26];
      }
    },
    tableWidth: 80,
    margin: { left: W - 80 - 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Repeat Order Block ─────────────────────────────
  if (state.isRepeatOrder) {
    const repGst = calc.repeatSubtotal * (parseFloat(state.gst) / 100);
    doc.setFillColor(253, 244, 238);
    const boxH = 32;
    doc.roundedRect(14, y, W - 28, boxH, 3, 3, 'F');
    doc.setDrawColor(CU); doc.setLineWidth(0.5);
    doc.roundedRect(14, y, W - 28, boxH, 3, 3, 'S');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(CU);
    doc.text('REPEAT ORDER PRICING', 20, y + 8);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(GY);
    doc.text('(One-time tooling charges excluded)', 20, y + 13);
    doc.setTextColor(BK);
    doc.text(`Subtotal (excl. tooling): ₹${fmt(calc.repeatSubtotal)}`, 20, y + 19);
    doc.text(`GST (${state.gst || 18}%): ₹${fmt(repGst)}`, 20, y + 24);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(CU);
    doc.text(`Repeat Grand Total: ₹${fmt(calc.repeatFinalTotal)}`, 20, y + 30);
    y += boxH + 8;
  }

  // ── Footer ─────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(CU); doc.setLineWidth(0.5);
  doc.line(14, footerY - 4, W - 14, footerY - 4);
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(BK);
  doc.text('Thank you for your business.', 14, footerY);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(GY);
  doc.text('datpackco.in | datbagco@gmail.com', W - 14, footerY, { align: 'right' });
  doc.setFontSize(7); doc.setFont('helvetica', 'italic');
  doc.text('This quotation is valid for 30 days. Prices subject to change based on material costs. GST applicable as per government norms.', 14, footerY + 5);

  doc.save(`DatPack_Quote_${state._quoteNumber || 'Draft'}.pdf`);
};
