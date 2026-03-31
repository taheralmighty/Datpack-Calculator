import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import useCalculatorStore from '../../store/calculatorStore';

const Section2 = ({ completion }) => {
  const { masterLength, masterWidth, gsm, setField } = useCalculatorStore();
  const gsmWarn = gsm && (parseFloat(gsm) < 60 || parseFloat(gsm) > 450) ? 'GSM is typically between 60–450' : undefined;
  return (
    <SectionCard id="section-2" title="Paper Specifications" index={1} defaultOpen completion={completion}
      subtitle={masterLength && masterWidth ? `${masterLength}×${masterWidth}mm · ${gsm || 0}gsm` : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AnimatedInput label="Master Sheet Length" value={masterLength} onChange={v => setField('masterLength', v)} type="number" unit="mm" placeholder="700" data-testid="master-length-input" />
        <AnimatedInput label="Master Sheet Width" value={masterWidth} onChange={v => setField('masterWidth', v)} type="number" unit="mm" placeholder="500" data-testid="master-width-input" />
        <AnimatedInput label="Paper GSM" value={gsm} onChange={v => setField('gsm', v)} type="number" placeholder="300" unit="gsm"
          error={gsmWarn} data-testid="gsm-input" />
      </div>
    </SectionCard>
  );
};

export default Section2;
