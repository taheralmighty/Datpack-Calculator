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
        <div className="flex items-center justify-between p-4 border border-[var(--color-border)] rounded-xl bg-[var(--color-bg)]">
          <div className="min-w-0 mr-4">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">This is a Repeat Order</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Excludes one-time tooling costs from the total</p>
          </div>
          <button
            onClick={() => setIsRepeatOrder(!isRepeatOrder)}
            data-clickable
            data-testid="repeat-order-toggle"
            style={{
              position: 'relative',
              flexShrink: 0,
              width: 48,
              height: 26,
              borderRadius: 13,
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              overflow: 'hidden',
              backgroundColor: isRepeatOrder ? 'var(--color-accent)' : '#C4C4C4',
              transition: 'background-color 0.2s ease',
              padding: 0,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 3,
                left: isRepeatOrder ? 25 : 3,
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                transition: 'left 0.2s ease',
              }}
            />
          </button>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">One-Time Tooling</p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]" data-testid="one-time-tooling">{formatINR(calc?.oneTimeTooling)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Foil Block + UV Screen + Die</p>
          </div>
          <div className={`p-4 rounded-xl border-2 transition-all ${isRepeatOrder ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Repeat Subtotal</p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]" data-testid="repeat-subtotal">{formatINR(calc?.repeatSubtotal)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Excl. tooling costs</p>
          </div>
          <div className={`p-4 rounded-xl border-2 transition-all ${isRepeatOrder ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Repeat Total w/ GST</p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-accent)]" data-testid="repeat-final-total">{formatINR(calc?.repeatFinalTotal)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">GST: {formatINR(repeatGst)}</p>
          </div>
        </div>

        {/* Repeat order cost breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border-2 transition-all ${isRepeatOrder ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Repeat Order Production Cost (₹)</p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]" data-testid="repeat-production-cost">{formatINR(calc?.repeatProductionCost)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Total cost excl. tooling & margin</p>
          </div>
          <div className={`p-4 rounded-xl border-2 transition-all ${isRepeatOrder ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1">Repeat Order Cost Per Unit (₹)</p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]" data-testid="repeat-cost-per-unit">{formatINR(calc?.repeatCostPerUnit)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Per piece, excl. tooling</p>
          </div>
          <div className={`p-4 rounded-xl border-2 transition-all ${isRepeatOrder ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]' : 'border-[var(--color-border)] bg-[var(--color-bg)]'}`}>
            <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-1 font-semibold">REPEAT ORDER SELLING PRICE (₹)</p>
            <p className="text-lg font-bold tabular-nums text-[var(--color-accent)]" data-testid="repeat-selling-price">{formatINR(calc?.repeatSellingPricePerUnit)}</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Per unit, with margin applied</p>
          </div>
        </div>

        {isRepeatOrder && (
          <div className="p-3 bg-[var(--color-accent-light)] border border-[var(--color-accent)] rounded-lg text-xs text-[var(--color-text-secondary)]">
            Summary bar and PDF now show Repeat Order pricing. One-time tooling costs ({formatINR(calc?.oneTimeTooling)}) are excluded.
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default Section9;
