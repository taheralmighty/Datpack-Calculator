import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import useCalculatorStore from '../../store/calculatorStore';

const Section1 = ({ completion }) => {
  const { clientName, jobName, orderQty, flatLength, flatWidth, setField } = useCalculatorStore();
  return (
    <SectionCard id="section-1" title="Job Specifications" index={0} defaultOpen completion={completion}
      subtitle={jobName ? `${jobName} · Qty: ${orderQty || 0}` : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatedInput label="Client Name" value={clientName} onChange={v => setField('clientName', v)} placeholder="e.g. Acme Ltd." data-testid="client-name-input" />
        <AnimatedInput label="Job Name" value={jobName} onChange={v => setField('jobName', v)} placeholder="e.g. Diwali Box" required data-testid="job-name-input" />
        <AnimatedInput label="Order Quantity" value={orderQty} onChange={v => setField('orderQty', v)} type="number" placeholder="5000" unit="pcs" required data-testid="order-qty-input" />
        <div className="grid grid-cols-2 gap-3">
          <AnimatedInput label="Flat Length" value={flatLength} onChange={v => setField('flatLength', v)} type="number" unit="in" placeholder="8" data-testid="flat-length-input" />
          <AnimatedInput label="Flat Width" value={flatWidth} onChange={v => setField('flatWidth', v)} type="number" unit="in" placeholder="6" data-testid="flat-width-input" />
        </div>
      </div>
    </SectionCard>
  );
};

export default Section1;
