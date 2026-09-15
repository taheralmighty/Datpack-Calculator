import React from 'react';
import SectionCard from '../ui/SectionCard';
import AnimatedInput from '../ui/AnimatedInput';
import useCalculatorStore from '../../store/calculatorStore';

const JobSpecs = ({ completion }) => {
  const { clientName, jobName, orderQty, upsPerSheet, setField } = useCalculatorStore();
  return (
    <SectionCard id="section-1" title="Job Specifications" index={0} defaultOpen completion={completion}
      subtitle={jobName ? `${jobName} · Qty: ${orderQty || 0}` : undefined}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatedInput label="Client Name" value={clientName} onChange={v => setField('clientName', v)} placeholder="e.g. Acme Ltd." data-testid="client-name-input" />
        <AnimatedInput label="Job Name" value={jobName} onChange={v => setField('jobName', v)} placeholder="e.g. Diwali Box" required data-testid="job-name-input" />
        <AnimatedInput label="Order Quantity" value={orderQty} onChange={v => setField('orderQty', v)} type="number" placeholder="5000" unit="pcs" required data-testid="order-qty-input" />
        <AnimatedInput label="Ups per Sheet" value={upsPerSheet} onChange={v => setField('upsPerSheet', v)} type="number" placeholder="4" data-testid="ups-per-sheet" />
      </div>
    </SectionCard>
  );
};

export default JobSpecs;
