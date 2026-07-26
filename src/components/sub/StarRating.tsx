import React from 'react';

interface StarRatingProps {
  rating: number; // For display, can be decimal (e.g. 4.3). For input, should be 1-5.
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: string; // CSS font size, e.g. '1rem' or '1.25rem'
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  interactive = false,
  onChange,
  size = '1rem'
}) => {
  const stars = [1, 2, 3, 4, 5];

  const handleStarClick = (val: number) => {
    if (interactive && onChange) {
      onChange(val);
    }
  };

  const getStarColor = (starValue: number) => {
    if (interactive) {
      return starValue <= rating ? 'var(--color-gold)' : 'rgba(229, 228, 226, 0.2)';
    }

    // Fractional star rendering logic
    const diff = rating - (starValue - 1);
    if (diff >= 1) return 'var(--color-gold)';
    if (diff > 0) return 'linear-gradient(90deg, var(--color-gold) 50%, rgba(229, 228, 226, 0.2) 50%)'; // Simplified color logic
    return 'rgba(229, 228, 226, 0.2)';
  };

  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      {stars.map((star) => {
        const isHalf = !interactive && rating > star - 1 && rating < star;
        return (
          <span
            key={star}
            onClick={() => handleStarClick(star)}
            style={{
              fontSize: size,
              cursor: interactive ? 'pointer' : 'default',
              position: 'relative',
              display: 'inline-block',
              color: isHalf ? 'transparent' : getStarColor(star) as string,
              transition: 'color 0.2s ease',
              fontFamily: 'sans-serif'
            }}
          >
            {isHalf ? (
              <>
                <span style={{ color: 'rgba(229, 228, 226, 0.2)', position: 'absolute', left: 0, top: 0 }}>★</span>
                <span style={{ color: 'var(--color-gold)', position: 'absolute', left: 0, top: 0, width: `${(rating % 1) * 100}%`, overflow: 'hidden' }}>★</span>
                <span style={{ opacity: 0 }}>★</span>
              </>
            ) : (
              '★'
            )}
          </span>
        );
      })}
    </div>
  );
};

export default StarRating;
