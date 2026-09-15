import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

function getPanelPosition(trigger, optionCount) {
  const rect = trigger.getBoundingClientRect();
  const gap = 6;
  const below = window.innerHeight - rect.bottom - gap - 12;
  const above = rect.top - gap - 12;
  const desiredHeight = Math.min(optionCount * 44 + 10, 280);
  const upward = below < desiredHeight && above > below;
  const width = Math.min(rect.width, window.innerWidth - 24);
  return {
    upward, width,
    left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
    top: upward ? undefined : rect.bottom + gap,
    bottom: upward ? window.innerHeight - rect.top + gap : undefined,
    maxHeight: Math.max(0, Math.min(desiredHeight, upward ? above : below)),
  };
}

export default function PremiumSelect({ label, value, onChange, options, disabled = false, 'data-testid': testId }) {
  const id = useId();
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardHighlight, setKeyboardHighlight] = useState(false);
  const [position, setPosition] = useState(null);
  const items = [{ value: '', label: 'None' }, ...Object.entries(options).map(([optionValue, option]) => ({ value: optionValue, label: option.label }))];
  const selectedIndex = Math.max(0, items.findIndex(item => item.value === value));
  const floated = open || (value !== null && value !== undefined && value !== '');
  const openDirection = position?.upward ? 'up' : 'down';

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      setPosition(getPanelPosition(triggerRef.current, items.length));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = event => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => {
    if (open && keyboardHighlight) panelRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, open, keyboardHighlight]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const openPanel = (fromKeyboard = false) => {
    setPosition(getPanelPosition(triggerRef.current, items.length));
    setActiveIndex(selectedIndex);
    setKeyboardHighlight(fromKeyboard);
    setOpen(true);
  };
  const choose = index => {
    onChange(items[index].value);
    setOpen(false);
    triggerRef.current?.focus();
  };
  const handleKeyDown = event => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      setKeyboardHighlight(true);
      if (!open) {
        openPanel(true);
        if (event.key === 'Home') setActiveIndex(0);
        if (event.key === 'End') setActiveIndex(items.length - 1);
      } else if (event.key === 'Enter' || event.key === ' ') choose(activeIndex);
      else if (event.key === 'Home') setActiveIndex(0);
      else if (event.key === 'End') setActiveIndex(items.length - 1);
      else setActiveIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div className="w-full min-w-0 py-2">
      <div className="premium-select-control" data-disabled={disabled}>
      <button
        ref={triggerRef} id={id} type="button" role="combobox" disabled={disabled}
        aria-labelledby={`${id}-label`} aria-expanded={open} aria-haspopup="listbox"
        aria-controls={open ? `${id}-listbox` : undefined}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        className="premium-select-trigger" data-open={open} data-testid={testId}
        onClick={() => open ? setOpen(false) : openPanel()} onKeyDown={handleKeyDown}
        onBlur={event => { if (!panelRef.current?.contains(event.relatedTarget)) setOpen(false); }}
      >
        <span className="min-w-0 break-words text-left">{selectedIndex > 0 ? items[selectedIndex].label : ''}</span>
        <ChevronDown size={16} strokeWidth={1.5} className="shrink-0" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: reducedMotion ? 'none' : 'transform 200ms ease-out' }} />
      </button>
      <motion.span
        id={`${id}-label`} className="premium-select-label"
        data-floated={floated} data-direction={openDirection}
        initial={false}
        animate={{
          top: floated ? (openDirection === 'up' ? '100%' : '0%') : '50%',
          y: '-50%',
          fontSize: floated ? '11.5px' : '14.5px',
          letterSpacing: floated ? '0.04em' : '0em',
          color: floated ? 'var(--select-bronze-deep)' : 'var(--color-text-tertiary)',
        }}
        transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
      >
        {label}
      </motion.span>
      </div>
      {createPortal(
        <AnimatePresence>
          {open && position && (
            <motion.div
              ref={panelRef} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}
              className="premium-select-panel" data-direction={position.upward ? 'up' : 'down'}
              style={{ position: 'fixed', zIndex: 60, left: position.left, top: position.top, bottom: position.bottom, width: position.width, maxHeight: position.maxHeight, transformOrigin: position.upward ? 'bottom' : 'top' }}
              initial={reducedMotion ? false : { opacity: 0, y: position.upward ? 5 : -5, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : (position.upward ? 5 : -5), scale: reducedMotion ? 1 : 0.985 }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}
              onMouseDown={event => event.preventDefault()}
            >
              {items.map((item, index) => (
                <div key={item.value} id={`${id}-option-${index}`} role="option"
                  aria-selected={index === selectedIndex} data-index={index}
                  data-active={keyboardHighlight && index === activeIndex} className="premium-select-option"
                  onPointerMove={() => { setKeyboardHighlight(false); setActiveIndex(index); }} onClick={() => choose(index)}>
                  <span className="min-w-0 break-words">{item.label}</span>
                  <span className="w-4 shrink-0">{index === selectedIndex && <Check size={14} strokeWidth={1.75} />}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>, document.body,
      )}
    </div>
  );
}