import { prisma } from "@/lib/prisma";
import { requireAdmin } from "./access";
import { hashPassword } from "@/lib/auth/password";
import { randomBytes } from "crypto";

/**
 * Admin-only data operations: managing organizations (clients), their sites,
 * and client login accounts. Every function asserts the caller is an ADMIN.
 */

/** Generate a short, URL-safe public site id used in the embed snippet. */
export function generatePublicId(): string {
  return randomBytes(8).toString("hex"); // 16 hex chars
}

export async function listOrganizations() {
  await requireAdmin();
  return prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sites: true, users: true } },
      sites: { select: { id: true, name: true, domain: true, publicId: true } },
      users: { select: { id: true, email: true, name: true, role: true } },
    },
  });
}

export async function getOrganization(id: string) {
  await requireAdmin();
  return prisma.organization.findUnique({
    where: { id },
    include: {
      sites: { orderBy: { createdAt: "desc" } },
      users: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createOrganization(name: string) {
  await requireAdmin();
  return prisma.organization.create({ data: { name } });
}

export async function deleteOrganization(id: string) {
  await requireAdmin();
  return prisma.organization.delete({ where: { id } });
}

export async function createSite(input: {
  organizationId: string;
  name: string;
  domain: string;
}) {
  await requireAdmin();
  return prisma.site.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      domain: input.domain,
      publicId: generatePublicId(),
    },
  });
}

export async function deleteSite(id: string) {
  await requireAdmin();
  return prisma.site.delete({ where: { id } });
}

export async function createClientUser(input: {
  organizationId: string;
  email: string;
  name?: string;
  password: string;
}) {
  await requireAdmin();
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      organizationId: input.organizationId,
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash,
      role: "CLIENT",
    },
  });
}

export async function deleteUser(id: string) {
  await requireAdmin();
  return prisma.user.delete({ where: { id } });
}

/** Cross-site overview for the admin home: totals per site over a window. */
export async function adminSiteOverview(sinceDays = 30) {
  await requireAdmin();
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const sites = await prisma.site.findMany({
    include: { organization: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const results = await Promise.all(
    sites.map(async (site) => {
      const [pageviews, visitorRows] = await Promise.all([
        prisma.event.count({
          where: { siteId: site.id, type: "PAGEVIEW", timestamp: { gte: since } },
        }),
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT "visitorId") AS count
          FROM "Event"
          WHERE "siteId" = ${site.id} AND "type" = 'PAGEVIEW'::"EventType"
            AND "timestamp" >= ${since}`,
      ]);
      return {
        site,
        pageviews,
        visitors: Number(visitorRows[0]?.count ?? 0),
      };
    }),
  );
  return results;
}
