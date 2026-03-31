import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const CalcDisplay = ({ label, value, testId }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</label>
    <div className="px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] tabular-nums text-[var(--text-primary)]" data-testid={testId}>
      {value}
    </div>
  </div>
);

const Section6 = ({ completion, calc }) => {
  const { foilLength, foilWidth, foilBlockRate, foilingSetup, foilingRunRate, uvScreenCost, uvRunRate, setField } = useCalculatorStore();
  return (
    <SectionCard id="section-6" title="Premium Finishes (Foiling & Spot UV)" index={5} completion={completion}
      subtitle={calc ? formatINR(calc.foilingCost + calc.uvCost) : undefined}>
      <div className="space-y-6">
        {/* Foiling */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--copper)] uppercase tracking-wider mb-3">Hot Foiling</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatedInput label="Foil Area Length" value={foilLength} onChange={v => setField('foilLength', v)} type="number" unit="mm" data-testid="foil-length-input" />
            <AnimatedInput label="Foil Area Width" value={foilWidth} onChange={v => setField('foilWidth', v)} type="number" unit="mm" data-testid="foil-width-input" />
            <AnimatedInput label="Foil Block Rate" value={foilBlockRate} onChange={v => setField('foilBlockRate', v)} type="number" unit="₹/in²" data-testid="foil-block-rate-input" />
            <AnimatedInput label="Foiling Setup Cost" value={foilingSetup} onChange={v => setField('foilingSetup', v)} type="number" unit="₹" data-testid="foiling-setup-input" />
            <AnimatedInput label="Foiling Run Rate per 1000" value={foilingRunRate} onChange={v => setField('foilingRunRate', v)} type="number" unit="₹/k" data-testid="foiling-run-rate-input" />
            <CalcDisplay label="Foil Block Cost" value={formatINR(calc?.foilBlockCost)} testId="foil-block-cost" />
            <CalcDisplay label="Total Foiling Cost" value={formatINR(calc?.foilingCost)} testId="total-foiling-cost" />
          </div>
        </div>
        {/* Spot UV */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--copper)] uppercase tracking-wider mb-3">Spot UV</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatedInput label="UV Screen Cost" value={uvScreenCost} onChange={v => setField('uvScreenCost', v)} type="number" unit="₹" data-testid="uv-screen-cost-input" />
            <AnimatedInput label="UV Run Rate per 1000" value={uvRunRate} onChange={v => setField('uvRunRate', v)} type="number" unit="₹/k" data-testid="uv-run-rate-input" />
            <CalcDisplay label="Total Spot UV Cost" value={formatINR(calc?.uvCost)} testId="total-uv-cost" />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default Section6;
