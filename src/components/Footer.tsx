import React, { useState } from 'react';
import * as api from '../services/api';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (error) {
      // Clear the error state automatically once the user corrects the input to a valid email
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setError('');
      }
    }
  };

  // Clearly commented spot where a real email service integration would be plugged in
  const submitNewsletterEmail = async (emailAddress: string) => {
    // Connect real email service integration here once backend is ready
    await api.addNewsletterEmail(emailAddress);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid email address');
      return;
    }

    // Standard email validation matching Checkout.tsx's regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await submitNewsletterEmail(trimmedEmail);
      setSuccess(true);
    } catch (err) {
      // Handle failure gracefully: if a real API call fails, show an on-brand error message
      setError('Something went wrong — please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer style={{ padding: '6rem 4rem 2rem', background: '#050505', borderTop: '1px solid var(--color-border)' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4rem', marginBottom: '6rem' }}>
          
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1rem' }}>HOROLOGUE</h2>
            <p style={{ color: 'var(--color-slate)', maxWidth: '250px' }}>
              Defining the new standard of ultra-luxury mechanical timepieces.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '4rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span className="technical-text" style={{ color: 'var(--color-gold)' }}>Company</span>
              <a href="#" style={{ color: 'var(--color-slate)', textDecoration: 'none', fontSize: '0.875rem' }}>Heritage</a>
              <a href="#" style={{ color: 'var(--color-slate)', textDecoration: 'none', fontSize: '0.875rem' }}>Atelier</a>
              <a href="#" style={{ color: 'var(--color-slate)', textDecoration: 'none', fontSize: '0.875rem' }}>Boutiques</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <span className="technical-text" style={{ color: 'var(--color-gold)' }}>Legal</span>
              <a href="#" style={{ color: 'var(--color-slate)', textDecoration: 'none', fontSize: '0.875rem' }}>Privacy Policy</a>
              <a href="#" style={{ color: 'var(--color-slate)', textDecoration: 'none', fontSize: '0.875rem' }}>Terms of Service</a>
            </div>
          </div>

          <div>
            <span className="technical-text" style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '1rem' }}>Newsletter</span>
            {success ? (
              <span className="technical-text" style={{ color: 'var(--color-gold)', display: 'block', fontSize: '0.875rem', paddingBottom: '0.5rem' }}>
                You're on the list.
              </span>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ 
                  display: 'flex', 
                  borderBottom: error ? '1px solid #ffb4ab' : '1px solid var(--color-border)', 
                  paddingBottom: '0.5rem',
                  transition: 'border-color 0.3s ease'
                }}>
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email}
                    onChange={handleEmailChange}
                    disabled={loading}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-white)', flex: 1, outline: 'none', fontFamily: 'var(--font-body)' }}
                  />
                  {/* Fixed: button had no type="submit" and was not wrapped in a <form>, so form never submitted */}
                  <button 
                    type="submit"
                    disabled={loading}
                    style={{ 
                      color: 'var(--color-gold)', 
                      fontFamily: 'var(--font-technical)', 
                      fontSize: '0.75rem', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.1em',
                      opacity: loading ? 0.5 : 1,
                      cursor: loading ? 'default' : 'pointer'
                    }}
                  >
                    {loading ? 'Subscribing...' : 'Subscribe'}
                  </button>
                </div>
                {error && (
                  <span style={{ 
                    color: '#ffb4ab', 
                    fontSize: '0.75rem', 
                    fontFamily: 'var(--font-technical)', 
                    marginTop: '0.4rem', 
                    display: 'block' 
                  }}>
                    {error}
                  </span>
                )}
              </form>
            )}
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid var(--color-border)' }}>
          <span className="technical-text" style={{ color: 'var(--color-slate)' }}>© 2026 HOROLOGUE. ALL RIGHTS RESERVED.</span>
          <span className="technical-text" style={{ color: 'var(--color-slate)' }}>SWISS MADE</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
