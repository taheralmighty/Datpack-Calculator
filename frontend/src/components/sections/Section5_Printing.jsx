import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import CalculatedEditableField from '../ui/CalculatedEditableField';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const Section5 = ({ completion, calc }) => {
  const { clickCharge, lamRate, setField, setOverride, clearOverride } = useCalculatorStore();
  return (
    <SectionCard id="section-5" title="Printing & Lamination" index={4} completion={completion}
      subtitle={calc ? formatINR(calc.printCost + calc.lamCost) : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CalculatedEditableField
          label="Total Impressions"
          calculatedValue={calc?.grossSheets || 0}
          formulaTooltip="Equal to Gross Sheets Needed"
          onOverride={v => setOverride('grossSheets', v)}
          onReset={() => clearOverride('grossSheets')}
          data-testid="total-impressions"
        />
        <AnimatedInput label="Click Charge per Sheet (₹)" value={clickCharge} onChange={v => setField('clickCharge', v)} type="number" placeholder="2.50" unit="₹" data-testid="click-charge-input" />
        <CalculatedEditableField
          label="Total Print Cost"
          calculatedValue={calc?.printCost || 0}
          formulaTooltip="Gross Sheets × Click Charge per Sheet"
          onOverride={v => setOverride('totalPrintCost', v)}
          onReset={() => clearOverride('totalPrintCost')}
          data-testid="total-print-cost"
        />
        <AnimatedInput label="Thermal Lam Rate per Sq. Inch (₹)" value={lamRate} onChange={v => setField('lamRate', v)} type="number" placeholder="0.015" unit="₹/in²" data-testid="lam-rate-input" />
        <CalculatedEditableField
          label="Sq. Inches per Sheet"
          calculatedValue={calc?.sqInPerSheet || 0}
          formulaTooltip="Flat Length × Flat Width (flat box area in square inches)"
          onOverride={v => setOverride('sqInchesPerSheet', v)}
          onReset={() => clearOverride('sqInchesPerSheet')}
          data-testid="sq-inches"
        />
        <CalculatedEditableField
          label="Total Lamination Cost"
          calculatedValue={calc?.lamCost || 0}
          formulaTooltip="Gross Sheets × Sq. Inches per Sheet × Lam Rate"
          onOverride={v => setOverride('totalLamCost', v)}
          onReset={() => clearOverride('totalLamCost')}
          data-testid="total-lam-cost"
        />
      </div>
    </SectionCard>
  );
};

export default Section5;
