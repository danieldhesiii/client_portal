import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

// Edge-safe auth middleware (uses only the JWT-based config, no DB access).
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything except Next internals and static assets. /va.js and
  // /api/event are explicitly treated as public inside authConfig.authorized.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
