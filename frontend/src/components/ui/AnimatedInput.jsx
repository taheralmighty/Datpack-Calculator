import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

// ─── Tooltip ──────────────────────────────────────────
export const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-1">
      {children}
      <button
        className="text-[var(--text-secondary)] hover:text-[var(--copper)] transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => e.preventDefault()}
        data-clickable
      >
        <HelpCircle size={12} strokeWidth={1.5} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="tooltip-content absolute bottom-full left-0 mb-2 z-50 whitespace-normal w-64"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

// ─── AnimatedInput ─────────────────────────────────────
const AnimatedInput = ({
  label, value, onChange, type = 'text',
  placeholder = '', unit, required, min, max,
  tooltip, error, readOnly, className = '',
  'data-testid': testId,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-1">
          {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`relative flex items-center rounded-lg overflow-hidden transition-all duration-200 ${
        focused ? 'shadow-[0_0_0_3px_var(--copper-glow)]' : ''
      }`}>
        <input
          data-testid={testId}
          type={type}
          value={value}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          readOnly={readOnly}
          min={min}
          max={max}
          className={`input-copper w-full px-3 py-2.5 text-sm rounded-lg ${
            unit ? 'pr-12' : ''
          } ${readOnly ? 'bg-[var(--bg)] cursor-default' : ''} ${
            error ? 'border-red-400 !border-red-400' : ''
          }`}
        />
        {unit && (
          <span className="absolute right-3 text-xs text-[var(--text-secondary)] pointer-events-none font-medium">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

export default AnimatedInput;
