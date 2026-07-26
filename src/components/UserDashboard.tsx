import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const getOffsetDate = (baseDateStr: string, daysOffset: number) => {
  const date = new Date(baseDateStr);
  date.setDate(date.getDate() + daysOffset);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getDaysPassed = (baseDateStr: string) => {
  const createdAt = new Date(baseDateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - createdAt.getTime());
  return diffTime / (1000 * 60 * 60 * 24);
};

const OrderTrackingTimeline: React.FC<{ order: api.Order }> = ({ order }) => {
  const baseDate = order.createdAt;
  const days = getDaysPassed(baseDate);
  const isCancelled = order.status === 'Cancelled';

  const steps = [
    { label: 'Order Confirmed', description: 'Acquisition registered. Insured verification complete.', offset: 0 },
    { label: 'Processing', description: 'Master watchmaker quality control & registry check.', offset: 1 },
    { label: 'Shipped', description: 'Dispatched via premium armored courier.', offset: 2 },
    { label: 'Out for Delivery', description: 'Courier in transit to your secure domicile.', offset: 3 },
    { label: 'Delivered', description: 'Timepiece successfully received.', offset: 4 }
  ];

  let activeStep = 0;
  if (isCancelled) {
    activeStep = 0;
  } else if (order.status === 'Delivered' || days >= 4) {
    activeStep = 4;
  } else if (days >= 3) {
    activeStep = 3;
  } else if (order.status === 'Shipped' || days >= 2) {
    activeStep = 2;
  } else if (days >= 1) {
    activeStep = 1;
  }

  const estDeliveryDate = getOffsetDate(baseDate, 4);

  return (
    <div style={{ marginTop: '2rem', border: '1px solid rgba(212, 175, 55, 0.15)', background: 'rgba(212, 175, 55, 0.01)', padding: '2rem', marginBottom: '2rem' }}>
      <h4 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-white)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1.5rem 0' }}>
        Acquisition Delivery Ledger
      </h4>

      {isCancelled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#ffb4ab', fontFamily: 'var(--font-technical)', fontSize: '0.8rem' }}>
          <div>● ORDER CANCELLED</div>
          <p style={{ color: 'var(--color-slate)', margin: 0, fontSize: '0.75rem' }}>This transaction has been terminated. Insured refunds are processed within 24 hours.</p>
        </div>
      ) : (
        <div>
          {/* Estimated Date banner */}
          <div style={{ background: 'rgba(212, 175, 55, 0.05)', borderLeft: '3px solid var(--color-gold)', padding: '0.75rem 1.25rem', marginBottom: '2rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-slate)' }}>
              {activeStep === 4 ? 'Status: Delivered Successfully' : 'Estimated Delivery:'}
            </span>
            <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontWeight: 600 }}>
              {activeStep === 4 ? getOffsetDate(baseDate, Math.min(4, Math.floor(days))) : estDeliveryDate}
            </span>
          </div>

          {/* Timeline steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute',
              left: '9px',
              top: '12px',
              bottom: '12px',
              width: '2px',
              background: 'rgba(255, 255, 255, 0.07)',
              zIndex: 1
            }} />
            
            {/* Active colored line segment */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(activeStep / 4) * 100}%` }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              style={{
                position: 'absolute',
                left: '9px',
                top: '12px',
                maxHeight: 'calc(100% - 24px)',
                width: '2px',
                background: 'var(--color-gold)',
                zIndex: 2,
                originY: 0
              }}
            />

            {steps.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isActive = idx === activeStep;
              const isFuture = idx > activeStep;

              return (
                <div key={idx} style={{ display: 'flex', gap: '1.5rem', zIndex: 3, position: 'relative' }}>
                  {/* Indicator Dot/Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isCompleted ? (
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.15 }}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--color-gold)',
                          border: '2px solid var(--color-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-obsidian)',
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}
                      >
                        ✓
                      </motion.div>
                    ) : isActive ? (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: 'var(--color-obsidian)',
                          border: '2px solid var(--color-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-gold)' }} />
                      </motion.div>
                    ) : (
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'var(--color-obsidian)',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                      }} />
                    )}
                  </div>

                  {/* Step Text Info */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      fontFamily: 'var(--font-display)', 
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--color-gold)' : isFuture ? 'var(--color-slate)' : 'var(--color-white)'
                    }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: isFuture ? 'rgba(255,255,255,0.15)' : 'var(--color-slate)' }}>
                      {step.description}
                    </div>
                    {/* Description time info */}
                    {!isFuture && (
                      <div style={{ fontFamily: 'var(--font-technical)', fontSize: '0.65rem', color: isActive ? 'var(--color-gold)' : 'var(--color-slate)', marginTop: '0.2rem' }}>
                        {getOffsetDate(baseDate, step.offset)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface UserDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onLogout, onNavigateHome }) => {
  const [user, setUser] = useState<api.User | null>(null);
  const [orders, setOrders] = useState<api.Order[]>([]);
  const [subscription, setSubscription] = useState<api.Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<api.Order | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentUser = await api.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const [userOrders, userSub] = await Promise.all([
            api.getUserOrders(currentUser.id),
            api.getUserSubscription(currentUser.id),
          ]);
          setOrders(userOrders);
          setSubscription(userSub);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    onLogout();
  };

  const downloadReceipt = (order: api.Order) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

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
    doc.text(order.id, 45, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('Date:', 20, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(order.date, 45, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', 20, 77);
    doc.setFont('helvetica', 'normal');
    
    const displayPayment = order.paymentMethod === 'card'
      ? 'Credit Card'
      : order.paymentMethod === 'online'
      ? `Online Payment — ${order.onlineSubOption || 'UPI'}`
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
    doc.text(`Name:    ${order.userName}`, 25, 98);
    doc.text(`Email:   ${order.userEmail}`, 25, 104);
    doc.text(`Phone:   ${order.phoneCountryCode || ''} ${order.phone}`, 25, 110);
    
    const splitAddress = doc.splitTextToSize(`Address: ${order.address}`, 110);
    doc.text(splitAddress, 85, 98);

    // 4. Products Table
    const tableHeaders = [['Watch Description', 'Ref Number', 'Qty', 'Unit Price', 'Total']];
    const tableRows = order.items.map((item) => [
      item.watch.name,
      item.watch.ref,
      item.quantity.toString(),
      item.watch.price,
      `$${(parseInt(item.watch.price.replace(/[^0-9]/g, ''), 10) * item.quantity).toLocaleString()}`,
    ]);

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

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, finalY);
    doc.text(`$${order.total.toLocaleString()}`, 190, finalY, { align: 'right' });

    doc.text('Shipping:', 140, finalY + 6);
    doc.text('Complimentary', 190, finalY + 6, { align: 'right' });

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(140, finalY + 10, 190, finalY + 10);

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('Total:', 140, finalY + 16);
    doc.setTextColor(secondaryColor);
    doc.text(`$${order.total.toLocaleString()}`, 190, finalY + 16, { align: 'right' });

    doc.setTextColor('#777777');
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.text('Thank you for acquiring a Chronos timepiece. Your legacy has begun.', 105, 275, { align: 'center' });

    doc.save(`Chronos_Receipt_${order.id}.pdf`);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-obsidian)',
        color: 'var(--color-gold)',
        fontFamily: 'var(--font-technical)',
        letterSpacing: '0.2em'
      }}>
        LOADING CLIENT PORTAL...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div data-lenis-prevent style={{ background: 'var(--color-obsidian)', minHeight: '100vh', color: 'var(--color-white)', fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      {/* Local styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 6rem 2rem 8rem;
          display: grid;
          grid-template-columns: 1fr 2.5fr;
          gap: 4rem;
        }
        @media (max-width: 960px) {
          .dashboard-container {
            grid-template-columns: 1fr;
            gap: 3rem;
            padding: 4rem 1.5rem 6rem;
          }
        }
        .card {
          background: var(--color-charcoal);
          border: 1px solid var(--color-border);
          padding: 2.5rem;
          position: relative;
        }
        .section-header {
          font-family: var(--font-display);
          font-size: 1.5rem;
          text-transform: uppercase;
          margin-bottom: 2rem;
          color: var(--color-white);
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(229, 228, 226, 0.1);
          padding-bottom: 0.75rem;
        }
        .btn-logout {
          background: transparent;
          border: 1px solid #ffb4ab;
          color: #ffb4ab;
          font-family: var(--font-technical);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.875rem 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1.5rem;
          width: 100%;
          text-align: center;
        }
        .btn-logout:hover {
          background: rgba(255, 180, 171, 0.05);
        }
        .order-row {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1fr 1.2fr;
          padding: 1.25rem 0;
          border-bottom: 1px solid rgba(229, 228, 226, 0.05);
          align-items: center;
          font-size: 0.9rem;
        }
        @media (max-width: 768px) {
          .order-row {
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            padding: 1.5rem;
            background: rgba(26, 26, 26, 0.4);
            border: 1px solid var(--color-border);
            margin-bottom: 1rem;
          }
          .order-row > *:nth-child(5) {
            grid-column: span 2;
            margin-top: 0.5rem;
          }
        }
      `}} />

      {/* Nav */}
      <header style={{ borderBottom: '1px solid rgba(229, 228, 226, 0.1)', padding: '1.5rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.1em' }}>
          HOROLOGUE
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button
            onClick={onNavigateHome}
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
            Return to Catalogue
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #ffb4ab',
              color: '#ffb4ab',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.4rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffb4ab';
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#ffb4ab';
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="dashboard-container">
        
        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Profile Card */}
          <div className="card">
            <h3 className="section-header">Client Dossier</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Client ID</span>
                <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '0.9rem' }}>{user.id}</span>
              </div>
              <div>
                <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Full Name</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>{user.name}</span>
              </div>
              <div>
                <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Email Address</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--color-silver)' }}>{user.email}</span>
              </div>
              {user.phone && (
                <div>
                  <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Phone Contact</span>
                  <span style={{ fontSize: '0.95rem', color: 'var(--color-silver)' }}>{user.phone}</span>
                </div>
              )}
              {user.country && (
                <div>
                  <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Domicile Country</span>
                  <span style={{ fontSize: '0.95rem', color: 'var(--color-silver)' }}>{user.country}</span>
                </div>
              )}
              <div>
                <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Client Since</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--color-silver)' }}>{user.joinDate}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Terminate Session</button>
          </div>

          {/* Subscription Card */}
          {subscription && (
            <div className="card" style={{ borderColor: 'var(--color-gold)', background: 'rgba(212, 175, 55, 0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <span className="technical-text" style={{ color: 'var(--color-gold)', fontSize: '0.7rem' }}>CLUBS & PRIVÉ</span>
                <span style={{
                  background: 'var(--color-gold)',
                  color: 'var(--color-obsidian)',
                  fontSize: '0.65rem',
                  fontFamily: 'var(--font-technical)',
                  padding: '0.15rem 0.5rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Active
                </span>
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', margin: '0 0 0.5rem', color: 'var(--color-white)' }}>
                {subscription.plan}
              </h4>
              <span className="technical-text" style={{ color: 'var(--color-slate)', fontSize: '0.8rem', display: 'block', marginBottom: '1.5rem' }}>
                Elite Access ($299)
              </span>
              <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.15)', paddingTop: '1rem' }}>
                <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.65rem' }}>Renewal Date</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-white)' }}>{subscription.renewalDate}</span>
              </div>
            </div>
          )}
        </aside>
        {/* Main Column */}
        <section className="card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
          
          <h3 className="section-header">Acquisitions</h3>

          {orders.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '350px', textAlign: 'center' }}>
              <span style={{ color: 'var(--color-slate)', fontSize: '3rem', marginBottom: '1.5rem' }}>∅</span>
              <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-white)', margin: '0 0 0.5rem' }}>No acquisitions yet</h4>
              <p style={{ color: 'var(--color-slate)', fontSize: '0.875rem', maxWidth: '300px', margin: 0 }}>
                Your mechanical ledger is empty. Explore our collection to acquire your first chronograph.
              </p>
            </div>
          ) : (
            <div>
              {/* Table Header on Desktop */}
              <div className="order-row" style={{ borderBottom: '1px solid rgba(229, 228, 226, 0.15)', fontFamily: 'var(--font-technical)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-slate)' }}>
                <span>ID</span>
                <span>Date</span>
                <span>Total</span>
                <span>Status</span>
                <span style={{ textAlign: 'right' }}>Actions</span>
              </div>

              {/* Rows */}
              {orders.map((order) => (
                <div key={order.id} className="order-row">
                  <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)' }}>{order.id}</span>
                  <span style={{ color: 'var(--color-silver)' }}>
                    {order.date.split(' at ')[0]}
                  </span>
                  <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-white)' }}>
                    ${order.total.toLocaleString()}
                  </span>
                  <span>
                    <span style={{
                      color: order.status === 'Delivered' ? '#81c784' : order.status === 'Shipped' ? '#64b5f6' : '#ffd54f',
                      fontSize: '0.85rem'
                    }}>
                      ● {order.status}
                    </span>
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--color-gold)',
                        color: 'var(--color-gold)',
                        fontFamily: 'var(--font-technical)',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--color-gold)';
                        e.currentTarget.style.color = 'var(--color-obsidian)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-gold)';
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Modal Details Overlay */}
      <AnimatePresence>
        {selectedOrder && (
          <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5, 5, 5, 0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '650px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                padding: '3rem 2.5rem',
                position: 'relative',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>
                Acquisition Details
              </h2>

              <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-obsidian)', padding: '2rem', marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Order ID</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)' }}>{selectedOrder.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisition Date</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedOrder.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Customer Name</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedOrder.userName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Phone Number</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{`${selectedOrder.phoneCountryCode || ''} ${selectedOrder.phone}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Delivery Address</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)', textAlign: 'right', maxWidth: '300px' }}>
                    {selectedOrder.address}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisition Total</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.85rem', color: 'var(--color-gold)' }}>${selectedOrder.total.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Payment Mode</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>
                    {selectedOrder.paymentMethod === 'card'
                      ? 'Credit Card'
                      : selectedOrder.paymentMethod === 'online'
                      ? `Online Payment — ${selectedOrder.onlineSubOption || 'UPI'}`
                      : 'Cash on Delivery'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Status</span>
                  <span style={{
                    color: selectedOrder.status === 'Delivered' ? '#81c784' : selectedOrder.status === 'Shipped' ? '#64b5f6' : '#ffd54f',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Order Tracking Timeline */}
              <OrderTrackingTimeline order={selectedOrder} />

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1.5rem', width: '100%' }}>
                <button
                  onClick={() => downloadReceipt(selectedOrder)}
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
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Download Receipt
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
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
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;
