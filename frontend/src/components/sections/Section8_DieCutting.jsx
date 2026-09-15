import React from 'react';
import SectionCard from '../ui/SectionCard';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR, FORMULAS } from '../../lib/calc';

const DieCutting = ({ completion, calc }) => {
  const { overrides, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-8" title="Die Cutting" index={7} completion={completion}
      subtitle={calc ? formatINR(calc.totalPunchingCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CalculatedEditableField label="Punch Cost" calculatedValue={calc?.punchCost || 0} formulaTooltip={FORMULAS.punching} format={formatINR} data-testid="punch-cost" />
        <CalculatedEditableField label="Punching Cost per 1000" calculatedValue={calc?.punchingCostPer1000 || 0} formulaTooltip={FORMULAS.punching} format={formatINR} data-testid="punching-cost-per-1000" />
        <CalculatedEditableField
          label="Total Punching Cost"
          calculatedValue={calc?.dieCuttingCost || 0}
          overrideValue={overrides?.totalDieCuttingCost}
          formulaTooltip={FORMULAS.totalDieCuttingCost} format={formatINR}
          onOverride={v => setOverride('totalDieCuttingCost', v)}
          onReset={() => clearOverride('totalDieCuttingCost')}
          data-testid="total-die-cutting-cost"
        />
      </div>
    </SectionCard>
  );
};

export default DieCutting;