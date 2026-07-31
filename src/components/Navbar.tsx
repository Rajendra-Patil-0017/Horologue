import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    if (latest > previous && latest > 150 && !isDrawerOpen) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    
    setScrolled(latest > 50);
  });

  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen]);

  const closeDrawer = () => setIsDrawerOpen(false);

  return (
    <>
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
          padding: '1.25rem clamp(1rem, 4vw, 4rem)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: scrolled ? 'rgba(10, 10, 10, 0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(10px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(229, 228, 226, 0.1)' : '1px solid transparent',
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease'
        }}
      >
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.2rem, 2vw + 0.8rem, 1.5rem)', fontWeight: 700, letterSpacing: '0.1em' }}>
          <a href="#/" style={{ color: 'inherit', textDecoration: 'none' }} onClick={closeDrawer}>
            HOROLOGUE
          </a>
        </div>

        {/* Desktop Nav Links */}
        <div className="nav-desktop-menu" style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }}>
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
              color: 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem',
              transition: 'color 0.3s ease',
              outline: 'none',
              minHeight: '44px'
            }}
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
                cursor: 'pointer',
                minHeight: '44px'
              }}
            >
              Dashboard
            </button>
          ) : (
            <button onClick={onLoginClick} style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', padding: '0.5rem 1rem', background: 'var(--color-gold)', color: 'var(--color-obsidian)', border: 'none', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', minHeight: '44px' }}>Login</button>
          )}
        </div>

        {/* Mobile Nav Action Buttons & Hamburger Toggle */}
        <div className="nav-mobile-bar" style={{ display: 'none', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={onWishlistClick} 
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              minHeight: '44px',
              minWidth: '44px',
              justifyContent: 'center'
            }}
            title="Wishlist"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={wishlistCount > 0 ? 'var(--color-gold)' : 'none'}
              stroke={wishlistCount > 0 ? 'var(--color-gold)' : 'currentColor'}
              strokeWidth="1.5"
              style={{ width: '20px', height: '20px' }}
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            {wishlistCount > 0 && (
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-gold)', marginLeft: '2px' }}>
                {wishlistCount}
              </span>
            )}
          </button>

          <button 
            onClick={onCartClick} 
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-white)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem',
              minHeight: '44px',
              minWidth: '44px',
              justifyContent: 'center',
              position: 'relative'
            }}
            title="Cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"/>
              <circle cx="19" cy="21" r="1"/>
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
            {cartCount > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '6px', 
                right: '4px', 
                background: 'var(--color-gold)', 
                color: '#000', 
                fontSize: '0.65rem', 
                fontWeight: 'bold', 
                borderRadius: '50%', 
                width: '16px', 
                height: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                {cartCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            aria-label="Toggle navigation drawer"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-gold)',
              padding: '0.5rem',
              minHeight: '44px',
              minWidth: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isDrawerOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        </div>
      </motion.nav>

      {/* Mobile Slide-in Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(5px)',
                zIndex: 45
              }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: 'min(85vw, 320px)',
                background: 'var(--color-background)',
                borderLeft: '1px solid var(--color-border)',
                zIndex: 48,
                padding: '5rem 2rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <a 
                  href="#collection" 
                  onClick={closeDrawer}
                  style={{ color: 'var(--color-white)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em' }}
                >
                  Collection
                </a>
                <a 
                  href="#craft" 
                  onClick={closeDrawer}
                  style={{ color: 'var(--color-white)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em' }}
                >
                  Craftsmanship
                </a>
                <a 
                  href="#subscribe" 
                  onClick={(e) => { e.preventDefault(); closeDrawer(); onSubscribeClick?.(); }}
                  style={{ color: 'var(--color-white)', textDecoration: 'none', fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em' }}
                >
                  Membership
                </a>
                <button 
                  onClick={() => { closeDrawer(); onWishlistClick?.(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--color-gold)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  Wishlist ({wishlistCount})
                </button>
                <button 
                  onClick={() => { closeDrawer(); onCartClick?.(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--color-gold)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    textAlign: 'left',
                    padding: 0
                  }}
                >
                  Cart ({cartCount})
                </button>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                {currentUser ? (
                  <button 
                    onClick={() => {
                      closeDrawer();
                      window.location.hash = currentUser.role === 'admin' ? '#/admin/dashboard' : '#/dashboard';
                    }} 
                    className="ingot-btn"
                    style={{ width: '100%' }}
                  >
                    Dashboard
                  </button>
                ) : (
                  <button 
                    onClick={() => { closeDrawer(); onLoginClick?.(); }}
                    className="ingot-btn"
                    style={{ width: '100%' }}
                  >
                    Login / Register
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 767px) {
          .nav-desktop-menu {
            display: none !important;
          }
          .nav-mobile-bar {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;

