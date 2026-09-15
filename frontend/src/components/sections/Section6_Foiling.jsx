import React from 'react';
import SectionCard from '../ui/SectionCard';
import PremiumSelect from '../ui/PremiumSelect';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR, FORMULAS, FOILING_SIZES } from '../../lib/calc';

const Foiling = ({ completion, calc }) => {
  const { foilingSize, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-6" title="Foiling" index={5} completion={completion}
      subtitle={calc ? formatINR(calc.totalFoilingCost) : undefined}>
      <div className="space-y-6">
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PremiumSelect label="Foiling Size" value={foilingSize} options={FOILING_SIZES} onChange={v => setField('foilingSize', v)} data-testid="foiling-size" />
            <CalculatedEditableField
              label="Foiling Block Cost"
              calculatedValue={calc?.foilingBlockCost || 0}
              formulaTooltip={FORMULAS.foiling} format={formatINR}
              data-testid="foil-block-cost"
            />
            <CalculatedEditableField label="Foiling Run Rate" calculatedValue={calc?.foilingRunRate || 0} formulaTooltip={FORMULAS.foiling} format={formatINR} data-testid="foiling-run-rate" />
            <CalculatedEditableField
              label="Total Foiling Cost"
              calculatedValue={calc?.foilingCost || 0}
              overrideValue={overrides?.totalFoilingCost}
              formulaTooltip={FORMULAS.totalFoilingCost} format={formatINR}
              onOverride={v => setOverride('totalFoilingCost', v)}
              onReset={() => clearOverride('totalFoilingCost')}
              data-testid="total-foiling-cost"
            />
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default Foiling;