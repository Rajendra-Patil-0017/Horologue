import React from 'react';
import { motion } from 'framer-motion';

interface SubscriptionSuccessProps {
  data: {
    name: string;
    email: string;
    phone: string;
    phoneCountryCode: string;
    country: string;
    paymentMethod: string;
    onlineSubOption: string | null;
    orderId: string;
    orderDate: string;
  };
  onReturn: () => void;
}

export const SubscriptionSuccess: React.FC<SubscriptionSuccessProps> = ({ data, onReturn }) => {
  return (
    <div style={{ background: 'var(--color-obsidian)', minHeight: '100vh', color: 'var(--color-white)', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(229, 228, 226, 0.1)', padding: '2rem 4rem', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
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
          }}
        >
          ← Return to Catalogue
        </button>
      </header>

      {/* Main success container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '650px',
            width: '100%',
            padding: '4rem 3rem',
            background: 'var(--color-charcoal)',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          {/* Animated Gold Star Badge */}
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', marginBottom: '2.5rem' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
            Membership Confirmed
          </h2>

          <p style={{ color: 'var(--color-slate)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '3rem', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
            Your enrollment in the HOROLOGUE Club is now active. You have been granted elite level access to private auctions and bespoke commissioning.
          </p>

          {/* Membership Info Card */}
          <div style={{ width: '100%', border: '1px solid var(--color-border)', background: 'var(--color-obsidian)', padding: '2rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Subscription ID</span>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)' }}>{data.orderId}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Activation Date</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{data.orderDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Member Name</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{data.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Email Address</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{data.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Phone Number</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{`${data.phoneCountryCode} ${data.phone}`}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Country</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{data.country}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Fee Paid</span>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.85rem', color: 'var(--color-gold)' }}>$299</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Payment Mode</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>
                {data.paymentMethod === 'card'
                  ? 'Credit Card'
                  : `Online Payment — ${data.onlineSubOption || 'UPI'}`}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onReturn}
            style={{
              width: '100%',
              background: 'var(--color-gold)',
              color: 'var(--color-obsidian)',
              border: 'none',
              padding: '1.25rem',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f2ca50'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-gold)'; }}
          >
            Return to Catalogue
          </button>

        </motion.div>
      </main>
    </div>
  );
};

export default SubscriptionSuccess;
