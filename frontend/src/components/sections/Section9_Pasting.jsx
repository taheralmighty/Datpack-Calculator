import React from 'react';
import SectionCard from '../ui/SectionCard';
import PremiumSelect from '../ui/PremiumSelect';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { FORMULAS, PASTING_OPTIONS, formatINR } from '../../lib/calc';

export default function Pasting({ completion, calc }) {
  const { pastingType, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-9" title="Pasting" index={8} completion={completion} subtitle={formatINR(calc?.totalPastingCost)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumSelect label="Type of Pasting" value={pastingType} options={PASTING_OPTIONS} onChange={value => setField('pastingType', value)} data-testid="pasting-type" />
        <CalculatedEditableField label="Total Pasting Cost" calculatedValue={calc?.totalPastingCost || 0} overrideValue={overrides?.totalPastingCost}
          onOverride={value => setOverride('totalPastingCost', value)} onReset={() => clearOverride('totalPastingCost')}
          formulaTooltip={FORMULAS.totalPastingCost} format={formatINR} data-testid="total-pasting-cost" />
      </div>
    </SectionCard>
  );
}