import React, { useState, useEffect, useRef } from 'react';
import { Pencil, RotateCcw } from 'lucide-react';
import { Tooltip } from './AnimatedInput';

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
  overrideValue,
  format,
  unit,
  formulaTooltip,
  onOverride,
  onReset,
  'data-testid': testId,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);
  const originalOverride = useRef(null);
  const finished = useRef(false);
  const hasOverride = overrideValue != null;

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const startEdit = () => {
    originalOverride.current = overrideValue;
    finished.current = false;
    setInputValue(String(calculatedValue ?? ''));
    setIsEditing(true);
  };

  const update = value => {
    setInputValue(value);
    if (value.trim() === '') onReset?.();
    else if (Number.isFinite(Number(value))) onOverride?.(Number(value));
  };
  const finish = cancel => {
    if (finished.current) return;
    finished.current = true;
    if (cancel) {
      if (originalOverride.current == null) onReset?.();
      else onOverride?.(originalOverride.current);
    }
    setIsEditing(false);
  };
  const reset = () => {
    finished.current = true;
    onReset?.();
    setIsEditing(false);
  };

  return (
    <div
      className="calculated-field flex items-center justify-between py-2 gap-3 group"
      data-testid={testId}
    >
      {/* LEFT — label + tooltip */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-[var(--color-text-secondary)] break-words">{label}</span>
        {formulaTooltip && <Tooltip text={formulaTooltip} label={label} />}
      </div>

      {/* RIGHT — value / edit */}
      <div className="calculated-field-value flex items-center justify-end gap-2 min-w-0">
        {hasOverride && !isEditing && <span className="text-[9px] text-[var(--color-accent)]">Override</span>}
        {isEditing ? (
          <input ref={inputRef} type="number" step="any" value={inputValue} aria-label={`Override ${label}`}
            onChange={event => update(event.target.value)} onBlur={() => finish(false)}
            onWheel={event => event.currentTarget.blur()}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.preventDefault();
                finish(event.key === 'Escape');
              }
            }}
            className="underline-input w-24 max-w-full text-sm text-right bg-transparent tabular-nums border-b border-[var(--color-accent)] text-[var(--color-text-primary)]" />
        ) : (
          <span className="text-sm font-medium font-sans tabular-nums text-right break-words text-[var(--color-text-primary)]">
            {format ? format(calculatedValue) : formatDisplay(calculatedValue, unit)}
          </span>
        )}
        {onOverride && !isEditing && (
          <button type="button" onClick={startEdit} aria-label={`Edit ${label}`} title={`Edit ${label}`} className="calculated-field-action shrink-0">
            <Pencil size={13} strokeWidth={1.75} />
          </button>
        )}
        {onReset && (hasOverride || isEditing) && (
          <button type="button" onMouseDown={event => event.preventDefault()} onClick={reset}
            aria-label={`Reset ${label}`} title={`Reset ${label}`} className="calculated-field-action shrink-0">
            <RotateCcw size={13} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
};

export default CalculatedEditableField;

