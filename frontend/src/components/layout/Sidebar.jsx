import React from 'react';
import { motion } from 'framer-motion';
import { formatINR } from '../../lib/calc';

const SECTIONS = [
  { id: 'section-1', label: 'Job Specs' },
  { id: 'section-2', label: 'Paper Specs' },
  { id: 'section-3', label: 'Layout & Qty' },
  { id: 'section-4', label: 'Paper Cost' },
  { id: 'section-5', label: 'Printing & Lam' },
  { id: 'section-6', label: 'Finishes' },
  { id: 'section-7', label: 'Finishing' },
  { id: 'section-8', label: 'Summary' },
  { id: 'section-9', label: 'Repeat Order' },
];

const Sidebar = ({ activeSection, completions = {}, calc }) => {
  const completedCount = Object.values(completions).filter(v => v === 'complete').length;
  const progress = (completedCount / SECTIONS.length) * 100;

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <aside
      className="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-[240px] border-r border-[var(--border)] bg-[var(--surface)] flex flex-col z-20 hidden lg:flex"
      data-testid="sidebar"
    >
      <div className="px-5 py-5 flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
            <span>Completion</span>
            <span className="tabular-nums">{completedCount}/{SECTIONS.length}</span>
          </div>
          <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #C8956C, #E8B898)' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        <nav className="space-y-0.5">
          {SECTIONS.map((sec, i) => {
            const comp = completions[sec.id] || 'empty';
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => scrollTo(sec.id)}
                data-clickable
                data-testid={`sidebar-${sec.id}`}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                  isActive
                    ? 'bg-[var(--copper-glow)] text-[var(--copper)]'
                    : 'hover:bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  comp === 'complete' ? 'bg-green-500'
                  : comp === 'partial' ? 'bg-amber-500'
                  : 'bg-[var(--border)]'
                }`} />
                <span className="text-sm font-medium flex-1 truncate">{sec.label}</span>
                <span className={`text-[10px] font-bold uppercase ${
                  comp === 'complete' ? 'text-green-500'
                  : comp === 'partial' ? 'text-amber-500'
                  : 'text-[var(--border)]'
                }`}>
                  {comp === 'complete' ? '✓' : comp === 'partial' ? '~' : ''}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Subtotals */}
      {calc && calc.totalProductionCost > 0 && (
        <div className="border-t border-[var(--border)] px-5 py-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">Cost Summary</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Paper</span>
              <span className="tabular-nums text-[var(--text-primary)]">{formatINR(calc.paperCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Print+Lam</span>
              <span className="tabular-nums text-[var(--text-primary)]">{formatINR(calc.printCost + calc.lamCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Finishes</span>
              <span className="tabular-nums text-[var(--text-primary)]">{formatINR(calc.foilingCost + calc.uvCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Finishing</span>
              <span className="tabular-nums text-[var(--text-primary)]">{formatINR(calc.dieCuttingCost + calc.pastingCost)}</span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-1.5 font-semibold">
              <span className="text-[var(--copper)]">Total</span>
              <span className="tabular-nums text-[var(--copper)]">{formatINR(calc.totalProductionCost)}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
