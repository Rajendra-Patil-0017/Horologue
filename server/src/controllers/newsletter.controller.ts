import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Please provide a valid email address.')
});

export const newsletterController = {
  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const { email } = parsed.data;
      await supabaseService.addNewsletterEmail(email);
      return res.status(200).json({ message: 'Subscription successful.' });
    } catch (error: any) {
      // Gracefully handle unique constraint violations
      if (error.statusCode === 400 || error.code === '23505') {
        return res.status(200).json({ message: "You're already subscribed" });
      }
      next(error);
    }
  }
};
