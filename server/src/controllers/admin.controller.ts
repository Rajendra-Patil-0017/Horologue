import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { emailService } from '../services/emailService';
import { z } from 'zod';

export const updateStatusSchema = z.object({
  status: z.enum(['Pending', 'Shipped', 'Delivered', 'Cancelled'], {
    errorMap: () => ({ message: 'Status must be one of: Pending, Shipped, Delivered, Cancelled' })
  })
});

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format.')
});

export const updateProductSchema = z.object({
  stock: z.number().int().nonnegative('Stock must be a non-negative integer.'),
  description: z.string().optional().nullable(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required.'),
  reference: z.string().min(1, 'Reference code is required.'),
  price: z.number().positive('Price must be a positive number.'),
  stock: z.number().int().nonnegative('Stock must be a non-negative integer.'),
  image_url: z.string().url('Image URL must be a valid URL.'),
  description: z.string().min(1, 'Description is required.'),
});

export const adminController = {
  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await supabaseService.getAllOrders();
      return res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  },

  async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;

    try {
      const { status } = req.body;
      const order = await supabaseService.updateOrderStatus(id, status.toLowerCase());
      return res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  },

  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const customers = await supabaseService.getAllCustomers();
      return res.status(200).json(customers);
    } catch (error) {
      next(error);
    }
  },

  async getSubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const subscriptions = await supabaseService.getAllSubscriptions();
      return res.status(200).json(subscriptions);
    } catch (error) {
      next(error);
    }
  },

  async getNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await supabaseService.getNewsletterSubscribers();
      return res.status(200).json(newsletter);
    } catch (error) {
      next(error);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await supabaseService.getDashboardStats();
      return res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  },

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    const productId = req.params.id;

    try {
      const { stock, description } = req.body;

      // 1. Get current product to check stock status
      const current = await supabaseService.getProductById(productId);
      
      // 2. Perform the update
      const updatedProduct = await supabaseService.updateProduct(productId, {
        stock,
        description: description || undefined,
      });

      // 3. If previous stock was 0 and new stock is > 0, trigger restock emails
      if (Number(current.stock || 0) === 0 && stock > 0) {
        const signups = await supabaseService.getUnnotifiedStockSignups(productId);
        if (signups.length > 0) {
          Promise.all(
            signups.map(email =>
              emailService.sendRestockNotification(email, current.name, current.reference || current.ref || '')
                .catch(err => console.error(`Error emailing restock notification to ${email}:`, err))
            )
          ).then(async () => {
            await supabaseService.markStockNotificationsSent(productId);
          }).catch(err => console.error('Error in batch restock notification emails:', err));
        }
      }

      return res.status(200).json(updatedProduct);
    } catch (error) {
      next(error);
    }
  },

  async addProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, reference, price, stock, image_url, description } = req.body;
      const product = await supabaseService.addProduct({
        name,
        reference,
        price,
        stock,
        image_url,
        description
      });
      return res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  },

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      await supabaseService.deleteProduct(productId);
      return res.status(200).json({ success: true, message: 'Timepiece deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
};
