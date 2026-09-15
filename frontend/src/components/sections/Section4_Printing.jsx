import React from 'react';
import SectionCard from '../ui/SectionCard';
import PremiumSelect from '../ui/PremiumSelect';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR, FORMULAS, MACHINE_SIZES } from '../../lib/calc';

const Printing = ({ completion, calc }) => {
  const { machineSize, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-4" title="Printing" index={3} completion={completion}
      subtitle={calc ? formatINR(calc.totalPrintCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PremiumSelect label="Machine Size" value={machineSize} options={MACHINE_SIZES} onChange={v => setField('machineSize', v)} data-testid="machine-size" />
        <CalculatedEditableField label="Plate Cost" calculatedValue={calc?.plateCost || 0} formulaTooltip={FORMULAS.machine} format={formatINR} data-testid="plate-cost" />
        <CalculatedEditableField label="Print Price / 1000" calculatedValue={calc?.printPrice || 0} formulaTooltip={FORMULAS.machine} format={formatINR} data-testid="print-price" />
        <CalculatedEditableField label="Number of Thousands" calculatedValue={calc?.numberOfThousands || 0} formulaTooltip={FORMULAS.numberOfThousands} data-testid="number-of-thousands" />
        <CalculatedEditableField
          label="Total Print Cost"
          calculatedValue={calc?.printCost || 0}
          overrideValue={overrides?.totalPrintCost}
          formulaTooltip={FORMULAS.totalPrintCost} format={formatINR}
          onOverride={v => setOverride('totalPrintCost', v)}
          onReset={() => clearOverride('totalPrintCost')}
          data-testid="total-print-cost"
        />
      </div>
    </SectionCard>
  );
};

export default Printing;