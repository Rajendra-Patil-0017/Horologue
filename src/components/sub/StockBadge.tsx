import React from 'react';

interface StockBadgeProps {
  stock: number;
  style?: React.CSSProperties;
}

export const SCARCITY_THRESHOLD = 3;

export const StockBadge: React.FC<StockBadgeProps> = ({ stock, style = {} }) => {
  if (stock <= 0) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-technical)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: 'rgba(255, 180, 171, 0.1)',
          border: '1px solid #ffb4ab',
          color: '#ffb4ab',
          ...style
        }}
      >
        Out of Stock
      </span>
    );
  }

  if (stock <= SCARCITY_THRESHOLD) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.25rem 0.75rem',
          fontSize: '0.65rem',
          fontFamily: 'var(--font-technical)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          background: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid var(--color-gold)',
          color: 'var(--color-gold)',
          ...style
        }}
      >
        Only {stock} remaining
      </span>
    );
  }

  return null;
};

export default StockBadge;
