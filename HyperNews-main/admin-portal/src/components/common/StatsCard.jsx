// src/components/common/StatsCard.jsx
import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const StatsCard = ({ 
  title, 
  value, 
  change, 
  isPositive, 
  changeType, 
  icon: Icon, 
  sparklineData = [] 
}) => {
  // Resolve positivity flag
  const positive = isPositive !== undefined 
    ? isPositive 
    : changeType === 'negative' 
      ? false 
      : changeType === 'neutral' 
        ? null 
        : true;

  // Generate a mini SVG sparkline path
  const width = 100;
  const height = 32;
  const data = sparklineData.length ? sparklineData : [20, 35, 25, 45, 30, 55, 65, 50, 75, 90];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const strokeColor = positive === true ? '#34d399' : positive === false ? '#fb7185' : '#94a3b8';
  const fillColor = positive === true ? 'rgba(16, 185, 129, 0.15)' : positive === false ? 'rgba(244, 63, 94, 0.15)' : 'rgba(148, 163, 184, 0.1)';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            padding: '0.45rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.04)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {value}
          </div>
          {change && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              marginTop: '0.25rem',
              color: strokeColor,
            }}>
              {positive === true ? <TrendingUp size={14} /> : positive === false ? <TrendingDown size={14} /> : <Minus size={14} />}
              <span>{change}</span>
            </div>
          )}
        </div>

        {/* Mini SVG Sparkline Chart */}
        <div style={{ width: `${width}px`, height: `${height}px` }}>
          <svg width={width} height={height} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id={`grad-${title.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${height} ${points} ${width},${height}`}
              fill={`url(#grad-${title.replace(/[^a-zA-Z0-9]/g, '')})`}
            />
            <polyline
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
