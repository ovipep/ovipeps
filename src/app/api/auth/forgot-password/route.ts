import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/password-reset";
import { buildEmailTemplate, sendEmail } from "@/lib/emails";
import { getOrMigrateOwnerAdmin, OWNER_EMAIL } from "@/lib/owner-account";

export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  const user =
    email === OWNER_EMAIL
      ? await getOrMigrateOwnerAdmin()
      : await db.user.findUnique({ where: { email } });
  if (user?.passwordHash) {
    const token = createPasswordResetToken(email, user.passwordHash);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    const result = await sendEmail(
      email,
      await buildEmailTemplate("password_reset", {
        name: user.firstName ?? "there",
        resetUrl: `${baseUrl}/account/reset-password?token=${encodeURIComponent(token)}`,
      })
    );
    if (!result.success) {
      return NextResponse.json(
        {
          error:
            "We could not send the reset email. The website email sender still needs to be connected.",
        },
        { status: 503 }
      );
    }
  }
  return NextResponse.json({ success: true });
}
