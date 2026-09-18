import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrMigrateOwnerAdmin, OWNER_EMAIL } from "@/lib/owner-account";

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Invalid email address").max(254),
  password: z.string().min(12, "Password must be at least 12 characters").max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail === OWNER_EMAIL) {
      await getOrMigrateOwnerAdmin();
      return NextResponse.json(
        {
          code: "OWNER_ACCOUNT_EXISTS",
          error:
            "Your administrator account already exists. Use Forgot your password to set or reset its password.",
        },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "CUSTOMER",
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}
