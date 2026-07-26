import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { emailService } from '../services/emailService';
import { z } from 'zod';

const watchSchema = z.object({
  name: z.string().min(1, 'Watch name is required.'),
  ref: z.string().min(1, 'Watch reference code is required.'),
  price: z.string().min(1, 'Watch price is required.'),
  image: z.string().min(1, 'Watch image URL is required.'),
});

const orderItemSchema = z.object({
  watch: watchSchema,
  quantity: z.number().int().positive('Quantity must be positive.'),
});

const createCodSchema = z.object({
  items: z.array(orderItemSchema).nonempty('Acquisition items list cannot be empty.'),
  total: z.number().positive('Total value must be positive.'),
  phone: z.string().min(1, 'Phone number is required.'),
  phoneCountryCode: z.string().min(1, 'Phone country code is required.'),
  address: z.string().min(1, 'Shipping address is required.'),
  userName: z.string().optional(),
  userEmail: z.string().email('Please enter a valid email address.').optional(),
});

export const ordersController = {
  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    try {
      const orders = await supabaseService.getUserOrders(user.uid);
      return res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  },

  async createCOD(req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    try {
      const parsed = createCodSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed: ' + parsed.error.issues.map(i => i.message).join(', ') });
      }

      const { items, total, phone, phoneCountryCode, address, userName, userEmail } = parsed.data;

      let finalName = userName;
      let finalEmail = userEmail;

      if (user) {
        const profile = await supabaseService.getProfile(user.uid);
        finalName = profile?.full_name || user.email || '';
        finalEmail = user.email || '';
      } else {
        if (!finalName || !finalEmail) {
          return res.status(400).json({ error: 'Customer name and email are required for guest checkout.' });
        }
      }

      const orderRef = 'HORO-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const orderData = {
        order_ref: orderRef,
        user_id: user ? user.uid : null,
        customer_name: finalName,
        email: finalEmail,
        phone: phoneCountryCode ? `${phoneCountryCode} ${phone}` : phone,
        items,
        shipping_address: { address },
        subtotal: total,
        shipping_fee: 0,
        total,
        payment_method: 'cod',
        status: 'pending',
      };

      const order = await supabaseService.createOrder(orderData);

      // Trigger order confirmation email in the background
      emailService.sendOrderConfirmation(finalEmail || '', finalName || '', order)
        .catch(err => console.error('Error sending order confirmation email:', err));

      return res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
};
