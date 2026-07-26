import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user || !user.uid) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.uid)
      .single();

    if (error || !profile) {
      console.error('Failed to load profile for admin check:', error);
      return res.status(403).json({ error: 'Forbidden: Profile not found' });
    }

    if (profile.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    next();
  } catch (error: any) {
    console.error('Admin verification error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
