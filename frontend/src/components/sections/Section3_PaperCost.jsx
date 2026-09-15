import React from 'react';
import SectionCard from '../ui/SectionCard';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR, FORMULAS } from '../../lib/calc';

const PaperCost = ({ completion, calc }) => {
  const { overrides, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-3" title="Paper Cost" index={2} completion={completion}
      subtitle={calc ? formatINR(calc.paperCost) : undefined}>
      <div className="space-y-2">
        <CalculatedEditableField
          label="Net Sheets Required"
          calculatedValue={calc?.netSheets || 0}
          overrideValue={overrides?.netSheets}
          onOverride={v => setOverride('netSheets', v)}
          onReset={() => clearOverride('netSheets')}
          formulaTooltip={FORMULAS.netSheets}
          data-testid="net-sheets"
        />
        <CalculatedEditableField
          label="Gross Sheets Needed"
          calculatedValue={calc?.grossSheets || 0}
          overrideValue={overrides?.grossSheets}
          onOverride={v => setOverride('grossSheets', v)}
          onReset={() => clearOverride('grossSheets')}
          formulaTooltip={FORMULAS.grossSheets}
          data-testid="gross-sheets"
        />
        <CalculatedEditableField
          label="Total Paper Cost"
          calculatedValue={calc?.paperCost || 0}
          overrideValue={overrides?.totalPaperCost}
          formulaTooltip={FORMULAS.totalPaperCost} format={formatINR}
          onOverride={v => setOverride('totalPaperCost', v)}
          onReset={() => clearOverride('totalPaperCost')}
          data-testid="total-paper-cost"
        />
      </div>
    </SectionCard>
  );
};

export default PaperCost;