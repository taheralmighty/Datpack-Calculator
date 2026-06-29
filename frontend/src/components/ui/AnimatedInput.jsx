import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

// ─── Shared tooltip positioning helper ───────────────
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
  return {
    top: above ? rect.top - GAP : rect.bottom + GAP,
    left,
    above,
  };
}

// ─── Tooltip (named export — kept for other components) ──
export const Tooltip = ({ text, children }) => {
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
    <span className="inline-flex items-center gap-1">
      {children}
      <span
        ref={triggerRef}
        className="inline-flex items-center text-[var(--color-text-secondary)] opacity-50 cursor-default"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShow(false)}
      >
        <HelpCircle size={12} strokeWidth={1.5} />
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
};

// ─── AnimatedInput ────────────────────────────────────
const AnimatedInput = ({
  label,
  value,
  onChange,
  type = 'text',
  unit,
  placeholder = '',
  required,
  error,
  tooltip,
  'data-testid': testId,
  className = '',
}) => {
  const wrapperRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    wrapperRef.current?.classList.add('input-focused');
  };
  const handleBlur = () => {
    setFocused(false);
    wrapperRef.current?.classList.remove('input-focused');
  };

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {/* Label row */}
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {tooltip && <Tooltip text={tooltip}><span /></Tooltip>}
        </div>
      )}

      {/* Input wrapper */}
      <div
        ref={wrapperRef}
        className="relative flex items-center transition-all duration-200"
        style={focused ? { boxShadow: '0 2px 0 0 var(--color-accent)' } : {}}
      >
        <input
          data-testid={testId}
          type={type}
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          {...(type === 'number' ? { step: 'any', min: '0' } : {})}
          className={`w-full px-3 py-2.5 text-sm bg-transparent border-b-2 outline-none transition-all duration-200 font-sans
            ${error
              ? 'border-red-400'
              : focused
                ? 'border-[var(--color-accent)]'
                : 'border-[var(--color-border)]'
            }
            ${unit ? 'pr-14' : ''}
          `}
          style={{ color: 'var(--color-text-primary)', boxShadow: 'none' }}
        />
        {unit && (
          <span className="absolute right-0 text-sm text-[var(--color-text-secondary)] pl-2 whitespace-nowrap pointer-events-none">
            {unit}
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default AnimatedInput;