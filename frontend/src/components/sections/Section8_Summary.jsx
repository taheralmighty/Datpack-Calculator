import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CostBreakdownChart from '../ui/CostBreakdownChart';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const ResultRow = ({ label, value, highlight, testId }) => (
  <div className={`flex justify-between items-center py-2 border-b border-[var(--border)] last:border-0 ${highlight ? 'font-bold' : ''}`}>
    <span className={`text-sm ${highlight ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{label}</span>
    <span className={`text-sm tabular-nums font-semibold ${highlight ? 'text-[var(--copper)] text-base' : 'text-[var(--text-primary)]'}`} data-testid={testId}>
      {value}
    </span>
  </div>
);

const Section8 = ({ completion, calc }) => {
  const { margin, gst, setField } = useCalculatorStore();
  const marginPct = margin * 100;
  const gstPct = gst * 100;
  const marginWarn = marginPct > 80 ? 'Margin above 80% — is this intentional?' : undefined;

  return (
    <SectionCard id="section-8" title="Final Summary & Pricing" index={7} completion={completion}
      subtitle={calc ? formatINR(calc.grandTotal) : undefined}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AnimatedInput
              label="Desired Profit Margin %"
              value={marginPct || ''}
              onChange={v => setField('margin', parseFloat(v) / 100 || 0)}
              type="number"
              unit="%"
              placeholder="20"
              error={marginWarn}
              data-testid="margin-input"
            />
            <AnimatedInput
              label="GST %"
              value={gstPct || ''}
              onChange={v => setField('gst', parseFloat(v) / 100 || 0)}
              type="number"
              unit="%"
              placeholder="18"
              data-testid="gst-input"
            />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 space-y-0" data-testid="pricing-summary">
            <ResultRow label="Total Production Cost" value={formatINR(calc?.totalProductionCost)} testId="production-cost-display" />
            <ResultRow label="Cost Per Unit" value={formatINR(calc?.costPerUnit)} testId="cost-per-unit-display" />
            <ResultRow label="Selling Price / Unit" value={formatINR(calc?.sellingPricePerUnit)} testId="selling-price-display" />
            <ResultRow label="Subtotal Quote Value" value={formatINR(calc?.totalQuoteValue)} testId="subtotal-display" />
            <ResultRow label={`GST (${gstPct || 18}%)`} value={formatINR(calc?.gstAmount)} testId="gst-amount-display" />
            <ResultRow label="Grand Total w/ GST" value={formatINR(calc?.grandTotal)} highlight testId="final-total-display" />
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">Cost Breakdown</h4>
          <CostBreakdownChart data={calc?.breakdown} />
        </div>
      </div>
    </SectionCard>
  );
};

export default Section8;
