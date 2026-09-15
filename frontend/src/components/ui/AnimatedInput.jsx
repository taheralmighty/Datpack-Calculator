import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
export const Tooltip = ({ text, children, label }) => {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, above: true });
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    const hide = () => setShow(false);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [show]);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      setPos(computeTooltipPos(triggerRef.current.getBoundingClientRect()));
    }
    setShow(true);
  };

  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <button
        ref={triggerRef}
        type="button" aria-label={label ? `Formula for ${label}` : 'Field information'}
        aria-describedby={show ? id : undefined}
        className="formula-info inline-flex items-center shrink-0"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => { if (document.activeElement !== triggerRef.current) setShow(false); }}
        onFocus={handleMouseEnter} onBlur={() => setShow(false)}
        onClick={handleMouseEnter}
        onKeyDown={event => { if (event.key === 'Escape') setShow(false); }}
      >
        <HelpCircle size={12} strokeWidth={1.5} />
      </button>
      {createPortal(<AnimatePresence>
        {show && (
          <div
            style={{
              position: 'fixed',
              zIndex: 9999,
              top: pos.top,
              left: pos.left,
              transform: pos.above ? 'translateY(-100%)' : 'translateY(0)',
              width: 'min(300px, calc(100vw - 24px))',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              pointerEvents: 'none',
            }}
          >
            <motion.div id={id} role="tooltip" className="formula-tooltip text-xs px-3 py-2 rounded-lg leading-relaxed"
              initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.13 }}>
              {text}
            </motion.div>
          </div>
        )}
      </AnimatePresence>, document.body)}
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
  const inputId = useId();
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
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-secondary)]">
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
          id={inputId}
          data-testid={testId}
          type={type}
          required={required} aria-invalid={!!error} aria-describedby={error ? `${inputId}-error` : undefined}
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onWheel={type === 'number' ? event => event.currentTarget.blur() : undefined}
          placeholder={placeholder}
          {...(type === 'number' ? { step: 'any', min: '0' } : {})}
          className={`underline-input w-full px-3 py-2.5 text-sm bg-transparent border-b-2 outline-none transition-all duration-200 font-sans
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
        <p id={`${inputId}-error`} className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default AnimatedInput;