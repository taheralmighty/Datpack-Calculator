import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sun, Moon, Plus, RotateCcw, User, ChevronDown } from 'lucide-react';
import useClientStore from '../../store/clientStore';
import useCalculatorStore from '../../store/calculatorStore';
import { saveQuotation } from '../../lib/db';
import { generateQuoteNumber } from '../../lib/calc';

const SaveDot = ({ isSaving, lastSavedAt }) => {
  const [dotClass, setDotClass] = useState('');

  useEffect(() => {
    if (isSaving) {
      setDotClass('save-dot-pulse');
      const t = setTimeout(() => setDotClass(''), 3000);
      return () => clearTimeout(t);
    }
  }, [isSaving]);

  const label = isSaving ? 'Saving...' : lastSavedAt
    ? `Saved ${timeAgo(lastSavedAt)}`
    : 'Not saved';

  return (
    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]" data-testid="save-indicator">
      <span className={`w-2 h-2 rounded-full bg-[var(--copper)] ${dotClass}`} />
      {label}
    </div>
  );
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
};

const AppHeader = ({ onHistory, onSwitchClient, onNewQuote, darkMode, onToggleDark }) => {
  const { selectedClient, isSaving, lastSavedAt, currentQuoteNumber } = useClientStore();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-6 gap-4 glass-light border-b border-[var(--border)]"
      data-testid="app-header"
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-md bg-[var(--copper)] flex items-center justify-center">
          <span className="text-white text-xs font-bold font-display">D</span>
        </div>
        <span className="font-display font-semibold text-sm text-[var(--text-primary)] hidden sm:block">Dat Pack Co.</span>
      </div>

      {/* Client + Job */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {selectedClient && (
          <button
            onClick={onSwitchClient}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--copper)] transition-all"
            data-clickable data-testid="client-switcher"
          >
            <User size={12} strokeWidth={1.5} className="text-[var(--copper)]" />
            <span className="max-w-[120px] truncate">{selectedClient.name}</span>
            <ChevronDown size={12} strokeWidth={1.5} />
          </button>
        )}
        {currentQuoteNumber && (
          <span className="text-xs text-[var(--text-secondary)] hidden md:block tabular-nums">{currentQuoteNumber}</span>
        )}
        <SaveDot isSaving={isSaving} lastSavedAt={lastSavedAt} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:border-[var(--copper)] transition-all"
          data-clickable data-testid="history-btn"
        >
          <Clock size={13} strokeWidth={1.5} className="text-[var(--copper)]" />
          <span className="hidden sm:block">History</span>
        </button>

        <button
          onClick={onSwitchClient}
          className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:border-[var(--copper)] transition-all hidden sm:block"
          data-clickable data-testid="switch-client-btn"
        >
          Switch Client
        </button>

        <button
          onClick={onNewQuote}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--copper)] text-white text-xs font-medium shimmer-btn hover:-translate-y-0.5 transition-all"
          data-clickable data-testid="new-quote-btn"
        >
          <Plus size={13} strokeWidth={2} />
          <span className="hidden sm:block">New Quote</span>
        </button>

        <button
          onClick={onToggleDark}
          className="p-2 rounded-lg border border-[var(--border)] hover:border-[var(--copper)] transition-all"
          data-clickable data-testid="dark-mode-toggle"
        >
          {darkMode ? <Sun size={14} strokeWidth={1.5} className="text-[var(--copper)]" /> : <Moon size={14} strokeWidth={1.5} />}
        </button>
      </div>
    </header>
  );
};

export default AppHeader;
