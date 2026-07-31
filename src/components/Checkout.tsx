import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { CartItem } from '../App';
import PaymentSuccessAnimation from './PaymentSuccessAnimation';
import * as api from '../services/api';
import { auth } from '../lib/firebaseClient';


// Configurable Merchant Details for UPI Payments (Bug 5)
const MERCHANT_UPI_ID = 'chronosstore@pay';
const MERCHANT_NAME = 'Chronos Horology';

interface CheckoutProps {
  items: CartItem[];
  onReturn: () => void;
  onOrderSuccess: () => void;
}

const parsePrice = (priceStr: string) => {
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
};

// Form field interfaces
interface ShippingDetails {
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

type PaymentMethod = 'cod' | 'card' | 'online';

export const Checkout: React.FC<CheckoutProps> = ({ items, onReturn, onOrderSuccess }) => {
  // Navigation & Step state: 'form' | 'animation' | 'success'
  const [step, setStep] = useState<'form' | 'animation' | 'success'>('form');
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [shipping, setShipping] = useState<ShippingDetails>({
    name: '',
    email: '',
    phone: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  });

  const [phoneCountryCode, setPhoneCountryCode] = useState('+1');

  const handleCountryDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setShipping((prev) => ({ ...prev, country }));
    
    // Sync country with phone country code
    const countryCodeMap: Record<string, string> = {
      'United States': '+1',
      'India': '+91',
      'United Kingdom': '+44',
      'Australia': '+61',
      'Germany': '+49',
      'France': '+33',
      'Japan': '+81',
      'Switzerland': '+41',
      'Singapore': '+65',
      'United Arab Emirates': '+971',
    };
    
    if (countryCodeMap[country]) {
      setPhoneCountryCode(countryCodeMap[country]);
    }

    if (errors.country) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.country;
        return copy;
      });
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

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

  // Success states (pre-generated to support stable QR codes)
  const [orderId, setOrderId] = useState(() => `CH-${Math.floor(100000 + Math.random() * 900000)}`);
  const [orderDate, setOrderDate] = useState('');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + parsePrice(item.watch.price) * item.quantity, 0);
  const shippingCost = 0; // Complimentary
  const taxCost = 0;
  const total = subtotal + shippingCost + taxCost;

  // Online Payment Sub-option states (Bugs 4 & 5)
  type OnlineSubOption = 'UPI' | 'PayPal' | 'GPay' | 'Wallet';
  const [onlineSubOption, setOnlineSubOption] = useState<OnlineSubOption | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Configurable merchant constants moved to file scope (Bug 5)

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(MERCHANT_UPI_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // FLAG FOR SEPARATE DECISION: UPI and Cash on Delivery (COD) are India-specific payment methods.
  // Now that the site-wide pricing is USD, these may need to be hidden/removed or modified
  // for a USD/international checkout flow. We are keeping the code for now as a business decision.
  useEffect(() => {
    if (paymentMethod === 'online' && onlineSubOption === 'UPI') {
      const upiLink = `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI_ID)}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${total}&cu=INR&tn=${encodeURIComponent(orderId)}`;
      QRCode.toDataURL(upiLink, { width: 200, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error('[UPI QR Code Generation Error]', err);
        });
    }
  }, [paymentMethod, onlineSubOption, total, orderId]);

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts: string[] = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCard((prev) => ({ ...prev, cardNumber: parts.join(' ') }));
    } else {
      setCard((prev) => ({ ...prev, cardNumber: val }));
    }
    // Clear error inline
    if (errors.cardNumber) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.cardNumber;
        return copy;
      });
    }
  };

  // Format Expiry (adds slash MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.slice(0, 4);
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2);
    }
    setCard((prev) => ({ ...prev, expiry: val }));
    // Clear error inline
    if (errors.expiry) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.expiry;
        return copy;
      });
    }
  };

  // Format CVV (max 4 digits)
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCard((prev) => ({ ...prev, cvv: val }));
    if (errors.cvv) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.cvv;
        return copy;
      });
    }
  };

  // Field change handlers with automatic error clearing
  const handleShippingChange = (field: keyof ShippingDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setShipping((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
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

  // Basic Validation Checker
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Shipping Validations
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

    if (!shipping.streetAddress.trim()) newErrors.streetAddress = 'Street address is required';
    if (!shipping.city.trim()) newErrors.city = 'City is required';
    if (!shipping.state.trim()) newErrors.state = 'State/Region is required';
    if (!shipping.zipCode.trim()) newErrors.zipCode = 'ZIP/Postal code is required';
    if (!shipping.country) newErrors.country = 'Country is required';

    // Payment Specific Validations
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
      } else if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(card.expiry)) {
        newErrors.expiry = 'Use MM/YY format';
      } else {
        const [month, year] = card.expiry.split('/').map(Number);
        const now = new Date();
        const currentYear = now.getFullYear() % 100;
        const currentMonth = now.getMonth() + 1;
        if (year < currentYear || (year === currentYear && month < currentMonth)) {
          newErrors.expiry = 'Card has expired';
        }
      }

      if (!card.cvv) {
        newErrors.cvv = 'CVV is required';
      } else if (card.cvv.length < 3 || card.cvv.length > 4) {
        newErrors.cvv = 'Must be 3 or 4 digits';
      }
    } else if (paymentMethod === 'online') {
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

    // Prevent duplicate payments: disable the button the instant it is clicked
    setIsProcessing(true);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.submit;
      return copy;
    });

    try {
      const currentUser = await api.getCurrentUser();
      const userEmail = currentUser ? currentUser.email : shipping.email;
      const userName = currentUser ? currentUser.name : shipping.name;

      if (paymentMethod === 'cod') {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const token = await auth.currentUser?.getIdToken();

        const response = await fetch(`${baseUrl}/api/orders/cod`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            items,
            total,
            phone: shipping.phone,
            phoneCountryCode,
            address: `${shipping.streetAddress}, ${shipping.city}, ${shipping.state} ${shipping.zipCode}, ${shipping.country}`,
            userName,
            userEmail,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const savedOrder = await response.json();
        setOrderId(savedOrder.id);
        setOrderDate(savedOrder.date || (new Date(savedOrder.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + new Date(savedOrder.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })));
        
        onOrderSuccess(); // empty cart
        setStep('animation');
      } else {
        // Razorpay Payment Flow
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
        const token = await auth.currentUser?.getIdToken();

        // 1. Create Order on Backend
        const createOrderRes = await fetch(`${baseUrl}/api/payments/create-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            amount: total,
            currency: 'USD',
            type: 'order',
            metadata: {
              items,
              total,
              phone: shipping.phone,
              phoneCountryCode,
              address: `${shipping.streetAddress}, ${shipping.city}, ${shipping.state} ${shipping.zipCode}, ${shipping.country}`,
              userName,
              userEmail,
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
          description: 'Luxury Timepiece Purchase',
          order_id: razorpay_order_id,
          handler: async (response: any) => {
            try {
              // 3. Verify Razorpay Transaction
              const verifyRes = await fetch(`${baseUrl}/api/payments/verify`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  orderDetails: {
                    items,
                    total,
                    paymentMethod,
                    onlineSubOption,
                    phone: shipping.phone,
                    phoneCountryCode,
                    address: `${shipping.streetAddress}, ${shipping.city}, ${shipping.state} ${shipping.zipCode}, ${shipping.country}`,
                    userName,
                    userEmail,
                  },
                }),
              });

              if (!verifyRes.ok) {
                throw new Error(await verifyRes.text());
              }

              const { data: savedOrder } = await verifyRes.json();

              setOrderId(savedOrder.id);
              setOrderDate(new Date(savedOrder.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + new Date(savedOrder.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
              
              onOrderSuccess(); // empty cart
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
      }
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

  // PDF Receipt Generation
  const downloadReceipt = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Color definitions
    const primaryColor = '#131313'; // Dark Charcoal
    const secondaryColor = '#D4AF37'; // Gold
    const lightGrey = '#F9F9F9';
    const borderGrey = '#E5E4E2';

    // 1. Branding Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    // Title
    doc.setTextColor(secondaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.text('C H R O N O S', 105, 20, { align: 'center' });

    // Subtitle
    doc.setTextColor('#E5E4E2');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('MASTER CHRONOGRAPHS & HOROLOGY', 105, 30, { align: 'center' });

    // 2. Receipt metadata
    doc.setTextColor('#333333');
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text('INVOICE RECEIPT', 20, 55);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Order ID:', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(orderId, 45, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 20, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(orderDate, 45, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', 20, 77);
    doc.setFont('helvetica', 'normal');
    // Reflect specific online payment sub-option on receipt (Bug 4)
    const displayPayment = paymentMethod === 'card'
      ? `Credit/Debit Card (ending in ${card.cardNumber.slice(-4)})`
      : paymentMethod === 'online'
      ? `Online Payment — ${onlineSubOption || 'UPI'}`
      : 'Cash on Delivery';
    doc.text(displayPayment, 50, 77);

    // 3. Shipping Details Box
    doc.setFillColor(lightGrey);
    doc.rect(20, 85, 170, 32, 'F');
    doc.setDrawColor(borderGrey);
    doc.rect(20, 85, 170, 32, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DELIVER TO:', 25, 92);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Name:    ${shipping.name}`, 25, 98);
    doc.text(`Email:   ${shipping.email}`, 25, 104);
    doc.text(`Phone:   ${phoneCountryCode} ${shipping.phone}`, 25, 110);
    
    // Address text wrap support
    const fullAddress = `${shipping.streetAddress}, ${shipping.city}, ${shipping.state} ${shipping.zipCode}, ${shipping.country}`;
    const splitAddress = doc.splitTextToSize(`Address: ${fullAddress}`, 110);
    doc.text(splitAddress, 85, 98);

    // 4. Products Table
    const tableHeaders = [['Watch Description', 'Ref Number', 'Qty', 'Unit Price', 'Total']];
    const tableRows = items.map((item) => [
      item.watch.name,
      item.watch.ref,
      item.quantity.toString(),
      item.watch.price,
      `$${(parsePrice(item.watch.price) * item.quantity).toLocaleString()}`,
    ]);

    // Add table using modern ESM import style
    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 125,
      theme: 'grid',
      headStyles: {
        fillColor: [19, 19, 19],
        textColor: [212, 175, 55],
        font: 'times',
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      columnStyles: {
        0: { font: 'times', fontStyle: 'bold', fontSize: 10 },
        1: { font: 'courier', fontSize: 9, halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      styles: {
        cellPadding: 4,
        fontSize: 9,
        lineColor: [229, 228, 226],
      },
    });

    // 5. Invoice Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, finalY);
    doc.text(`$${subtotal.toLocaleString()}`, 190, finalY, { align: 'right' });

    doc.text('Shipping:', 140, finalY + 6);
    doc.text('Complimentary', 190, finalY + 6, { align: 'right' });

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(140, finalY + 10, 190, finalY + 10);

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 140, finalY + 16);
    doc.setTextColor(secondaryColor);
    doc.text(`$${total.toLocaleString()}`, 190, finalY + 16, { align: 'right' });

    // 6. Thank You Footer
    doc.setTextColor('#777777');
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.text('Thank you for acquiring a Chronos timepiece. Your legacy has begun.', 105, 275, { align: 'center' });

    doc.save(`Chronos_Receipt_${orderId}.pdf`);
  };

  return (
    <div data-lenis-prevent style={{ background: 'var(--color-obsidian)', minHeight: '100vh', color: 'var(--color-white)', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>
      {/* Top Navigation */}
      <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(229, 228, 226, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4rem', height: '5rem', maxWidth: '1440px', margin: '0 auto' }}>
          <button
            onClick={onReturn}
            onMouseEnter={() => setIsBackHovered(true)}
            onMouseLeave={() => setIsBackHovered(false)}
            aria-label="Back to store"
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              color: isBackHovered ? 'var(--color-gold)' : 'var(--color-white)',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'color 0.2s ease',
              outline: 'none',
            }}
          >
            ← Return
          </button>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0, color: 'var(--color-white)' }}>
            CHRONOS
          </h1>
          <div style={{ width: '4rem' }}></div> {/* Balanced spacer */}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ paddingTop: '6rem', paddingBottom: '6rem', paddingLeft: 'clamp(1rem, 4vw, 4rem)', paddingRight: 'clamp(1rem, 4vw, 4rem)', width: '100%', maxWidth: '1440px', margin: '0 auto', boxSizing: 'border-box' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          .checkout-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 3rem;
          }
          @media (min-width: 992px) {
            .checkout-grid {
              grid-template-columns: 1.2fr 1fr;
            }
          }
          @media (max-width: 767px) {
            .checkout-form-2col {
              grid-template-columns: 1fr !important;
            }
            .payment-selectors-grid {
              grid-template-columns: 1fr !important;
            }
          }
          .checkout-input {
            width: 100%;
            background: rgba(26, 26, 26, 0.6);
            border: 1px solid var(--color-border);
            color: var(--color-white);
            padding: 0.875rem 1rem;
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
            font-family: var(--font-technical);
            font-size: 0.75rem;
            color: var(--color-silver);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin-bottom: 0.5rem;
            display: block;
          }
          .payment-card-selector {
            border: 1px solid var(--color-border);
            background: rgba(26, 26, 26, 0.6);
            padding: 1.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 1rem;
            outline: none;
          }
          .payment-card-selector.selected {
            border-color: var(--color-gold);
            background: rgba(212, 175, 55, 0.05);
          }
          .payment-card-selector:focus-visible {
            outline: 1px solid var(--color-gold);
            outline-offset: 2px;
          }
          .sub-option-btn {
            font-family: var(--font-technical);
            font-size: 0.75rem;
            padding: 0.6rem 1.2rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--color-border);
            color: var(--color-white);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.3s ease;
            outline: none;
          }
          .sub-option-btn:hover {
            border-color: rgba(212, 175, 55, 0.5);
            color: var(--color-gold);
            background: rgba(212, 175, 55, 0.02);
          }
          .sub-option-btn.selected {
            background: rgba(212, 175, 55, 0.08);
            border-color: var(--color-gold);
            color: var(--color-gold);
          }
          .error-text {
            color: #ffb4ab;
            font-size: 0.75rem;
            font-family: var(--font-technical);
            margin-top: 0.4rem;
            display: block;
          }
        `}} />

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div
              key="form-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="checkout-grid"
            >
              {/* Left Column: Checkout Forms */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                
                {/* Shipping Section */}
                <section>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', marginBottom: '2rem', borderBottom: '1px solid rgba(229, 228, 226, 0.15)', paddingBottom: '0.75rem', letterSpacing: '0.02em' }}>
                    Shipping Details
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label htmlFor="shipping-name" className="checkout-label">Full Name</label>
                      <input
                        id="shipping-name"
                        type="text"
                        className="checkout-input"
                        placeholder="John Doe"
                        value={shipping.name}
                        onChange={handleShippingChange('name')}
                        style={errors.name ? { borderColor: '#ffb4ab' } : {}}
                      />
                      {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="checkout-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="shipping-email" className="checkout-label">Email Address</label>
                        <input
                          id="shipping-email"
                          type="email"
                          inputMode="email"
                          className="checkout-input"
                          placeholder="john@example.com"
                          value={shipping.email}
                          onChange={handleShippingChange('email')}
                          style={errors.email ? { borderColor: '#ffb4ab' } : {}}
                        />
                        {errors.email && <span className="error-text">{errors.email}</span>}
                      </div>
                      <div>
                        <label htmlFor="shipping-phone" className="checkout-label">Phone Number</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <select
                            id="shipping-phone-code"
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
                            id="shipping-phone"
                            type="tel"
                            inputMode="tel"
                            className="checkout-input"
                            placeholder="(555) 000-0000"
                            value={shipping.phone}
                            onChange={handleShippingChange('phone')}
                            style={{ flex: 1, ...errors.phone ? { borderColor: '#ffb4ab' } : {} }}
                          />
                        </div>
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                      </div>
                    </div>

                    {/* Split Delivery Address Fields */}
                    <div>
                      <label htmlFor="shipping-street" className="checkout-label">Street Address / House No.</label>
                      <input
                        id="shipping-street"
                        type="text"
                        className="checkout-input"
                        placeholder="123 Luxury Lane"
                        value={shipping.streetAddress}
                        onChange={handleShippingChange('streetAddress')}
                        style={errors.streetAddress ? { borderColor: '#ffb4ab' } : {}}
                      />
                      {errors.streetAddress && <span className="error-text">{errors.streetAddress}</span>}
                    </div>

                    <div className="checkout-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="shipping-city" className="checkout-label">City</label>
                        <input
                          id="shipping-city"
                          type="text"
                          className="checkout-input"
                          placeholder="Chronos City"
                          value={shipping.city}
                          onChange={handleShippingChange('city')}
                          style={errors.city ? { borderColor: '#ffb4ab' } : {}}
                        />
                        {errors.city && <span className="error-text">{errors.city}</span>}
                      </div>
                      <div>
                        <label htmlFor="shipping-state" className="checkout-label">State / Region</label>
                        <input
                          id="shipping-state"
                          type="text"
                          className="checkout-input"
                          placeholder="NY"
                          value={shipping.state}
                          onChange={handleShippingChange('state')}
                          style={errors.state ? { borderColor: '#ffb4ab' } : {}}
                        />
                        {errors.state && <span className="error-text">{errors.state}</span>}
                      </div>
                    </div>

                    <div className="checkout-form-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label htmlFor="shipping-zip" className="checkout-label">ZIP / Postal Code</label>
                        <input
                          id="shipping-zip"
                          type="text"
                          inputMode="numeric"
                          className="checkout-input"
                          placeholder="10001"
                          value={shipping.zipCode}
                          onChange={handleShippingChange('zipCode')}
                          style={errors.zipCode ? { borderColor: '#ffb4ab' } : {}}
                        />
                        {errors.zipCode && <span className="error-text">{errors.zipCode}</span>}
                      </div>
                      <div>
                        <label htmlFor="shipping-country" className="checkout-label">Country</label>
                        <select
                          id="shipping-country"
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

                {/* Payment Section */}
                <section>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', marginBottom: '2rem', borderBottom: '1px solid rgba(229, 228, 226, 0.15)', paddingBottom: '0.75rem', letterSpacing: '0.02em' }}>
                    Payment Acquisition
                  </h2>

                  {/* Selector Cards */}
                  <div className="payment-selectors-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    
                    {/* Cash on Delivery */}
                    <div
                      role="radio"
                      aria-checked={paymentMethod === 'cod'}
                      tabIndex={0}
                      className={`payment-card-selector ${paymentMethod === 'cod' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('cod')}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setPaymentMethod('cod'); }}
                    >
                      <input type="radio" checked={paymentMethod === 'cod'} readOnly style={{ accentColor: 'var(--color-gold)', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-white)', fontWeight: 600 }}>COD</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>Cash on Delivery</span>
                      </div>
                    </div>

                    {/* Credit/Debit Card */}
                    <div
                      role="radio"
                      aria-checked={paymentMethod === 'card'}
                      tabIndex={0}
                      className={`payment-card-selector ${paymentMethod === 'card' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setPaymentMethod('card'); }}
                    >
                      <input type="radio" checked={paymentMethod === 'card'} readOnly style={{ accentColor: 'var(--color-gold)', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-white)', fontWeight: 600 }}>Card</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>Credit/Debit</span>
                      </div>
                    </div>

                    {/* Online Wallet / UPI */}
                    <div
                      role="radio"
                      aria-checked={paymentMethod === 'online'}
                      tabIndex={0}
                      className={`payment-card-selector ${paymentMethod === 'online' ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod('online')}
                      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setPaymentMethod('online'); }}
                    >
                      <input type="radio" checked={paymentMethod === 'online'} readOnly style={{ accentColor: 'var(--color-gold)', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-white)', fontWeight: 600 }}>UPI/Wallet</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-slate)', marginTop: '0.2rem' }}>Online Payment</span>
                      </div>
                    </div>
                  </div>

                  {/* Method specific fields */}
                  <div style={{ background: 'rgba(26, 26, 26, 0.3)', border: '1px dashed var(--color-border)', padding: '2rem' }}>
                    {paymentMethod === 'cod' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          ✓ Cash on Delivery Selected
                        </span>
                        <p style={{ color: 'var(--color-slate)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                          Please pay in cash or digital scan-on-delivery when your order arrives. Standard courier delivery applies. Complimentary insured dispatch is included.
                        </p>
                      </motion.div>
                    )}

                    {paymentMethod === 'card' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                          <label htmlFor="card-name" className="checkout-label">Cardholder Name</label>
                          <input
                            id="card-name"
                            type="text"
                            className="checkout-input"
                            placeholder="John Doe"
                            value={card.cardholderName}
                            onChange={handleCardFieldChange('cardholderName')}
                            style={errors.cardholderName ? { borderColor: '#ffb4ab' } : {}}
                          />
                          {errors.cardholderName && <span className="error-text">{errors.cardholderName}</span>}
                        </div>

                        <div>
                          <label htmlFor="card-number" className="checkout-label">Card Number</label>
                          <input
                            id="card-number"
                            type="text"
                            className="checkout-input"
                            placeholder="0000 0000 0000 0000"
                            value={card.cardNumber}
                            onChange={handleCardNumberChange}
                            style={errors.cardNumber ? { borderColor: '#ffb4ab' } : {}}
                          />
                          {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                          <div>
                            <label htmlFor="card-expiry" className="checkout-label">Expiration Date</label>
                            <input
                              id="card-expiry"
                              type="text"
                              className="checkout-input"
                              placeholder="MM/YY"
                              value={card.expiry}
                              onChange={handleExpiryChange}
                              style={errors.expiry ? { borderColor: '#ffb4ab' } : {}}
                            />
                            {errors.expiry && <span className="error-text">{errors.expiry}</span>}
                          </div>
                          <div>
                            <label htmlFor="card-cvv" className="checkout-label">Security Code (CVV)</label>
                            <input
                              id="card-cvv"
                              type="password"
                              className="checkout-input"
                              placeholder="•••"
                              value={card.cvv}
                              onChange={handleCvvChange}
                              style={errors.cvv ? { borderColor: '#ffb4ab' } : {}}
                            />
                            {errors.cvv && <span className="error-text">{errors.cvv}</span>}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {paymentMethod === 'online' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            ✓ Online Payment Option Selected
                          </span>
                          <p style={{ color: 'var(--color-slate)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                            Choose your preferred online checkout option below:
                          </p>
                        </div>

                        {/* Interactive Sub-Options Selector (Bug 4) */}
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          {['UPI', 'PayPal', 'GPay', 'Wallet'].map((plat) => {
                            const isSelected = onlineSubOption === plat;
                            return (
                              <button
                                key={plat}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                className={`sub-option-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => {
                                  // Fixed (Bug 4): Sub-option buttons selection state and hover effect styled using CSS classes
                                  setOnlineSubOption(plat as OnlineSubOption);
                                  if (errors.onlineSubOption) {
                                    setErrors((prev) => {
                                      const copy = { ...prev };
                                      delete copy.onlineSubOption;
                                      return copy;
                                    });
                                  }
                                }}
                              >
                                {plat}
                              </button>
                            );
                          })}
                        </div>
                        {errors.onlineSubOption && <span className="error-text" style={{ marginTop: '-0.5rem' }}>{errors.onlineSubOption}</span>}

                        {/* UPI QR Panel (Bug 5) */}
                        {onlineSubOption === 'UPI' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            style={{
                              border: '1px dashed var(--color-gold)',
                              background: 'rgba(212, 175, 55, 0.02)',
                              padding: '1.5rem',
                              marginTop: '1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: '1rem',
                            }}
                          >
                            <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-gold)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                              Scan QR to Pay
                            </span>
                            
                            {/* FLAG FOR SEPARATE DECISION: UPI only supports INR. Since site-wide pricing is USD, the UPI QR code is configured for INR, but the user is billed in USD. Under a USD flow, we should convert the USD amount to INR or use an international checkout provider. For now, we display USD to align with site-wide USD currency changes. */}
                            <div style={{ fontFamily: 'var(--font-body)', fontSize: '1.1rem', color: 'var(--color-white)' }}>
                              Amount to Pay: <span style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-technical)', fontWeight: 'bold' }}>${total.toLocaleString()} USD</span>
                            </div>

                            {/* QR Code Container */}
                            {qrCodeUrl ? (
                              <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: '4px', display: 'inline-block' }}>
                                <img
                                  src={qrCodeUrl}
                                  alt="UPI Payment QR Code"
                                  style={{ width: '160px', height: '160px', display: 'block' }}
                                />
                              </div>
                            ) : (
                              <div style={{ height: '160px', width: '160px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>Generating QR...</span>
                              </div>
                            )}

                            {/* UPI ID display & copy */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.85rem', color: 'var(--color-silver)' }}>
                                UPI ID: <code style={{ color: 'var(--color-white)', background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.4rem' }}>{MERCHANT_UPI_ID}</code>
                              </span>
                              <button
                                type="button"
                                onClick={handleCopyUpiId}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--color-border)',
                                  color: 'var(--color-white)',
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.7rem',
                                  fontFamily: 'var(--font-technical)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  outline: 'none',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-gold)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
                              >
                                {copied ? 'Copied!' : 'Copy'}
                              </button>
                            </div>

                            <p style={{ fontSize: '0.8rem', color: 'var(--color-slate)', lineHeight: '1.4', margin: '0.5rem 0 0 0' }}>
                              After scanning and paying with your UPI app, please click the <strong>"I've Completed the Payment"</strong> confirmation button below to complete the acquisition.
                            </p>
                          </motion.div>
                        )}

                        {/* Other sub-option placeholders */}
                        {onlineSubOption && onlineSubOption !== 'UPI' && (
                          <div style={{ color: 'var(--color-slate)', fontSize: '0.875rem', lineHeight: '1.5', marginTop: '0.5rem' }}>
                            You will be redirected securely to <strong>{onlineSubOption}</strong> to complete your acquisition when you click the order button below.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
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
                    "Processing Acquisition..."
                  ) : paymentMethod === 'online' && onlineSubOption === 'UPI' ? (
                    "I've Completed the Payment"
                  ) : (
                    "Confirm & Place Order"
                  )}
                </button>
                {errors.submit && (
                  <span className="error-text" style={{ textAlign: 'center', display: 'block', marginTop: '1rem' }}>
                    {errors.submit}
                  </span>
                )}
              </form>

              {/* Right Column: Order Details Summary */}
              <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', padding: '2.5rem', position: 'sticky', top: '8rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '2rem', marginTop: 0, color: 'var(--color-white)', letterSpacing: '0.02em' }}>
                    Acquisition Summary
                  </h3>

                  {/* Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                    {items.map((item) => {
                      const itemSubtotal = parsePrice(item.watch.price) * item.quantity;
                      return (
                        <div key={item.watch.name} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <img
                            src={item.watch.image}
                            alt={item.watch.name}
                            style={{ width: '60px', height: '60px', objectFit: 'cover', border: '1px solid var(--color-border)', background: 'var(--color-obsidian)' }}
                          />
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '0.95rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: 0 }}>
                              {item.watch.name}
                            </h4>
                            <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', display: 'block', marginTop: '0.2rem' }}>
                              Ref: {item.watch.ref}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-gold)', display: 'block', marginTop: '0.1rem' }}>
                              Qty: {item.quantity} × {item.watch.price}
                            </span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.9rem', color: 'var(--color-white)' }}>
                            ${itemSubtotal.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ height: '1px', background: 'rgba(229, 228, 226, 0.1)', margin: '1.5rem 0' }} />

                  {/* Fee Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Subtotal</span>
                      <span style={{ fontSize: '1.05rem', fontFamily: 'var(--font-technical)' }}>${subtotal.toLocaleString()}</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-slate)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Shipping</span>
                      <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Complimentary</span>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(229, 228, 226, 0.1)', margin: '0.5rem 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', textTransform: 'uppercase', color: 'var(--color-white)' }}>Total</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--color-gold)' }}>${total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Safe checkout message */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderTop: '1px solid rgba(229, 228, 226, 0.1)', paddingTop: '1.5rem', color: 'var(--color-slate)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Chronos Secure Escrow Verification
                    </span>
                  </div>

                </div>
              </aside>

            </motion.div>
          ) : step === 'animation' ? (
            <PaymentSuccessAnimation onComplete={() => setStep('success')} />
          ) : (
            <motion.div
              key="success-step"
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
                margin: '2rem auto',
                padding: '4rem 3rem',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                textAlign: 'center',
              }}
            >
              {/* Animated Success Badge */}
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gold)', marginBottom: '2.5rem' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                Acquisition Confirmed
              </h2>

              <p style={{ color: 'var(--color-slate)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '3rem', fontFamily: 'var(--font-body)', fontWeight: 300 }}>
                Your order has been successfully placed in our system. A confirmation email has been sent to your address. Our master horologists are now preparing your chronograph.
              </p>

              {/* Order Info Card */}
              <div style={{ width: '100%', border: '1px solid var(--color-border)', background: 'var(--color-obsidian)', padding: '2rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Order ID</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)' }}>{orderId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisition Date</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{orderDate}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Customer Name</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{shipping.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Phone Number</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{`${phoneCountryCode} ${shipping.phone}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Delivery Address</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)', textAlign: 'right', maxWidth: '300px' }}>
                    {`${shipping.streetAddress}, ${shipping.city}, ${shipping.state} ${shipping.zipCode}, ${shipping.country}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisition Total</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.85rem', color: 'var(--color-gold)' }}>${total.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Payment Mode</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>
                    {/* Fixed (Bug 4): Reflect selected sub-option in the final order summary page */}
                    {paymentMethod === 'card'
                      ? `Card ending in ${card.cardNumber.slice(-4)}`
                      : paymentMethod === 'online'
                      ? `Online Payment — ${onlineSubOption || 'UPI'}`
                      : 'Cash on Delivery'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1.5rem', width: '100%' }}>
                
                {/* Download Receipt */}
                <button
                  onClick={downloadReceipt}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: 'var(--color-white)',
                    border: '1px solid var(--color-silver)',
                    padding: '1.25rem',
                    fontFamily: 'var(--font-technical)',
                    fontSize: '0.875rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-gold)'; e.currentTarget.style.color = 'var(--color-gold)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-silver)'; e.currentTarget.style.color = 'var(--color-white)'; }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Receipt
                </button>

                {/* Return to Catalogue */}
                <button
                  onClick={() => {
                    onOrderSuccess();
                    onReturn();
                  }}
                  style={{
                    flex: 1,
                    background: 'var(--color-gold)',
                    color: 'var(--color-obsidian)',
                    border: 'none',
                    padding: '1.25rem',
                    fontFamily: 'var(--font-technical)',
                    fontSize: '0.875rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f2ca50'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-gold)'; }}
                >
                  Return to Catalogue
                </button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
