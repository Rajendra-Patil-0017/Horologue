import { Request, Response, NextFunction } from 'express';
import { supabaseService } from '../services/supabaseService';
import { z } from 'zod';

export const syncSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
});

export const authController = {
  async sync(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Missing user authentication details.' });
    }

    try {
      const { name, phone, country } = req.body;

      // Fetch existing profile first to avoid overwriting fields if frontend doesn't pass them in sync
      const existing = await supabaseService.getProfile(user.uid);
      
      const profile = await supabaseService.upsertProfile({
        id: user.uid,
        email: user.email || existing?.email || '',
        full_name: name !== undefined ? name : existing?.full_name,
        phone: phone !== undefined ? phone : existing?.phone,
        country: country !== undefined ? country : existing?.country,
        role: existing?.role || 'customer',
      });

      return res.status(200).json(profile);
    } catch (error) {
      next(error);
    }
  }
};
