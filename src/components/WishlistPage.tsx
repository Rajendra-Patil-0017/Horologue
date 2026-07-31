import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import type { Watch } from './Collection';
import type { CartItem } from '../App';

interface WishlistPageProps {
  onNavigateHome: () => void;
  onAddToCart?: (watch: Watch) => void;
  cartItems?: CartItem[];
}

export const WishlistPage: React.FC<WishlistPageProps> = ({ 
  onNavigateHome, 
  onAddToCart, 
  cartItems = [] 
}) => {
  const [wishlist, setWishlist] = useState<api.WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fallback image in case the watch image fails to render
  const LUXURY_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop';

  const fetchWishlist = async () => {
    try {
      const items = await api.getWishlist();
      setWishlist(items);
    } catch (err: any) {
      console.error('Failed to load wishlist:', err);
      setError(err.message || 'Unable to retrieve your saved collection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
    window.addEventListener('wishlist-updated', fetchWishlist);
    return () => {
      window.removeEventListener('wishlist-updated', fetchWishlist);
    };
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      await api.removeFromWishlist(productId);
      setWishlist(prev => prev.filter(item => item.productId !== productId));
      window.dispatchEvent(new CustomEvent('wishlist-updated'));
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  return (
    <div className="min-full-dvh" style={{ background: 'var(--color-obsidian)', color: 'var(--color-white)', fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      {/* CSS Injections for responsiveness and hover transitions */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wishlist-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(5rem, 8vw, 8rem) clamp(1rem, 4vw, 4rem);
        }
        .wishlist-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
          gap: 2.5rem;
          margin-top: 3.5rem;
        }
        @media (max-width: 767px) {
          .wishlist-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .wishlist-btn-group {
            flex-direction: column;
            width: 100%;
          }
          .wishlist-btn-group button {
            width: 100%;
            min-height: 44px;
          }
        }
        .wishlist-card {
          background: var(--color-charcoal);
          border: 1px solid var(--color-border);
          transition: border-color 0.4s ease, box-shadow 0.4s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .wishlist-card:hover {
          border-color: var(--color-gold);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .wishlist-image-container {
          position: relative;
          aspect-ratio: 3/4;
          background: #151515;
          overflow: hidden;
        }
        .wishlist-heart-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 10;
          background: rgba(19, 19, 19, 0.7);
          backdrop-filter: blur(8px);
          border: 1px solid var(--color-border);
          border-radius: 50%;
          padding: 8px;
          cursor: pointer;
          color: var(--color-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          min-height: 44px;
          transition: transform 0.2s ease, background 0.3s ease;
        }
        .wishlist-heart-badge:hover {
          transform: scale(1.1);
          background: rgba(19, 19, 19, 0.9);
        }
      `}} />

      {/* Header Navigation */}
      <header style={{ borderBottom: '1px solid rgba(229, 228, 226, 0.1)', padding: '1.25rem clamp(1rem, 4vw, 4rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, width: '100%', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(10px)', zIndex: 100 }}>
        <div 
          onClick={onNavigateHome}
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 2vw + 0.8rem, 1.5rem)', fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
        >
          HOROLOGUE
        </div>
        <button
          onClick={onNavigateHome}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-silver)',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            minHeight: '44px'
          }}
        >
          Return to Catalogue
        </button>
      </header>

      {/* Main Content Area */}
      <main className="wishlist-container">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--color-white)', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Saved Collection
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{ fontFamily: 'var(--font-body)', color: 'var(--color-slate)', fontSize: '1rem', margin: 0 }}
          >
            Your personally curated collection of exceptional timepieces.
          </motion.p>
        </div>

        {error && (
          <div style={{ textAlign: 'center', color: '#ffb4ab', fontFamily: 'var(--font-body)', marginTop: '4rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          /* Premium Loading Skeletons */
          <div className="wishlist-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', height: '520px', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
                <div style={{ flex: 1, background: '#181818', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ height: '16px', width: '40%', background: '#181818', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ height: '24px', width: '70%', background: '#181818', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ height: '18px', width: '30%', background: '#181818', animation: 'pulse 1.5s infinite ease-in-out' }} />
                <div style={{ height: '40px', background: '#181818', animation: 'pulse 1.5s infinite ease-in-out', marginTop: '1rem' }} />
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          /* Premium Empty Wishlist State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', textAlign: 'center', marginTop: '4rem', padding: '2rem' }}
          >
            {/* Elegant luxury watch outline SVG */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--color-gold)" 
              strokeWidth="0.75" 
              style={{ width: '80px', height: '80px', marginBottom: '2rem', opacity: 0.6 }}
            >
              <circle cx="12" cy="12" r="7" />
              <path d="M12 9v3l2 2" />
              <path d="M12 2v3M12 19v3M9 5h6M9 19h6" />
            </svg>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--color-white)', margin: '0 0 0.75rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Saved Collection is Empty
            </h2>
            <p style={{ color: 'var(--color-slate)', fontSize: '0.95rem', maxWidth: '350px', margin: '0 0 2.5rem 0', lineHeight: 1.6 }}>
              Save your favourite timepieces to compare them later.
            </p>
            <button 
              onClick={() => { window.location.hash = '#/'; setTimeout(() => {
                const el = document.getElementById('collection');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100); }}
              style={{
                background: 'transparent',
                border: '1px solid var(--color-gold)',
                color: 'var(--color-gold)',
                padding: '1rem 2.5rem',
                fontFamily: 'var(--font-technical)',
                fontSize: '0.8rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-gold)';
                e.currentTarget.style.color = 'var(--color-obsidian)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-gold)';
              }}
            >
              Explore Collection
            </button>
          </motion.div>
        ) : (
          /* Standalone Luxury Responsive Grid */
          <div className="wishlist-grid">
            <AnimatePresence mode="popLayout">
              {wishlist.map((item) => {
                const isInCart = cartItems.some(c => c.watch.name.toLowerCase() === item.name.toLowerCase());
                return (
                  <motion.div 
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: -30 }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    className="wishlist-card"
                  >
                    {/* Watch Image with overlay button */}
                    <div className="wishlist-image-container">
                      <div 
                        className="wishlist-heart-badge"
                        onClick={() => handleRemove(item.productId)}
                        title="Remove from collection"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                        </svg>
                      </div>
                      <img 
                        src={item.image || LUXURY_FALLBACK_IMAGE} 
                        alt={item.name} 
                        onError={(e) => {
                          e.currentTarget.src = LUXURY_FALLBACK_IMAGE;
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.9)', transition: 'transform 0.6s ease' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1.0)';
                        }}
                      />
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-gold)', letterSpacing: '0.1em' }}>
                        {item.ref}
                      </span>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-white)', margin: '0.2rem 0', fontWeight: 500 }}>
                        {item.name}
                      </h3>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.95rem', color: 'var(--color-silver)' }}>
                        {item.price}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(229, 228, 226, 0.05)' }}>
                        <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.65rem', color: item.stock > 0 ? '#81c784' : '#ffb4ab', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ● {item.stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                        {item.createdAt && (
                          <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.6rem', color: 'var(--color-slate)' }}>
                            Saved: {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="wishlist-btn-group" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                        {item.stock > 0 && onAddToCart && (
                          isInCart ? (
                            <button
                              disabled
                              style={{
                                flex: 1.5,
                                background: 'rgba(255, 255, 255, 0.03)',
                                color: 'var(--color-slate)',
                                border: '1px solid var(--color-border)',
                                fontFamily: 'var(--font-technical)',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                padding: '1rem',
                                cursor: 'not-allowed',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              Already in Cart ✓
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const watch: Watch = {
                                  id: item.productId,
                                  name: item.name,
                                  ref: item.ref,
                                  price: item.price,
                                  image: item.image,
                                  gallery: [],
                                  description: item.description,
                                  stock: item.stock
                                };
                                onAddToCart(watch);
                              }}
                              style={{
                                flex: 1.5,
                                background: 'var(--color-gold)',
                                color: 'var(--color-obsidian)',
                                border: 'none',
                                fontFamily: 'var(--font-technical)',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                padding: '1rem',
                                cursor: 'pointer',
                                transition: 'background 0.3s ease, transform 0.2s ease',
                                fontWeight: 600,
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#f2ca50';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--color-gold)';
                              }}
                            >
                              Add to Cart
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handleRemove(item.productId)}
                          style={{
                            flex: 1,
                            background: 'transparent',
                            border: '1px solid rgba(255, 180, 171, 0.3)',
                            color: '#ffb4ab',
                            fontFamily: 'var(--font-technical)',
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            padding: '1rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 180, 171, 0.05)';
                            e.currentTarget.style.borderColor = '#ffb4ab';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'rgba(255, 180, 171, 0.3)';
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* CSS keyframe pulse definition for loading state */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}} />
    </div>
  );
};

export default WishlistPage;
