# OVIpeps automated email copy

## Order confirmation

**Subject:** Congratulations — we received order {{orderNumber}}

Hi {{firstName}},

We’re excited to confirm that order **{{orderNumber}}** has been reserved. The email includes the itemized order and total, followed by these private Interac e-Transfer steps:

1. Log in to your Canadian bank’s online banking or mobile app.
2. Send the exact order total to the verified payment address shown in the email.
3. Enter **ONLY {{orderNumber}}** in the message or memo field.
4. Confirm AutoDeposit displays **Ivo Ziedins** before sending.

Storage and handling: Keep products at a consistent temperature; refrigeration is highly recommended for stable storage. Keep each vial sealed in its original packaging, protect it from light and moisture, and retain the batch label. Follow your qualified laboratory’s protocol and the product’s batch documentation.

Never send payment to an address other than the one in the official confirmation. If anything looks suspicious, reply before sending funds.

OVIpeps products are intended exclusively for in-vitro research and laboratory use. Not intended for human or veterinary consumption.

## Affiliate approval

**Subject:** Welcome to the OVIpeps Partner Program

Hi {{name}},

Congratulations—your OVIpeps Partner Program application has been approved.

- Commission: **15%** on qualifying regularly priced sales

Sign in with the account you created before applying, then choose your own unique affiliate code in your dashboard. Your referral link becomes active as soon as your code is saved. There is no temporary password.

To maintain Affiliate Status, generate at least $300 CAD in qualifying sales per calendar month. Sale and promotional orders are excluded. Affiliates are responsible for applicable tax reporting and payment obligations.

## Password reset

**Subject:** Reset your OVIpeps password

Hi {{name}},

Use the secure button in this email to choose a new password. The link expires in one hour. If you did not request it, ignore the email.

## Sending configuration

- From: the sender explicitly verified in the connected Resend account
- Reply-To: `ovipeps@gmail.com`
- Newsletter subscribers: Resend Audience configured with `RESEND_AUDIENCE_ID`
