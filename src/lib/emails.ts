/**
 * Transactional email templates for OVIpeps.
 * Integrate with Resend or similar provider in production.
 * Templates return { subject, html, text } for each email type.
 */

const brandColor = "#0c4a6e";
const footer = `
  <p style="color:#64748b;font-size:12px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
    OVIpeps — Research compounds for laboratory use only.<br>
    Not for human consumption. &copy; ${new Date().getFullYear()} OVIpeps.
  </p>
`;

function wrap(content: string) {
  return `<!DOCTYPE html><html><body style="font-family:Inter,system-ui,sans-serif;color:#0f172a;max-width:600px;margin:0 auto;padding:24px;">
    <div style="border-bottom:2px solid ${brandColor};padding-bottom:16px;margin-bottom:24px;">
      <strong style="font-size:20px;color:${brandColor};">OVIpeps</strong>
    </div>
    ${content}
    ${footer}
  </body></html>`;
}

export const emailTemplates = {
  orderReceived: (data: { orderNumber: string; total: string; name: string }) => ({
    subject: `Order Received — ${data.orderNumber}`,
    html: wrap(`
      <h2 style="color:${brandColor};">Thank you for your order</h2>
      <p>Hi ${data.name},</p>
      <p>We've received your order <strong>${data.orderNumber}</strong> for <strong>${data.total}</strong>.</p>
      <p>Payment instructions will follow separately if you selected Interac e-Transfer.</p>
    `),
    text: `Order ${data.orderNumber} received. Total: ${data.total}.`,
  }),

  awaitingEtransfer: (data: {
    orderNumber: string;
    total: string;
    etransferEmail: string;
    instructions: string;
  }) => ({
    subject: `Payment Instructions — ${data.orderNumber}`,
    html: wrap(`
      <h2 style="color:${brandColor};">Interac e-Transfer Payment</h2>
      <p>Order: <strong>${data.orderNumber}</strong></p>
      <p>Amount: <strong>${data.total}</strong></p>
      <p>Send your e-Transfer to: <strong>${data.etransferEmail}</strong></p>
      <p>Include your order number <strong>${data.orderNumber}</strong> in the message field.</p>
      <p style="background:#f1f5f9;padding:16px;border-radius:8px;">${data.instructions}</p>
    `),
    text: `Send ${data.total} to ${data.etransferEmail}. Reference: ${data.orderNumber}.`,
  }),

  paymentConfirmed: (data: { orderNumber: string; name: string }) => ({
    subject: `Payment Confirmed — ${data.orderNumber}`,
    html: wrap(`
      <h2 style="color:${brandColor};">Payment Received</h2>
      <p>Hi ${data.name},</p>
      <p>We've confirmed payment for order <strong>${data.orderNumber}</strong>. Your order is now being processed.</p>
    `),
    text: `Payment confirmed for order ${data.orderNumber}.`,
  }),

  orderShipped: (data: {
    orderNumber: string;
    trackingNumber?: string;
    carrier?: string;
  }) => ({
    subject: `Order Shipped — ${data.orderNumber}`,
    html: wrap(`
      <h2 style="color:${brandColor};">Your order has shipped</h2>
      <p>Order <strong>${data.orderNumber}</strong> is on its way.</p>
      ${data.trackingNumber ? `<p>Tracking: <strong>${data.trackingNumber}</strong>${data.carrier ? ` (${data.carrier})` : ""}</p>` : ""}
    `),
    text: `Order ${data.orderNumber} shipped.${data.trackingNumber ? ` Tracking: ${data.trackingNumber}` : ""}`,
  }),

  affiliateApproved: (data: { name: string; code: string; commissionRate: number }) => ({
    subject: "Welcome to the OVIpeps Partner Program",
    html: wrap(`
      <h2 style="color:${brandColor};">Application Approved</h2>
      <p>Hi ${data.name},</p>
      <p>Your OVIpeps Partner Program application has been approved.</p>
      <p>Your referral code: <strong>${data.code}</strong></p>
      <p>Commission rate: <strong>${data.commissionRate}%</strong></p>
    `),
    text: `Approved. Code: ${data.code}. Commission: ${data.commissionRate}%.`,
  }),

  affiliatePayoutSent: (data: { name: string; amount: string; period: string }) => ({
    subject: `Payout Sent — ${data.period}`,
    html: wrap(`
      <h2 style="color:${brandColor};">Commission Payout</h2>
      <p>Hi ${data.name},</p>
      <p>Your commission payout of <strong>${data.amount}</strong> for <strong>${data.period}</strong> has been sent via Interac e-Transfer.</p>
    `),
    text: `Payout ${data.amount} for ${data.period} sent.`,
  }),
};

export async function sendEmail(
  to: string,
  template: { subject: string; html: string; text: string }
) {
  // Production: integrate with Resend
  // await resend.emails.send({ from: 'orders@ovipeps.ca', to, ...template });
  if (process.env.NODE_ENV === "development") {
    console.log(`[Email] To: ${to} | Subject: ${template.subject}`);
  }
  return { success: true };
}
