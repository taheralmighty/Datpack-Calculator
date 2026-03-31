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

const Section7 = ({ completion, calc }) => {
  const { punchingRate, punchingSetup, dieCost, pastingRate, setField } = useCalculatorStore();
  return (
    <SectionCard id="section-7" title="Finishing (Die-Cutting & Pasting)" index={6} completion={completion}
      subtitle={calc ? formatINR(calc.dieCuttingCost + calc.pastingCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatedInput label="Punching Rate per 1000" value={punchingRate} onChange={v => setField('punchingRate', v)} type="number" unit="₹/k" data-testid="punching-rate-input" />
        <AnimatedInput label="Punching Setup Cost" value={punchingSetup} onChange={v => setField('punchingSetup', v)} type="number" unit="₹" data-testid="punching-setup-input" />
        <AnimatedInput label="Wooden Die Cost" value={dieCost} onChange={v => setField('dieCost', v)} type="number" unit="₹" data-testid="die-cost-input" />
        <AnimatedInput label="Pasting Rate per Box" value={pastingRate} onChange={v => setField('pastingRate', v)} type="number" unit="₹/box" data-testid="pasting-rate-input" />
        <CalcDisplay label="Total Die-Cutting Cost" value={formatINR(calc?.dieCuttingCost)} testId="total-die-cutting-cost" />
        <CalcDisplay label="Total Pasting Cost" value={formatINR(calc?.pastingCost)} testId="total-pasting-cost" />
      </div>
    </SectionCard>
  );
};

export default Section7;
