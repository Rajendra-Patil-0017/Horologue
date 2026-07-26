import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

interface NavbarProps {
  onLoginClick?: () => void;
  onCartClick?: () => void;
  onSubscribeClick?: () => void;
  onWishlistClick?: () => void;
  cartCount?: number;
  wishlistCount?: number;
  currentUser?: { name: string; role: string } | null;
}

const Navbar: React.FC<NavbarProps> = ({ 
  onLoginClick, 
  onCartClick, 
  onSubscribeClick, 
  onWishlistClick,
  cartCount = 0, 
  wishlistCount = 0,
  currentUser 
}) => {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    
    setScrolled(latest > 50);
  });

  return (
    <motion.nav
      variants={{
        visible: { y: 0 },
        hidden: { y: "-100%" },
      }}
      animate={hidden ? "hidden" : "visible"}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        top: 0,
        width: '100%',
        zIndex: 50,
        padding: '1.5rem 4rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: scrolled ? 'rgba(10, 10, 10, 0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(229, 228, 226, 0.1)' : '1px solid transparent',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease'
      }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.1em' }}>
        HOROLOGUE
      </div>
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <a href="#collection" style={{ color: 'var(--color-white)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Collection</a>
        <a href="#craft" style={{ color: 'var(--color-white)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Craftsmanship</a>
        <a 
          href="#subscribe" 
          onClick={(e) => { e.preventDefault(); onSubscribeClick?.(); }}
          style={{ color: 'var(--color-white)', textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}
        >
          Membership
        </a>
        <button 
          onClick={onWishlistClick} 
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-silver)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem',
            transition: 'color 0.3s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-gold)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-silver)'; }}
          title="Saved Collection"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={wishlistCount > 0 ? 'var(--color-gold)' : 'none'}
            stroke={wishlistCount > 0 ? 'var(--color-gold)' : 'currentColor'}
            strokeWidth="1.5"
            style={{ width: '18px', height: '18px', transition: 'all 0.3s ease' }}
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem' }}>
            ({wishlistCount})
          </span>
        </button>
        <button className="ghost-btn" onClick={onCartClick} style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
          Cart {cartCount > 0 && `(${cartCount})`}
        </button>
        {currentUser ? (
          <button 
            onClick={() => {
              window.location.hash = currentUser.role === 'admin' ? '#/admin/dashboard' : '#/dashboard';
            }} 
            style={{ 
              fontFamily: 'var(--font-technical)', 
              fontSize: '0.75rem', 
              padding: '0.5rem 1rem', 
              background: 'var(--color-gold)', 
              color: 'var(--color-obsidian)', 
              border: 'none', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em', 
              cursor: 'pointer' 
            }}
          >
            Dashboard
          </button>
        ) : (
          <button onClick={onLoginClick} style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', padding: '0.5rem 1rem', background: 'var(--color-gold)', color: 'var(--color-obsidian)', border: 'none', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Login</button>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;
