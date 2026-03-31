import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const COMPLETION_STATES = { empty: 'dot-empty', partial: 'dot-partial', complete: 'dot-complete' };

const SectionCard = ({ id, title, subtitle, completion = 'empty', defaultOpen = false, children, index = 0 }) => {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="section-card mb-4"
    >
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left"
        onClick={() => setOpen(!open)}
        data-clickable
        data-testid={`section-card-${id}`}
      >
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${COMPLETION_STATES[completion] || 'dot-empty'}`} />
          <div>
            <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-6 pb-6 border-t border-[var(--border)]">
              <div className="pt-5">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SectionCard;
