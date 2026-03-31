import React from 'react';
import SectionCard from '../ui/SectionCard';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';

const Section9 = ({ completion, calc }) => {
  const { isRepeatOrder, gst, setIsRepeatOrder } = useCalculatorStore();
  const gstNum = parseFloat(gst) || 18;
  const repeatGst = (calc?.repeatSubtotal || 0) * (gstNum / 100);

  return (
    <SectionCard id="section-9" title="Repeat Order Logic" index={8} completion={completion}
      subtitle={isRepeatOrder ? `Repeat Total: ${formatINR(calc?.repeatFinalTotal)}` : 'Toggle for repeat pricing'}>
      <div className="space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-xl bg-[var(--bg)]">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">This is a Repeat Order</p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Excludes one-time tooling costs from the total</p>
          </div>
          <button
            onClick={() => setIsRepeatOrder(!isRepeatOrder)}
            data-clickable
            data-testid="repeat-order-toggle"
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              isRepeatOrder ? 'bg-[var(--copper)]' : 'bg-[var(--border)]'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${
              isRepeatOrder ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">One-Time Tooling</p>
            <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]" data-testid="one-time-tooling">{formatINR(calc?.oneTimeTooling)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Foil Block + UV Screen + Die</p>
          </div>
          <div className={`p-4 rounded-xl border-2 ${isRepeatOrder ? 'border-[var(--copper)] bg-[var(--copper-glow)]' : 'border-[var(--border)] bg-[var(--bg)]'} transition-all`}>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Repeat Subtotal</p>
            <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]" data-testid="repeat-subtotal">{formatINR(calc?.repeatSubtotal)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Excl. tooling costs</p>
          </div>
          <div className={`p-4 rounded-xl border-2 ${isRepeatOrder ? 'border-[var(--copper)] bg-[var(--copper-glow)]' : 'border-[var(--border)] bg-[var(--bg)]'} transition-all`}>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Repeat Total w/ GST</p>
            <p className="text-lg font-bold tabular-nums text-[var(--copper)]" data-testid="repeat-final-total">{formatINR(calc?.repeatFinalTotal)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">GST: {formatINR(repeatGst)}</p>
          </div>
        </div>

        {isRepeatOrder && (
          <div className="p-3 bg-[var(--copper-glow)] border border-[var(--copper)] rounded-lg text-xs text-[var(--text-secondary)]">
            Summary bar and PDF now show Repeat Order pricing. One-time tooling costs ({formatINR(calc?.oneTimeTooling)}) are excluded.
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default Section9;
