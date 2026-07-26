import { Buffer } from 'buffer';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
      rawBody?: Buffer;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      uid: string;
      email?: string;
    };
    rawBody?: Buffer;
  }
}

