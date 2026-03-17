import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config — no Node.js APIs (no Prisma, no bcrypt).
 * Used only in middleware for JWT session reading.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
};
