import React from 'react';
import { MapPin, Phone, Mail, Globe, Factory } from 'lucide-react';
import logoSrc from '../assets/logo-copper.png';

/*
 * QuotationPDFTemplate
 * Mirrors pdf copy 2.js layout in HTML so html2canvas captures it faithfully.
 * Gives us: real logo, native Rs. symbol, Lucide icons - impossible in pure jsPDF.
 */

const CU = '#C8956C';
const BK = '#1A1A1A';
const WH = '#FFFFFF';
const GR = '#827D78';
const LGR = '#F6F5F2';
const CUL = '#FDF4EE';
const P = '0 53px';   // horizontal page padding (matching ML=14mm~53px)

const fmt = (n) => {
    if (!n || isNaN(n) || Number(n) === 0) return '₹ --';
    return '₹ ' + Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
};

const QuotationPDFTemplate = ({ state, calc, client }) => {
    if (!state || !calc) return null;

    const qNum = state._quoteNumber || state.quoteNumber || 'QT-DRAFT';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const cName = (client && client.name) ? client.name : (state.clientName || 'Client Name');
    const jobName = state.jobName || '';
    const qty = (state.orderQty || 0).toLocaleString('en-IN');
    const gstPct = Math.round((state.gst || 0.18) * 100);
    const marginPct = Math.round((state.margin || 0.20) * 100);
    const fL = state.flatLength || 0;
    const fW = state.flatWidth || 0;
    const gsm = state.gsm || 0;

    const hasPaper = (state.paperRate || 0) > 0;
    const hasPrint = (state.clickCharge || 0) > 0 || (state.lamRate || 0) > 0;
    const hasFinish1 = (state.foilLength || 0) > 0 || (state.uvScreenCost || 0) > 0;
    const hasFinish2 = (state.punchingRate || 0) > 0 || (state.pastingRate || 0) > 0;
    const hasBreakdown = hasPaper || hasPrint || hasFinish1 || hasFinish2;
    const hasTooling = (calc.oneTimeTooling || 0) > 0;
    const hasRepeat = state.isRepeatOrder === true;

    const bdRows = [
        hasPaper && ['Paper & Materials', fmt(calc.totalPaperCost)],
        hasPrint && ['Printing & Lamination', fmt(calc.totalPrintCost + calc.totalLamCost)],
        hasFinish1 && ['Premium Finishes (Foiling / UV)', fmt(calc.totalFoilingCost + calc.totalSpotUVCost)],
        hasFinish2 && ['Finishing (Die-cutting / Pasting)', fmt(calc.totalDieCuttingCost + calc.totalPastingCost)],
    ].filter(Boolean);

    /* shared inline-style shortcuts */
    const mono = { fontFamily: "'Courier New', monospace" };
    const bold = { fontWeight: '700' };

    return (
        <div
            data-pdf-root="true"
            style={{ width: '794px', minHeight: '1123px', backgroundColor: WH, fontFamily: 'Arial, Helvetica, sans-serif', color: BK, boxSizing: 'border-box' }}
        >
            {/* ═══ COPPER TOP STRIP (matches fc(doc,CU); doc.rect(0,0,W,2,'F')) ═══ */}
            <div style={{ height: '7px', backgroundColor: CU, width: '100%' }} />

            {/* ═══ HEADER ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 53px 0 53px' }}>

                {/* Logo + company name — matches: roundedRect placeholder, text at nameX */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <img
                        src={logoSrc}
                        alt="Dat Pack Co."
                        crossOrigin="anonymous"
                        style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '3px' }}>
                        <div style={{ ...bold, fontSize: '17px', color: BK, letterSpacing: '0.3px', lineHeight: '1.1' }}>DAT PACK CO.</div>
                        <div style={{ fontSize: '9.5px', color: GR, fontStyle: 'italic', marginTop: '4px' }}>Premium Packaging Solutions</div>
                    </div>
                </div>

                {/* Contact block — matches prefix+right-aligned text, now with real icons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', paddingTop: '4px' }}>
                    {[
                        { Icon: MapPin, text: 'B-412, Sussex Industrial Estate, Byculla East, Mumbai 400027' },
                        { Icon: Factory, text: '72 D.C. Road, Gandhi Nagar, Upper Worli, Mumbai 400018' },
                        { Icon: Phone, text: '+91 8591127248' },
                        { Icon: Mail, text: 'datbagco@gmail.com | info@datpackco.in' },
                        { Icon: Globe, text: 'datpackco.in | @datpackco' },
                    ].map(({ Icon, text }, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <Icon size={9} color={CU} strokeWidth={1.5} />
                            <span style={{ fontSize: '8px', color: GR }}>{text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Full-width copper rule — matches dc(doc,CU); lw(0.7); line(...) */}
            <div style={{ margin: '18px 53px 0 53px', height: '0.8px', backgroundColor: CU }} />

            {/* ═══ SECTION 2 — META ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '28px 53px 0 53px' }}>

                {/* Left title block */}
                <div>
                    <div style={{ ...bold, fontSize: '30px', color: BK, lineHeight: '1' }}>QUOTATION</div>
                    <div style={{ fontSize: '10px', color: GR, marginTop: '13px' }}>{qNum}</div>
                    <div style={{ fontSize: '10px', color: GR, marginTop: '5px' }}>Date: {dateStr}</div>
                    <div style={{ fontSize: '9px', color: GR, fontStyle: 'italic', marginTop: '6px' }}>Valid for 30 days from date of issue.</div>
                </div>

                {/* Client card — matches roundedRect + copper bar + text */}
                <div style={{
                    border: '0.5px solid ' + CU,
                    borderLeft: '3px solid ' + CU,
                    borderRadius: '4px',
                    backgroundColor: '#FDF8F4',
                    padding: '14px 18px 16px 18px',
                    minWidth: '220px',
                    maxWidth: '260px',
                }}>
                    <div style={{ fontSize: '7px', ...bold, color: CU, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '9px' }}>PREPARED FOR</div>
                    <div style={{ fontSize: '15px', ...bold, color: BK, marginBottom: '7px' }}>
                        {cName.length > 22 ? cName.slice(0, 22) + '...' : cName}
                    </div>
                    {jobName && (
                        <div style={{ fontSize: '9px', color: GR, marginBottom: '7px' }}>
                            {jobName.length > 26 ? jobName.slice(0, 26) + '...' : jobName}
                        </div>
                    )}
                    <div style={{ fontSize: '9px', ...bold, color: BK, marginTop: '2px' }}>Order Qty: {qty} pcs</div>
                </div>
            </div>

            {/* ═══ SECTION 3 — MAIN ITEMS TABLE ═══ */}
            <div style={{ padding: '22px 53px 0 53px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <thead>
                        <tr style={{ backgroundColor: BK, color: WH }}>
                            <th style={{ padding: '9px 10px', textAlign: 'left', width: '26px', fontSize: '9px' }}>#</th>
                            <th style={{ padding: '9px 10px', textAlign: 'left', fontSize: '9px' }}>Description</th>
                            <th style={{ padding: '9px 10px', textAlign: 'center', width: '60px', fontSize: '9px' }}>Qty</th>
                            <th style={{ padding: '9px 10px', textAlign: 'right', width: '100px', fontSize: '9px' }}>Unit Price</th>
                            <th style={{ padding: '9px 10px', textAlign: 'right', width: '108px', fontSize: '9px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ backgroundColor: WH }}>
                            <td style={{ padding: '14px 10px', verticalAlign: 'top', color: GR }}>01</td>
                            <td style={{ padding: '14px 10px', verticalAlign: 'top' }}>
                                <div style={{ ...bold, color: BK, marginBottom: '3px' }}>Custom Packaging Box</div>
                                {jobName && <div style={{ fontSize: '9px', color: GR, marginBottom: '2px' }}>{jobName}</div>}
                                <div style={{ fontSize: '9px', color: GR }}>{fL} x {fW} in &nbsp;|&nbsp; {gsm} GSM &nbsp;|&nbsp; Qty: {qty} pcs</div>
                            </td>
                            <td style={{ padding: '14px 10px', textAlign: 'center', verticalAlign: 'top' }}>{qty}</td>
                            <td style={{ padding: '14px 10px', textAlign: 'right', verticalAlign: 'top', ...mono, fontSize: '11px' }}>{fmt(calc.sellingPricePerUnit)}</td>
                            <td style={{ padding: '14px 10px', textAlign: 'right', verticalAlign: 'top', ...bold, ...mono, fontSize: '11px', borderBottom: '1.5px solid ' + CU }}>{fmt(calc.totalQuoteValue)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══ SECTION 4 — COST BREAKDOWN (conditional) ═══ */}
            {hasBreakdown && (
                <div style={{ padding: '18px 53px 0 53px' }}>
                    <div style={{ fontSize: '9px', ...bold, color: CU, letterSpacing: '1px', textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '0.5px solid ' + CU, display: 'inline-block', marginBottom: '8px' }}>
                        COST BREAKDOWN
                    </div>
                    <table style={{ width: '55%', borderCollapse: 'collapse', fontSize: '10px' }}>
                        <tbody>
                            {bdRows.map(([label, value], i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? LGR : WH }}>
                                    <td style={{ padding: '5px 8px', color: GR }}>{label}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'right', color: BK, ...mono }}>{value}</td>
                                </tr>
                            ))}
                            <tr style={{ borderTop: '1.5px solid ' + CU }}>
                                <td style={{ padding: '7px 8px', ...bold, color: BK }}>Total Production Cost</td>
                                <td style={{ padding: '7px 8px', textAlign: 'right', ...bold, color: BK, ...mono }}>{fmt(calc.totalProductionCost)}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '5px 8px', color: GR }}>Margin Applied</td>
                                <td style={{ padding: '5px 8px', textAlign: 'right', color: GR }}>{marginPct}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* ═══ SECTION 5 — TOOLING (conditional) ═══ */}
            {hasTooling && (
                <div style={{ margin: '18px 53px 0 53px', backgroundColor: CUL, borderRadius: '4px', borderLeft: '2.5px solid ' + CU, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                    <div>
                        <div style={{ fontSize: '10px', ...bold, color: BK }}>One-Time Tooling Setup</div>
                        <div style={{ fontSize: '8.5px', color: GR, fontStyle: 'italic', marginTop: '3px' }}>
                            Foil blocks, UV screens, wooden dies -- deducted in full on all repeat orders.
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', ...bold, color: CU, ...mono, marginLeft: '12px', whiteSpace: 'nowrap' }}>{fmt(calc.oneTimeTooling)}</div>
                </div>
            )}

            {/* ═══ SECTION 6 — PRICING SUMMARY (right half, matches sumX=W/2+14) ═══ */}
            <div style={{ padding: '18px 53px 0 53px', display: 'flex', justifyContent: 'flex-end' }}>
                <table style={{ width: '47%', borderCollapse: 'collapse', fontSize: '10px' }}>
                    <tbody>
                        <tr style={{ backgroundColor: LGR }}>
                            <td style={{ padding: '7px 12px', color: GR }}>Subtotal</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', color: BK, ...mono, fontSize: '11px' }}>{fmt(calc.totalQuoteValue)}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '7px 12px', color: GR }}>GST ({gstPct}%)</td>
                            <td style={{ padding: '7px 12px', textAlign: 'right', color: BK, ...mono, fontSize: '11px' }}>{fmt(calc.gstAmount)}</td>
                        </tr>
                        {/* Grand Total — copper tint + copper left accent bar (matches didDrawCell) */}
                        <tr style={{ backgroundColor: CUL }}>
                            <td style={{ padding: '9px 12px 9px 15px', ...bold, fontSize: '12px', color: BK, borderLeft: '2.5px solid ' + CU }}>Grand Total</td>
                            <td style={{ padding: '9px 12px', textAlign: 'right', ...bold, fontSize: '13px', color: CU, ...mono }}>{fmt(calc.grandTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ═══ SECTION 7 — REPEAT ORDER (conditional) ═══ */}
            {hasRepeat && (
                <div style={{ margin: '18px 53px 0 53px', backgroundColor: CUL, border: '0.5px solid ' + CU, borderRadius: '4px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '10px', ...bold, color: CU, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '5px' }}>REPEAT ORDER PRICING</div>
                    <div style={{ fontSize: '9px', color: GR, fontStyle: 'italic', marginBottom: '10px' }}>One-time tooling charges excluded from repeat orders.</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span style={{ color: GR }}>Subtotal (excl. tooling)</span>
                        <span style={{ ...mono }}>{fmt(calc.repeatQuoteValue)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '10px' }}>
                        <span style={{ color: GR }}>GST ({gstPct}%)</span>
                        <span style={{ ...mono }}>{fmt(calc.repeatGSTAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', ...bold, borderTop: '1px solid ' + CU, paddingTop: '8px' }}>
                        <span style={{ color: BK }}>Repeat Grand Total</span>
                        <span style={{ color: CU, ...mono }}>{fmt(calc.repeatGrandTotal)}</span>
                    </div>
                </div>
            )}

            {/* ═══ SECTION 8 — TERMS & NOTES ═══ */}
            <div style={{ margin: '18px 53px 0 53px', backgroundColor: LGR, borderRadius: '4px', padding: '13px 15px' }}>
                <div style={{ fontSize: '9px', ...bold, color: CU, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '7px' }}>TERMS & NOTES</div>
                {[
                    'This quotation is valid for 30 days from the date of issue.',
                    'Prices are subject to revision based on prevailing material costs at time of order.',
                    'GST is applicable as per government regulations at the rate specified above.',
                    'Tooling charges are one-time costs and are fully deductible on all repeat orders.',
                ].map((t, i) => (
                    <div key={i} style={{ fontSize: '9px', color: GR, marginBottom: '4px' }}>- {t}</div>
                ))}
            </div>

            {/* ═══ FOOTER ═══ */}
            <div style={{ margin: '20px 53px 0 53px', borderTop: '0.6px solid ' + CU, paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: GR }}>
                <span style={{ fontStyle: 'italic' }}>Thank you for your business.</span>
                <span>datpackco.in &nbsp;|&nbsp; datbagco@gmail.com</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '8px', color: '#AAA', paddingTop: '6px', paddingBottom: '28px' }}>
                Dat Pack Co. &nbsp;|&nbsp; Mumbai
            </div>
        </div>
    );
};

export default QuotationPDFTemplate;
