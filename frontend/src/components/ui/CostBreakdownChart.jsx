import React from 'react';
import { formatINR, FORMULAS } from '../../lib/calc';
import { Tooltip } from './AnimatedInput';

const COST_FORMULAS = {
  Paper: FORMULAS.totalPaperCost, Printing: FORMULAS.totalPrintCost, Lamination: FORMULAS.totalLamCost,
  Foiling: FORMULAS.totalFoilingCost, UV: FORMULAS.totalSpotUVCost,
  'Die-Cutting': FORMULAS.totalDieCuttingCost, Pasting: FORMULAS.totalPastingCost,
};

const CostBreakdownChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-[var(--text-secondary)] text-sm">
      Fill in cost sections to see breakdown
    </div>
  );

  return (
    <div className="space-y-3" data-testid="cost-breakdown-chart">
      {data.map(item => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">{item.name}<Tooltip text={COST_FORMULAS[item.name]} label={`${item.name} cost`} /></span>
            <span className="tabular-nums text-[var(--text-primary)] font-medium">
              {formatINR(item.value)} <span className="text-[var(--copper)]">({item.pct}%)</span>
            </span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg, #C8956C, #E8B898)' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default CostBreakdownChart;
