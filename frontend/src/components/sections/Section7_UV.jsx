import React from 'react';
import SectionCard from '../ui/SectionCard';
import PremiumSelect from '../ui/PremiumSelect';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { FORMULAS, UV_OPTIONS, formatINR } from '../../lib/calc';

export default function UV({ completion, calc }) {
  const { uvType, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-7" title="UV" index={6} completion={completion} subtitle={formatINR(calc?.totalUVCost)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumSelect label="UV Type" value={uvType} options={UV_OPTIONS} onChange={value => setField('uvType', value)} data-testid="uv-type" />
        <CalculatedEditableField label="UV Rate" calculatedValue={calc?.uvRate || 0} formulaTooltip={FORMULAS.uv} format={formatINR} data-testid="uv-rate" />
        <CalculatedEditableField label="Total UV Cost" calculatedValue={calc?.totalUVCost || 0} overrideValue={overrides?.totalSpotUVCost}
          onOverride={value => setOverride('totalSpotUVCost', value)} onReset={() => clearOverride('totalSpotUVCost')}
          formulaTooltip={FORMULAS.totalSpotUVCost} format={formatINR} data-testid="total-uv-cost" />
      </div>
    </SectionCard>
  );
}