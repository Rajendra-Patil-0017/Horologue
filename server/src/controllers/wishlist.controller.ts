import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { z } from 'zod';

export const addToWishlistSchema = z.object({
  productId: z.string().uuid('Invalid product ID format.'),
});

export const wishlistParamSchema = z.object({
  productId: z.string().uuid('Invalid product ID format.'),
});

export const wishlistController = {
  async getWishlist(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    try {
      const items = await supabaseService.getWishlist(user.uid);
      
      // Map it to return flat objects containing product details
      const formattedItems = items.map((item: any) => {
        const product = item.products;
        return {
          productId: item.product_id,
          name: product.name,
          ref: product.reference || product.ref || '',
          price: typeof product.price === 'number' ? `$${product.price.toLocaleString()}` : (product.price || ''),
          stock: Number(product.stock || 0),
          image: product.image_url || product.image || '',
          description: product.description || '',
          createdAt: item.created_at
        };
      });

      return res.status(200).json(formattedItems);
    } catch (error) {
      next(error);
    }
  },

  async addToWishlist(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    try {
      const { productId } = req.body;
      
      // Upsert/Insert wishlist row
      await supabaseService.addToWishlist(user.uid, productId);
      
      return res.status(201).json({ success: true, message: 'Timepiece saved to your collection.' });
    } catch (error) {
      next(error);
    }
  },

  async removeFromWishlist(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    try {
      const { productId } = req.params;

      await supabaseService.removeFromWishlist(user.uid, productId);
      
      return res.status(200).json({ success: true, message: 'Timepiece removed from your collection.' });
    } catch (error) {
      next(error);
    }
  }
};
