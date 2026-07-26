import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CartItem } from '../App';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface CartProps {
  cartItems: CartItem[];
  onReturn: () => void;
  onRemove: (name: string) => void;
  onUpdateQuantity: (name: string, delta: number) => void;
  onCheckout: () => void;
}

// 1. Lightweight requestAnimationFrame-based number tween hook
const useAnimatedNumber = (targetValue: number, duration: number = 400) => {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const prevValueRef = useRef(targetValue);

  useEffect(() => {
    let start: number | null = null;
    const startVal = prevValueRef.current;
    const endVal = targetValue;
    if (startVal === endVal) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Easing out quad
      const ease = progress * (2 - progress);
      const current = Math.round(startVal + ease * (endVal - startVal));
      
      setCurrentValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = targetValue;
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration]);

  // Keep ref up to date if we don't animate (e.g. initial mount)
  useEffect(() => {
    prevValueRef.current = currentValue;
  }, [currentValue]);

  return currentValue;
};

// Price display component with smooth count animation
const AnimatedPrice: React.FC<{ value: number }> = ({ value }) => {
  const animatedValue = useAnimatedNumber(value);
  return <span>${animatedValue.toLocaleString()}</span>;
};

// 2. Empty State Subcomponent
const CartEmptyState: React.FC<{ onReturn: () => void }> = ({ onReturn }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5rem 2rem',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '2rem auto',
      }}
    >
      {/* Luxury Watch-Box Outline Line-Art Icon */}
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          opacity: 0.8,
          marginBottom: '2rem',
          filter: 'drop-shadow(0 4px 12px rgba(212, 175, 55, 0.15))',
        }}
        aria-hidden="true"
      >
        <rect x="3" y="9" width="18" height="11" rx="1" />
        <path d="M12 2L3 9h18L12 2z" />
        <circle cx="12" cy="14.5" r="2.5" />
        <path d="M12 9v3" />
      </svg>

      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          color: 'var(--color-white)',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Your Collection Awaits
      </h3>
      
      <p
        style={{
          color: 'var(--color-slate)',
          fontSize: '1rem',
          lineHeight: '1.6',
          marginBottom: '2.5rem',
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
        }}
      >
        Your collection is currently empty. Explore our masterfully crafted chronographs and find your next legacy timepiece.
      </p>

      <button
        onClick={() => {
          onReturn();
          setTimeout(() => {
            // Force ScrollTrigger to recalculate DOM heights and pin-spacers
            ScrollTrigger.refresh();
            const lenis = (window as any).lenis;
            if (lenis) {
              lenis.scrollTo('#collection', { duration: 1.2 });
            } else {
              const el = document.getElementById('collection');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 50);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: 'transparent',
          border: `1px solid ${isFocused || isHovered ? 'var(--color-gold)' : 'var(--color-border)'}`,
          color: isFocused || isHovered ? 'var(--color-gold)' : 'var(--color-white)',
          fontFamily: 'var(--font-technical)',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '1rem 2.25rem',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          outline: 'none',
          boxShadow: isFocused ? '0 0 0 2px rgba(212, 175, 55, 0.3)' : 'none',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
      >
        Explore Collection
      </button>
    </motion.div>
  );
};

// Helper to extract integer value from price string (e.g. "$125,000" -> 125000)
const parsePrice = (priceStr: string) => {
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
};

// 3. Cart Item Row Subcomponent
interface CartItemRowProps {
  item: CartItem;
  onRemove: (name: string) => void;
  onUpdateQuantity: (name: string, delta: number) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, onRemove, onUpdateQuantity }) => {
  const [isRemoveFocused, setIsRemoveFocused] = useState(false);
  const [isRemoveHovered, setIsRemoveHovered] = useState(false);

  const priceVal = parsePrice(item.watch.price);
  const lineSubtotal = priceVal * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, height: 0, paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0, overflow: 'hidden' }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      style={{
        display: 'flex',
        gap: '2rem',
        borderBottom: '1px solid rgba(229, 228, 226, 0.1)',
        paddingBottom: '2.5rem',
        marginBottom: '2.5rem',
        alignItems: 'stretch',
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}
      className="cart-item-row"
    >
      {/* Product Image Thumbnail */}
      <div
        style={{
          width: '10rem',
          height: '10rem',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
          background: 'var(--color-charcoal)',
          position: 'relative',
        }}
      >
        <img
          src={item.watch.image}
          alt={item.watch.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'grayscale(20%)',
            transition: 'transform 0.5s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        />
      </div>

      {/* Details Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0.25rem 0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                textTransform: 'uppercase',
                margin: '0 0 0.25rem 0',
                color: 'var(--color-white)',
                letterSpacing: '0.02em',
              }}
            >
              {item.watch.name}
            </h3>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem',
                color: 'var(--color-slate)',
                margin: '0 0 0.5rem 0',
                fontWeight: 300,
              }}
            >
              41 mm · Brushed Obsidian Finish
            </p>
            <p
              style={{
                fontFamily: 'var(--font-technical)',
                fontSize: '0.75rem',
                color: 'rgba(229, 228, 226, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                margin: 0,
              }}
            >
              Ref: {item.watch.ref}
            </p>
          </div>

          {/* Line Subtotal */}
          <div
            style={{
              textAlign: 'right',
              fontFamily: 'var(--font-display)',
              fontSize: '1.35rem',
              color: 'var(--color-white)',
            }}
          >
            <AnimatedPrice value={lineSubtotal} />
          </div>
        </div>

        {/* Action Controls Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-technical)',
                fontSize: '0.75rem',
                color: 'var(--color-slate)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Qty:
            </span>
            
            {/* Quantity Stepper */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-border)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <button
                onClick={() => onUpdateQuantity(item.watch.name, -1)}
                disabled={item.quantity <= 1}
                aria-label="Decrease quantity"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: item.quantity <= 1 ? 'var(--color-slate)' : 'var(--color-white)',
                  cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => {
                  if (item.quantity > 1) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: 'var(--font-technical)',
                  fontSize: '0.85rem',
                  minWidth: '1.75rem',
                  textAlign: 'center',
                  color: 'var(--color-gold)',
                  fontWeight: 500,
                }}
              >
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.watch.name, 1)}
                aria-label="Increase quantity"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-white)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-body)',
                  outline: 'none',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                +
              </button>
            </div>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.watch.name)}
            onFocus={() => setIsRemoveFocused(true)}
            onBlur={() => setIsRemoveFocused(false)}
            onMouseEnter={() => setIsRemoveHovered(true)}
            onMouseLeave={() => setIsRemoveHovered(false)}
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              color: isRemoveFocused || isRemoveHovered ? '#ffb4ab' : 'var(--color-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${isRemoveFocused || isRemoveHovered ? '#ffb4ab' : 'rgba(229, 228, 226, 0.2)'}`,
              paddingBottom: '0.2rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              outline: 'none',
              boxShadow: isRemoveFocused ? '0 4px 0 -2px #ffb4ab' : 'none',
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// 4. Cart Summary Panel Subcomponent
interface CartSummaryProps {
  subtotal: number;
  onCheckout: () => void;
}

const CartSummary: React.FC<CartSummaryProps> = ({ subtotal, onCheckout }) => {
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0); // Percentage, e.g. 0.1
  const [promoSuccess, setPromoSuccess] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isApplyFocused, setIsApplyFocused] = useState(false);
  const [isApplyHovered, setIsApplyHovered] = useState(false);
  const [isCheckoutHovered, setIsCheckoutHovered] = useState(false);
  const [isCheckoutFocused, setIsCheckoutFocused] = useState(false);

  const discountAmount = subtotal * discount;
  const finalTotal = subtotal - discountAmount;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code === 'LEGACY10' || code === 'CHRONOS') {
      setDiscount(0.1); // 10% Off
      setPromoSuccess('PROMO CODE APPLIED (10% OFF)');
      setPromoError('');
    } else if (code === '') {
      setPromoError('Please enter a coupon code.');
      setPromoSuccess('');
      setDiscount(0);
    } else {
      setPromoError('Invalid promo code.');
      setPromoSuccess('');
      setDiscount(0);
    }
  };

  return (
    <div
      style={{
        background: 'var(--color-charcoal)',
        border: '1px solid var(--color-border)',
        padding: '2.5rem',
        position: 'sticky',
        top: '8rem',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          textTransform: 'uppercase',
          marginBottom: '2rem',
          marginTop: 0,
          color: 'var(--color-white)',
          letterSpacing: '0.02em',
        }}
      >
        Order Summary
      </h3>

      {/* Breakdowns */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.8rem',
              color: 'var(--color-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            Subtotal
          </span>
          <span style={{ fontSize: '1.1rem', fontFamily: 'var(--font-body)' }}>
            <AnimatedPrice value={subtotal} />
          </span>
        </div>

        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-technical)',
                fontSize: '0.8rem',
                color: 'var(--color-gold)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}
            >
              Discount (10%)
            </span>
            <span style={{ fontSize: '1.1rem', color: 'var(--color-gold)' }}>
              -<AnimatedPrice value={discountAmount} />
            </span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.8rem',
              color: 'var(--color-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            Shipping
          </span>
          <span
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              color: 'var(--color-gold)',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
            }}
          >
            Complimentary
          </span>
        </div>

        <div style={{ height: '1px', background: 'rgba(229, 228, 226, 0.1)', margin: '0.5rem 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              textTransform: 'uppercase',
              color: 'var(--color-white)',
            }}
          >
            Total
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              color: 'var(--color-gold)',
            }}
          >
            <AnimatedPrice value={finalTotal} />
          </span>
        </div>
      </div>

      {/* Promo Code Input */}
      <form
        onSubmit={handleApplyPromo}
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="PROMO CODE (e.g. LEGACY10)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-white)',
              padding: '0.75rem 1rem',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              outline: 'none',
              transition: 'border-color 0.3s ease',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-gold)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          />
          <button
            type="submit"
            onFocus={() => setIsApplyFocused(true)}
            onBlur={() => setIsApplyFocused(false)}
            onMouseEnter={() => setIsApplyHovered(true)}
            onMouseLeave={() => setIsApplyHovered(false)}
            style={{
              background: isApplyHovered || isApplyFocused ? 'var(--color-gold)' : 'transparent',
              color: isApplyHovered || isApplyFocused ? 'var(--color-obsidian)' : 'var(--color-white)',
              border: '1px solid var(--color-gold)',
              padding: '0.75rem 1.25rem',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              outline: 'none',
              boxShadow: isApplyFocused ? '0 0 0 2px rgba(212, 175, 55, 0.3)' : 'none',
            }}
          >
            Apply
          </button>
        </div>

        {promoSuccess && (
          <span
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.7rem',
              color: 'var(--color-gold)',
              marginTop: '0.5rem',
              letterSpacing: '0.05em',
            }}
          >
            {promoSuccess}
          </span>
        )}
        {promoError && (
          <span
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.7rem',
              color: '#ffb4ab',
              marginTop: '0.5rem',
              letterSpacing: '0.05em',
            }}
          >
            {promoError}
          </span>
        )}
      </form>

      {/* Checkout CTA */}
      <button
        onFocus={() => setIsCheckoutFocused(true)}
        onBlur={() => setIsCheckoutFocused(false)}
        onMouseEnter={() => setIsCheckoutHovered(true)}
        onMouseLeave={() => setIsCheckoutHovered(false)}
        onClick={onCheckout}
        style={{
          width: '100%',
          background: 'var(--color-gold)',
          color: 'var(--color-obsidian)',
          padding: '1.25rem',
          fontFamily: 'var(--font-technical)',
          fontSize: '0.875rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.75rem',
          outline: 'none',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          transform: isCheckoutHovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isCheckoutHovered
            ? '0 10px 20px rgba(212, 175, 55, 0.2)'
            : isCheckoutFocused
            ? '0 0 0 3px rgba(212, 175, 55, 0.4)'
            : 'none',
        }}
      >
        Proceed to Checkout
        <span style={{ fontSize: '1rem', transition: 'transform 0.3s ease', transform: isCheckoutHovered ? 'translateX(3px)' : 'none' }}>→</span>
      </button>

      {/* Payment Security */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem',
          color: 'var(--color-slate)',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span
          style={{
            fontFamily: 'var(--font-technical)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Secure Encryption by Chronos Pay
        </span>
      </div>
    </div>
  );
};

// 5. Main Cart Wrapper Component
const Cart: React.FC<CartProps> = ({ cartItems, onReturn, onRemove, onUpdateQuantity, onCheckout }) => {
  const subtotal = cartItems.reduce((acc, item) => acc + parsePrice(item.watch.price) * item.quantity, 0);

  return (
    <div
      style={{
        background: 'var(--color-obsidian)',
        minHeight: '100vh',
        color: 'var(--color-white)',
        fontFamily: 'var(--font-body)',
        overflowX: 'hidden',
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          width: '100%',
          zIndex: 50,
          background: 'rgba(10, 10, 10, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(229, 228, 226, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4rem',
            height: '5rem',
            maxWidth: '1440px',
            margin: '0 auto',
          }}
        >
          <button
            onClick={onReturn}
            aria-label="Return to store"
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              color: 'var(--color-white)',
              fontSize: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-body)',
              transition: 'color 0.2s ease',
              outline: 'none',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = 'var(--color-gold)')}
            onMouseOut={(e) => (e.currentTarget.style.color = 'var(--color-white)')}
            onFocus={(e) => (e.currentTarget.style.color = 'var(--color-gold)')}
            onBlur={(e) => (e.currentTarget.style.color = 'var(--color-white)')}
          >
            ✕
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              margin: 0,
              color: 'var(--color-white)',
            }}
          >
            CHRONOS
          </h1>
          <div style={{ width: '2rem' }}></div> {/* Balanced layout spacer */}
        </div>
      </header>

      {/* Main Page Layout */}
      <main
        style={{
          paddingTop: '8rem',
          paddingBottom: '8rem',
          paddingLeft: '4rem',
          paddingRight: '4rem',
          width: '100%',
          maxWidth: '1440px',
          margin: '0 auto',
          minHeight: 'calc(100vh - 5rem)',
          boxSizing: 'border-box',
        }}
      >
        {/* Style block for responsive rules and custom focus rings */}
        <style dangerouslySetInnerHTML={{ __html: `
          .cart-layout-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 4rem;
          }
          @media (min-width: 992px) {
            .cart-layout-grid {
              grid-template-columns: 1.8fr 1fr;
            }
          }
          .cart-layout-grid.empty {
            grid-template-columns: 1fr;
          }
          .cart-item-row:hover {
            background-color: rgba(255, 255, 255, 0.01);
          }
          button:focus-visible, input:focus-visible {
            outline: 1px solid var(--color-gold) !important;
            outline-offset: 2px;
          }
        `}} />

        <div className={`cart-layout-grid ${cartItems.length === 0 ? 'empty' : ''}`}>
          {/* Left Area: Item list or Empty State */}
          <section>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                textTransform: 'uppercase',
                marginBottom: '3rem',
                borderBottom: '1px solid rgba(229, 228, 226, 0.15)',
                paddingBottom: '1rem',
                marginTop: 0,
                color: 'var(--color-white)',
                letterSpacing: '0.02em',
              }}
            >
              Your Collection
            </h2>

            {cartItems.length === 0 ? (
              <CartEmptyState onReturn={onReturn} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence initial={false}>
                  {cartItems.map((item) => (
                    <CartItemRow
                      key={item.watch.name}
                      item={item}
                      onRemove={onRemove}
                      onUpdateQuantity={onUpdateQuantity}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* Right Area: Order Summary Panel */}
          {cartItems.length > 0 && (
            <aside>
              <CartSummary subtotal={subtotal} onCheckout={onCheckout} />
            </aside>
          )}
        </div>
      </main>

      {/* Shared Footer */}
      <footer
        style={{
          width: '100%',
          padding: '4rem 0',
          background: '#0a0a0a',
          borderTop: '1px solid rgba(229, 228, 226, 0.1)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 4rem',
            maxWidth: '1440px',
            margin: '0 auto',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              color: 'var(--color-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}
          >
            © 2026 CHRONOS HOROLOGY. ALL RIGHTS RESERVED.
          </span>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {['Shipping', 'Returns', 'Contact', 'Warranty'].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontFamily: 'var(--font-technical)',
                  fontSize: '0.75rem',
                  color: 'var(--color-slate)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  outline: 'none',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.color = 'var(--color-gold)';
                  e.currentTarget.style.textDecoration = 'underline';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.color = 'var(--color-slate)';
                  e.currentTarget.style.textDecoration = 'none';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.color = 'var(--color-gold)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.color = 'var(--color-slate)';
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Cart;
