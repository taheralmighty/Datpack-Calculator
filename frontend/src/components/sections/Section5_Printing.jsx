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

const Section5 = ({ completion, calc }) => {
  const { clickCharge, lamRate, setField } = useCalculatorStore();
  return (
    <SectionCard id="section-5" title="Printing & Lamination" index={4} completion={completion}
      subtitle={calc ? formatINR(calc.printCost + calc.lamCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CalcDisplay label="Total Impressions" value={calc?.grossSheets || 0} testId="total-impressions" />
        <AnimatedInput label="Click Charge per Sheet (₹)" value={clickCharge} onChange={v => setField('clickCharge', v)} type="number" placeholder="2.50" unit="₹" data-testid="click-charge-input" />
        <CalcDisplay label="Total Print Cost" value={formatINR(calc?.printCost)} testId="total-print-cost" />
        <AnimatedInput label="Thermal Lam Rate per Sq. Inch (₹)" value={lamRate} onChange={v => setField('lamRate', v)} type="number" placeholder="0.015" unit="₹/in²" data-testid="lam-rate-input" />
        <CalcDisplay label="Sq. Inches per Sheet" value={(calc?.sqInPerSheet || 0).toFixed(2)} testId="sq-inches" />
        <CalcDisplay label="Total Lamination Cost" value={formatINR(calc?.lamCost)} testId="total-lam-cost" />
      </div>
    </SectionCard>
  );
};

export default Section5;
