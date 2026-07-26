import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Configuration parameters with sensible defaults, fully customizable via Environment Variables
const AUTH_WINDOW_MS = Number(process.env.AUTH_LIMIT_WINDOW_MS) || 60000; // 1 minute tracking window
const AUTH_MAX_ATTEMPTS = Number(process.env.AUTH_LIMIT_MAX_ATTEMPTS) || 5; // 5 allowed attempts before backoff
const AUTH_BASE_DELAY_MS = Number(process.env.AUTH_LIMIT_BASE_DELAY_MS) || 1000; // 1s base delay
const AUTH_MAX_DELAY_MS = Number(process.env.AUTH_LIMIT_MAX_DELAY_MS) || 900000; // 15m maximum backoff delay

const PUBLIC_WINDOW_MS = Number(process.env.PUBLIC_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const PUBLIC_MAX_REQ = Number(process.env.PUBLIC_LIMIT_MAX) || 100;

const USER_WINDOW_MS = Number(process.env.USER_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const USER_MAX_REQ = Number(process.env.USER_LIMIT_MAX) || 500;

interface RateLimitRecord {
  attempts: number;
  lastRequest: number;
}

const ipRecords = new Map<string, RateLimitRecord>();
const accountRecords = new Map<string, RateLimitRecord>();

// Clean up maps periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipRecords.entries()) {
    if (now - value.lastRequest > AUTH_MAX_DELAY_MS) {
      ipRecords.delete(key);
    }
  }
  for (const [key, value] of accountRecords.entries()) {
    if (now - value.lastRequest > AUTH_MAX_DELAY_MS) {
      accountRecords.delete(key);
    }
  }
}, 30 * 60 * 1000); // run cleanup every 30 minutes

/**
 * Custom rate limiter for authentication/sync endpoints.
 * Combines per-IP and per-account rate limiting with exponential backoff.
 */
export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  
  // Get IP
  const rawIp = req.ip || (req.headers['x-forwarded-for'] as string) || '';
  const ipKey = rawIp.split(',')[0].trim();
  
  // Get Account (uid or email from verifyFirebaseToken user payload)
  const accountKey = req.user?.uid || req.user?.email || '';

  // 1. Validate IP Rate Limit
  if (ipKey) {
    const record = ipRecords.get(ipKey);
    if (record) {
      if (now - record.lastRequest < AUTH_WINDOW_MS) {
        const attempts = record.attempts + 1;
        record.attempts = attempts;
        record.lastRequest = now;

        if (attempts > AUTH_MAX_ATTEMPTS) {
          const exponent = attempts - AUTH_MAX_ATTEMPTS;
          const delay = Math.min(AUTH_BASE_DELAY_MS * Math.pow(2, exponent), AUTH_MAX_DELAY_MS);
          const timeSinceLast = now - record.lastRequest; // this will be 0 initially, but tracks delta
          
          // Since they just sent the request, block them if it's within the backoff delay
          // To implement strict backoff, we check if they waited less than the calculated delay since their previous request
          const elapsed = now - (record.lastRequest - 0); // we want the gap from the previous successful/unsuccessful request
          
          res.setHeader('Retry-After', Math.ceil(delay / 1000));
          return res.status(429).json({
            error: `Too many authentication requests from this IP. Please wait ${Math.ceil(delay / 1000)} seconds before trying again.`
          });
        }
      } else {
        // Reset tracking window
        record.attempts = 1;
        record.lastRequest = now;
      }
    } else {
      ipRecords.set(ipKey, { attempts: 1, lastRequest: now });
    }
  }

  // 2. Validate Account Rate Limit (if logged in)
  if (accountKey) {
    const record = accountRecords.get(accountKey);
    if (record) {
      if (now - record.lastRequest < AUTH_WINDOW_MS) {
        const attempts = record.attempts + 1;
        record.attempts = attempts;
        record.lastRequest = now;

        if (attempts > AUTH_MAX_ATTEMPTS) {
          const exponent = attempts - AUTH_MAX_ATTEMPTS;
          const delay = Math.min(AUTH_BASE_DELAY_MS * Math.pow(2, exponent), AUTH_MAX_DELAY_MS);
          
          res.setHeader('Retry-After', Math.ceil(delay / 1000));
          return res.status(429).json({
            error: `Too many authentication requests for this account. Please wait ${Math.ceil(delay / 1000)} seconds before trying again.`
          });
        }
      } else {
        record.attempts = 1;
        record.lastRequest = now;
      }
    } else {
      accountRecords.set(accountKey, { attempts: 1, lastRequest: now });
    }
  }

  next();
};

/**
 * Moderate rate limiter for public endpoints.
 */
export const publicRateLimiter = rateLimit({
  windowMs: PUBLIC_WINDOW_MS,
  max: PUBLIC_MAX_REQ,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests on this endpoint. Please try again later.' }
});

/**
 * Permissive rate limiter for authenticated user actions.
 */
export const userRateLimiter = rateLimit({
  windowMs: USER_WINDOW_MS,
  max: USER_MAX_REQ,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Action limit exceeded. Please wait a few minutes and try again.' }
});
