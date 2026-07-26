import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentSuccessAnimation from './PaymentSuccessAnimation';
import { auth } from '../lib/firebaseClient';

interface SubscriptionCheckoutProps {
  onReturn: () => void;
  onSuccess: (data: {
    name: string;
    email: string;
    phone: string;
    phoneCountryCode: string;
    country: string;
    paymentMethod: string;
    onlineSubOption: string | null;
    orderId: string;
    orderDate: string;
  }) => void;
}

type PaymentMethod = 'card' | 'online';

interface ShippingDetails {
  name: string;
  email: string;
  phone: string;
  country: string;
}

interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

const MERCHANT_UPI_ID = 'chronosstore@pay';

export const SubscriptionCheckout: React.FC<SubscriptionCheckoutProps> = ({ onReturn, onSuccess }) => {
  const [step, setStep] = useState<'form' | 'animation'>('form');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [onlineSubOption, setOnlineSubOption] = useState<'UPI' | 'PayPal' | 'GPay' | 'Wallet' | null>(null);

  // Form states
  const [shipping, setShipping] = useState<ShippingDetails>({
    name: '',
    email: '',
    phone: '',
    country: 'United States',
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');

  const [card, setCard] = useState<CardDetails>({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitHovered, setIsSubmitHovered] = useState(false);
  const [isSubmitFocused, setIsSubmitFocused] = useState(false);
  const [isBackHovered, setIsBackHovered] = useState(false);

  // Success states (pre-generated)
  const [orderId, setOrderId] = useState(() => `SUB-${Math.floor(100000 + Math.random() * 900000)}`);
  const [orderDate, setOrderDate] = useState('');

  // Handle simple input changes
  const handleShippingChange = (field: keyof ShippingDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setShipping((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleCountryDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setShipping((prev) => ({ ...prev, country: e.target.value }));
    if (errors.country) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.country;
        return copy;
      });
    }
  };

  const handleCardFieldChange = (field: keyof CardDetails) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setCard((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Card formatting
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const parts: string[] = [];
    for (let i = 0; i < raw.length; i += 4) {
      parts.push(raw.substring(i, i + 4));
    }
    setCard((prev) => ({ ...prev, cardNumber: parts.join(' ') }));
    if (errors.cardNumber) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.cardNumber;
        return copy;
      });
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (raw.length > 2) {
      raw = raw.substring(0, 2) + '/' + raw.substring(2, 4);
    }
    setCard((prev) => ({ ...prev, expiry: raw }));
    if (errors.expiry) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.expiry;
        return copy;
      });
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!shipping.name.trim()) newErrors.name = 'Full name is required';

    if (!shipping.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!shipping.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (shipping.phone.replace(/[^0-9]/g, '').length < 7) {
      newErrors.phone = 'Enter a valid phone number (at least 7 digits)';
    }

    if (!shipping.country) newErrors.country = 'Country is required';

    if (paymentMethod === 'card') {
      if (!card.cardholderName.trim()) newErrors.cardholderName = 'Cardholder name is required';

      const rawCard = card.cardNumber.replace(/\s+/g, '');
      if (!rawCard) {
        newErrors.cardNumber = 'Card number is required';
      } else if (rawCard.length < 13 || rawCard.length > 19) {
        newErrors.cardNumber = 'Card number must be between 13 and 19 digits';
      }

      if (!card.expiry) {
        newErrors.expiry = 'Expiry date is required';
      } else if (!/^\d{2}\/\d{2}$/.test(card.expiry)) {
        newErrors.expiry = 'Use MM/YY format';
      }

      if (!card.cvv) {
        newErrors.cvv = 'CVV is required';
      } else if (card.cvv.length < 3 || card.cvv.length > 4) {
        newErrors.cvv = 'Must be 3 or 4 digits';
      }
    } else {
      if (!onlineSubOption) {
        newErrors.onlineSubOption = 'Please select a sub-option';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsProcessing(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.submit;
      return copy;
    });

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication is required to join the club. Please log in or sign up first.');
      }

      const token = await currentUser.getIdToken();
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

      // FLAG FOR SEPARATE DECISION: UPI and Cash on Delivery (COD) are India-specific payment methods.
      // Now that the site-wide pricing is USD, these may need to be hidden/removed or modified
      // for a USD/international checkout flow. We are keeping the code for now as a business decision.
      // 1. Create Order on Backend (299 USD)
      const createOrderRes = await fetch(`${baseUrl}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: 299,
          currency: 'USD',
          type: 'subscription',
          metadata: {
            userName: shipping.name,
            userEmail: shipping.email,
            phone: shipping.phone,
            phoneCountryCode,
            country: shipping.country,
            paymentMethod,
            onlineSubOption,
          },
        }),
      });

      if (!createOrderRes.ok) {
        throw new Error(await createOrderRes.text());
      }

      const { razorpay_order_id, amount, currency, key_id } = await createOrderRes.json();

      // 2. Dynamically Load Razorpay Widget
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const scriptLoaded = await loadScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please verify your connection.');
      }

      const options = {
        key: key_id,
        amount,
        currency,
        name: 'HOROLOGUE',
        description: 'Club Membership Registration',
        order_id: razorpay_order_id,
        handler: async (response: any) => {
          try {
            // 3. Verify Razorpay Transaction
            const verifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                orderDetails: {
                  paymentMethod,
                  onlineSubOption,
                  phone: shipping.phone,
                  phoneCountryCode,
                  country: shipping.country,
                },
              }),
            });

            if (!verifyRes.ok) {
              throw new Error(await verifyRes.text());
            }

            const { data: savedSub } = await verifyRes.json();

            // Set renewal date / date for display
            setOrderId(savedSub.id);
            setOrderDate(new Date(savedSub.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
            
            setStep('animation');
          } catch (err: any) {
            console.error(err);
            let errMsg = err.message || 'Payment verification failed.';
            if (err instanceof TypeError || (err.message && err.message.toLowerCase().includes('failed to fetch'))) {
              errMsg = "We couldn't reach our servers. Please try again in a moment.";
            }
            setErrors((prev) => ({ ...prev, submit: errMsg }));
            setIsProcessing(false);
          }
        },
        prefill: {
          name: shipping.name,
          email: shipping.email,
          contact: `${phoneCountryCode}${shipping.phone}`,
        },
        theme: {
          color: '#D4AF37',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Verification failed';
      if (err instanceof TypeError || (err.message && err.message.toLowerCase().includes('failed to fetch'))) {
        errMsg = "We couldn't reach our servers. Please try again in a moment.";
      } else {
        try {
          const json = JSON.parse(err.message);
          errMsg = json.error || errMsg;
        } catch {
          // Not JSON
        }
      }
      setErrors((prev) => ({ ...prev, submit: errMsg }));
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ background: 'var(--color-obsidian)', minHeight: '100vh', color: 'var(--color-white)', fontFamily: 'var(--font-body)' }}>
      {/* Local Styles matching Checkout.tsx */}
      <style dangerouslySetInnerHTML={{ __html: `
        .checkout-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 6rem;
          max-width: 1200px;
          margin: 0 auto;
          padding: 4rem 2rem 8rem;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .checkout-grid {
            grid-template-columns: 1fr;
            gap: 4rem;
            padding: 2rem 1.5rem 6rem;
          }
        }
        .checkout-input {
          width: 100%;
          background: rgba(26, 26, 26, 0.6);
          border: 1px solid var(--color-border);
          color: var(--color-white);
          padding: 1rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          outline: none;
          transition: all 0.3s ease;
        }
        .checkout-input:focus {
          border-color: var(--color-gold);
          background: rgba(26, 26, 26, 0.8);
          box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.1);
        }
        .checkout-label {
          display: block;
          font-family: var(--font-technical);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-silver);
          margin-bottom: 0.5rem;
        }
        .error-text {
          color: #ffb4ab;
          font-size: 0.75rem;
          font-family: var(--font-technical);
          margin-top: 0.4rem;
          display: block;
        }
        .payment-method-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .method-btn {
          border: 1px solid var(--color-border);
          background: rgba(19, 19, 19, 0.4);
          color: var(--color-silver);
          padding: 1.25rem;
          font-family: var(--font-technical);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 500;
        }
        .method-btn.active {
          border-color: var(--color-gold);
          background: rgba(212, 175, 55, 0.05);
          color: var(--color-gold);
        }
        .sub-option-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem;
          background: rgba(26, 26, 26, 0.3);
          border: 1px solid var(--color-border);
          color: var(--color-white);
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }
        .sub-option-btn.selected {
          background: rgba(212, 175, 55, 0.08);
          border-color: var(--color-gold);
          color: var(--color-gold);
        }
      `}} />

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(229, 228, 226, 0.1)', padding: '2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onReturn}
          onMouseEnter={() => setIsBackHovered(true)}
          onMouseLeave={() => setIsBackHovered(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: isBackHovered ? 'var(--color-gold)' : 'var(--color-silver)',
            fontFamily: 'var(--font-technical)',
            fontSize: '0.75rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'color 0.3s ease',
          }}
        >
          ← Return to Catalogue
        </button>
        <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '0.75rem', letterSpacing: '0.15em' }}>
          SECURE CHECKOUT
        </span>
      </header>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 100px)' }}>
        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="sub-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="checkout-grid"
            >
              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                <section>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', marginBottom: '2rem', borderBottom: '1px solid rgba(229, 228, 226, 0.15)', paddingBottom: '0.75rem', letterSpacing: '0.02em' }}>
                    Membership Enrollment
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label htmlFor="sub-name" className="checkout-label">Full Name</label>
                      <input
                        id="sub-name"
                        type="text"
                        className="checkout-input"
                        placeholder="John Doe"
                        value={shipping.name}
                        onChange={handleShippingChange('name')}
                        style={errors.name ? { borderColor: '#ffb4ab' } : {}}
                      />
                      {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div>
                      <label htmlFor="sub-email" className="checkout-label">Email Address</label>
                      <input
                        id="sub-email"
                        type="email"
                        className="checkout-input"
                        placeholder="john@example.com"
                        value={shipping.email}
                        onChange={handleShippingChange('email')}
                        style={errors.email ? { borderColor: '#ffb4ab' } : {}}
                      />
                      {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="sub-phone" className="checkout-label">Phone Number</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <select
                            id="sub-phone-code"
                            value={phoneCountryCode}
                            onChange={(e) => setPhoneCountryCode(e.target.value)}
                            style={{
                              width: '100px',
                              background: 'rgba(26, 26, 26, 0.6)',
                              border: '1px solid var(--color-border)',
                              color: 'var(--color-white)',
                              padding: '1rem 0.5rem',
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
                            <option value="+33" style={{ background: '#1a1a1a', color: 'white' }}>🇫🇷 +33</option>
                            <option value="+81" style={{ background: '#1a1a1a', color: 'white' }}>🇯🇵 +81</option>
                            <option value="+41" style={{ background: '#1a1a1a', color: 'white' }}>🇨🇭 +41</option>
                            <option value="+65" style={{ background: '#1a1a1a', color: 'white' }}>🇸🇬 +65</option>
                            <option value="+971" style={{ background: '#1a1a1a', color: 'white' }}>🇦🇪 +971</option>
                          </select>
                          <input
                            id="sub-phone"
                            type="tel"
                            className="checkout-input"
                            placeholder="555-0199"
                            value={shipping.phone}
                            onChange={handleShippingChange('phone')}
                            style={{
                              flex: 1,
                              ...errors.phone ? { borderColor: '#ffb4ab' } : {},
                            }}
                          />
                        </div>
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                      </div>

                      <div>
                        <label htmlFor="sub-country" className="checkout-label">Country</label>
                        <select
                          id="sub-country"
                          className="checkout-input"
                          value={shipping.country}
                          onChange={handleCountryDropdownChange}
                          style={{
                            ...errors.country ? { borderColor: '#ffb4ab' } : {},
                            borderRadius: 0,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="United States" style={{ background: '#1a1a1a', color: 'white' }}>🇺🇸 United States</option>
                          <option value="India" style={{ background: '#1a1a1a', color: 'white' }}>🇮🇳 India</option>
                          <option value="United Kingdom" style={{ background: '#1a1a1a', color: 'white' }}>🇬🇧 United Kingdom</option>
                          <option value="Australia" style={{ background: '#1a1a1a', color: 'white' }}>🇦🇺 Australia</option>
                          <option value="Germany" style={{ background: '#1a1a1a', color: 'white' }}>🇩🇪 Germany</option>
                          <option value="France" style={{ background: '#1a1a1a', color: 'white' }}>🇫🇷 France</option>
                          <option value="Japan" style={{ background: '#1a1a1a', color: 'white' }}>🇯🇵 Japan</option>
                          <option value="Switzerland" style={{ background: '#1a1a1a', color: 'white' }}>🇨🇭 Switzerland</option>
                          <option value="Singapore" style={{ background: '#1a1a1a', color: 'white' }}>🇸🇬 Singapore</option>
                          <option value="United Arab Emirates" style={{ background: '#1a1a1a', color: 'white' }}>🇦🇪 United Arab Emirates</option>
                        </select>
                        {errors.country && <span className="error-text">{errors.country}</span>}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Payment Options */}
                <section>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', marginBottom: '2rem', borderBottom: '1px solid rgba(229, 228, 226, 0.15)', paddingBottom: '0.75rem', letterSpacing: '0.02em' }}>
                    Payment Acquisition
                  </h2>

                  <div className="payment-method-selector">
                    <button
                      type="button"
                      className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('card'); setErrors({}); }}
                    >
                      💳 Credit Card
                    </button>
                    <button
                      type="button"
                      className={`method-btn ${paymentMethod === 'online' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('online'); setErrors({}); }}
                    >
                      🌐 Online / UPI
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {paymentMethod === 'card' ? (
                      <motion.div
                        key="card-info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                      >
                        <div>
                          <label htmlFor="sub-cardholder" className="checkout-label">Cardholder Name</label>
                          <input
                            id="sub-cardholder"
                            type="text"
                            className="checkout-input"
                            placeholder="Johnathan Doe"
                            value={card.cardholderName}
                            onChange={handleCardFieldChange('cardholderName')}
                            style={errors.cardholderName ? { borderColor: '#ffb4ab' } : {}}
                          />
                          {errors.cardholderName && <span className="error-text">{errors.cardholderName}</span>}
                        </div>

                        <div>
                          <label htmlFor="sub-cardnumber" className="checkout-label">Card Number</label>
                          <input
                            id="sub-cardnumber"
                            type="text"
                            className="checkout-input"
                            placeholder="4111 2222 3333 4444"
                            maxLength={19}
                            value={card.cardNumber}
                            onChange={handleCardNumberChange}
                            style={errors.cardNumber ? { borderColor: '#ffb4ab' } : {}}
                          />
                          {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div>
                            <label htmlFor="sub-expiry" className="checkout-label">Expiry Date</label>
                            <input
                              id="sub-expiry"
                              type="text"
                              className="checkout-input"
                              placeholder="MM/YY"
                              maxLength={5}
                              value={card.expiry}
                              onChange={handleExpiryChange}
                              style={errors.expiry ? { borderColor: '#ffb4ab' } : {}}
                            />
                            {errors.expiry && <span className="error-text">{errors.expiry}</span>}
                          </div>

                          <div>
                            <label htmlFor="sub-cvv" className="checkout-label">CVV</label>
                            <input
                              id="sub-cvv"
                              type="password"
                              className="checkout-input"
                              placeholder="•••"
                              maxLength={4}
                              value={card.cvv}
                              onChange={handleCardFieldChange('cvv')}
                              style={errors.cvv ? { borderColor: '#ffb4ab' } : {}}
                            />
                            {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="online-info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                      >
                        <label className="checkout-label">Select Online Provider</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {(['UPI', 'PayPal', 'GPay', 'Wallet'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              className={`sub-option-btn ${onlineSubOption === opt ? 'selected' : ''}`}
                              onClick={() => {
                                setOnlineSubOption(opt);
                                if (errors.onlineSubOption) {
                                  setErrors((prev) => {
                                    const copy = { ...prev };
                                    delete copy.onlineSubOption;
                                    return copy;
                                  });
                                }
                              }}
                            >
                              <span>{opt === 'UPI' ? '🇮🇳 UPI Escrow' : opt === 'PayPal' ? '💳 PayPal Secure' : opt === 'GPay' ? '📱 Google Pay' : '💼 Digital Wallet'}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', opacity: onlineSubOption === opt ? 1 : 0.6 }}>
                                {onlineSubOption === opt ? '● Selected' : '○ Select'}
                              </span>
                            </button>
                          ))}
                        </div>
                        {errors.onlineSubOption && <span className="error-text">{errors.onlineSubOption}</span>}

                        {onlineSubOption === 'UPI' && (
                          <div style={{ border: '1px dashed var(--color-gold)', padding: '1.5rem', background: 'rgba(212, 175, 55, 0.02)', textAlign: 'center', marginTop: '1rem' }}>
                            <span style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                              Instant UPI Transfer
                            </span>
                            <span style={{ display: 'block', fontSize: '1rem', color: 'var(--color-white)', fontFamily: 'var(--font-technical)', fontWeight: 600 }}>
                              {MERCHANT_UPI_ID}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '0.5rem' }}>
                              Complete the transfer of $299 with your UPI application before confirming.
                            </span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  onFocus={() => setIsSubmitFocused(true)}
                  onBlur={() => setIsSubmitFocused(false)}
                  onMouseEnter={() => setIsSubmitHovered(true)}
                  onMouseLeave={() => setIsSubmitHovered(false)}
                  style={{
                    width: '100%',
                    background: isProcessing ? 'var(--color-slate)' : 'var(--color-gold)',
                    color: 'var(--color-obsidian)',
                    padding: '1.5rem',
                    fontFamily: 'var(--font-technical)',
                    fontSize: '0.875rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '0.75rem',
                    outline: 'none',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    transform: isSubmitHovered && !isProcessing ? 'translateY(-2px)' : 'translateY(0)',
                    opacity: isProcessing ? 0.7 : 1,
                    boxShadow: isSubmitHovered && !isProcessing
                      ? '0 10px 20px rgba(212, 175, 55, 0.2)'
                      : isSubmitFocused && !isProcessing
                      ? '0 0 0 3px rgba(212, 175, 55, 0.4)'
                      : 'none',
                  }}
                >
                  {isProcessing ? (
                    "Processing Membership..."
                  ) : paymentMethod === 'online' && onlineSubOption === 'UPI' ? (
                    "I've Completed the Payment"
                  ) : (
                    "Confirm & Join Club"
                  )}
                </button>
                {errors.submit && (
                  <span className="error-text" style={{ textAlign: 'center', display: 'block', marginTop: '1rem' }}>
                    {errors.submit}
                  </span>
                )}
              </form>

              {/* Sidebar Summary */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', padding: '2.5rem', position: 'sticky', top: '8rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '2rem', marginTop: 0, color: 'var(--color-white)', letterSpacing: '0.02em' }}>
                    Club Membership
                  </h3>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '60px', height: '60px', border: '1px solid var(--color-border)', background: 'var(--color-obsidian)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: 0 }}>
                        HOROLOGUE Club Membership
                      </h4>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', display: 'block', marginTop: '0.2rem' }}>
                        Access to Private Auctions & Bespoke Orders
                      </span>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(229, 228, 226, 0.1)', margin: '1.5rem 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Membership Tier</span>
                      <span style={{ fontSize: '0.95rem', fontFamily: 'var(--font-technical)', color: 'var(--color-white)' }}>Elite Access</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Billing Cycle</span>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>One-Time Acquisition</span>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(229, 228, 226, 0.1)', margin: '0.5rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textTransform: 'uppercase', color: 'var(--color-white)' }}>Total Cost</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-gold)' }}>$299</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid rgba(229, 228, 226, 0.1)', paddingTop: '1.5rem', color: 'var(--color-slate)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Bespoke Escrow Network Encryption
                    </span>
                  </div>
                </div>
              </aside>
            </motion.div>
          ) : (
            <PaymentSuccessAnimation
              onComplete={() => {
                onSuccess({
                  name: shipping.name,
                  email: shipping.email,
                  phone: shipping.phone,
                  phoneCountryCode: phoneCountryCode,
                  country: shipping.country,
                  paymentMethod: paymentMethod,
                  onlineSubOption: onlineSubOption,
                  orderId: orderId,
                  orderDate: orderDate,
                });
              }}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
