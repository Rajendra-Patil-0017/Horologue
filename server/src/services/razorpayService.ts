import crypto from 'crypto';
import { razorpay } from '../config/razorpay';

export const razorpayService = {
  /**
   * Creates a Razorpay order.
   * @param amount The order amount in standard units (Rupees/USD). We convert it to paise (x 100).
   * @param currency Default is 'USD'
   */
  async createRazorpayOrder(amount: number, currency: string = 'USD') {
    const options = {
      amount: Math.round(amount * 100), // convert standard unit to paise
      currency,
      receipt: `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    return razorpay.orders.create(options);
  },

  /**
   * Verifies the Razorpay payment signature for client-side checkouts.
   */
  verifySignature(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): boolean {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error('RAZORPAY_KEY_SECRET environment variable is missing.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    return expectedSignature === razorpaySignature;
  },

  /**
   * Verifies the signature of a Razorpay webhook event using the raw request body buffer.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('RAZORPAY_WEBHOOK_SECRET environment variable is missing.');
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
};
