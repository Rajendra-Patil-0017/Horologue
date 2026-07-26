import { Request, Response, NextFunction } from 'express';
import { razorpayService } from '../services/razorpayService';
import { supabaseService } from '../services/supabaseService';
import { emailService } from '../services/emailService';
import { z } from 'zod';

const createOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive.'),
  currency: z.string().optional(),
  type: z.enum(['order', 'subscription']),
  metadata: z.record(z.any()).optional(),
});

const verifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().min(1, 'razorpay_payment_id is required.'),
  razorpay_order_id: z.string().min(1, 'razorpay_order_id is required.'),
  razorpay_signature: z.string().min(1, 'razorpay_signature is required.'),
  orderDetails: z.record(z.any()).optional(),
});

export const paymentsController = {
  async createOrder(req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed: ' + parsed.error.issues.map(i => i.message).join(', ') });
      }

      const { amount, currency = 'USD', type, metadata } = parsed.data;

      // Subscriptions require logged-in accounts
      if (type === 'subscription' && !user) {
        return res.status(401).json({ error: 'Authentication required for subscription purchases.' });
      }

      const rzpOrder = await razorpayService.createRazorpayOrder(amount, currency);

      // Create a pending payment record
      await supabaseService.createPayment({
        razorpay_order_id: rzpOrder.id, // Use razorpay order id as primary identifier
        amount: amount,
        currency: currency,
        status: 'created',
        user_id: user ? user.uid : null,
        type,
        metadata: metadata || {},
      });

      return res.status(201).json({
        razorpay_order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
      });
    } catch (error) {
      next(error);
    }
  },

  async verifyPayment(req: Request, res: Response, next: NextFunction) {
    const user = req.user;

    try {
      const parsed = verifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed: ' + parsed.error.issues.map(i => i.message).join(', ') });
      }

      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderDetails } = parsed.data;

      // 1. Signature Verification
      const isValid = razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
      if (!isValid) {
        console.error('Razorpay signature mismatch');
        return res.status(400).json({ error: 'Payment signature verification failed. Invalid transaction.' });
      }

      // 2. Fetch payment record
      const payment = await supabaseService.getPayment(razorpay_order_id);
      if (!payment) {
        return res.status(404).json({ error: 'Payment transaction record not found.' });
      }

      // Idempotency: check if payment is already processed/verified
      if (payment.status === 'verified') {
        return res.status(200).json({ success: true, message: 'Payment already processed and verified.' });
      }

      // 3. Update payment status to verified
      await supabaseService.updatePaymentStatus(razorpay_order_id, 'verified', {
        razorpay_payment_id,
        razorpay_signature,
      });

      // 4. Create Order or Subscription record
      let payloadResponse: any = null;

      if (payment.type === 'order') {
        let finalName = orderDetails?.userName;
        let finalEmail = orderDetails?.userEmail;

        if (user) {
          const profile = await supabaseService.getProfile(user.uid);
          finalName = profile?.full_name || user.email || '';
          finalEmail = user.email || '';
        }

        const newOrder = await supabaseService.createOrder({
          order_ref: 'HORO-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          user_id: user ? user.uid : null,
          customer_name: finalName || payment.metadata?.userName || payment.metadata?.shipping?.name || 'Guest Customer',
          email: finalEmail || payment.metadata?.userEmail || payment.metadata?.shipping?.email || '',
          phone: orderDetails?.phoneCountryCode 
            ? `${orderDetails.phoneCountryCode} ${orderDetails.phone}` 
            : (payment.metadata?.phoneCountryCode ? `${payment.metadata.phoneCountryCode} ${payment.metadata.phone}` : (orderDetails?.phone || payment.metadata?.phone || '')),
          items: orderDetails?.items || payment.metadata?.items || [],
          shipping_address: { address: orderDetails?.address || payment.metadata?.address || '' },
          subtotal: orderDetails?.total || payment.amount || 0,
          shipping_fee: 0,
          total: orderDetails?.total || payment.amount || 0,
          payment_method: orderDetails?.paymentMethod || payment.metadata?.paymentMethod || 'card',
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id: razorpay_payment_id || null,
          status: 'pending',
        });

        payloadResponse = newOrder;

        // Trigger confirmation email
        emailService.sendOrderConfirmation(newOrder.user_email, newOrder.user_name, newOrder)
          .catch(err => console.error('Error sending order confirmation email:', err));

      } else if (payment.type === 'subscription') {
        // Subscription must have a logged-in user
        const targetUserId = user ? user.uid : payment.user_id;
        if (!targetUserId) {
          throw new Error('Subscription requires an authenticated user account.');
        }

        const profile = await supabaseService.getProfile(targetUserId);
        const finalName = profile?.full_name || user?.email || payment.metadata?.userName || '';
        const finalEmail = profile?.email || user?.email || payment.metadata?.userEmail || '';

        // Deactivate active subscriptions first
        await supabaseService.deactivateUserSubscriptions(targetUserId);

        const renewal = new Date();
        renewal.setFullYear(renewal.getFullYear() + 1);

        const newSub = await supabaseService.createSubscription({
          user_id: targetUserId,
          plan_name: 'HOROLOGUE Club Membership',
          status: 'active',
          renewal_date: renewal.toISOString(),
          fee: payment.amount || 299,
          payment_method: orderDetails?.paymentMethod || 'card',
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id: razorpay_payment_id || null,
          start_date: new Date().toISOString(),
        });

        payloadResponse = newSub;

        // Trigger welcome subscription email
        emailService.sendSubscriptionConfirmation(finalEmail, finalName, newSub)
          .catch(err => console.error('Error sending subscription welcome email:', err));
      }

      return res.status(200).json({ success: true, data: payloadResponse });
    } catch (error) {
      next(error);
    }
  },

  async webhook(req: Request, res: Response, next: NextFunction) {
    const signature = req.headers['x-razorpay-signature'] as string;
    const bodyStr = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    try {
      const isValid = razorpayService.verifyWebhookSignature(bodyStr, signature);
      if (!isValid) {
        console.error('Webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body;
      console.log('Razorpay webhook event received:', event.event);

      // We backstop order creation on payment.captured
      if (event.event === 'payment.captured') {
        const paymentEntity = event.payload?.payment?.entity;
        const razorpay_order_id = paymentEntity?.order_id;
        const razorpay_payment_id = paymentEntity?.id;

        if (razorpay_order_id) {
          const payment = await supabaseService.getPayment(razorpay_order_id);

          if (payment && payment.status !== 'verified') {
            // Update payment to verified
            await supabaseService.updatePaymentStatus(razorpay_order_id, 'verified', {
              razorpay_payment_id,
              razorpay_signature: signature,
            });

            // Process order/subscription creation (if verify was missed due to client tab-close)
            if (payment.type === 'order') {
              const newOrder = await supabaseService.createOrder({
                order_ref: 'HORO-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
                user_id: payment.user_id,
                customer_name: payment.metadata?.userName || payment.metadata?.shipping?.name || 'Guest Customer',
                email: payment.metadata?.userEmail || payment.metadata?.shipping?.email || '',
                phone: payment.metadata?.phoneCountryCode ? `${payment.metadata.phoneCountryCode} ${payment.metadata.phone}` : (payment.metadata?.phone || ''),
                items: payment.metadata?.items || [],
                shipping_address: { address: payment.metadata?.address || '' },
                subtotal: payment.amount || 0,
                shipping_fee: 0,
                total: payment.amount || 0,
                payment_method: payment.metadata?.paymentMethod || 'card',
                razorpay_order_id: razorpay_order_id || null,
                razorpay_payment_id: razorpay_payment_id || null,
                status: 'pending',
              });

              emailService.sendOrderConfirmation(newOrder.user_email, newOrder.user_name, newOrder)
                .catch(err => console.error('Webhook: order confirmation email failed:', err));

            } else if (payment.type === 'subscription' && payment.user_id) {
              const profile = await supabaseService.getProfile(payment.user_id);
              const finalName = profile?.full_name || payment.metadata?.userName || 'Valued Member';
              const finalEmail = profile?.email || payment.metadata?.userEmail || '';

              await supabaseService.deactivateUserSubscriptions(payment.user_id);

              const renewal = new Date();
              renewal.setFullYear(renewal.getFullYear() + 1);

              const newSub = await supabaseService.createSubscription({
                user_id: payment.user_id,
                user_name: finalName,
                user_email: finalEmail,
                plan: 'HOROLOGUE Club Membership',
                status: 'active',
                renewal_date: renewal.toISOString(),
                fee: payment.amount || 299,
                payment_method: payment.metadata?.paymentMethod || 'card',
                online_sub_option: payment.metadata?.onlineSubOption || null,
                phone: payment.metadata?.phone || '',
                phone_country_code: payment.metadata?.phoneCountryCode || '',
                country: payment.metadata?.country || 'United States',
              });

              emailService.sendSubscriptionConfirmation(finalEmail, finalName, newSub)
                .catch(err => console.error('Webhook: subscription welcome email failed:', err));
            }
          }
        }
      }

      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  }
};
