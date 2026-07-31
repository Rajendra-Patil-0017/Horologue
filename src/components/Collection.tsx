import React from 'react';
import { motion } from 'framer-motion';
import * as api from '../services/api';
import { auth } from '../lib/firebaseClient';
import WishlistButton from './sub/WishlistButton';
import StockBadge from './sub/StockBadge';

export interface Watch {
  id?: string;
  name: string;
  ref: string;
  price: string;
  image: string;
  gallery: string[];
  description?: string;
  stock?: number;
}

export const watches: Watch[] = [
  {
    name: 'THE CHRONOS',
    ref: 'REF. 401.CX.0123',
    price: '$125,000',
    image: 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/chronos_gallery_1_1781355514781.png', '/images/chronos_gallery_2_1781355529778.png'],
    description: 'A luxury chronograph designed for precision and elegance.',
    stock: 5
  },
  {
    name: 'THE AVIATOR',
    ref: 'REF. 502.TX.0456',
    price: '$85,000',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/aviator_gallery_1_1781355543072.png', '/images/aviator_gallery_2_1781355556312.png'],
    description: 'Engineered for high-altitude performance and classic pilot style.',
    stock: 2
  },
  {
    name: 'THE NOCTURNE',
    ref: 'REF. 603.OX.0789',
    price: '$180,000',
    image: 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/nocturne_gallery_1_1781355569738.png', '/images/nocturne_gallery_2_1781355583536.png'],
    description: 'A masterwork of nocturnal elegance.',
    stock: 3
  },
  {
    name: 'THE ECLIPSE',
    ref: 'REF. 704.UX.1011',
    price: '$210,000',
    image: 'https://images.unsplash.com/photo-1547996160-81dfa63595aa?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/eclipse_gallery_1_1781355595360.png', '/images/eclipse_gallery_2_1781355606672.png'],
    description: 'Deep carbon finishes with astronomical precision.',
    stock: 4
  },
  {
    name: 'THE VANGUARD',
    ref: 'REF. 805.MX.1213',
    price: '$95,000',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/vanguard_gallery_1_1781355617620.png', '/images/vanguard_gallery_2_1781355628159.png'],
    description: 'Innovative materials combined with futuristic design elements.',
    stock: 8
  },
  {
    name: 'THE MERIDIAN',
    ref: 'REF. 906.SX.1415',
    price: '$145,000',
    image: 'https://images.unsplash.com/photo-1585123334904-845d60e97b29?q=80&w=800&auto=format&fit=crop',
    gallery: ['/images/meridian_gallery_1_1781355648747.png', '/images/meridian_gallery_2_1781355659372.png'],
    description: 'A timeless global traveler timepiece.',
    stock: 1
  }
];

interface CollectionProps {
  onViewAllClick?: () => void;
  onSelectProduct?: (watch: Watch) => void;
}

const Collection: React.FC<CollectionProps> = ({ onViewAllClick, onSelectProduct }) => {
  const [enrichedWatches, setEnrichedWatches] = React.useState<Watch[]>([]);
  const [wishlistProductIds, setWishlistProductIds] = React.useState<string[]>([]);

  React.useEffect(() => {
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
        console.error('Failed to load products in Collection:', err);
        setEnrichedWatches(watches); // fallback
      });

    // 2. Fetch user's wishlist if logged in
    const checkUserWishlist = async () => {
      if (auth.currentUser) {
        try {
          const items = await api.getWishlist();
          setWishlistProductIds(items.map(item => item.productId));
        } catch (err) {
          console.error('Failed to fetch wishlist in Collection:', err);
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

  const displayedWatches = enrichedWatches.slice(0, 3);

  return (
    <section id="collection" style={{ padding: 'clamp(4rem, 8vw, 8rem) clamp(1rem, 4vw, 4rem)', background: 'var(--color-charcoal)', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'clamp(2.5rem, 5vw, 6rem)' }}>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: 'var(--color-white)', margin: 0 }}
          >
            THE COLLECTION
          </motion.h2>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <button 
              className="ghost-btn"
              onClick={onViewAllClick}
            >
              View All Models
            </button>
          </motion.div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2rem' }}>
          {displayedWatches.map((watch, i) => (
            <motion.div 
              key={i}
              onClick={() => onSelectProduct?.(watch)}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ duration: 0.8, delay: i * 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', cursor: 'pointer' }}
              className="group"
            >
              <div style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--color-obsidian)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
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
    </section>
  );
};

export default Collection;
