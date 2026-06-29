import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const Section4 = ({ completion, calc }) => {
  const { paperRate, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-4" title="Paper Cost" index={3} completion={completion}
      subtitle={calc ? formatINR(calc.paperCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CalculatedEditableField
          label="Weight per Sheet (kg)"
          calculatedValue={calc?.weightPerSheet || 0}
          overrideValue={overrides?.weightPerSheet}
          onOverride={v => setOverride('weightPerSheet', v)}
          onReset={() => clearOverride('weightPerSheet')}
          formulaTooltip="(Master Length × Master Width × GSM) ÷ 1,550,000"
          format={v => (parseFloat(v) || 0).toFixed(6)}
          data-testid="weight-per-sheet"
        />
        <CalculatedEditableField
          label="Total Paper Weight (kg)"
          calculatedValue={calc?.totalWeight || 0}
          overrideValue={overrides?.totalWeight}
          onOverride={v => setOverride('totalWeight', v)}
          onReset={() => clearOverride('totalWeight')}
          formulaTooltip="Gross Sheets × Weight per Sheet"
          format={v => (parseFloat(v) || 0).toFixed(3)}
          data-testid="total-weight"
        />
        <AnimatedInput label="Paper Rate per kg (₹)" value={paperRate} onChange={v => setField('paperRate', v)} type="number" placeholder="120" unit="₹/kg" data-testid="paper-rate-input" />
        <CalculatedEditableField
          label="Total Paper Cost"
          calculatedValue={calc?.paperCost || 0}
          formulaTooltip="Total Paper Weight × Paper Rate per kg"
          onOverride={v => setOverride('totalPaperCost', v)}
          onReset={() => clearOverride('totalPaperCost')}
          data-testid="total-paper-cost"
        />
      </div>
    </SectionCard>
  );
};

export default Section4;
