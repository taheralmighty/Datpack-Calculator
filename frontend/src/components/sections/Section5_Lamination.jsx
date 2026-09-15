import React from 'react';
import SectionCard from '../ui/SectionCard';
import PremiumSelect from '../ui/PremiumSelect';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { FORMULAS, LAMINATION_OPTIONS, formatINR } from '../../lib/calc';

export default function Lamination({ completion, calc }) {
  const { laminationType, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-5" title="Lamination" index={4} completion={completion} subtitle={formatINR(calc?.totalLamCost)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumSelect label="Lamination Type / Cost" value={laminationType} options={LAMINATION_OPTIONS} onChange={value => setField('laminationType', value)} data-testid="lamination-type" />
        <CalculatedEditableField label="Total Lamination Cost" calculatedValue={calc?.totalLamCost || 0} overrideValue={overrides?.totalLamCost}
          onOverride={value => setOverride('totalLamCost', value)} onReset={() => clearOverride('totalLamCost')}
          formulaTooltip={FORMULAS.totalLamCost} format={formatINR} data-testid="total-lam-cost" />
      </div>
    </SectionCard>
  );
}