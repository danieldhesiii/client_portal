import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Role, Site } from "@prisma/client";

export class AccessError extends Error {
  constructor(
    message: string,
    public status: number = 403,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string | null;
};

/** Current authenticated user, or null. Memoised per-request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
    role: session.user.role,
    organizationId: session.user.organizationId,
  };
});

/** Require any authenticated user. Throws AccessError(401) otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AccessError("Not authenticated", 401);
  return user;
}

/** Require an ADMIN. Throws AccessError(403) for clients. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AccessError("Admin only", 403);
  return user;
}

/**
 * The single chokepoint for site authorization. ADMIN can access any site;
 * a CLIENT can only access sites owned by their organization. Every analytics
 * query funnels through here, so tenant isolation is enforced in the data layer
 * — not merely hidden in the UI.
 */
export async function assertSiteAccess(siteId: string): Promise<Site> {
  const user = await requireUser();
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site) throw new AccessError("Site not found", 404);
  if (user.role === "ADMIN") return site;
  if (user.organizationId && site.organizationId === user.organizationId) {
    return site;
  }
  throw new AccessError("You do not have access to this site", 403);
}

/** All sites the current user may view (admins: all; clients: their org's). */
export async function listAccessibleSites(): Promise<Site[]> {
  const user = await requireUser();
  if (user.role === "ADMIN") {
    return prisma.site.findMany({ orderBy: { createdAt: "desc" } });
  }
  if (!user.organizationId) return [];
  return prisma.site.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: "desc" },
  });
}
