import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { z } from 'zod';

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid product ID format.'),
});

export const notifyMeSchema = z.object({
  email: z.string().email('Invalid email address.'),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5.'),
  comment: z.string().optional().nullable(),
});

export const productsController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await supabaseService.getProducts();
      return res.status(200).json(products);
    } catch (error) {
      next(error);
    }
  },

  async notifyMe(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      const { email } = req.body;

      await supabaseService.addStockNotification(productId, email);
      return res.status(201).json({ success: true, message: 'We will notify you when this timepiece is restocked.' });
    } catch (error) {
      next(error);
    }
  },

  async getReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      const reviews = await supabaseService.getProductReviews(productId);

      const formattedReviews = reviews.map((r: any) => {
        const name = r.profile?.full_name || 'Anonymous Collector';
        const nameParts = name.trim().split(/\s+/);
        let formattedName = name;
        if (nameParts.length > 1) {
          const first = nameParts[0];
          const lastInitial = nameParts[nameParts.length - 1][0] + '.';
          formattedName = `${first} ${lastInitial}`;
        }
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          verified_purchase: r.verified_purchase,
          created_at: r.created_at,
          user_name: formattedName
        };
      });

      const count = reviews.length;
      const average = count > 0 ? Number((reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / count).toFixed(1)) : 0;

      return res.status(200).json({
        reviews: formattedReviews,
        averageRating: average,
        totalCount: count
      });
    } catch (error) {
      next(error);
    }
  },

  async addReview(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    try {
      const productId = req.params.id;
      const { rating, comment } = req.body;

      // Enforce one review per user per product
      const alreadyReviewed = await supabaseService.checkUserHasReviewed(user.uid, productId);
      if (alreadyReviewed) {
        return res.status(400).json({ error: "You have already submitted a review for this timepiece." });
      }

      // Check verified purchase
      const product = await supabaseService.getProductById(productId);
      const verified = await supabaseService.checkUserPurchasedProduct(user.uid, product.name);

      const review = await supabaseService.addReview({
        product_id: productId,
        user_id: user.uid,
        rating,
        comment: comment || undefined,
        verified_purchase: verified,
      });

      return res.status(201).json({ success: true, data: review });
    } catch (error: any) {
      if (error && error.code === '23505') {
        return res.status(400).json({ error: "You have already submitted a review for this timepiece." });
      }
      next(error);
    }
  }
};
