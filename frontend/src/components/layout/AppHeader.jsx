import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, RotateCcw, User, ChevronDown } from 'lucide-react';
import useClientStore from '../../store/clientStore';
import useCalculatorStore from '../../store/calculatorStore';
import { saveQuotation } from '../../lib/db';
import { generateQuoteNumber } from '../../lib/calc';
import DarkModeToggle from '../ui/DarkModeToggle';
import logoCopper from '../../assets/logo-copper.png';

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

const AppHeader = ({ onHistory, onSwitchClient, onNewQuote }) => {
  const { selectedClient, isSaving, lastSavedAt, currentQuoteNumber } = useClientStore();

  const headerStyle = {
    background: 'var(--header-bg)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--header-border)',
    boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
  };

  return (
    <header
      className="sticky top-0 left-0 right-0 z-30 h-14 flex items-center px-6 gap-4"
      style={headerStyle}
      data-testid="app-header"
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }} className="mr-4">
        <img
          src={logoCopper}
          alt=""
          style={{
            height: '32px',
            marginRight: '12px',
            filter: 'brightness(0) invert(0.65) sepia(1) saturate(2.5) hue-rotate(338deg)',
            opacity: 0.88,
            flexShrink: 0,
          }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.35rem',
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--color-text-primary)',
          lineHeight: 1,
        }} className="hidden sm:block">
          Dat Pack Co.
        </span>
      </div>

      {/* Client + Job */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {selectedClient && (
          <button
            onClick={onSwitchClient}
            className="shimmer-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--copper)] transition-all"
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
          className="shimmer-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:border-[var(--copper)] hover:-translate-y-0.5 transition-all"
          data-clickable data-testid="history-btn"
        >
          <Clock size={13} strokeWidth={1.5} className="text-[var(--copper)]" />
          <span className="hidden sm:block">History</span>
        </button>

        <button
          onClick={onSwitchClient}
          className="shimmer-btn px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs hover:border-[var(--copper)] hover:-translate-y-0.5 transition-all hidden sm:block"
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

        <DarkModeToggle />
      </div>
    </header>
  );
};

export default AppHeader;
