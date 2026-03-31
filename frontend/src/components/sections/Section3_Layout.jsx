import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';

const Section3 = ({ completion, calc }) => {
  const { wastage, overrides, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-3" title="Layout & Quantity" index={2} defaultOpen completion={completion}
      subtitle={calc ? `${calc.grossSheets} gross sheets` : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <CalculatedEditableField
          label="Ups per Sheet"
          calculatedValue={calc?.upsPerSheet || 0}
          overrideValue={overrides?.upsPerSheet}
          onOverride={v => setOverride('upsPerSheet', v)}
          onReset={() => clearOverride('upsPerSheet')}
          tooltip="Floor(Master Length ÷ Flat Length) × Floor(Master Width ÷ Flat Width)"
          data-testid="ups-per-sheet"
        />
        <CalculatedEditableField
          label="Net Sheets Required"
          calculatedValue={calc?.netSheets || 0}
          overrideValue={overrides?.netSheets}
          onOverride={v => setOverride('netSheets', v)}
          onReset={() => clearOverride('netSheets')}
          tooltip="RoundUp(Order Qty ÷ Ups per Sheet)"
          data-testid="net-sheets"
        />
        <AnimatedInput label="Platen Wastage %" value={wastage} onChange={v => setField('wastage', v)} type="number" unit="%" placeholder="5" data-testid="wastage-input" />
        <CalculatedEditableField
          label="Gross Sheets Needed"
          calculatedValue={calc?.grossSheets || 0}
          overrideValue={overrides?.grossSheets}
          onOverride={v => setOverride('grossSheets', v)}
          onReset={() => clearOverride('grossSheets')}
          tooltip="RoundUp(Net Sheets × (1 + Wastage %))"
          data-testid="gross-sheets"
        />
      </div>
    </SectionCard>
  );
};

export default Section3;
