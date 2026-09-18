import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { verifyPasswordResetToken } from "@/lib/password-reset";

export async function POST(request: Request) {
  const parsed = z.object({ token: z.string().min(20).max(2048), password: z.string().min(12).max(128) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use a password of at least 12 characters" }, { status: 400 });
  let email: string | undefined;
  try { email = JSON.parse(Buffer.from(parsed.data.token.split(".")[0], "base64url").toString()).email; } catch {}
  if (!email) return NextResponse.json({ error: "This reset link is invalid or expired" }, { status: 400 });
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !verifyPasswordResetToken(parsed.data.token, user.passwordHash)) return NextResponse.json({ error: "This reset link is invalid or expired" }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  return NextResponse.json({ success: true });
}
