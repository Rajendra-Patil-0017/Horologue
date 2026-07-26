import { supabase } from '../config/supabase';

export const supabaseService = {
  async upsertProfile(profile: {
    id: string;
    email: string;
    full_name?: string;
    phone?: string;
    country?: string;
    role?: string;
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        country: profile.country,
        role: profile.role || 'customer',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getProfile(id: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return this.autoProgressOrders(data);
  },

  async getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data) return [];
    return this.autoProgressOrders(data);
  },

  async getUserSubscription(userId: string) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getAllSubscriptions() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAllCustomers() {
    const [profilesRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('status', 'active')
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (subsRes.error) throw subsRes.error;

    const profiles = profilesRes.data || [];
    const activeSubs = subsRes.data || [];
    const activeSubUserIds = new Set(activeSubs.map((s: any) => s.user_id));

    return profiles.map((p: any) => ({
      ...p,
      membership: activeSubUserIds.has(p.id) ? 'Elite Club' : 'Free Tier'
    }));
  },

  async getNewsletterSubscribers() {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .order('subscribed_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row: any) => row.email);
  },

  async addNewsletterEmail(email: string) {
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email: email.trim() });

    if (error) {
      if (error.code === '23505') {
        const err: any = new Error("You're already subscribed");
        err.statusCode = 400;
        throw err;
      }
      throw error;
    }
  },

  async createOrder(order: any) {
    const { data, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deactivateUserSubscriptions(userId: string) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'inactive' })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
  },

  async createSubscription(subscription: any) {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(subscription)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createPayment(payment: {
    razorpay_order_id: string;
    amount: number;
    currency: string;
    status: string;
    user_id: string | null;
    type: string;
    metadata: any;
  }) {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updatePaymentStatus(razorpayOrderId: string, status: string, details?: {
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }) {
    const { data, error } = await supabase
      .from('payments')
      .update({
        status,
        ...details
      })
      .eq('razorpay_order_id', razorpayOrderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getPayment(razorpayOrderId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getDashboardStats() {
    const [
      ordersRes,
      profilesRes,
      subsRes,
      productsRes,
      wishlistsRes,
      reviewsRes,
      newsletterRes
    ] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('wishlists').select('*'),
      supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      supabase.from('newsletter_subscribers').select('*').order('subscribed_at', { ascending: false })
    ]);

    if (ordersRes.error) throw ordersRes.error;
    if (profilesRes.error) throw profilesRes.error;
    if (subsRes.error) throw subsRes.error;
    if (productsRes.error) throw productsRes.error;
    if (wishlistsRes.error) throw wishlistsRes.error;
    if (reviewsRes.error) throw reviewsRes.error;
    if (newsletterRes.error) throw newsletterRes.error;

    const allOrders = ordersRes.data || [];
    const allProfiles = profilesRes.data || [];
    const allSubs = subsRes.data || [];
    const allProducts = productsRes.data || [];
    const allWishlists = wishlistsRes.data || [];
    const allReviews = reviewsRes.data || [];
    const allNewsletter = newsletterRes.data || [];

    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();

    // 1. Revenue calculations (Only successful, i.e., status !== 'cancelled')
    const successfulOrders = allOrders.filter((o: any) => o.status !== 'cancelled');
    const activeSubscriptions = allSubs.filter((s: any) => s.status === 'active');

    let todayRev = 0;
    let weekRev = 0;
    let monthRev = 0;
    let yearRev = 0;
    let lifetimeRev = 0;

    successfulOrders.forEach((o: any) => {
      const t = new Date(o.created_at || o.date).getTime();
      const val = Number(o.total || 0);
      lifetimeRev += val;
      if (t >= startOfToday) todayRev += val;
      if (t >= startOfWeek) weekRev += val;
      if (t >= startOfMonth) monthRev += val;
      if (t >= startOfYear) yearRev += val;
    });

    activeSubscriptions.forEach((s: any) => {
      const t = new Date(s.created_at).getTime();
      const val = Number(s.fee || 299);
      lifetimeRev += val;
      if (t >= startOfToday) todayRev += val;
      if (t >= startOfWeek) weekRev += val;
      if (t >= startOfMonth) monthRev += val;
      if (t >= startOfYear) yearRev += val;
    });

    // 2. Orders metrics
    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter((o: any) => o.status === 'pending').length;
    const shippedOrders = allOrders.filter((o: any) => o.status === 'shipped').length;
    const deliveredOrders = allOrders.filter((o: any) => o.status === 'delivered').length;
    const cancelledOrders = allOrders.filter((o: any) => o.status === 'cancelled').length;

    // 3. Customers metrics
    const customersOnly = allProfiles.filter((p: any) => p.role !== 'admin');
    const totalCustomers = customersOnly.length;
    const newCustomersThisMonth = customersOnly.filter((p: any) => new Date(p.created_at).getTime() >= startOfMonth).length;
    const activeCustomerIds = new Set(successfulOrders.map((o: any) => o.user_id));
    const activeCustomers = activeCustomerIds.size;

    // 4. Products metrics
    const totalProducts = allProducts.length;
    const inStock = allProducts.filter((p: any) => Number(p.stock || 0) > 0).length;
    const outOfStock = allProducts.filter((p: any) => Number(p.stock || 0) === 0).length;

    // 5. Wishlists metrics
    const totalWishlistSaves = allWishlists.length;
    const wishCountMap = new Map<string, number>();
    allWishlists.forEach((w: any) => {
      wishCountMap.set(w.product_id, (wishCountMap.get(w.product_id) || 0) + 1);
    });
    let maxWishes = 0;
    let mostWishlistedId = '';
    for (const [id, count] of wishCountMap.entries()) {
      if (count > maxWishes) {
        maxWishes = count;
        mostWishlistedId = id;
      }
    }
    const mostWishlistedProduct = allProducts.find((p: any) => p.id === mostWishlistedId);
    const mostWishlistedWatch = mostWishlistedProduct ? mostWishlistedProduct.name : 'None';

    // 6. Reviews metrics
    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0 ? Number((allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews).toFixed(1)) : 0;
    const reviewScoreMap = new Map<string, { sum: number; count: number }>();
    allReviews.forEach((r: any) => {
      const current = reviewScoreMap.get(r.product_id) || { sum: 0, count: 0 };
      reviewScoreMap.set(r.product_id, { sum: current.sum + r.rating, count: current.count + 1 });
    });
    let bestAvg = 0;
    let bestProductId = '';
    for (const [id, score] of reviewScoreMap.entries()) {
      const avg = score.sum / score.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestProductId = id;
      }
    }
    const highestRatedProduct = allProducts.find((p: any) => p.id === bestProductId);
    const highestRatedWatch = highestRatedProduct ? highestRatedProduct.name : 'None';

    // 7. Subscribers
    const newsletterSubscribers = allNewsletter.length;
    const eliteSubscribers = activeSubscriptions.length;

    // 8. Recent Activity Feed
    const activities: any[] = [];
    allOrders.slice(0, 10).forEach((o: any) => {
      activities.push({
        type: 'order',
        title: `New Order placed by ${o.customer_name || 'Guest'}`,
        timestamp: o.created_at,
        details: `$${Number(o.total || 0).toLocaleString()}`,
        status: o.status
      });
    });
    customersOnly.slice(0, 10).forEach((c: any) => {
      activities.push({
        type: 'registration',
        title: `New Customer Registration: ${c.full_name || 'Anonymous'}`,
        timestamp: c.created_at || new Date().toISOString(),
        details: c.country || 'N/A'
      });
    });
    allReviews.slice(0, 10).forEach((r: any) => {
      activities.push({
        type: 'review',
        title: `New ${r.rating}★ Review Submitted`,
        timestamp: r.created_at,
        details: r.comment ? `"${r.comment.slice(0, 50)}..."` : 'No comment'
      });
    });
    allNewsletter.slice(0, 10).forEach((n: any) => {
      activities.push({
        type: 'subscriber',
        title: `Newsletter Signup: ${n.email}`,
        timestamp: n.subscribed_at || n.created_at || new Date().toISOString(),
        details: 'Newsletter Sub'
      });
    });
    // Sort and slice top 12 activities
    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12);

    // 9. Charts generation data
    const dailySales: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayOrders = successfulOrders.filter((o: any) => {
        const t = new Date(o.created_at || o.date).getTime();
        return t >= dayStart && t < dayEnd;
      });
      const dRev = dayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      dailySales.push({ date: label, revenue: dRev, orders: dayOrders.length });
    }

    const monthlySales: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      const monthOrders = successfulOrders.filter((o: any) => {
        const ot = new Date(o.created_at || o.date);
        return ot.getMonth() === monthIndex && ot.getFullYear() === year;
      });
      const mRev = monthOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      monthlySales.push({ month: label, revenue: mRev, orders: monthOrders.length });
    }

    const productSalesMap = new Map<string, { qty: number; rev: number }>();
    successfulOrders.forEach((o: any) => {
      const items = o.items;
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const watchName = item.watch?.name || 'Unknown';
          const qty = Number(item.quantity || 1);
          const price = Number(item.watch?.price ? String(item.watch.price).replace(/[^0-9]/g, '') : 0);
          const current = productSalesMap.get(watchName) || { qty: 0, rev: 0 };
          productSalesMap.set(watchName, {
            qty: current.qty + qty,
            rev: current.rev + price * qty
          });
        });
      }
    });
    const topSellingWatches = Array.from(productSalesMap.entries()).map(([name, stats]) => ({
      name,
      quantity: stats.qty,
      revenue: stats.rev
    })).sort((a, b) => b.quantity - a.quantity).slice(0, 5);

    const pmCount = new Map<string, { count: number; rev: number }>();
    successfulOrders.forEach((o: any) => {
      const raw = String(o.paymentMethod || 'cod').toLowerCase();
      const display = raw === 'card' ? 'Credit Card' : raw === 'online' ? 'UPI/Online' : 'Cash on Delivery';
      const current = pmCount.get(display) || { count: 0, rev: 0 };
      pmCount.set(display, { count: current.count + 1, rev: current.rev + Number(o.total || 0) });
    });
    const paymentMethods = Array.from(pmCount.entries()).map(([method, stats]) => ({
      method,
      count: stats.count,
      revenue: stats.rev
    }));

    return {
      revenue: {
        today: todayRev,
        week: weekRev,
        month: monthRev,
        year: yearRev,
        lifetime: lifetimeRev
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders
      },
      customers: {
        total: totalCustomers,
        newThisMonth: newCustomersThisMonth,
        active: activeCustomers
      },
      products: {
        total: totalProducts,
        inStock,
        outOfStock
      },
      wishlists: {
        total: totalWishlistSaves,
        mostWishlistedWatch
      },
      reviews: {
        total: totalReviews,
        averageRating: avgRating,
        highestRatedWatch
      },
      subscribers: {
        newsletter: newsletterSubscribers,
        elite: eliteSubscribers
      },
      recentActivity,
      charts: {
        dailySales,
        monthlySales,
        topSellingWatches,
        paymentMethods
      }
    };
  },

  async logEmail(emailLog: {
    recipient: string;
    template: string;
    status: 'sent' | 'failed';
    provider_message_id?: string | null;
    error_message?: string | null;
  }) {
    const { data, error } = await supabase
      .from('email_logs')
      .insert(emailLog)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async autoProgressOrders(orders: any[]): Promise<any[]> {
    const updatedOrders = [];
    for (const order of orders) {
      if (order.status === 'cancelled' || order.status === 'delivered') {
        updatedOrders.push(order);
        continue;
      }

      const createdAt = new Date(order.created_at);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdAt.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let newStatus = order.status;
      if (diffDays >= 4) {
        newStatus = 'delivered';
      } else if (diffDays >= 2 && order.status === 'pending') {
        newStatus = 'shipped';
      }

      if (newStatus !== order.status) {
        const { data, error } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', order.id)
          .select()
          .single();
        if (!error && data) {
          updatedOrders.push(data);
        } else {
          updatedOrders.push({ ...order, status: newStatus });
        }
      } else {
        updatedOrders.push(order);
      }
    }
    return updatedOrders;
  },

  async getWishlist(userId: string) {
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id, products(*)')
      .eq('user_id', userId);
    if (error) throw error;
    return data || [];
  },

  async addToWishlist(userId: string, productId: string) {
    const { data, error } = await supabase
      .from('wishlists')
      .insert({ user_id: userId, product_id: productId })
      .select()
      .maybeSingle();
    if (error && error.code !== '23505') throw error;
    return data;
  },

  async removeFromWishlist(userId: string, productId: string) {
    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);
    if (error) throw error;
  },

  async addStockNotification(productId: string, email: string) {
    const { data, error } = await supabase
      .from('stock_notifications')
      .insert({ product_id: productId, email: email.trim().toLowerCase() })
      .select()
      .maybeSingle();
    if (error && error.code !== '23505') throw error;
    return data;
  },

  async getUnnotifiedStockSignups(productId: string) {
    const { data, error } = await supabase
      .from('stock_notifications')
      .select('email')
      .eq('product_id', productId)
      .eq('notified', false);
    if (error) throw error;
    return (data || []).map((row: any) => row.email);
  },

  async markStockNotificationsSent(productId: string) {
    const { error } = await supabase
      .from('stock_notifications')
      .update({ notified: true })
      .eq('product_id', productId)
      .eq('notified', false);
    if (error) throw error;
  },

  async getProductReviews(productId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profile:profiles(full_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async checkUserHasReviewed(userId: string, productId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },

  async addReview(review: { product_id: string; user_id: string; rating: number; comment?: string; verified_purchase: boolean }) {
    const { data, error } = await supabase
      .from('reviews')
      .insert(review)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async checkUserPurchasedProduct(userId: string, productName: string) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('items')
      .eq('user_id', userId)
      .eq('status', 'delivered');
    if (error) throw error;
    if (!orders) return false;

    for (const order of orders) {
      const items = order.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.watch?.name?.toLowerCase() === productName.toLowerCase()) {
            return true;
          }
        }
      }
    }
    return false;
  },

  async getProductById(productId: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    if (error) throw error;
    return data;
  },

  async updateProduct(productId: string, updates: { stock: number; description?: string }) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addProduct(product: {
    name: string;
    reference: string;
    price: number;
    stock: number;
    image_url: string;
    description: string;
  }) {
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        reference: product.reference,
        price: product.price,
        stock: product.stock,
        image_url: product.image_url,
        description: product.description
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteProduct(productId: string) {
    await Promise.all([
      supabase.from('reviews').delete().eq('product_id', productId),
      supabase.from('wishlists').delete().eq('product_id', productId),
      supabase.from('stock_notifications').delete().eq('product_id', productId)
    ]);

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
  }
};
