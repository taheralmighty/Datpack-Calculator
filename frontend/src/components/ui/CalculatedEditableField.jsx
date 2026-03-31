import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, RotateCcw } from 'lucide-react';
import { Tooltip } from './AnimatedInput';

const CalculatedEditableField = ({
  label, calculatedValue, overrideValue, onOverride, onReset,
  unit, tooltip, format, className = '', 'data-testid': testId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const isOverridden = overrideValue != null && overrideValue !== '';

  const displayValue = isOverridden ? overrideValue : calculatedValue;
  const formatted = format ? format(displayValue) : (typeof displayValue === 'number' ? displayValue.toFixed(4).replace(/\.?0+$/, '') : displayValue);

  const startEdit = () => {
    setInputVal(String(displayValue || ''));
    setIsEditing(true);
  };

  const confirmEdit = (val) => {
    if (val !== '' && !isNaN(val)) onOverride(parseFloat(val));
    setIsEditing(false);
  };

  const handleReset = () => {
    onReset();
    setIsEditing(false);
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-1">
          {tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}
          {isOverridden && <span className="override-tag">OVERRIDE</span>}
        </label>
      )}
      <div className="relative flex items-center gap-2 group">
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.input
              key="input"
              data-testid={testId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              type="number"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={e => confirmEdit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(e.target.value); if (e.key === 'Escape') setIsEditing(false); }}
              autoFocus
              className="input-copper w-full px-3 py-2.5 text-sm rounded-lg"
            />
          ) : (
            <motion.div
              key="display"
              data-testid={testId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`calc-field-display flex-1 px-3 py-2.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] tabular-nums ${
                isOverridden ? 'border-[var(--copper)] bg-[var(--copper-glow)]' : ''
              }`}
            >
              {formatted}{unit && <span className="text-xs text-[var(--text-secondary)] ml-1">{unit}</span>}
            </motion.div>
          )}
        </AnimatePresence>

        {isEditing ? (
          <button onClick={handleReset} className="text-[var(--copper)] hover:opacity-75 transition-opacity p-1" data-clickable title="Reset to formula">
            <RotateCcw size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <button onClick={startEdit} className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:text-[var(--copper)] transition-all p-1" data-clickable title="Edit value">
            <Pencil size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CalculatedEditableField;
