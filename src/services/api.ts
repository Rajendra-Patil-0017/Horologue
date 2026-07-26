import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  role: 'admin' | 'customer';
  joinDate: string;
  membership?: string;
}

export interface OrderItem {
  watch: {
    name: string;
    ref: string;
    price: string;
    image: string;
  };
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  createdAt: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  onlineSubOption: string | null;
  phone: string;
  phoneCountryCode: string;
  address: string;
  status: 'Pending' | 'Shipped' | 'Delivered' | 'Cancelled';
}

export interface Subscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: 'Active' | 'Inactive';
  renewalDate: string;
  fee: number;
  paymentMethod: string;
  onlineSubOption: string | null;
  phone: string;
  phoneCountryCode: string;
  country: string;
  date: string;
}

export interface Product {
  id?: string;
  name: string;
  ref: string;
  price: string;
  stock: number;
  image: string;
  description?: string;
}

// Helper to format timestamps into on-theme frontend date strings
const formatDateTime = (timestampStr: string | null | undefined): string => {
  if (!timestampStr) return '';
  const dateObj = new Date(timestampStr);
  return (
    dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }) +
    ' at ' +
    dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
};

// Database row mapping helpers
const capitalizeStatus = (status: string | null | undefined): Order['status'] => {
  if (!status) return 'Pending';
  const lowered = status.toLowerCase();
  if (lowered === 'shipped') return 'Shipped';
  if (lowered === 'delivered') return 'Delivered';
  if (lowered === 'cancelled') return 'Cancelled';
  return 'Pending';
};

const mapDbOrderToOrder = (dbOrder: any): Order => {
  return {
    id: dbOrder.id,
    userId: dbOrder.user_id || 'USR-GUEST',
    userName: dbOrder.customer_name || dbOrder.user_name || '',
    userEmail: dbOrder.email || dbOrder.user_email || '',
    date: formatDateTime(dbOrder.created_at),
    createdAt: dbOrder.created_at || new Date().toISOString(),
    items: dbOrder.items || [],
    total: Number(dbOrder.total || 0),
    paymentMethod: dbOrder.payment_method || 'cod',
    onlineSubOption: dbOrder.online_sub_option || null,
    phone: dbOrder.phone || '',
    phoneCountryCode: dbOrder.phone_country_code || '',
    address: typeof dbOrder.shipping_address === 'object' && dbOrder.shipping_address 
      ? (dbOrder.shipping_address.address || '') 
      : (dbOrder.shipping_address || dbOrder.address || ''),
    status: capitalizeStatus(dbOrder.status),
  };
};

const mapDbSubscriptionToSubscription = (dbSub: any): Subscription => {
  return {
    id: dbSub.id,
    userId: dbSub.user_id || '',
    userName: dbSub.user_name || '',
    userEmail: dbSub.user_email || '',
    plan: dbSub.plan_name || dbSub.plan || 'HOROLOGUE Club Membership',
    status: dbSub.status === 'active' ? 'Active' : 'Inactive',
    renewalDate: dbSub.renewal_date
      ? new Date(dbSub.renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '',
    fee: Number(dbSub.fee || 299),
    paymentMethod: dbSub.payment_method || '',
    onlineSubOption: dbSub.online_sub_option || null,
    phone: dbSub.phone || '',
    phoneCountryCode: dbSub.phone_country_code || '',
    country: dbSub.country || '',
    date: formatDateTime(dbSub.created_at),
  };
};

const mapDbProfileToUser = (profile: any, emailFallback: string): User => {
  return {
    id: profile.id,
    name: profile.full_name || '',
    email: profile.email || emailFallback,
    phone: profile.phone || '',
    country: profile.country || '',
    role: profile.role || 'customer',
    joinDate: profile.created_at
      ? new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  };
};

// Shared authenticated fetch helper
async function authedFetch(path: string, options: RequestInit = {}) {
  // If no user is logged in, token is undefined
  const token = await auth.currentUser?.getIdToken();
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Unable to reach the server. Please check your connection and try again.');
    }
    throw err;
  }

  if (!res.ok) {
    const errorText = await res.text();
    let parsedError = errorText;
    try {
      const parsedJson = JSON.parse(errorText);
      parsedError = parsedJson.error || errorText;
    } catch {
      // Not JSON
    }
    throw new Error(parsedError);
  }

  return res.json();
}

// Auth wrappers matching existing signatures
export const login = async (email: string, passkey: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), passkey);
  if (!userCredential.user) {
    throw new Error('Authentication returned an empty session user.');
  }

  // Sync profile details with backend
  const profile = await authedFetch('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  return mapDbProfileToUser(profile, userCredential.user.email || email);
};

export const signup = async (userData: {
  name: string;
  email: string;
  phone: string;
  country: string;
  passkey: string;
}): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, userData.email.trim(), userData.passkey);
  if (!userCredential.user) {
    throw new Error('User creation returned an empty auth profile.');
  }

  // Get token and sync profile immediately
  const profile = await authedFetch('/api/auth/sync', {
    method: 'POST',
    body: JSON.stringify({
      name: userData.name,
      phone: userData.phone,
      country: userData.country,
    }),
  });

  return mapDbProfileToUser(profile, userCredential.user.email || userData.email);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;

  try {
    const profile = await authedFetch('/api/auth/sync', { method: 'POST' });
    return mapDbProfileToUser(profile, firebaseUser.email || '');
  } catch (error) {
    console.error('Failed to sync current user profile details:', error);
    return null;
  }
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

export const getUserOrders = async (_userId: string): Promise<Order[]> => {
  const data = await authedFetch('/api/orders');
  return (data || []).map(mapDbOrderToOrder);
};

export const getUserSubscription = async (_userId: string): Promise<Subscription | null> => {
  const data = await authedFetch('/api/subscriptions/me');
  return data ? mapDbSubscriptionToSubscription(data) : null;
};

export const getAllOrders = async (): Promise<Order[]> => {
  const data = await authedFetch('/api/admin/orders');
  return (data || []).map(mapDbOrderToOrder);
};

export const getAllProducts = async (): Promise<Product[]> => {
  const data = await authedFetch('/api/products');
  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    ref: p.reference || p.ref || '',
    price: typeof p.price === 'number' ? `$${p.price.toLocaleString()}` : (p.price || ''),
    stock: Number(p.stock || 0),
    image: p.image_url || p.image || '',
    description: p.description || '',
  }));
};

export const getAllCustomers = async (): Promise<User[]> => {
  const data = await authedFetch('/api/admin/customers');
  return (data || []).map((profile: any) => ({
    ...mapDbProfileToUser(profile, profile.email || ''),
    membership: profile.membership || 'Free Tier'
  }));
};

export const getNewsletterSubscribers = async (): Promise<string[]> => {
  return authedFetch('/api/admin/newsletter');
};

export const getDashboardStats = async () => {
  return authedFetch('/api/admin/stats');
};

export const addOrder = async (_order: Omit<Order, 'id' | 'date' | 'status'>): Promise<Order> => {
  throw new Error('Direct insert disabled. Orders must be created via verified checkout workflows.');
};

export const addSubscription = async (
  _subscription: Omit<Subscription, 'id' | 'date' | 'status' | 'renewalDate' | 'plan' | 'fee'>
): Promise<Subscription> => {
  throw new Error('Direct insert disabled. Subscriptions must be created via verified payment workflows.');
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<Order> => {
  const data = await authedFetch(`/api/admin/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return mapDbOrderToOrder(data);
};

export const addNewsletterEmail = async (email: string): Promise<void> => {
  await authedFetch('/api/newsletter/subscribe', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

// React reactive auth state change listener callback
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const userDetails = await getCurrentUser();
        callback(userDetails);
      } catch (error) {
        console.error('Error fetching details on auth change:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

export interface WishlistItem {
  productId: string;
  name: string;
  ref: string;
  price: string;
  stock: number;
  image: string;
  description?: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment?: string;
  verified_purchase: boolean;
  created_at: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalCount: number;
}

export const getWishlist = async (): Promise<WishlistItem[]> => {
  return authedFetch('/api/wishlist');
};

export const addToWishlist = async (productId: string): Promise<{ success: boolean; message: string }> => {
  return authedFetch('/api/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId })
  });
};

export const removeFromWishlist = async (productId: string): Promise<{ success: boolean; message: string }> => {
  return authedFetch(`/api/wishlist/${productId}`, {
    method: 'DELETE'
  });
};

export const registerRestockAlert = async (productId: string, email: string): Promise<{ success: boolean; message: string }> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}/api/products/${productId}/notify-me`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email })
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedError = errorText;
    try {
      const parsedJson = JSON.parse(errorText);
      parsedError = parsedJson.error || errorText;
    } catch {}
    throw new Error(parsedError);
  }

  return res.json();
};

export const getProductReviews = async (productId: string): Promise<ReviewsResponse> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}/api/products/${productId}/reviews`);

  if (!res.ok) {
    const errorText = await res.text();
    let parsedError = errorText;
    try {
      const parsedJson = JSON.parse(errorText);
      parsedError = parsedJson.error || errorText;
    } catch {}
    throw new Error(parsedError);
  }

  return res.json();
};

export const submitReview = async (
  productId: string, 
  rating: number, 
  comment?: string
): Promise<{ success: boolean; data: any }> => {
  return authedFetch(`/api/products/${productId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment })
  });
};

export const adminUpdateProduct = async (
  productId: string, 
  updates: { stock: number; description?: string }
): Promise<any> => {
  return authedFetch(`/api/admin/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
};

export const adminAddProduct = async (product: {
  name: string;
  reference: string;
  price: number;
  stock: number;
  image_url: string;
  description: string;
}): Promise<any> => {
  return authedFetch('/api/admin/products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
};

export const adminDeleteProduct = async (productId: string): Promise<any> => {
  return authedFetch(`/api/admin/products/${productId}`, {
    method: 'DELETE'
  });
};
