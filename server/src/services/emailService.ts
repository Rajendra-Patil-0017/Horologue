import { resend, emailFrom } from '../config/email';
import { supabaseService } from './supabaseService';

const getBaseTemplate = (title: string, contentHtml: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      background-color: #131313;
      color: #E5E4E2;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1a1a1a;
      border: 1px solid #D4AF37;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      border-bottom: 1px solid rgba(229, 228, 226, 0.1);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo {
      color: #D4AF37;
      font-size: 28px;
      font-weight: bold;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      font-family: "Times New Roman", serif;
      margin: 0;
    }
    .subtitle {
      color: #8a8a8a;
      font-size: 10px;
      letter-spacing: 0.2em;
      margin-top: 5px;
      text-transform: uppercase;
    }
    .title {
      font-size: 20px;
      color: #D4AF37;
      margin-bottom: 20px;
      font-weight: normal;
      letter-spacing: 0.05em;
    }
    .content {
      line-height: 1.6;
      font-size: 14px;
      color: #cccccc;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      margin-bottom: 20px;
    }
    .item-table th {
      text-align: left;
      border-bottom: 1px solid rgba(229, 228, 226, 0.1);
      padding-bottom: 10px;
      color: #D4AF37;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .item-table td {
      padding: 12px 0;
      border-bottom: 1px solid rgba(229, 228, 226, 0.05);
      font-size: 14px;
    }
    .total-row td {
      border-top: 1px solid #D4AF37;
      border-bottom: none;
      font-size: 16px;
      font-weight: bold;
      color: #D4AF37;
      padding-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid rgba(229, 228, 226, 0.1);
      font-size: 11px;
      color: #666666;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo">C H R O N O S</h1>
      <div class="subtitle">Master Chronographs & Horology</div>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} CHRONOS. All rights reserved.<br>
      This is an automated receipt for your purchase.
    </div>
  </div>
</body>
</html>
`;

export const emailService = {
  async sendOrderConfirmation(email: string, name: string, order: any) {
    const title = `Order Confirmation #${order.id}`;
    
    let itemsHtml = '';
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        itemsHtml += `
          <tr>
            <td style="color: #cccccc;">${item.watch.name} (Ref. ${item.watch.ref}) x ${item.quantity}</td>
            <td style="text-align: right; color: #cccccc;">${item.watch.price}</td>
          </tr>
        `;
      });
    }

    const contentHtml = `
      <h2 class="title">Thank You for Your Order</h2>
      <p>Dear ${name},</p>
      <p>Your order has been verified and is currently being processed. Here are your transaction details:</p>
      
      <div style="background-color: #222; border: 1px solid #333; padding: 15px; margin: 20px 0; font-size: 13px;">
        <strong>Order ID:</strong> ${order.id}<br>
        <strong>Date:</strong> ${new Date(order.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br>
        <strong>Payment Method:</strong> ${order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'card' ? 'Credit/Debit Card' : 'Online Payment'}<br>
        <strong>Shipping Address:</strong> ${order.address}
      </div>

      <table class="item-table">
        <thead>
          <tr>
            <th style="color: #D4AF37;">Item Details</th>
            <th style="text-align: right; color: #D4AF37;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td style="color: #D4AF37;">Total Amount Paid</td>
            <td style="text-align: right; color: #D4AF37;">₹${order.total.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <p>If you have any questions, please contact our support department.</p>
    `;

    const html = getBaseTemplate(title, contentHtml);

    try {
      const data = await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: `CHRONOS — Order Confirmation #${order.id}`,
        html,
      });

      await supabaseService.logEmail({
        recipient: email,
        template: 'order_confirmation',
        status: 'sent',
        provider_message_id: data.data?.id || null,
        error_message: null,
      });
    } catch (err: any) {
      console.error('Failed to send order confirmation email:', err);
      await supabaseService.logEmail({
        recipient: email,
        template: 'order_confirmation',
        status: 'failed',
        provider_message_id: null,
        error_message: err.message || String(err),
      });
    }
  },

  async sendSubscriptionConfirmation(email: string, name: string, subscription: any) {
    const title = `Welcome to the Club — Subscription #${subscription.id}`;
    const renewalDateStr = subscription.renewal_date 
      ? new Date(subscription.renewal_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '';

    const contentHtml = `
      <h2 class="title">Membership Activated</h2>
      <p>Dear ${name},</p>
      <p>Welcome to the exclusive <strong>CHRONOS Club Membership</strong>. Your subscription has been verified successfully.</p>
      
      <div style="background-color: #222; border: 1px solid #333; padding: 15px; margin: 20px 0; font-size: 13px;">
        <strong>Subscription ID:</strong> ${subscription.id}<br>
        <strong>Plan:</strong> ${subscription.plan || 'HOROLOGUE Club Membership'}<br>
        <strong>Annual Membership Fee:</strong> $${subscription.fee || 299}<br>
        <strong>Next Renewal Date:</strong> ${renewalDateStr}<br>
        <strong>Status:</strong> Active
      </div>

      <p>As a member, you now have priority access to limited edition timepieces, members-only releases, and complimentary horological consultations.</p>
      <p>Your membership benefits are now active. Log in to your dashboard to discover your privileges.</p>
    `;

    const html = getBaseTemplate(title, contentHtml);

    try {
      const data = await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: 'CHRONOS — Welcome to the Club',
        html,
      });

      await supabaseService.logEmail({
        recipient: email,
        template: 'subscription_confirmation',
        status: 'sent',
        provider_message_id: data.data?.id || null,
        error_message: null,
      });
    } catch (err: any) {
      console.error('Failed to send subscription confirmation email:', err);
      await supabaseService.logEmail({
        recipient: email,
        template: 'subscription_confirmation',
        status: 'failed',
        provider_message_id: null,
        error_message: err.message || String(err),
      });
    }
  },

  async sendRestockNotification(email: string, productName: string, productRef: string) {
    const title = `Back in Stock: ${productName}`;
    const contentHtml = `
      <h2 class="title" style="color: #D4AF37; font-family: 'Times New Roman', serif; font-size: 24px; font-weight: normal; letter-spacing: 0.05em; margin-bottom: 20px;">Timepiece Restocked</h2>
      <p>Dear Collector,</p>
      <p>We are pleased to inform you that the timepiece you requested notification for, <strong>${productName}</strong> (Ref. ${productRef}), is now back in stock.</p>
      
      <div style="background-color: #222; border: 1px solid #333; padding: 20px; margin: 25px 0; text-align: center;">
        <span style="color: #D4AF37; font-family: 'Times New Roman', serif; font-size: 18px; letter-spacing: 0.1em; text-transform: uppercase;">${productName}</span><br>
        <span style="color: #888; font-size: 12px; letter-spacing: 0.05em; display: inline-block; margin-top: 5px;">Reference: ${productRef}</span>
      </div>

      <p>Quantities are extremely limited and reserved for our select priority list. We recommend securing yours promptly.</p>
      <p>Log in to your account and visit the collection catalogue to complete your acquisition.</p>
    `;

    const html = getBaseTemplate(title, contentHtml);

    try {
      const data = await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: `CHRONOS — ${productName} Back in Stock`,
        html,
      });

      await supabaseService.logEmail({
        recipient: email,
        template: 'restock_notification',
        status: 'sent',
        provider_message_id: data.data?.id || null,
        error_message: null,
      });
    } catch (err: any) {
      console.error('Failed to send restock notification email:', err);
      await supabaseService.logEmail({
        recipient: email,
        template: 'restock_notification',
        status: 'failed',
        provider_message_id: null,
        error_message: err.message || String(err),
      });
    }
  }
};
