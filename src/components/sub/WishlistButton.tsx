import React, { useState, useEffect } from 'react';
import { auth } from '../../lib/firebaseClient';
import * as api from '../../services/api';

interface WishlistButtonProps {
  productId: string;
  isInitiallySaved?: boolean;
  onToggle?: (saved: boolean) => void;
  style?: React.CSSProperties;
}

export const WishlistButton: React.FC<WishlistButtonProps> = ({
  productId,
  isInitiallySaved = false,
  onToggle,
  style = {}
}) => {
  const [saved, setSaved] = useState(isInitiallySaved);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(isInitiallySaved);
  }, [isInitiallySaved]);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card clicks
    
    if (loading) return;

    if (!auth.currentUser) {
      window.location.hash = '#/login';
      return;
    }

    setLoading(true);
    try {
      if (saved) {
        await api.removeFromWishlist(productId);
        setSaved(false);
        if (onToggle) onToggle(false);
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      } else {
        await api.addToWishlist(productId);
        setSaved(true);
        if (onToggle) onToggle(true);
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
      }
    } catch (err) {
      console.error('Wishlist action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        color: saved ? 'var(--color-gold)' : 'var(--color-silver)',
        transition: 'all 0.3s ease',
        outline: 'none',
        ...style
      }}
      title={saved ? 'Remove from Saved Collection' : 'Save to Collection'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ 
          width: '20px', 
          height: '20px', 
          transition: 'transform 0.2s ease',
          transform: loading ? 'scale(0.8)' : 'scale(1)'
        }}
        className="wishlist-icon"
      >
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
    </button>
  );
};

export default WishlistButton;
