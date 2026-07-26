import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from './lib/firebaseClient';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Lenis from 'lenis';
import Craftsmanship from './components/Craftsmanship';
import Collection from './components/Collection';
import Footer from './components/Footer';
import Login from './components/Login';
import UserDashboard from './components/UserDashboard';
import WishlistPage from './components/WishlistPage';
import AdminDashboard from './components/AdminDashboard';
import * as api from './services/api';
import AllModels from './components/AllModels';
import ProductDetails from './components/ProductDetails';
import Cart from './components/Cart';
import { Checkout } from './components/Checkout';
import { SubscriptionCheckout } from './components/SubscriptionCheckout';
import { SubscriptionSuccess } from './components/SubscriptionSuccess';
import type { Watch } from './components/Collection';

export interface CartItem {
  watch: Watch;
  quantity: number;
}

function App() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    });
    (window as any).lenis = lenis;
    return () => {
      lenis.destroy();
      (window as any).lenis = undefined;
    };
  }, []);

  const [currentRoute, setCurrentRoute] = useState(window.location.hash || '#/');
  const [currentUser, setCurrentUser] = useState<api.User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const [showAllModels, setShowAllModels] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSubscriptionCheckout, setShowSubscriptionCheckout] = useState(false);
  const [showSubscriptionSuccess, setShowSubscriptionSuccess] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [selectedProduct, setSelectedProduct] = useState<Watch | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<api.WishlistItem[]>([]);

  const fetchWishlist = async () => {
    if (auth.currentUser) {
      try {
        const items = await api.getWishlist();
        setWishlist(items);
      } catch (err) {
        console.error('Failed to fetch wishlist in App:', err);
      }
    } else {
      setWishlist([]);
    }
  };

  useEffect(() => {
    fetchWishlist();
    window.addEventListener('wishlist-updated', fetchWishlist);
    return () => {
      window.removeEventListener('wishlist-updated', fetchWishlist);
    };
  }, [currentUser]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#/';
      setCurrentRoute(hash);
    };

    window.addEventListener('hashchange', handleHashChange);

    // Firebase auth session, reactively synchronizes login/logout state across the app
    const unsubscribe = api.onAuthStateChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const checkRouteProtection = () => {
      const user = currentUser;

      if (currentRoute === '#/dashboard' || currentRoute === '#/admin/dashboard' || currentRoute === '#/wishlist') {
        if (!user) {
          window.location.hash = '#/login';
        } else if (currentRoute === '#/admin/dashboard' && user.role !== 'admin') {
          window.location.hash = '#/dashboard';
        }
      } else if (currentRoute === '#/login' || currentRoute === '#/signup') {
        if (user) {
          window.location.hash = user.role === 'admin' ? '#/admin/dashboard' : '#/dashboard';
        }
      }
    };
    checkRouteProtection();
  }, [currentRoute, currentUser, authLoading]);

  useEffect(() => {
    const lenis = (window as any).lenis;
    if (lenis) {
      if (
        showCart || 
        showCheckout || 
        showSubscriptionCheckout || 
        showSubscriptionSuccess || 
        currentRoute === '#/login' || 
        currentRoute === '#/signup' || 
        currentRoute === '#/dashboard' || 
        currentRoute === '#/admin/dashboard'
      ) {
        lenis.stop();
      } else {
        lenis.start();
      }
    }
  }, [showCart, showCheckout, showSubscriptionCheckout, showSubscriptionSuccess, currentRoute]);

  if (currentRoute === '#/login' || currentRoute === '#/signup') {
    return (
      <div style={{ position: 'relative' }}>
        <button 
          onClick={() => { window.location.hash = '#/'; }}
          style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-silver)',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          ← Return
        </button>
        <Login onLoginSuccess={(user) => setCurrentUser(user)} />

        {/* Floating success toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -20, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                position: 'fixed',
                top: '2rem',
                right: '2rem',
                background: 'var(--color-card-bg, #1a1a1a)',
                border: '1px solid var(--color-gold, #D4AF37)',
                padding: '1rem 2rem',
                color: 'var(--color-white, #ffffff)',
                zIndex: 99999,
                fontFamily: 'var(--font-technical)',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <span style={{ color: 'var(--color-gold, #D4AF37)', fontSize: '1rem', fontWeight: 'bold' }}>✓</span>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (currentRoute === '#/dashboard') {
    return (
      <UserDashboard 
        onLogout={() => {
          setCurrentUser(null);
          triggerToast('You have been logged out successfully.');
          window.location.hash = '#/login';
        }}
        onNavigateHome={() => {
          window.location.hash = '#/';
        }}
      />
    );
  }

  if (currentRoute === '#/wishlist') {
    return (
      <WishlistPage 
        onNavigateHome={() => {
          window.location.hash = '#/';
        }}
        onAddToCart={(watch) => {
          setCartItems(prev => {
            const existing = prev.find(item => item.watch.name === watch.name);
            if (existing) {
              return prev;
            }
            return [...prev, { watch, quantity: 1 }];
          });
          triggerToast(`${watch.name} added to your cart.`);
        }}
        cartItems={cartItems}
      />
    );
  }

  if (currentRoute === '#/admin/dashboard') {
    return (
      <AdminDashboard 
        onLogout={() => {
          setCurrentUser(null);
          triggerToast('You have been logged out successfully.');
          window.location.hash = '#/login';
        }}
        onNavigateHome={() => {
          window.location.hash = '#/';
        }}
      />
    );
  }

  if (selectedProduct) {
    return <ProductDetails 
             watch={selectedProduct} 
             onReturn={() => setSelectedProduct(null)} 
             onAddToCart={(watch) => {
               setCartItems(prev => {
                 const existing = prev.find(item => item.watch.name === watch.name);
                 if (existing) {
                   return prev.map(item => item.watch.name === watch.name ? { ...item, quantity: item.quantity + 1 } : item);
                 }
                 return [...prev, { watch, quantity: 1 }];
               });
               setShowCart(true);
               setSelectedProduct(null);
             }}
             onBuyNow={(watch) => {
               setCheckoutItems([{ watch, quantity: 1 }]);
               setShowCheckout(true);
               setSelectedProduct(null);
             }}
           />;
  }

  if (showAllModels) {
    return <AllModels onReturn={() => setShowAllModels(false)} onSelectProduct={(w) => setSelectedProduct(w)} />;
  }

  return (
    <div style={{ background: 'var(--color-obsidian)', minHeight: '100vh' }}>
      <Navbar 
        onLoginClick={() => { window.location.hash = '#/login'; }} 
        onCartClick={() => setShowCart(true)} 
        onSubscribeClick={() => setShowSubscriptionCheckout(true)}
        onWishlistClick={() => {
          if (!currentUser) {
            window.location.hash = '#/login';
          } else {
            window.location.hash = '#/wishlist';
          }
        }}
        cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} 
        wishlistCount={wishlist.length}
        currentUser={currentUser}
      />
      <Hero />
      <Craftsmanship />
      <Collection onViewAllClick={() => setShowAllModels(true)} onSelectProduct={(w) => setSelectedProduct(w)} />
      <Footer />

      {/* Cart full-screen overlay */}
      {showCart && (
        <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto', background: 'var(--color-obsidian)' }}>
          <Cart 
            cartItems={cartItems} 
            onReturn={() => setShowCart(false)} 
            onRemove={(name) => {
              setCartItems(prev => prev.filter(item => item.watch.name !== name));
            }} 
            onUpdateQuantity={(name, delta) => {
              setCartItems(prev => prev.map(item => {
                if (item.watch.name === name) {
                  const newQuantity = Math.max(1, item.quantity + delta);
                  return { ...item, quantity: newQuantity };
                }
                return item;
              }));
            }}
            onCheckout={() => {
              setCheckoutItems(cartItems);
              setShowCheckout(true);
              setShowCart(false);
            }}
          />
        </div>
      )}

      {/* Checkout full-screen overlay */}
      {showCheckout && (
        <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 110, overflowY: 'auto', background: 'var(--color-obsidian)' }}>
          <Checkout 
            items={checkoutItems} 
            onReturn={() => setShowCheckout(false)} 
            onOrderSuccess={() => {
              setCartItems([]);
            }}
          />
        </div>
      )}

      {/* Subscription Checkout overlay */}
      {showSubscriptionCheckout && (
        <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 120, overflowY: 'auto', background: 'var(--color-obsidian)' }}>
          <SubscriptionCheckout
            onReturn={() => setShowSubscriptionCheckout(false)}
            onSuccess={(data) => {
              setSubscriptionData(data);
              setShowSubscriptionSuccess(true);
              setShowSubscriptionCheckout(false);
            }}
          />
        </div>
      )}

      {/* Subscription Success overlay */}
      {showSubscriptionSuccess && subscriptionData && (
        <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 130, overflowY: 'auto', background: 'var(--color-obsidian)' }}>
          <SubscriptionSuccess
            data={subscriptionData}
            onReturn={() => {
              setShowSubscriptionSuccess(false);
              setSubscriptionData(null);
            }}
          />
        </div>
      )}

      {/* Floating success toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              top: '2rem',
              right: '2rem',
              background: 'var(--color-card-bg, #1a1a1a)',
              border: '1px solid var(--color-gold, #D4AF37)',
              padding: '1rem 2rem',
              color: 'var(--color-white, #ffffff)',
              zIndex: 99999,
              fontFamily: 'var(--font-technical)',
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            <span style={{ color: 'var(--color-gold, #D4AF37)', fontSize: '1rem', fontWeight: 'bold' }}>✓</span>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
