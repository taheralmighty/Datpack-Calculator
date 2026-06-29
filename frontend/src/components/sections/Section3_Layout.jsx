import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';

const Section3 = ({ completion, calc }) => {
  const { platenWastage, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-3" title="Layout & Quantity" index={2} defaultOpen completion={completion}
      subtitle={calc ? `${calc.grossSheets} gross sheets` : undefined}>
      {/* Row 1 — inputs side by side */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <AnimatedInput
          label="Ups per Sheet"
          value={overrides?.upsPerSheet ?? (calc?.upsPerSheet || '')}
          onChange={v => setOverride('upsPerSheet', parseFloat(v) || 0)}
          type="number"
          placeholder="0"
          data-testid="ups-per-sheet"
        />
        <AnimatedInput
          label="Platen Wastage %"
          value={platenWastage ? +(platenWastage * 100).toFixed(4) : 0}
          onChange={v => setField('platenWastage', parseFloat(v) / 100 || 0)}
          type="number"
          unit="%"
          placeholder="5"
          data-testid="wastage-input"
        />
      </div>

      {/* Row 2 — calculated fields side by side */}
      <div className="grid grid-cols-2 gap-4">
        <CalculatedEditableField
          label="Net Sheets Required"
          calculatedValue={calc?.netSheets || 0}
          overrideValue={overrides?.netSheets}
          onOverride={v => setOverride('netSheets', v)}
          onReset={() => clearOverride('netSheets')}
          formulaTooltip="RoundUp(Order Qty ÷ Ups per Sheet)"
          data-testid="net-sheets"
        />
        <CalculatedEditableField
          label="Gross Sheets Needed"
          calculatedValue={calc?.grossSheets || 0}
          overrideValue={overrides?.grossSheets}
          onOverride={v => setOverride('grossSheets', v)}
          onReset={() => clearOverride('grossSheets')}
          formulaTooltip="RoundUp(Net Sheets × (1 + Wastage %))"
          data-testid="gross-sheets"
        />
      </div>
    </SectionCard>
  );
};

export default Section3;
