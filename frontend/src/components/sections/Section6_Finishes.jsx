import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const Section6 = ({ completion, calc }) => {
  const { foilLength, foilWidth, foilBlockRate, foilingSetup, foilingRunRate, uvScreenCost, uvRunRate, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-6" title="Premium Finishes (Foiling & Spot UV)" index={5} completion={completion}
      subtitle={calc ? formatINR(calc.foilingCost + calc.uvCost) : undefined}>
      <div className="space-y-6">
        {/* Foiling */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--copper)] uppercase tracking-wider mb-3">Hot Foiling</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatedInput label="Foil Area Length" value={foilLength} onChange={v => setField('foilLength', v)} type="number" unit="in" data-testid="foil-length-input" />
            <AnimatedInput label="Foil Area Width" value={foilWidth} onChange={v => setField('foilWidth', v)} type="number" unit="in" data-testid="foil-width-input" />
            <AnimatedInput label="Foil Block Rate" value={foilBlockRate} onChange={v => setField('foilBlockRate', v)} type="number" unit="₹/in²" data-testid="foil-block-rate-input" />
            <AnimatedInput label="Foiling Setup Cost" value={foilingSetup} onChange={v => setField('foilingSetup', v)} type="number" unit="₹" data-testid="foiling-setup-input" />
            <AnimatedInput label="Foiling Run Rate per 1000" value={foilingRunRate} onChange={v => setField('foilingRunRate', v)} type="number" unit="₹/k" data-testid="foiling-run-rate-input" />
            <CalculatedEditableField
              label="Foil Block Cost"
              calculatedValue={calc?.foilBlockCost || 0}
              formulaTooltip="Foil Length × Foil Width × Foil Block Rate"
              onOverride={v => setOverride('foilBlockCost', v)}
              onReset={() => clearOverride('foilBlockCost')}
              data-testid="foil-block-cost"
            />
            <CalculatedEditableField
              label="Total Foiling Cost"
              calculatedValue={calc?.foilingCost || 0}
              formulaTooltip="(Gross Sheets ÷ 1000 × Run Rate) + Setup Cost + Block Cost"
              onOverride={v => setOverride('totalFoilingCost', v)}
              onReset={() => clearOverride('totalFoilingCost')}
              data-testid="total-foiling-cost"
            />
          </div>
        </div>
        {/* Spot UV */}
        <div>
          <h4 className="text-xs font-semibold text-[var(--copper)] uppercase tracking-wider mb-3">Spot UV</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatedInput label="UV Screen Cost" value={uvScreenCost} onChange={v => setField('uvScreenCost', v)} type="number" unit="₹" data-testid="uv-screen-cost-input" />
            <AnimatedInput label="UV Run Rate per 1000" value={uvRunRate} onChange={v => setField('uvRunRate', v)} type="number" unit="₹/k" data-testid="uv-run-rate-input" />
            <CalculatedEditableField
              label="Total Spot UV Cost"
              calculatedValue={calc?.uvCost || 0}
              formulaTooltip="(Gross Sheets ÷ 1000 × UV Run Rate) + UV Screen Cost"
              onOverride={v => setOverride('totalSpotUVCost', v)}
              onReset={() => clearOverride('totalSpotUVCost')}
              data-testid="total-uv-cost"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default Section6;
