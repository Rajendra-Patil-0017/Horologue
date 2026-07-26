import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebaseClient';
import * as api from '../services/api';

interface LoginProps {
  onLoginSuccess?: (user: api.User) => void;
}

const translateAuthError = (code: string): string => {
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address provided is malformed.';
    case 'auth/user-disabled':
      return 'This dossier has been deactivated by administration.';
    case 'auth/user-not-found':
      return 'No corresponding client identity was found.';
    case 'auth/wrong-password':
      return 'Incorrect passkey. Please verify credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'The selected passkey is too weak. Ensure at least 6 characters.';
    case 'auth/invalid-credential':
      return 'Invalid credentials provided. Check your email or passkey.';
    default:
      return 'Authentication system encountered an anomaly.';
  }
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(window.location.hash === '#/signup');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');
  const [country, setCountry] = useState('United States');

  React.useEffect(() => {
    const checkHash = () => {
      setIsSignUp(window.location.hash === '#/signup');
    };
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  const handleToggleMode = (signUpMode: boolean) => {
    window.location.hash = signUpMode ? '#/signup' : '#/login';
    setIsSignUp(signUpMode);
    setErrors({});
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (isSignUp && !name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Passkey is required';
    } else if (password.length < 6) {
      newErrors.password = 'Passkey must be at least 6 characters';
    }

    if (isSignUp) {
      if (!phone.trim()) {
        newErrors.phone = 'Phone number is required';
      } else if (phone.replace(/[^0-9]/g, '').length < 7) {
        newErrors.phone = 'Enter a valid phone number (at least 7 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      if (isSignUp) {
        // Firebase Client Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const firebaseUser = userCredential.user;

        // Obtain token for backend sync
        const token = await firebaseUser.getIdToken();
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

        // Call sync endpoint
        const res = await fetch(`${baseUrl}/api/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name,
            phone: `${phoneCountryCode} ${phone}`,
            country
          })
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const profile = await res.json();
        
        const mappedUser: api.User = {
          id: profile.id,
          name: profile.full_name || name,
          email: profile.email || firebaseUser.email || email,
          phone: profile.phone || `${phoneCountryCode} ${phone}`,
          country: profile.country || country,
          role: profile.role || 'customer',
          joinDate: new Date(profile.created_at || firebaseUser.metadata.creationTime || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        };

        if (onLoginSuccess) onLoginSuccess(mappedUser);
        window.location.hash = '#/dashboard';
      } else {
        // Firebase Client Login
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const firebaseUser = userCredential.user;

        // Obtain token for backend sync
        const token = await firebaseUser.getIdToken();
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

        // Call sync endpoint
        const res = await fetch(`${baseUrl}/api/auth/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        const profile = await res.json();

        const mappedUser: api.User = {
          id: profile.id,
          name: profile.full_name || '',
          email: profile.email || firebaseUser.email || email,
          phone: profile.phone || '',
          country: profile.country || '',
          role: profile.role || 'customer',
          joinDate: new Date(profile.created_at || firebaseUser.metadata.creationTime || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        };

        if (onLoginSuccess) onLoginSuccess(mappedUser);
        
        if (mappedUser.role === 'admin') {
          window.location.hash = '#/admin/dashboard';
        } else {
          window.location.hash = '#/dashboard';
        }
      }
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.code ? translateAuthError(err.code) : (err.message || 'Authentication failed');
      if (
        err instanceof TypeError ||
        err.code === 'auth/network-request-failed' ||
        (err.message && err.message.toLowerCase().includes('failed to fetch'))
      ) {
        friendlyMessage = "We couldn't reach our servers. Please try again in a moment.";
      }
      setErrors({ auth: friendlyMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrors({});

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const firebaseUser = userCredential.user;

      const token = await firebaseUser.getIdToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

      const res = await fetch(`${baseUrl}/api/auth/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: firebaseUser.displayName || undefined,
          phone: firebaseUser.phoneNumber || undefined,
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const profile = await res.json();

      const mappedUser: api.User = {
        id: profile.id,
        name: profile.full_name || firebaseUser.displayName || '',
        email: profile.email || firebaseUser.email || '',
        phone: profile.phone || firebaseUser.phoneNumber || '',
        country: profile.country || '',
        role: profile.role || 'customer',
        joinDate: new Date(profile.created_at || firebaseUser.metadata.creationTime || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      };

      if (onLoginSuccess) onLoginSuccess(mappedUser);

      if (mappedUser.role === 'admin') {
        window.location.hash = '#/admin/dashboard';
      } else {
        window.location.hash = '#/dashboard';
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, show no alarm
        return;
      }
      if (err.code === 'auth/popup-blocked') {
        setErrors({ auth: 'Please allow popups for this site and try again.' });
        return;
      }
      let friendlyMessage = err.code ? translateAuthError(err.code) : (err.message || 'Google authentication failed.');
      if (
        err instanceof TypeError ||
        err.code === 'auth/network-request-failed' ||
        (err.message && err.message.toLowerCase().includes('failed to fetch'))
      ) {
        friendlyMessage = "We couldn't reach our servers. Please try again in a moment.";
      }
      setErrors({ auth: friendlyMessage });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div 
      data-lenis-prevent
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: 'var(--color-obsidian)',
        zIndex: 5
      }}
    >
      <div style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        width: '100%'
      }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .login-select {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(229, 228, 226, 0.3);
          color: var(--color-white);
          font-family: var(--font-body);
          font-size: 1rem;
          padding: 0.5rem 0;
          outline: none;
          border-radius: 0;
          cursor: pointer;
        }
        .login-select option {
          background: #1a1a1a;
          color: white;
        }
      `}} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'var(--color-charcoal)',
          border: '1px solid rgba(229, 228, 226, 0.15)',
          padding: '4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem'
        }}
      >
        {/* Sign In / Sign Up tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(229, 228, 226, 0.15)' }}>
          <div 
            onClick={() => handleToggleMode(false)}
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '1rem', 
              cursor: 'pointer',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: !isSignUp ? 'var(--color-gold)' : 'var(--color-slate)',
              borderBottom: !isSignUp ? '2px solid var(--color-gold)' : '2px solid transparent',
              transition: 'all 0.3s ease',
              marginBottom: '-1px'
            }}
          >
            Sign In
          </div>
          <div 
            onClick={() => handleToggleMode(true)}
            style={{ 
              flex: 1, 
              textAlign: 'center', 
              padding: '1rem', 
              cursor: 'pointer',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.875rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isSignUp ? 'var(--color-gold)' : 'var(--color-slate)',
              borderBottom: isSignUp ? '2px solid var(--color-gold)' : '2px solid transparent',
              transition: 'all 0.3s ease',
              marginBottom: '-1px'
            }}
          >
            Sign Up
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            color: 'var(--color-white)',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            {isSignUp ? 'BECOME A CLIENT' : 'ACCESS'}
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-slate)',
            fontSize: '0.875rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            {isSignUp ? 'CREATE YOUR DOSSIER' : 'ENTER YOUR CREDENTIALS'}
          </p>
        </div>

        {/* Auth Error Banner */}
        {errors.auth && (
          <div style={{
            border: '1px solid #ffb4ab',
            background: 'rgba(255, 180, 171, 0.05)',
            color: '#ffb4ab',
            padding: '1rem',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}>
            {errors.auth}
          </div>
        )}

        {/* SignUp Success Banner */}
        {errors.signupSuccess && (
          <div style={{
            border: '1px solid var(--color-gold)',
            background: 'rgba(212, 175, 55, 0.05)',
            color: 'var(--color-gold)',
            padding: '1rem',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.75rem',
            textAlign: 'center'
          }}>
            {errors.signupSuccess}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {isSignUp && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
            >
              <label style={{
                fontFamily: 'var(--font-technical)',
                fontSize: '0.75rem',
                color: 'var(--color-silver)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>
                Full Name
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => { setName(e.target.value); delete errors.name; }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: errors.name ? '1px solid #ffb4ab' : '1px solid rgba(229, 228, 226, 0.3)',
                  color: 'var(--color-white)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  padding: '0.5rem 0',
                  outline: 'none',
                  borderRadius: '0'
                }}
                placeholder="John Doe"
              />
              {errors.name && <span style={{ color: '#ffb4ab', fontSize: '0.7rem', fontFamily: 'var(--font-technical)' }}>{errors.name}</span>}
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              color: 'var(--color-silver)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase'
            }}>
              Client ID / Email
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => { setEmail(e.target.value); delete errors.email; }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: errors.email ? '1px solid #ffb4ab' : '1px solid rgba(229, 228, 226, 0.3)',
                color: 'var(--color-white)',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                padding: '0.5rem 0',
                outline: 'none',
                borderRadius: '0'
              }}
              placeholder="name@example.com"
            />
            {errors.email && <span style={{ color: '#ffb4ab', fontSize: '0.7rem', fontFamily: 'var(--font-technical)' }}>{errors.email}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{
                fontFamily: 'var(--font-technical)',
                fontSize: '0.75rem',
                color: 'var(--color-silver)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}>
                Passkey
              </label>
              {!isSignUp && (
                <span 
                  onClick={() => alert('Password recovery is managed via Supabase. If you need a test account, please use the Sign Up tab.')}
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--color-gold)',
                    cursor: 'pointer'
                  }}
                >
                  Recover
                </span>
              )}
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => { setPassword(e.target.value); delete errors.password; }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: errors.password ? '1px solid #ffb4ab' : '1px solid rgba(229, 228, 226, 0.3)',
                color: 'var(--color-white)',
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                padding: '0.5rem 0',
                outline: 'none',
                borderRadius: '0'
              }}
              placeholder="••••••••"
            />
            {errors.password && <span style={{ color: '#ffb4ab', fontSize: '0.7rem', fontFamily: 'var(--font-technical)' }}>{errors.password}</span>}
          </div>

          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  fontFamily: 'var(--font-technical)',
                  fontSize: '0.75rem',
                  color: 'var(--color-silver)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  Phone Number
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    style={{
                      width: '80px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(229, 228, 226, 0.3)',
                      color: 'var(--color-white)',
                      fontFamily: 'var(--font-technical)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      cursor: 'pointer',
                      borderRadius: 0,
                    }}
                  >
                    <option value="+1" style={{ background: '#1a1a1a', color: 'white' }}>🇺🇸 +1</option>
                    <option value="+91" style={{ background: '#1a1a1a', color: 'white' }}>🇮🇳 +91</option>
                    <option value="+44" style={{ background: '#1a1a1a', color: 'white' }}>🇬🇧 +44</option>
                    <option value="+61" style={{ background: '#1a1a1a', color: 'white' }}>🇦🇺 +61</option>
                    <option value="+49" style={{ background: '#1a1a1a', color: 'white' }}>🇩🇪 +49</option>
                  </select>
                  <input 
                    type="tel" 
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); delete errors.phone; }}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      borderBottom: errors.phone ? '1px solid #ffb4ab' : '1px solid rgba(229, 228, 226, 0.3)',
                      color: 'var(--color-white)',
                      fontFamily: 'var(--font-body)',
                      fontSize: '1rem',
                      padding: '0.5rem 0',
                      outline: 'none',
                      borderRadius: '0'
                    }}
                    placeholder="555-0199"
                  />
                </div>
                {errors.phone && <span style={{ color: '#ffb4ab', fontSize: '0.7rem', fontFamily: 'var(--font-technical)' }}>{errors.phone}</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  fontFamily: 'var(--font-technical)',
                  fontSize: '0.75rem',
                  color: 'var(--color-silver)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase'
                }}>
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="login-select"
                >
                  <option value="United States">🇺🇸 United States</option>
                  <option value="India">🇮🇳 India</option>
                  <option value="United Kingdom">🇬🇧 United Kingdom</option>
                  <option value="Australia">🇦🇺 Australia</option>
                  <option value="Germany">🇩🇪 Germany</option>
                  <option value="Switzerland">🇨🇭 Switzerland</option>
                </select>
              </div>
            </motion.div>
          )}

          {!isSignUp && (
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem', cursor: 'pointer' }}
              onClick={() => setRememberMe(!rememberMe)}
            >
              <div style={{
                width: '14px',
                height: '14px',
                border: `1px solid ${rememberMe ? 'var(--color-gold)' : 'rgba(229, 228, 226, 0.5)'}`,
                background: rememberMe ? 'var(--color-gold)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                borderRadius: '0px'
              }}>
                {rememberMe && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0a0a0a" strokeWidth="1.5" strokeLinecap="square"/>
                  </svg>
                )}
              </div>
              <span style={{
                fontFamily: 'var(--font-technical)',
                fontSize: '0.65rem',
                color: 'var(--color-silver)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                userSelect: 'none'
              }}>
                Remember Me
              </span>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            style={{
              marginTop: '1rem',
              width: '100%',
              background: loading ? 'var(--color-slate)' : 'var(--color-gold)',
              color: 'var(--color-obsidian)',
              border: 'none',
              padding: '1rem',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.875rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: loading ? 'not-allowed' : 'pointer',
              borderRadius: '0',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.3s ease',
              fontWeight: 600,
            }}
          >
            {loading ? 'Processing Authentication...' : isSignUp ? 'Initialize Dossier' : 'Authenticate'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '0.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(229, 228, 226, 0.15)' }}></div>
          <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', letterSpacing: '0.1em' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(229, 228, 226, 0.15)' }}></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            background: 'transparent',
            color: 'var(--color-white)',
            border: '1px solid rgba(229, 228, 226, 0.3)',
            padding: '1rem',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            borderRadius: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            transition: 'all 0.3s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

      </motion.div>
      </div>
    </div>
  );
};

export default Login;
