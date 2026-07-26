import { Request, Response, NextFunction } from 'express';
import { auth } from '../config/firebaseAdmin';

export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
  }

  const idToken = authHeader.substring(7); // "Bearer " is 7 characters
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (error: any) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const optionalFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const idToken = authHeader.substring(7);
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.warn('Optional Firebase token verification failed:', error);
  }
  next();
};

