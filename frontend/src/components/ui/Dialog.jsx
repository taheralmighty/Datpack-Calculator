import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useClientStore from '../../store/clientStore';

const stack = [];
const originalInert = new Map();
let previousOverflow;
function updateBackground() {
  const top = stack[stack.length - 1];
  for (const child of document.body.children) {
    if (!originalInert.has(child)) originalInert.set(child, child.inert);
    child.inert = !!top && child !== top;
  }
  if (!top) {
    originalInert.forEach((value, element) => { element.inert = value; });
    originalInert.clear();
    document.body.style.overflow = previousOverflow || '';
  }
}

export default function Dialog({ children, label, onClose, className = '', style = {} }) {
  const error = useClientStore(state => state.recoveryError || state.saveError || state.actionError);
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const element = ref.current;
    const previousFocus = document.activeElement;
    if (!stack.length) previousOverflow = document.body.style.overflow;
    stack.push(element);
    document.body.style.overflow = 'hidden';
    updateBackground();
    const focusable = () => [...element.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]')]
      .filter(item => item.getClientRects().length > 0);
    (focusable()[0] || element).focus();
    const handleKey = event => {
      if (stack[stack.length - 1] !== element) return;
      if (event.key === 'Escape' && closeRef.current) { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0] || element, last = items[items.length - 1] || element;
        if (!items.length || (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement)))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) {
          event.preventDefault(); first.focus();
        }
      }
    };
    const containFocus = event => {
      if (stack[stack.length - 1] === element && !element.contains(event.target)) (focusable()[0] || element).focus();
    };
    document.addEventListener('keydown', handleKey, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      stack.splice(stack.indexOf(element), 1);
      document.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('focusin', containFocus);
      updateBackground();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  return createPortal(<div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
    className={className} style={{ position: 'fixed', inset: 0, zIndex: 110 + stack.length * 10, ...style }}>
    {children}
    {error && <div role="alert" className="absolute top-4 left-4 right-4 p-3 rounded-lg bg-[var(--surface)] border border-red-400 text-sm" style={{ zIndex: 300 }}>
      {error}
      <button className="ml-4 underline" onClick={() => { useClientStore.getState().clearError(); useClientStore.getState().fetchClients(); }}>Reload Clients</button>
      <button className="ml-4 underline" onClick={() => useClientStore.getState().clearError()}>Dismiss</button>
    </div>}
  </div>, document.body);
}