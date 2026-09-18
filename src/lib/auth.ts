import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import {
  activateOwnerAdmin,
  getOrMigrateOwnerAdmin,
  OWNER_EMAIL,
} from "./owner-account";

const sessionMaxAge = 8 * 60 * 60;

function authVersion(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("base64url");
}

function secureEqual(left: string | undefined, right: string) {
  if (!left) return false;
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const user =
          email === OWNER_EMAIL
            ? await getOrMigrateOwnerAdmin()
            : await db.user.findUnique({ where: { email } });

        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        const authenticatedUser =
          email === OWNER_EMAIL && user.role !== "ADMIN"
            ? await activateOwnerAdmin(user.id)
            : user;

        return {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: `${authenticatedUser.firstName ?? ""} ${authenticatedUser.lastName ?? ""}`.trim(),
          role: authenticatedUser.role,
          authVersion: authVersion(authenticatedUser.passwordHash!),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.authVersion = (user as { authVersion?: string }).authVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const currentUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, passwordHash: true },
        });
        if (!currentUser?.passwordHash || !secureEqual(token.authVersion as string | undefined, authVersion(currentUser.passwordHash))) {
          session.user = undefined as never;
          return session;
        }
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = currentUser.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/account/login",
  },
  session: { strategy: "jwt", maxAge: sessionMaxAge },
  jwt: { maxAge: sessionMaxAge },
});

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

export async function requireAffiliate() {
  const session = await auth();
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "AFFILIATE") return null;
  return session;
}
