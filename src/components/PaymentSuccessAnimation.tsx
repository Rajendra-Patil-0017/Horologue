import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PaymentSuccessAnimationProps {
  onComplete: () => void;
}

export const PaymentSuccessAnimation: React.FC<PaymentSuccessAnimationProps> = ({ onComplete }) => {
  useEffect(() => {
    // Hold animation for 2.2 seconds, then proceed automatically
    const timer = setTimeout(() => {
      onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        width: '100%',
        padding: '3rem',
        background: 'var(--color-charcoal)',
        border: '1px solid var(--color-border)',
        textAlign: 'center',
        margin: '2rem auto',
        maxWidth: '650px',
      }}
    >
      <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '2rem' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Animated Gold Circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke="var(--color-gold)"
            strokeWidth="2.5"
            fill="transparent"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
          {/* Animated Gold Checkmark */}
          <motion.path
            d="M32 52 L45 65 L68 37"
            stroke="var(--color-gold)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="transparent"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
          />
        </svg>
      </div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          color: 'var(--color-white)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          margin: 0,
        }}
      >
        Acquisition Approved
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        style={{
          fontFamily: 'var(--font-technical)',
          color: 'var(--color-gold)',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginTop: '1rem',
          marginBottom: 0,
        }}
      >
        Securing Blockchain Signature...
      </motion.p>
    </motion.div>
  );
};

export default PaymentSuccessAnimation;
