import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, ShoppingBag, Users, Watch, Heart, Star, Mail, 
  ArrowUpRight, Search, SlidersHorizontal, 
  ChevronLeft, ChevronRight, Download, Plus, Trash2, Edit, Eye, AlertTriangle
} from 'lucide-react';
import * as api from '../services/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AdminDashboardProps {
  onLogout: () => void;
  onNavigateHome: () => void;
}

type TabType = 'overview' | 'orders' | 'products' | 'customers' | 'subscribers';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onNavigateHome }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<api.Order[]>([]);
  const [products, setProducts] = useState<api.Product[]>([]);
  const [customers, setCustomers] = useState<api.User[]>([]);
  const [subscribers, setSubscribers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Details
  const [selectedOrder, setSelectedOrder] = useState<api.Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [addingProduct, setAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<api.Product | null>(null);

  // Forms
  const [newProduct, setNewProduct] = useState({
    name: '',
    ref: '',
    price: 0,
    stock: 0,
    image_url: '',
    description: ''
  });
  const [editStock, setEditStock] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Search, Sort, Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortField, setSortField] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // INR Currency Conversion rate
  const INR_RATE = 85;

  const refreshData = async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [allStats, allOrders, allProducts, allCustomers, allSubscribers] = await Promise.all([
        api.getDashboardStats(),
        api.getAllOrders(),
        api.getAllProducts(),
        api.getAllCustomers(),
        api.getNewsletterSubscribers(),
      ]);
      setStats(allStats);
      setOrders(allOrders);
      setProducts(allProducts);
      setCustomers(allCustomers);
      setSubscribers(allSubscribers);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(() => refreshData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await api.logout();
    onLogout();
  };

  const handleStatusChange = async (orderId: string, newStatus: api.Order['status']) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      await refreshData(false);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.adminAddProduct({
        name: newProduct.name.trim(),
        reference: newProduct.ref.trim(),
        price: Number(newProduct.price),
        stock: Number(newProduct.stock),
        image_url: newProduct.image_url.trim(),
        description: newProduct.description.trim()
      });
      setAddingProduct(false);
      setNewProduct({ name: '', ref: '', price: 0, stock: 0, image_url: '', description: '' });
      await refreshData(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add product.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.id) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      await api.adminUpdateProduct(editingProduct.id, {
        stock: editStock,
        description: editDescription.trim() || undefined
      });
      setEditingProduct(null);
      await refreshData(true);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update timepiece.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to permanently decommission "${productName}" from Horologue catalog?`)) {
      return;
    }
    try {
      await api.adminDeleteProduct(productId);
      await refreshData(true);
    } catch (err: any) {
      alert(`Decommissioning failed: ${err.message}`);
    }
  };

  const handleExportSubscribers = () => {
    if (!stats || !subscribers) return;
    // Combine newsletter & elite subs
    const rows = [
      ['Email Address', 'Subscription Type', 'Status', 'Date Joined']
    ];
    subscribers.forEach((email: string) => {
      rows.push([email, 'Newsletter Alert', 'Active', 'N/A']);
    });
    // Add elite membership profiles
    customers.forEach((c) => {
      if (c.membership === 'Elite Club') {
        rows.push([c.email, 'Elite Membership Club', 'Active', c.joinDate || 'N/A']);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Horologue_Subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadReceipt = (order: api.Order) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor = '#131313';
    const secondaryColor = '#D4AF37';
    const lightGrey = '#F9F9F9';
    const borderGrey = '#E5E4E2';

    doc.setFillColor(primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(secondaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.text('H O R O L O G U E', 105, 20, { align: 'center' });

    doc.setTextColor('#E5E4E2');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('LUXURY CHRONOGRAPHS & ANALYTICS ESCROW', 105, 30, { align: 'center' });

    doc.setTextColor('#333333');
    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.text('OFFICIAL INVOICE RECEIPT', 20, 55);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Acquisition ID:', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(order.id, 45, 65);

    doc.setFont('helvetica', 'bold');
    doc.text('Date Ordered:', 20, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(order.date, 45, 71);

    doc.setFont('helvetica', 'bold');
    doc.text('Payment Gateway:', 20, 77);
    doc.setFont('helvetica', 'normal');
    const displayPayment = order.paymentMethod === 'card'
      ? 'Credit/Debit Card'
      : order.paymentMethod === 'online'
      ? `Online UPI — ${order.onlineSubOption || 'Verified'}`
      : 'Cash on Delivery';
    doc.text(displayPayment, 52, 77);

    doc.setFillColor(lightGrey);
    doc.rect(20, 85, 170, 32, 'F');
    doc.setDrawColor(borderGrey);
    doc.rect(20, 85, 170, 32, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SHIPPING DETAILS:', 25, 92);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Recipient:  ${order.userName}`, 25, 98);
    doc.text(`Email:      ${order.userEmail}`, 25, 104);
    doc.text(`Phone:      ${order.phoneCountryCode || ''} ${order.phone}`, 25, 110);
    
    const splitAddress = doc.splitTextToSize(`Address:    ${order.address}`, 100);
    doc.text(splitAddress, 85, 98);

    const tableHeaders = [['Timepiece Model', 'Ref Code', 'Qty', 'Unit Price (₹)', 'Total (₹)']];
    const tableRows = order.items.map((item) => {
      const priceVal = parseInt(item.watch.price.replace(/[^0-9]/g, ''), 10) * INR_RATE;
      return [
        item.watch.name,
        item.watch.ref,
        item.quantity.toString(),
        `₹ ${priceVal.toLocaleString('en-IN')}`,
        `₹ ${(priceVal * item.quantity).toLocaleString('en-IN')}`,
      ];
    });

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
    const finalInr = order.total * INR_RATE;

    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', 140, finalY);
    doc.text(`₹ ${finalInr.toLocaleString('en-IN')}`, 190, finalY, { align: 'right' });

    doc.text('Delivery & Escrow:', 140, finalY + 6);
    doc.text('Complimentary', 190, finalY + 6, { align: 'right' });

    doc.setDrawColor(primaryColor);
    doc.setLineWidth(0.5);
    doc.line(140, finalY + 10, 190, finalY + 10);

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('Total Paid:', 140, finalY + 16);
    doc.setTextColor(secondaryColor);
    doc.text(`₹ ${finalInr.toLocaleString('en-IN')}`, 190, finalY + 16, { align: 'right' });

    doc.setTextColor('#777777');
    doc.setFont('times', 'italic');
    doc.setFontSize(10);
    doc.text('Thank you for acquiring a Horologue timepiece. Authenticity guaranteed.', 105, 275, { align: 'center' });

    doc.save(`Horologue_Receipt_${order.id.slice(0, 8)}.pdf`);
  };

  // Helper Sort & Filters
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-obsidian)',
        color: 'var(--color-gold)',
        fontFamily: 'var(--font-technical)',
        letterSpacing: '0.2em',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '2px solid rgba(212, 175, 55, 0.1)',
          borderTopColor: 'var(--color-gold)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        INITIALIZING HOROLOGUE COMMAND CONSOLE...
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  // --- Filtering & Sorting lists ---
  // 1. Orders
  const filteredOrders = orders.filter(o => {
    const sTerm = searchQuery.toLowerCase();
    const matchSearch = o.id.toLowerCase().includes(sTerm) || 
      o.userName.toLowerCase().includes(sTerm) || 
      o.userEmail.toLowerCase().includes(sTerm);
    
    const matchFilter = statusFilter === 'All' || o.status.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchFilter;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortField === 'date') return (new Date(a.date).getTime() - new Date(b.date).getTime()) * factor;
    if (sortField === 'total') return (a.total - b.total) * factor;
    if (sortField === 'client') return a.userName.localeCompare(b.userName) * factor;
    return 0;
  });

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 2. Products
  const filteredProducts = products.filter(p => {
    const sTerm = searchQuery.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(sTerm) || p.ref.toLowerCase().includes(sTerm);
    
    if (statusFilter === 'All') return matchSearch;
    if (statusFilter === 'In Stock') return matchSearch && p.stock > 0;
    if (statusFilter === 'Low Stock') return matchSearch && p.stock > 0 && p.stock <= 3;
    if (statusFilter === 'Out of Stock') return matchSearch && p.stock === 0;
    return matchSearch;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortField === 'name') return a.name.localeCompare(b.name) * factor;
    if (sortField === 'ref') return a.ref.localeCompare(b.ref) * factor;
    if (sortField === 'stock') return (a.stock - b.stock) * factor;
    if (sortField === 'price') {
      const aPrice = parseInt(a.price.replace(/[^0-9]/g, ''), 10);
      const bPrice = parseInt(b.price.replace(/[^0-9]/g, ''), 10);
      return (aPrice - bPrice) * factor;
    }
    return 0;
  });

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 3. Customers
  const filteredCustomers = customers.filter(c => {
    const sTerm = searchQuery.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(sTerm) || 
      c.email.toLowerCase().includes(sTerm) || 
      (c.country || '').toLowerCase().includes(sTerm);
    
    if (statusFilter === 'All') return matchSearch;
    if (statusFilter === 'Elite Club') return matchSearch && c.membership === 'Elite Club';
    if (statusFilter === 'Free Tier') return matchSearch && c.membership !== 'Elite Club';
    return matchSearch;
  }).sort((a, b) => {
    if (!sortField) return 0;
    let factor = sortOrder === 'asc' ? 1 : -1;
    if (sortField === 'name') return a.name.localeCompare(b.name) * factor;
    if (sortField === 'date') return (new Date(a.joinDate || '').getTime() - new Date(b.joinDate || '').getTime()) * factor;
    
    // Calculated aggregates
    const getSpent = (user: api.User) => orders.filter(o => o.userId === user.id && o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0);
    const getCount = (user: api.User) => orders.filter(o => o.userId === user.id).length;

    if (sortField === 'spent') return (getSpent(a) - getSpent(b)) * factor;
    if (sortField === 'orders') return (getCount(a) - getCount(b)) * factor;
    return 0;
  });

  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 4. Subscribers
  // Combined list formatting
  const combinedSubscribersList: { email: string; type: string; date: string; status: string }[] = [];
  subscribers.forEach(email => {
    combinedSubscribersList.push({
      email,
      type: 'Newsletter Alert',
      date: 'N/A',
      status: 'Active'
    });
  });
  customers.forEach(c => {
    if (c.membership === 'Elite Club') {
      combinedSubscribersList.push({
        email: c.email,
        type: 'Elite Club Membership',
        date: c.joinDate || 'N/A',
        status: 'Active'
      });
    }
  });

  const filteredSubs = combinedSubscribersList.filter(s => {
    const sTerm = searchQuery.toLowerCase();
    const matchSearch = s.email.toLowerCase().includes(sTerm);
    if (statusFilter === 'All') return matchSearch;
    if (statusFilter === 'Newsletter') return matchSearch && s.type.includes('Newsletter');
    if (statusFilter === 'Elite Member') return matchSearch && s.type.includes('Elite');
    return matchSearch;
  });

  const paginatedSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Max Pages calculation
  const getMaxPages = (totalItems: number) => Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div data-lenis-prevent style={{ background: 'var(--color-obsidian)', minHeight: '100vh', color: 'var(--color-white)', fontFamily: 'var(--font-body)', overflowY: 'auto' }}>
      {/* Local luxury CSS extensions */}
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-grid {
          display: grid;
          grid-template-columns: 240px 1fr;
          min-height: calc(100vh - 80px);
        }
        @media (max-width: 960px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
        }
        .admin-sidebar {
          background: rgba(10, 10, 10, 0.4);
          border-right: 1px solid var(--color-border);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .admin-table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .chart-bar {
          width: clamp(14px, 3vw, 30px) !important;
        }
        @media (max-width: 960px) {
          .admin-sidebar {
            flex-direction: row;
            border-right: none;
            border-bottom: 1px solid var(--color-border);
            overflow-x: auto;
            padding: 0.75rem 1rem;
            -webkit-overflow-scrolling: touch;
          }
        }
        .sidebar-link {
          font-family: var(--font-technical);
          font-size: 0.85rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #7a756b;
          padding: 1.1rem 1.4rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 2px solid transparent;
          text-align: left;
          background: transparent;
          border: none;
          width: 100%;
          display: flex;
          align-items: center;
          border-radius: 2px;
          min-height: 44px;
        }
        .sidebar-link:hover {
          color: #d4af37;
          background: rgba(212, 175, 55, 0.03);
        }
        .sidebar-link.active {
          color: #f5b83d;
          border-left-color: #f5b83d;
          background: rgba(28, 24, 18, 0.95);
          box-shadow: inset 0 0 0 1px rgba(245, 184, 61, 0.15);
        }
        @media (max-width: 960px) {
          .sidebar-link {
            border-left: none;
            border-bottom: 2px solid transparent;
            padding: 0.85rem 1.2rem;
            white-space: nowrap;
            width: auto;
          }
          .sidebar-link.active {
            border-bottom-color: #f5b83d;
          }
        }
        .admin-content {
          padding: clamp(1rem, 4vw, 3rem);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        @media (max-width: 1200px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        .stat-card {
          background: rgba(26, 26, 26, 0.4);
          border: 1px solid var(--color-border);
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stat-card:hover {
          transform: translateY(-4px);
          border-color: var(--color-gold);
          background: rgba(36, 36, 36, 0.5);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
        }
        .stat-card::after {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent);
          transform: translateX(-100%);
          transition: transform 0.6s ease;
        }
        .stat-card:hover::after {
          transform: translateX(100%);
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .admin-table th {
          font-family: var(--font-technical);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--color-slate);
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(229, 228, 226, 0.15);
          user-select: none;
        }
        .admin-table td {
          padding: 1.25rem;
          border-bottom: 1px solid rgba(229, 228, 226, 0.05);
          font-size: 0.9rem;
          color: var(--color-silver);
          vertical-align: middle;
        }
        .admin-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .status-select {
          background: rgba(10, 10, 10, 0.8);
          border: 1px solid var(--color-border);
          color: var(--color-white);
          font-family: var(--font-technical);
          font-size: 0.75rem;
          padding: 0.5rem;
          outline: none;
          cursor: pointer;
          transition: border-color 0.3s;
        }
        .status-select:focus {
          border-color: var(--color-gold);
        }
        .action-btn {
          background: transparent;
          border: 1px solid var(--color-gold);
          color: var(--color-gold);
          font-family: var(--font-technical);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .action-btn:hover {
          background: var(--color-gold);
          color: var(--color-obsidian);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          background: rgba(26, 26, 26, 0.2);
          border: 1px solid var(--color-border);
          padding: 1rem 1.5rem;
        }
        .search-wrapper {
          position: relative;
          flex: 1;
          min-width: 250px;
        }
        .search-input {
          width: 100%;
          background: rgba(10, 10, 10, 0.6);
          border: 1px solid var(--color-border);
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          color: var(--color-white);
          font-size: 0.9rem;
          outline: none;
          transition: all 0.3s;
        }
        .search-input:focus {
          border-color: var(--color-gold);
          background: rgba(15, 15, 15, 0.8);
        }
        .form-input {
          width: 100%;
          background: rgba(10, 10, 10, 0.8);
          border: 1px solid var(--color-border);
          padding: 0.875rem 1.25rem;
          color: var(--color-white);
          outline: none;
          font-family: var(--font-body);
          font-size: 0.95rem;
          transition: border-color 0.3s;
        }
        .form-input:focus {
          border-color: var(--color-gold);
        }
        .activity-item {
          padding: 1rem 0;
          border-bottom: 1px solid rgba(229, 228, 226, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.9rem;
        }
        .activity-item:last-child {
          border-bottom: none;
        }
        .chart-container {
          background: rgba(26, 26, 26, 0.3);
          border: 1px solid var(--color-border);
          padding: 2rem;
          margin-bottom: 2rem;
        }
        .empty-state {
          text-align: center;
          padding: 5rem 2rem;
          border: 1px dashed var(--color-border);
          color: var(--color-slate);
          font-family: var(--font-technical);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
      `}} />

      {/* Top Navigation */}
      <header style={{ borderBottom: '1px solid rgba(229, 228, 226, 0.1)', padding: '1.5rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px', background: 'rgba(10, 10, 10, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.15em' }}>HOROLOGUE</span>
          <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.65rem', border: '1px solid var(--color-gold)', color: 'var(--color-gold)', padding: '0.15rem 0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CONTROL ESCROW</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {refreshing && (
            <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-gold)', letterSpacing: '0.1em', animation: 'pulse 1s infinite alternate' }}>
              SYNCING WITH SUPABASE...
            </span>
          )}
          <button
            onClick={onNavigateHome}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--color-silver)',
              fontFamily: 'var(--font-technical)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'color 0.3s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-gold)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-silver)'}
          >
            Catalog view
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="admin-grid">
        
        {/* Sidebar Nav */}
        <aside className="admin-sidebar">
          <button className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setSearchQuery(''); }}>
            Summary
          </button>
          <button className={`sidebar-link ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => { setActiveTab('orders'); setSearchQuery(''); setStatusFilter('All'); setSortField('date'); setSortOrder('desc'); }}>
            Acquisitions
          </button>
          <button className={`sidebar-link ${activeTab === 'products' ? 'active' : ''}`} onClick={() => { setActiveTab('products'); setSearchQuery(''); setStatusFilter('All'); setSortField('name'); setSortOrder('asc'); }}>
            Inventory
          </button>
          <button className={`sidebar-link ${activeTab === 'customers' ? 'active' : ''}`} onClick={() => { setActiveTab('customers'); setSearchQuery(''); setStatusFilter('All'); setSortField('name'); setSortOrder('asc'); }}>
            Clients
          </button>
          <button className={`sidebar-link ${activeTab === 'subscribers' ? 'active' : ''}`} onClick={() => { setActiveTab('subscribers'); setSearchQuery(''); setStatusFilter('All'); }}>
            Subscribers
          </button>

          <div style={{ flex: 1 }} />
          <button 
            className="sidebar-link" 
            onClick={handleLogout}
            style={{ color: '#ffb4ab', borderLeftColor: 'transparent', borderTop: '1px solid rgba(255, 180, 171, 0.1)', marginTop: '2rem' }}
          >
            Deactivate Session
          </button>
        </aside>

        {/* Content Panel */}
        <main className="admin-content">
          <AnimatePresence mode="wait">
            
            {/* Overview / Summary Tab */}
            {activeTab === 'overview' && stats && (
              <motion.div
                key="overview-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', margin: 0 }}>
                    Command Ledger
                  </h2>
                  <button className="action-btn" onClick={() => refreshData(true)} disabled={refreshing}>
                    Force Synchronize
                  </button>
                </div>

                {/* 1. Summary Cards Grid */}
                <div className="stats-grid">
                  
                  {/* Gross Revenue */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Revenue (INR)</span>
                      <DollarSign size={16} className="text-gold" style={{ color: 'var(--color-gold)' }} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-gold)', margin: '0.5rem 0 0.25rem' }}>
                      ₹{(stats.revenue.lifetime * INR_RATE).toLocaleString('en-IN')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#81c784' }}>
                      <ArrowUpRight size={14} />
                      <span>₹{(stats.revenue.month * INR_RATE).toLocaleString('en-IN')} this month</span>
                    </div>
                  </div>

                  {/* Acquisitions / Orders */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Total Orders</span>
                      <ShoppingBag size={16} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: '0.5rem 0 0.25rem' }}>
                      {stats.orders.total}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                      {stats.orders.pending} pending / {stats.orders.delivered} delivered
                    </span>
                  </div>

                  {/* Clients */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Timepiece Collectors</span>
                      <Users size={16} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: '0.5rem 0 0.25rem' }}>
                      {stats.customers.total}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--color-gold)' }}>
                      <Plus size={12} />
                      <span>{stats.customers.newThisMonth} collectors added this month</span>
                    </div>
                  </div>

                  {/* Wishlist saves */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Wishlist Saves</span>
                      <Heart size={16} style={{ color: '#ffb4ab' }} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: '0.5rem 0 0.25rem' }}>
                      {stats.wishlists.total}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Top Watch: {stats.wishlists.mostWishlistedWatch}
                    </span>
                  </div>

                  {/* Catalog / Inventory */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Inventory Catalog</span>
                      <Watch size={16} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: '0.5rem 0 0.25rem' }}>
                      {stats.products.total}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: stats.products.outOfStock > 0 ? '#ffb4ab' : 'var(--color-slate)' }}>
                      {stats.products.inStock} active / {stats.products.outOfStock} decommissioned
                    </span>
                  </div>

                  {/* Reviews */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Customer Reviews</span>
                      <Star size={16} style={{ color: 'var(--color-gold)' }} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-gold)', margin: '0.5rem 0 0.25rem' }}>
                      {stats.reviews.averageRating} ★
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      From {stats.reviews.total} user evaluations
                    </span>
                  </div>

                  {/* Subscribers */}
                  <div className="stat-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Active Audiences</span>
                      <Mail size={16} />
                    </div>
                    <span style={{ fontSize: '2.1rem', fontFamily: 'var(--font-display)', color: 'var(--color-white)', margin: '0.5rem 0 0.25rem' }}>
                      {stats.subscribers.newsletter + stats.subscribers.elite}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>
                      {stats.subscribers.newsletter} newsletter / {stats.subscribers.elite} elite club
                    </span>
                  </div>

                  {/* Period revenues */}
                  <div className="stat-card" style={{ background: 'rgba(212, 175, 55, 0.04)', borderColor: 'rgba(212, 175, 55, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-gold)' }}>
                      <span className="technical-text" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>Escrow Ledger</span>
                      <SlidersHorizontal size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-slate)' }}>Today:</span>
                        <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)' }}>₹{(stats.revenue.today * INR_RATE).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-slate)' }}>This Week:</span>
                        <span style={{ fontFamily: 'var(--font-technical)' }}>₹{(stats.revenue.week * INR_RATE).toLocaleString('en-IN')}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-slate)' }}>This Month:</span>
                        <span style={{ fontFamily: 'var(--font-technical)' }}>₹{(stats.revenue.month * INR_RATE).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 2. Charts Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
                  
                  {/* Monthly Sales Line/Bar Chart */}
                  <div className="chart-container">
                    <h4 style={{ margin: '0 0 1.5rem', fontFamily: 'var(--font-technical)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-slate)' }}>
                      Monthly Gross Revenue Growth (₹)
                    </h4>
                    {stats.charts.monthlySales.length === 0 ? (
                      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--color-slate)' }}>INSUFFICIENT CHART DATA</div>
                    ) : (
                      <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 1rem' }}>
                        {stats.charts.monthlySales.map((m: any, idx: number) => {
                          const maxRev = Math.max(...stats.charts.monthlySales.map((item: any) => item.revenue), 100);
                          const pct = (m.revenue / maxRev) * 100;
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                              <div style={{ width: '30px', height: `${Math.max(5, pct * 1.3)}px`, background: 'linear-gradient(to top, rgba(212,175,55,0.2), var(--color-gold))', border: '1px solid var(--color-gold)', position: 'relative' }} className="chart-bar">
                                <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--font-technical)', fontSize: '0.65rem', color: 'var(--color-gold)', whiteSpace: 'nowrap' }}>
                                  ₹{((m.revenue * INR_RATE)/1000).toFixed(0)}k
                                </div>
                              </div>
                              <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-slate)', marginTop: '0.75rem' }}>{m.month}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Top Selling Watches Chart */}
                  <div className="chart-container">
                    <h4 style={{ margin: '0 0 1.5rem', fontFamily: 'var(--font-technical)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-slate)' }}>
                      Volume Acquisitions by Product
                    </h4>
                    {stats.charts.topSellingWatches.length === 0 ? (
                      <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--color-slate)' }}>NO VOLUME METRICS DETECTED</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {stats.charts.topSellingWatches.map((w: any, idx: number) => {
                          const maxQty = Math.max(...stats.charts.topSellingWatches.map((item: any) => item.quantity), 1);
                          const pct = (w.quantity / maxQty) * 100;
                          return (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                <span style={{ color: 'var(--color-white)', fontWeight: 500 }}>{w.name}</span>
                                <span style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)' }}>{w.quantity} units</span>
                              </div>
                              <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'var(--color-gold)' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* 3. Recent Activity Feed */}
                <div style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', padding: '2.5rem' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', textTransform: 'uppercase', margin: '0 0 1.5rem', letterSpacing: '0.05em', color: 'var(--color-white)' }}>
                    Command Audit Activity Logs
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {stats.recentActivity.map((act: any, idx: number) => (
                      <div className="activity-item" key={idx}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: act.type === 'order' ? 'var(--color-gold)' : act.type === 'review' ? '#ffd54f' : act.type === 'registration' ? '#81c784' : '#64b5f6' 
                          }} />
                          <div>
                            <span style={{ color: 'var(--color-white)', fontWeight: 500 }}>{act.title}</span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', marginTop: '2px' }}>
                              {new Date(act.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)' }}>
                          {act.type === 'order' ? `₹ ${(parseFloat(act.details.replace(/[^0-9.]/g, '')) * INR_RATE).toLocaleString('en-IN')}` : act.details}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Orders / Acquisitions Tab */}
            {activeTab === 'orders' && (
              <motion.div
                key="orders-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', marginBottom: '2.5rem', marginTop: 0 }}>
                  Client Acquisitions Ledger
                </h2>

                {/* Filter and search bar */}
                <div className="filter-bar">
                  <div className="search-wrapper">
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search Client Name, Email, or Order ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Status:</span>
                    <select
                      className="status-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {paginatedOrders.length === 0 ? (
                  <div className="empty-state">No acquisitions logged matching terms.</div>
                ) : (
                  <>
                    <div className="admin-table-container" style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('id')}>Acquisition ID</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('client')}>Client Details</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>Date Ordered</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('total')}>Total Amount (₹)</th>
                            <th>Payment Mode</th>
                            <th>Status Control</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedOrders.map((o) => (
                            <tr key={o.id}>
                              <td style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)', fontSize: '0.8rem' }}>{o.id.slice(0, 8)}...</td>
                              <td>
                                <div style={{ fontWeight: 500, color: 'var(--color-white)' }}>{o.userName}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)' }}>{o.userEmail}</div>
                              </td>
                              <td>{o.date.split(' at ')[0]}</td>
                              <td style={{ fontFamily: 'var(--font-technical)' }}>₹{(o.total * INR_RATE).toLocaleString('en-IN')}</td>
                              <td style={{ fontSize: '0.8rem' }}>{o.paymentMethod === 'card' ? 'Card' : o.paymentMethod === 'online' ? 'Online' : 'COD'}</td>
                              <td>
                                <select
                                  className="status-select"
                                  value={o.status}
                                  onChange={(e) => handleStatusChange(o.id, e.target.value as any)}
                                  style={{
                                    borderColor: o.status === 'Delivered' ? '#81c784' : o.status === 'Shipped' ? '#64b5f6' : o.status === 'Cancelled' ? '#ffb4ab' : 'var(--color-border)',
                                    color: o.status === 'Delivered' ? '#81c784' : o.status === 'Shipped' ? '#64b5f6' : o.status === 'Cancelled' ? '#ffb4ab' : 'var(--color-white)',
                                  }}
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="Shipped">Shipped</option>
                                  <option value="Delivered">Delivered</option>
                                  <option value="Cancelled">Cancelled</option>
                                </select>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="action-btn" onClick={() => setSelectedOrder(o)}>
                                  <Eye size={12} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} records
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                          <ChevronLeft size={16} />
                        </button>
                        <button className="action-btn" disabled={currentPage >= getMaxPages(filteredOrders.length)} onClick={() => setCurrentPage(prev => prev + 1)}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Products / Inventory Tab */}
            {activeTab === 'products' && (
              <motion.div
                key="products-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', margin: 0 }}>
                    Chronograph Catalog Inventory
                  </h2>
                  <button className="action-btn" onClick={() => { setFormError(null); setAddingProduct(true); }}>
                    <Plus size={14} /> Add Timepiece
                  </button>
                </div>

                {/* Filter and search bar */}
                <div className="filter-bar">
                  <div className="search-wrapper">
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search Watch Name or Reference Code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Stock Filter:</span>
                    <select
                      className="status-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Watches</option>
                      <option value="In Stock">In Stock Only</option>
                      <option value="Low Stock">Low Stock (≤3)</option>
                      <option value="Out of Stock">Decommissioned (0)</option>
                    </select>
                  </div>
                </div>

                {paginatedProducts.length === 0 ? (
                  <div className="empty-state">No timepieces matched search parameters.</div>
                ) : (
                  <>
                    <div className="admin-table-container" style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Visual representation</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Watch Name</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('ref')}>Reference Code</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>List Price (₹)</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('stock')}>Current Stock</th>
                            <th>Status Tag</th>
                            <th style={{ textAlign: 'right' }}>Management</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedProducts.map((p) => {
                            const rawPrice = parseInt(p.price.replace(/[^0-9]/g, ''), 10);
                            const displayInr = rawPrice * INR_RATE;
                            return (
                              <tr key={p.id || p.name}>
                                <td>
                                  <img src={p.image} alt={p.name} style={{ width: '45px', height: '45px', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
                                </td>
                                <td style={{ fontWeight: 500, color: 'var(--color-white)' }}>
                                  {p.name}
                                  {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-slate)', fontWeight: 400, marginTop: '2px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                                </td>
                                <td style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem' }}>{p.ref}</td>
                                <td style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)' }}>₹{displayInr.toLocaleString('en-IN')}</td>
                                <td>
                                  <span style={{ color: p.stock === 0 ? '#ffb4ab' : p.stock <= 3 ? '#ffd54f' : 'var(--color-white)' }}>
                                    {p.stock} units
                                  </span>
                                </td>
                                <td>
                                  {p.stock === 0 ? (
                                    <span style={{ color: '#ffb4ab', background: 'rgba(255, 180, 171, 0.05)', border: '1px solid rgba(255, 180, 171, 0.2)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Out of Stock</span>
                                  ) : p.stock <= 3 ? (
                                    <span style={{ color: '#ffd54f', background: 'rgba(255, 213, 79, 0.05)', border: '1px solid rgba(255, 213, 79, 0.2)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock</span>
                                  ) : (
                                    <span style={{ color: '#81c784', background: 'rgba(129, 199, 132, 0.05)', border: '1px solid rgba(129, 199, 132, 0.2)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button className="action-btn" onClick={() => handleProductEditClick(p)}>
                                      <Edit size={12} />
                                    </button>
                                    <button className="action-btn" style={{ borderColor: '#ffb4ab', color: '#ffb4ab' }} onClick={() => handleDeleteProduct(p.id!, p.name)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} models
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                          <ChevronLeft size={16} />
                        </button>
                        <button className="action-btn" disabled={currentPage >= getMaxPages(filteredProducts.length)} onClick={() => setCurrentPage(prev => prev + 1)}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Customers / Clients Tab */}
            {activeTab === 'customers' && (
              <motion.div
                key="customers-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', marginBottom: '2.5rem', marginTop: 0 }}>
                  Client Directory Database
                </h2>

                {/* Filter and search bar */}
                <div className="filter-bar">
                  <div className="search-wrapper">
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search Collector Name, Email, or Domicile..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Membership:</span>
                    <select
                      className="status-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Clients</option>
                      <option value="Elite Club">Elite Club Only</option>
                      <option value="Free Tier">Free Tier Only</option>
                    </select>
                  </div>
                </div>

                {paginatedCustomers.length === 0 ? (
                  <div className="empty-state">No registered collectors matching terms.</div>
                ) : (
                  <>
                    <div className="admin-table-container" style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>Client Name</th>
                            <th>Email Profile</th>
                            <th>Country</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>Enrollment Date</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('orders')}>Acquisitions Count</th>
                            <th style={{ cursor: 'pointer' }} onClick={() => handleSort('spent')}>Total Spent (₹)</th>
                            <th>Club Tier</th>
                            <th style={{ textAlign: 'right' }}>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCustomers.map((c) => {
                            const userOrders = orders.filter(o => o.userId === c.id);
                            const successfulOrdersCount = userOrders.filter(o => o.status !== 'Cancelled').length;
                            const spent = userOrders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0) * INR_RATE;
                            return (
                              <tr key={c.id}>
                                <td style={{ fontWeight: 500, color: 'var(--color-white)' }}>{c.name}</td>
                                <td>{c.email}</td>
                                <td>{c.country || 'N/A'}</td>
                                <td>{c.joinDate || 'N/A'}</td>
                                <td style={{ fontFamily: 'var(--font-technical)' }}>{successfulOrdersCount}</td>
                                <td style={{ fontFamily: 'var(--font-technical)', color: 'var(--color-gold)' }}>₹{spent.toLocaleString('en-IN')}</td>
                                <td>
                                  {c.membership === 'Elite Club' ? (
                                    <span style={{ color: 'var(--color-gold)', border: '1px solid var(--color-gold)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Elite Club</span>
                                  ) : (
                                    <span style={{ color: 'var(--color-slate)', border: '1px solid var(--color-border)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Free Tier</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button className="action-btn" onClick={() => setSelectedCustomer({ ...c, spent, count: successfulOrdersCount })}>
                                    <Eye size={12} /> Profile
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} profiles
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                          <ChevronLeft size={16} />
                        </button>
                        <button className="action-btn" disabled={currentPage >= getMaxPages(filteredCustomers.length)} onClick={() => setCurrentPage(prev => prev + 1)}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Subscribers Tab */}
            {activeTab === 'subscribers' && (
              <motion.div
                key="subscribers-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', textTransform: 'uppercase', margin: 0 }}>
                    Audience & Subscriber Escrow
                  </h2>
                  <button className="action-btn" onClick={handleExportSubscribers}>
                    <Download size={14} /> Export CSV
                  </button>
                </div>

                {/* Filter and search bar */}
                <div className="filter-bar">
                  <div className="search-wrapper">
                    <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate)' }} />
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search Audience Email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Sub Type:</span>
                    <select
                      className="status-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Audiences</option>
                      <option value="Newsletter">Newsletter Alerts</option>
                      <option value="Elite Member">Elite Club Membership</option>
                    </select>
                  </div>
                </div>

                {paginatedSubs.length === 0 ? (
                  <div className="empty-state">No audience records found matching terms.</div>
                ) : (
                  <>
                    <div className="admin-table-container" style={{ background: 'var(--color-charcoal)', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Audience Email</th>
                            <th>Subscription Type</th>
                            <th>Status</th>
                            <th>Subscribed Date</th>
                            <th style={{ textAlign: 'right' }}>Escrow Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedSubs.map((s, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--color-white)', fontFamily: 'var(--font-technical)' }}>{s.email}</td>
                              <td>{s.type}</td>
                              <td>
                                <span style={{ color: '#81c784', background: 'rgba(129, 199, 132, 0.05)', border: '1px solid rgba(129, 199, 132, 0.2)', padding: '0.15rem 0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.status}</span>
                              </td>
                              <td>{s.date}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="action-btn" style={{ borderColor: '#ffb4ab', color: '#ffb4ab' }} onClick={() => alert('Audience removals must be synchronized directly in database manager.')}>
                                  Suspend
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate)' }}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredSubs.length)} of {filteredSubs.length} records
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="action-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                          <ChevronLeft size={16} />
                        </button>
                        <button className="action-btn" disabled={currentPage >= getMaxPages(filteredSubs.length)} onClick={() => setCurrentPage(prev => prev + 1)}>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* MODAL Details Overlays */}
      <AnimatePresence>
        
        {/* Order details overlay */}
        {selectedOrder && (
          <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '650px',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                padding: '3rem 2.5rem',
                position: 'relative',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>
                Acquisition Details
              </h2>

              <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-obsidian)', padding: '1.75rem', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Order ID</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)' }}>{selectedOrder.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisition Date</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedOrder.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Customer Name</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedOrder.userName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Phone Number</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{`${selectedOrder.phoneCountryCode || ''} ${selectedOrder.phone}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Delivery Address</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)', textAlign: 'right', maxWidth: '300px' }}>
                    {selectedOrder.address}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisition Total</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.85rem', color: 'var(--color-gold)' }}>₹{(selectedOrder.total * INR_RATE).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Payment Mode</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>
                    {selectedOrder.paymentMethod === 'card' ? 'Credit Card' : selectedOrder.paymentMethod === 'online' ? 'UPI/Online' : 'Cash on Delivery'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Status</span>
                  <span style={{
                    color: selectedOrder.status === 'Delivered' ? '#81c784' : selectedOrder.status === 'Shipped' ? '#64b5f6' : selectedOrder.status === 'Cancelled' ? '#ffb4ab' : '#ffd54f',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '1.5rem', width: '100%' }}>
                <button
                  onClick={() => downloadReceipt(selectedOrder)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: 'var(--color-white)',
                    border: '1px solid var(--color-silver)',
                    padding: '1rem',
                    fontFamily: 'var(--font-technical)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Download Invoice
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{
                    flex: 1,
                    background: 'var(--color-gold)',
                    color: 'var(--color-obsidian)',
                    border: 'none',
                    padding: '1rem',
                    fontFamily: 'var(--font-technical)',
                    fontSize: '0.8rem',
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

        {/* Customer details profile overlay */}
        {selectedCustomer && (
          <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '650px',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                padding: '3rem 2.5rem',
                position: 'relative',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>
                Collector Profile Dossier
              </h2>

              <div style={{ border: '1px solid var(--color-border)', background: 'var(--color-obsidian)', padding: '1.75rem', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Collector ID</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.8rem', color: 'var(--color-gold)' }}>{selectedCustomer.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Email Profile</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedCustomer.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Country Domicile</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedCustomer.country || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Club Tier Status</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>{selectedCustomer.membership || 'Free Tier'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Acquisitions Count</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-white)' }}>{selectedCustomer.count} successful orders</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(229, 228, 226, 0.05)', paddingBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-slate)', textTransform: 'uppercase' }}>Capital Value Dispatched</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.85rem', color: 'var(--color-gold)' }}>₹{selectedCustomer.spent.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', width: '100%' }}>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{
                    flex: 1,
                    background: 'var(--color-gold)',
                    color: 'var(--color-obsidian)',
                    border: 'none',
                    padding: '1rem',
                    fontFamily: 'var(--font-technical)',
                    fontSize: '0.8rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f2ca50'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-gold)'; }}
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Add Product Modal Overlay */}
        {addingProduct && (
          <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '600px',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                padding: '3rem 2.5rem',
                position: 'relative',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>
                Commission New Timepiece
              </h2>
              
              <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.5rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Timepiece Name</label>
                    <input type="text" className="form-input" required value={newProduct.name} onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. THE CHRONOS" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Reference Code</label>
                    <input type="text" className="form-input" required value={newProduct.ref} onChange={(e) => setNewProduct(prev => ({ ...prev, ref: e.target.value }))} placeholder="e.g. CR-01" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Base Price (USD)</label>
                    <input type="number" min="1" className="form-input" required value={newProduct.price || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, price: Number(e.target.value) }))} placeholder="Price in USD" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Initial Stock</label>
                    <input type="number" min="0" className="form-input" required value={newProduct.stock || ''} onChange={(e) => setNewProduct(prev => ({ ...prev, stock: Number(e.target.value) }))} placeholder="Stock units" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Image URL</label>
                  <input type="url" className="form-input" required value={newProduct.image_url} onChange={(e) => setNewProduct(prev => ({ ...prev, image_url: e.target.value }))} placeholder="https://images.unsplash.com/..." />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.7rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Timepiece Description</label>
                  <textarea rows={3} className="form-input" required style={{ resize: 'vertical' }} value={newProduct.description} onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))} placeholder="Enter luxury specifications..." />
                </div>

                {formError && (
                  <div style={{ color: '#ffb4ab', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
                  <button type="button" className="action-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAddingProduct(false)} disabled={formSubmitting}>Cancel</button>
                  <button type="submit" className="action-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-gold)', color: 'var(--color-obsidian)' }} disabled={formSubmitting}>
                    {formSubmitting ? 'Commissioning...' : 'Commission Watch'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Product Modal Overlay */}
        {editingProduct && (
          <div data-lenis-prevent style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '2rem' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                width: '100%',
                maxWidth: '550px',
                background: 'var(--color-charcoal)',
                border: '1px solid var(--color-border)',
                padding: '3rem 2.5rem',
                position: 'relative',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', textTransform: 'uppercase', color: 'var(--color-white)', letterSpacing: '0.05em', marginBottom: '2rem', textAlign: 'center' }}>
                Decommit/Modify Timepiece
              </h2>
              
              <form onSubmit={handleEditProduct} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <div>
                  <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Timepiece Model</span>
                  <span style={{ fontSize: '1.1rem', color: 'var(--color-white)', fontWeight: 500 }}>{editingProduct.name}</span>
                </div>
                
                <div>
                  <span className="technical-text" style={{ color: 'var(--color-slate)', display: 'block', fontSize: '0.7rem', marginBottom: '0.3rem' }}>Reference Code</span>
                  <span style={{ fontFamily: 'var(--font-technical)', fontSize: '0.9rem', color: 'var(--color-gold)' }}>{editingProduct.ref}</span>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Available Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    required
                    disabled={formSubmitting}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-technical)', fontSize: '0.75rem', color: 'var(--color-silver)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Luxury Specifications / Description
                  </label>
                  <textarea
                    className="form-input"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={5}
                    disabled={formSubmitting}
                  />
                </div>

                {formError && (
                  <div style={{ color: '#ffb4ab', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <button type="button" className="action-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingProduct(null)} disabled={formSubmitting}>Cancel</button>
                  <button type="submit" className="action-btn" style={{ flex: 1, justifyContent: 'center', background: 'var(--color-gold)', color: 'var(--color-obsidian)' }} disabled={formSubmitting}>
                    {formSubmitting ? 'Saving...' : 'Save Adjustments'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );

  function handleProductEditClick(p: api.Product) {
    setEditingProduct(p);
    setEditStock(p.stock);
    setEditDescription(p.description || '');
    setFormError(null);
  }
};

export default AdminDashboard;
