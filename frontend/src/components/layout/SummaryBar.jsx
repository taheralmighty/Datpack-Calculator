import React from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { formatINR } from '../../lib/calc';
import useCalculatorStore from '../../store/calculatorStore';

const SummaryBar = ({ calc, onExportPDF, onExportCSV, onSaveSnapshot }) => {
  const { isRepeatOrder } = useCalculatorStore();

  const displayTotal = isRepeatOrder ? calc?.repeatFinalTotal : calc?.finalTotal;
  const displayLabel = isRepeatOrder ? 'Repeat Total w/ GST' : 'Grand Total w/ GST';

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 lg:left-[240px] left-0 right-0 h-16 glass-light z-30 flex items-center px-6 gap-6"
      data-testid="summary-bar"
    >
      {/* Figures */}
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="hidden sm:block">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Production Cost</p>
          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]" data-testid="total-production-cost">
            {formatINR(calc?.totalProductionCost)}
          </p>
        </div>
        <div className="hidden md:block">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">Selling / Unit</p>
          <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]" data-testid="selling-price-per-unit">
            {formatINR(calc?.sellingPricePerUnit)}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] mb-0.5">{displayLabel}</p>
          <p className="text-base font-bold tabular-nums text-[var(--copper)]" data-testid="grand-total">
            {formatINR(displayTotal)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSaveSnapshot}
          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[var(--border)] rounded-lg hover:border-[var(--copper)] transition-all"
          data-clickable data-testid="save-snapshot-btn"
        >
          <RefreshCw size={12} strokeWidth={1.5} />
          <span className="hidden sm:block">Snapshot</span>
        </button>
        <button
          onClick={onExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[var(--border)] rounded-lg hover:border-[var(--copper)] transition-all shimmer-btn"
          data-clickable data-testid="export-csv-btn"
        >
          <FileText size={12} strokeWidth={1.5} />
          <span className="hidden sm:block">CSV</span>
        </button>
        <button
          onClick={onExportPDF}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-[var(--copper)] text-white rounded-lg font-medium shimmer-btn hover:-translate-y-0.5 transition-all"
          data-clickable data-testid="export-pdf-btn"
        >
          <Download size={12} strokeWidth={2} />
          <span className="hidden sm:block">Export PDF</span>
        </button>
      </div>
    </motion.div>
  );
};

export default SummaryBar;
