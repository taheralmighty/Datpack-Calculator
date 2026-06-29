import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, RotateCcw, HelpCircle } from 'lucide-react';

// ── Shared tooltip pos helper ─────────────────────────
function computeTooltipPos(rect) {
  const TOOLTIP_W = 300;
  const GAP = 8;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const above = spaceAbove > 100 && spaceAbove >= spaceBelow;
  let left = rect.left;
  if (left + TOOLTIP_W > window.innerWidth - 12) {
    left = window.innerWidth - TOOLTIP_W - 12;
  }
  if (left < 12) left = 12;
  return { top: above ? rect.top - GAP : rect.bottom + GAP, left, above };
}

// ── Inline tooltip (same style as AnimatedInput) ──────
function TooltipIcon({ text }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, above: true });
  const triggerRef = useRef(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      setPos(computeTooltipPos(triggerRef.current.getBoundingClientRect()));
    }
    setShow(true);
  };

  return (
    <span className="inline-flex items-center">
      <span
        ref={triggerRef}
        className="text-[var(--color-text-secondary)] opacity-50 cursor-default inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
      >
        <HelpCircle size={11} strokeWidth={1.5} />
      </span>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: pos.above ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: pos.above ? 4 : -4 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-white px-3 py-2 rounded-lg pointer-events-none leading-relaxed"
            style={{
              position: 'fixed',
              zIndex: 9999,
              background: '#1A1A1A',
              top: pos.top,
              left: pos.left,
              transform: pos.above ? 'translateY(-100%)' : 'translateY(0)',
              minWidth: '200px',
              maxWidth: '300px',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

// ── Animated count-up using rAF ───────────────────────
function useCountUp(target, duration = 400) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = typeof target === 'number' && isFinite(target) ? target : 0;
    if (from === to) return;

    const start = performance.now();
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(to);
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

function formatDisplay(value, unit) {
  if (typeof value !== 'number' || !isFinite(value)) return '—';
  const decimals = value % 1 === 0 ? 0 : 2;
  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return unit ? `${formatted} ${unit}` : formatted;
}

// ── Main component ─────────────────────────────────────
const CalculatedEditableField = ({
  label,
  calculatedValue,
  unit,
  formulaTooltip,
  onOverride,
  onReset,
  'data-testid': testId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const animatedValue = useCountUp(
    typeof calculatedValue === 'number' && isFinite(calculatedValue) ? calculatedValue : 0
  );

  const startEdit = () => {
    setInputValue(String(calculatedValue ?? ''));
    setIsEditing(true);
    // focus on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = (val) => {
    const parsed = parseFloat(val);
    if (val === '' || isNaN(parsed)) {
      onReset?.();
    } else {
      onOverride?.(parsed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commit(e.target.value);
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div
      className="flex items-center justify-between py-2 group"
      data-testid={testId}
    >
      {/* LEFT — label + tooltip */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-[var(--color-text-secondary)] truncate">{label}</span>
        {formulaTooltip && <TooltipIcon text={formulaTooltip} />}
      </div>

      {/* RIGHT — value / edit */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5"
            >
              <span className="text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded"
                style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)' }}>
                Override
              </span>
              <input
                ref={inputRef}
                type="number"
                step="any"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onBlur={e => commit(e.target.value)}
                onKeyDown={handleKeyDown}
                className="text-sm w-24 text-right bg-transparent outline-none tabular-nums"
                style={{
                  borderBottom: '1px solid var(--color-accent)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={() => { onReset?.(); setIsEditing(false); }}
                className="cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-accent)' }}
                tabIndex={-1}
              >
                <RotateCcw size={13} strokeWidth={1.75} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="read"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <span
                className="text-sm font-medium font-sans tabular-nums"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {formatDisplay(animatedValue, unit)}
              </span>
              <button
                onClick={startEdit}
                className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ color: 'var(--color-accent)' }}
                tabIndex={-1}
              >
                <Pencil size={13} strokeWidth={1.75} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CalculatedEditableField;

