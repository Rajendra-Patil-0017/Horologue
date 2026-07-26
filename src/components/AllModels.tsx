import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { watches } from './Collection';
import type { Watch } from './Collection';
import * as api from '../services/api';
import { auth } from '../lib/firebaseClient';
import WishlistButton from './sub/WishlistButton';
import StockBadge from './sub/StockBadge';

interface AllModelsProps {
  onReturn: () => void;
  onSelectProduct?: (watch: Watch) => void;
}

const AllModels: React.FC<AllModelsProps> = ({ onReturn, onSelectProduct }) => {
  const [enrichedWatches, setEnrichedWatches] = useState<Watch[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);

    // 1. Fetch DB products and merge with static catalog
    api.getAllProducts()
      .then(dbProducts => {
        const updated = watches.map(w => {
          const match = dbProducts.find(p => p.name.toLowerCase() === w.name.toLowerCase());
          if (match) {
            return {
              ...w,
              id: match.id,
              stock: match.stock,
              description: match.description || w.description
            };
          }
          return w;
        });
        setEnrichedWatches(updated);
      })
      .catch(err => {
        console.error('Failed to load products in AllModels:', err);
        setEnrichedWatches(watches); // fallback
      });

    // 2. Fetch user's wishlist if logged in
    const checkUserWishlist = async () => {
      if (auth.currentUser) {
        try {
          const items = await api.getWishlist();
          setWishlistProductIds(items.map(item => item.productId));
        } catch (err) {
          console.error('Failed to fetch wishlist in AllModels:', err);
        }
      } else {
        setWishlistProductIds([]);
      }
    };

    checkUserWishlist();
    window.addEventListener('wishlist-updated', checkUserWishlist);
    return () => {
      window.removeEventListener('wishlist-updated', checkUserWishlist);
    };
  }, []);

  return (
    <div style={{ background: 'var(--color-obsidian)', minHeight: '100vh', paddingBottom: '6rem' }}>
      <nav style={{ padding: '2rem 4rem', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(229, 228, 226, 0.1)' }}>
        <button 
          onClick={onReturn}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-silver)',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          ← Return to Home
        </button>
      </nav>

      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '4rem' }}>
        <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '3.5rem', 
              color: 'var(--color-white)',
              marginBottom: '1rem',
              letterSpacing: '-0.02em'
            }}
          >
            THE FULL CATALOGUE
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: 'var(--font-technical)',
              color: 'var(--color-slate)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: '0.875rem'
            }}
          >
            {enrichedWatches.length} MASTERPIECES
          </motion.p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
          {enrichedWatches.map((watch, i) => (
            <motion.div 
              key={i}
              onClick={() => onSelectProduct?.(watch)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.1 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', cursor: 'pointer' }}
              className="group"
            >
              <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--color-charcoal)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                {/* 3. Wishlist button overlay */}
                {watch.id && (
                  <WishlistButton
                    productId={watch.id}
                    isInitiallySaved={wishlistProductIds.includes(watch.id)}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1rem',
                      zIndex: 10,
                      background: 'rgba(19, 19, 19, 0.6)',
                      backdropFilter: 'blur(4px)',
                      borderRadius: '50%'
                    }}
                  />
                )}

                {/* 4. Stock badge scarcity overlay */}
                {watch.stock !== undefined && (
                  <StockBadge
                    stock={watch.stock}
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      left: '1rem',
                      zIndex: 10
                    }}
                  />
                )}

                <motion.img 
                  src={watch.image} 
                  alt={watch.name}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(50%) brightness(0.8)' }}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', textAlign: 'center' }}>
                <span className="technical-text" style={{ color: 'var(--color-gold)' }}>{watch.ref}</span>
                <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: 0 }}>{watch.name}</h3>
                <span className="technical-text" style={{ color: 'var(--color-slate)' }}>{watch.price}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllModels;
