import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Watch } from './Collection';
import * as api from '../services/api';
import { auth } from '../lib/firebaseClient';
import WishlistButton from './sub/WishlistButton';
import StockBadge from './sub/StockBadge';
import NotifyMeForm from './sub/NotifyMeForm';
import ReviewsSection from './sub/ReviewsSection';
import StarRating from './sub/StarRating';

interface ProductDetailsProps {
  watch: Watch;
  onReturn: () => void;
  onAddToCart?: (watch: Watch) => void;
  onBuyNow?: (watch: Watch) => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ watch, onReturn, onAddToCart, onBuyNow }) => {
  const [reviewsSummary, setReviewsSummary] = useState<{ averageRating: number; totalCount: number } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (watch.id) {
      // Load reviews summary
      api.getProductReviews(watch.id)
        .then(summary => {
          setReviewsSummary({ averageRating: summary.averageRating, totalCount: summary.totalCount });
        })
        .catch(err => console.error('Failed to load reviews summary in ProductDetails:', err));

      // Check user's wishlist status
      const checkWishlist = async () => {
        if (auth.currentUser) {
          try {
            const items = await api.getWishlist();
            setIsSaved(items.some(item => item.productId === watch.id));
          } catch (err) {
            console.error('Failed to check wishlist status in ProductDetails:', err);
          }
        }
      };
      checkWishlist();
    }
  }, [watch.id]);

  // Use the uniquely generated/assigned gallery images
  const gallery = [watch.image, ...(watch.gallery || [])];
  const [mainImage, setMainImage] = useState(gallery[0]);

  const isOutOfStock = watch.stock !== undefined && watch.stock <= 0;

  return (
    <div className="min-full-dvh" style={{ background: 'var(--color-obsidian)', paddingBottom: '6rem' }}>
      <nav style={{ padding: '1.25rem clamp(1rem, 4vw, 4rem)', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(229, 228, 226, 0.1)' }}>
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
            gap: '0.5rem',
            minHeight: '44px'
          }}
        >
          ← Back to Catalogue
        </button>
      </nav>

      <div className="product-details-grid" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 4rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'clamp(2rem, 5vw, 6rem)' }}>
        
        {/* Images Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key={mainImage}
            style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--color-charcoal)', border: '1px solid var(--color-border)' }}
          >
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
            {watch.id && (
              <WishlistButton
                productId={watch.id}
                isInitiallySaved={isSaved}
                onToggle={(saved) => setIsSaved(saved)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  zIndex: 10,
                  background: 'rgba(19, 19, 19, 0.6)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: '50%',
                  padding: '10px'
                }}
              />
            )}
            <img 
              src={mainImage} 
              alt={watch.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </motion.div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            {gallery.map((img, idx) => (
              <div 
                key={idx}
                onClick={() => setMainImage(img)}
                style={{
                  aspectRatio: '1',
                  background: 'var(--color-charcoal)',
                  border: mainImage === img ? '1px solid var(--color-gold)' : '1px solid var(--color-border)',
                  cursor: 'pointer',
                  opacity: mainImage === img ? 1 : 0.6,
                  transition: 'all 0.3s ease'
                }}
              >
                <img src={img} alt={`Gallery ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Details Section */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', letterSpacing: '0.1em', fontSize: '0.875rem' }}>
              {watch.ref}
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', margin: '0.5rem 0 1rem 0' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3.5rem)', color: 'var(--color-white)', margin: 0, lineHeight: 1.1 }}>
                {watch.name}
              </h1>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
              <p style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-silver)', fontSize: '1.5rem', margin: 0 }}>
                {watch.price}
              </p>
              {reviewsSummary && reviewsSummary.totalCount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'rgba(229, 228, 226, 0.15)' }}>|</span>
                  <StarRating rating={reviewsSummary.averageRating} size="0.9rem" />
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                    {reviewsSummary.averageRating} ({reviewsSummary.totalCount} reviews)
                  </span>
                </div>
              )}
            </div>

            <p style={{ fontFamily: 'var(--font-body)', color: 'var(--color-slate)', lineHeight: 1.8, marginBottom: '2.5rem' }}>
              {watch.description || "A masterpiece of horological engineering. Hand-assembled by master watchmakers, this piece features a bespoke in-house movement, sapphire crystal back, and a meticulously finished dial. Designed for those who command time."}
            </p>

            {isOutOfStock ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                {watch.id && <NotifyMeForm productId={watch.id} />}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                <button 
                  onClick={() => onBuyNow && onBuyNow(watch)}
                  className="ingot-btn"
                  style={{
                    flex: '1 1 180px',
                    width: '100%',
                    minHeight: '48px'
                  }}>
                  Buy Now
                </button>
                <button 
                  onClick={() => onAddToCart && onAddToCart(watch)}
                  className="ghost-btn"
                  style={{
                    flex: '1 1 180px',
                    width: '100%',
                    minHeight: '48px'
                  }}>
                  Add to Cart
                </button>
              </div>
            )}
          </motion.div>
        </div>

      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 4rem) 4rem clamp(1rem, 4vw, 4rem)' }}>
        {watch.id && <ReviewsSection productId={watch.id} />}
      </div>
    </div>
  );
};

export default ProductDetails;
