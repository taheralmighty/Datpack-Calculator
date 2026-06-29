import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Layers, Grid, DollarSign, Printer,
  Sparkles, Scissors, BarChart2, RefreshCw,
} from 'lucide-react';

const ICON_MAP = {
  FileText, Layers, Grid, DollarSign, Printer,
  Sparkles, Scissors, BarChart2, RefreshCw,
};

const SECTIONS = [
  { id: 1, label: 'Job Specs', icon: 'FileText' },
  { id: 2, label: 'Paper Specs', icon: 'Layers' },
  { id: 3, label: 'Layout & Qty', icon: 'Grid' },
  { id: 4, label: 'Paper Cost', icon: 'DollarSign' },
  { id: 5, label: 'Print & Lam', icon: 'Printer' },
  { id: 6, label: 'Finishes', icon: 'Sparkles' },
  { id: 7, label: 'Finishing', icon: 'Scissors' },
  { id: 8, label: 'Summary', icon: 'BarChart2' },
  { id: 9, label: 'Repeat Order', icon: 'RefreshCw' },
];

const DOT_COLOR = {
  empty: 'bg-gray-300',
  partial: 'bg-amber-400',
  complete: 'bg-emerald-500',
};

function formatSubtotal(n) {
  if (!n || isNaN(n)) return null;
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export default function Sidebar({ activeSection, onSectionClick, sectionSubtotals = {}, sectionCompletion = {} }) {
  const completeCount = Object.values(sectionCompletion).filter(v => v === 'complete').length;
  const pct = (completeCount / 9) * 100;

  return (
    <aside
      className="fixed left-0 top-14 z-20 flex flex-col
                 w-12 md:w-[240px]
                 h-[calc(100vh-56px)] overflow-y-auto
                 border-r border-[var(--color-border)]"
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* ── Nav items ── */}
      <nav className="flex-1 p-2 md:p-4 space-y-0.5">
        {SECTIONS.map(({ id, label, icon }) => {
          const Icon = ICON_MAP[icon];
          const completion = sectionCompletion[id] || 'empty';
          const subtotal = formatSubtotal(sectionSubtotals[id]);
          const isActive = activeSection === id;

          return (
            <div key={id} className="relative">
              {/* Active left-border indicator */}
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-bar"
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                    style={{ background: 'var(--color-accent)' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </AnimatePresence>

              <button
                onClick={() => onSectionClick(id)}
                className={`shimmer-btn w-full flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-lg text-left transition-all duration-150 hover:-translate-y-0.5
                  ${isActive
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:opacity-80'
                  }`}
              >
                {/* Icon (always visible) */}
                <Icon size={15} className="flex-shrink-0" />

                {/* Label + subtotal (hidden on mobile) */}
                <span className="hidden md:flex flex-col flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    {/* Completion dot */}
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_COLOR[completion]}`} />
                    <span className="text-sm truncate">{label}</span>
                  </span>
                  {subtotal && (
                    <span className="text-xs pl-3.5" style={{ color: 'var(--color-accent)' }}>
                      {subtotal}
                    </span>
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* ── Progress bar (hidden on mobile) ── */}
      <div className="hidden md:block p-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[var(--color-text-secondary)]">Quote Completion</span>
          <span className="text-xs text-[var(--color-text-secondary)]">{completeCount} of 9</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #C8956C, #E8B898)' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
          {completeCount} of 9 sections complete
        </p>
      </div>
    </aside>
  );
}
