import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Edge-safe Auth.js configuration (no database / Node-only imports here so it
 * can run in middleware). The Credentials provider with its bcrypt + Prisma
 * logic is added in `auth.ts`, which runs in the Node.js runtime.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Persist role + org onto the JWT so route handlers and the data layer can
    // authorize without an extra DB round-trip.
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as Role;
        session.user.organizationId =
          (token.organizationId as string | null) ?? null;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isAuthPage = pathname === "/login";
      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/tracker.js") ||
        pathname.startsWith("/api/collect") ||
        pathname.startsWith("/api/auth");

      if (isPublic) return true;
      if (isAuthPage) {
        // Bounce already-authenticated users away from the login page.
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", request.nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
  providers: [], // real providers added in auth.ts (Node runtime)
} satisfies NextAuthConfig;
