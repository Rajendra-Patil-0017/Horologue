import React, { useState } from 'react';
import * as api from '../../services/api';

interface NotifyMeFormProps {
  productId: string;
  style?: React.CSSProperties;
}

export const NotifyMeForm: React.FC<NotifyMeFormProps> = ({ productId, style = {} }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.registerRestockAlert(productId, email.trim());
      setMessage(res.message || 'Restock notification registered successfully.');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to register restock alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', ...style }}>
      <p style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
        Notify Me When Back in Stock
      </p>

      {message ? (
        <div style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', width: '100%' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={loading}
            style={{
              flex: '1 1 200px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-border)',
              padding: '0.875rem 1rem',
              color: 'var(--color-white)',
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              outline: 'none',
              minHeight: '44px',
              transition: 'border-color 0.3s ease'
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-gold)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          />
          <button
            type="submit"
            disabled={loading}
            className="ingot-btn"
            style={{
              flex: '1 1 auto',
              minHeight: '44px',
              padding: '0 1.5rem'
            }}
          >
            {loading ? 'Submitting...' : 'Notify'}
          </button>
        </form>
      )}

      {error && (
        <div style={{ color: '#ffb4ab', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default NotifyMeForm;
