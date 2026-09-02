import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildAffiliateApplicationAdminEmail,
  sendEmail,
} from "@/lib/emails";

const AGREEMENT_VERSION = "2026-08-27-tiered-commission";

const applySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(7),
  address1: z.string().trim().min(1),
  address2: z.string().trim().optional(),
  city: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: z.string().trim().regex(/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/),
  country: z.literal("Canada"),
  canadianResident: z.literal(true),
  socialProfiles: z.array(z.object({
    platform: z.string().trim().min(1),
    handle: z.string().trim().min(1),
    followers: z.number().int().min(0),
  })).min(1),
  website: z.string().url().optional().or(z.literal("")),
  whyAffiliate: z.string().trim().min(20),
  affiliateStrengths: z.string().trim().min(20),
  promotionPlan: z.string().trim().min(20),
  monthlyMinimumAccepted: z.literal(true),
  complianceAccepted: z.literal(true),
  signedName: z.string().trim().min(2),
  signedDate: z.string().date(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please sign in before applying." }, { status: 401 });
    }

    const data = applySchema.parse(await request.json());
    const accountEmail = session.user.email?.trim().toLowerCase();
    if (accountEmail && data.email.toLowerCase() !== accountEmail) {
      return NextResponse.json({ error: "Use the same email address as your OVIpeps account." }, { status: 400 });
    }

    const existingForUser = await db.affiliateApplication.findUnique({ where: { userId: session.user.id } });
    if (existingForUser) {
      return NextResponse.json({ error: existingForUser.status === "PENDING" ? "You already have a pending application under review." : "An application is already on file for your account." }, { status: 409 });
    }

    const existingEmail = await db.affiliateApplication.findFirst({
      where: { email: data.email.toLowerCase(), status: "PENDING" },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "An application with this email is already pending review." }, { status: 409 });
    }

    const signedAt = new Date(`${data.signedDate}T12:00:00.000Z`);
    if (Number.isNaN(signedAt.getTime()) || signedAt > new Date()) {
      return NextResponse.json({ error: "Please enter a valid signature date." }, { status: 400 });
    }

    const application = await db.affiliateApplication.create({
      data: {
        userId: session.user.id,
        name: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        address1: data.address1,
        address2: data.address2 || undefined,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode.toUpperCase(),
        country: "Canada",
        canadianResident: data.canadianResident,
        socialProfiles: data.socialProfiles,
        socialChannel: data.socialProfiles.map((profile) => `${profile.platform}: ${profile.handle} (${profile.followers.toLocaleString()} followers)`).join(" | "),
        website: data.website || undefined,
        audienceSize: data.socialProfiles.reduce((sum, profile) => sum + profile.followers, 0).toString(),
        primaryPlatform: data.socialProfiles[0]?.platform,
        promotionPlan: data.promotionPlan,
        whyAffiliate: data.whyAffiliate,
        affiliateStrengths: data.affiliateStrengths,
        monthlyMinimumAccepted: data.monthlyMinimumAccepted,
        complianceAccepted: data.complianceAccepted,
        signedName: data.signedName,
        signedAt,
        agreementVersion: AGREEMENT_VERSION,
      },
    });

    const adminDelivery = await sendEmail(
      "ovipeps@gmail.com",
      buildAffiliateApplicationAdminEmail({
        applicationId: application.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        city: data.city,
        province: data.province,
        socialProfiles: data.socialProfiles,
        whyAffiliate: data.whyAffiliate,
      }),
      { idempotencyKey: `affiliate-application-admin-${application.id}` }
    );
    if (!adminDelivery.success) {
      console.error("Affiliate application saved, but admin notification failed", {
        applicationId: application.id,
        error: adminDelivery.error,
      });
    }

    return NextResponse.json({ success: true, id: application.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Please check the highlighted details." }, { status: 400 });
    }
    console.error("Affiliate application failed", error);
    return NextResponse.json({ error: "We could not submit the application right now. Please try again." }, { status: 503 });
  }
}
