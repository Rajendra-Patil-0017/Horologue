import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';

export const subscriptionsController = {
  async getMySubscription(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    try {
      const subscription = await supabaseService.getUserSubscription(user.uid);
      return res.status(200).json(subscription);
    } catch (error) {
      next(error);
    }
  }
};
