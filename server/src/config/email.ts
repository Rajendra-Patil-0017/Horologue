import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error('Resend API key is missing. Check environment variables.');
}

export const resend = new Resend(apiKey);
export const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
