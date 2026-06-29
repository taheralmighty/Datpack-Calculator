import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const Section7 = ({ completion, calc }) => {
  const { punchingRate, punchingSetup, woodenDieCost, pastingRate, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-7" title="Finishing (Die-Cutting & Pasting)" index={6} completion={completion}
      subtitle={calc ? formatINR(calc.dieCuttingCost + calc.pastingCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatedInput label="Punching Rate per 1000" value={punchingRate} onChange={v => setField('punchingRate', v)} type="number" unit="₹/k" data-testid="punching-rate-input" />
        <AnimatedInput label="Punching Setup Cost" value={punchingSetup} onChange={v => setField('punchingSetup', v)} type="number" unit="₹" data-testid="punching-setup-input" />
        <AnimatedInput label="Wooden Die Cost" value={woodenDieCost} onChange={v => setField('woodenDieCost', v)} type="number" unit="₹" data-testid="die-cost-input" />
        <AnimatedInput label="Pasting Rate per Box" value={pastingRate} onChange={v => setField('pastingRate', v)} type="number" unit="₹/box" data-testid="pasting-rate-input" />
        <CalculatedEditableField
          label="Total Die-Cutting Cost"
          calculatedValue={calc?.dieCuttingCost || 0}
          formulaTooltip="(Gross Sheets ÷ 1000 × Punching Rate) + Setup Cost + Wooden Die Cost"
          onOverride={v => setOverride('totalDieCuttingCost', v)}
          onReset={() => clearOverride('totalDieCuttingCost')}
          data-testid="total-die-cutting-cost"
        />
        <CalculatedEditableField
          label="Total Pasting Cost"
          calculatedValue={calc?.pastingCost || 0}
          formulaTooltip="Order Qty × Pasting Rate per Box"
          onOverride={v => setOverride('totalPastingCost', v)}
          onReset={() => clearOverride('totalPastingCost')}
          data-testid="total-pasting-cost"
        />
      </div>
    </SectionCard>
  );
};

export default Section7;
