import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const DOT_CLASS = {
  empty: 'bg-gray-300',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

function formatSubtotal(n) {
  if (!n || isNaN(n) || n <= 0) return null;
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// Supports both controlled (isOpen + onToggle) and uncontrolled (defaultOpen) modes.
const SectionCard = ({
  id,
  title,
  subtitle,
  completion = 'empty',
  subtotal,
  isOpen,          // controlled
  onToggle,        // controlled
  defaultOpen = false,
  children,
  index = 0,
}) => {
  const isControlled = isOpen !== undefined && onToggle !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);

  const open = isControlled ? isOpen : internalOpen;
  const toggle = isControlled ? onToggle : () => setInternalOpen(o => !o);

  const subtotalLabel = formatSubtotal(subtotal);

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] mb-4 overflow-hidden"
      data-testid={`section-card-${id}`}
    >
      {/* ── Header ── */}
      <button
        className="shimmer-btn w-full flex items-center justify-between px-6 py-4 text-left
                   hover:bg-[var(--color-accent-light)] transition-colors duration-200 cursor-pointer"
        onClick={toggle}
        data-clickable
      >
        {/* LEFT */}
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_CLASS[completion] || DOT_CLASS.empty}`} />
          <div>
            <h3 className="font-serif text-lg font-medium text-[var(--color-text-primary)]">{title}</h3>
            {subtitle && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">
          {subtotalLabel && (
            <span className="text-xs font-medium text-[var(--color-accent)] bg-[var(--color-accent-light)] px-2.5 py-1 rounded-full tabular-nums">
              {subtotalLabel}
            </span>
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={18} strokeWidth={1.5} className="text-[var(--color-text-secondary)]" />
          </motion.div>
        </div>
      </button>

      {/* ── Content ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              className="px-6 pb-6 pt-2"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SectionCard;
