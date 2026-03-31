import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatINR } from '../../lib/calc';

const COPPER = '#C8956C';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1A1A1A] text-[#FAFAFA] text-xs rounded-lg px-3 py-2 shadow-xl">
      <p className="font-semibold">{payload[0]?.payload?.name}</p>
      <p className="text-[#C8956C]">{formatINR(payload[0]?.value)}</p>
    </div>
  );
};

const CostBreakdownChart = ({ data }) => {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-32 text-[var(--text-secondary)] text-sm">
      Fill in cost sections to see breakdown
    </div>
  );

  const total = data.reduce((s, d) => s + d.value, 0);
  const withPct = data.map(d => ({ ...d, pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : 0 }));

  return (
    <div className="space-y-3" data-testid="cost-breakdown-chart">
      {withPct.map((item, i) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-[var(--text-secondary)]">{item.name}</span>
            <span className="tabular-nums text-[var(--text-primary)] font-medium">
              {formatINR(item.value)} <span className="text-[var(--copper)]">({item.pct}%)</span>
            </span>
          </div>
          <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
            <motion_bar width={item.pct} delay={i * 0.1} />
          </div>
        </div>
      ))}
    </div>
  );
};

const motion_bar = ({ width, delay }) => {
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    const t = setTimeout(() => setW(width), delay * 1000 + 100);
    return () => clearTimeout(t);
  }, [width, delay]);
  return (
    <div
      className="h-full rounded-full transition-all duration-700 ease-out"
      style={{ width: `${w}%`, background: `linear-gradient(90deg, #C8956C, #E8B898)` }}
    />
  );
};

export default CostBreakdownChart;
