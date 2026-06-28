import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin, AccessError } from "./access";
import type {
  SupportStatus,
  SupportType,
  SupportPriority,
} from "@prisma/client";

/**
 * Support tickets data layer. Clients raise requests scoped to their own
 * organization; the agency (ADMIN) reads every request and updates status.
 * Tenant isolation mirrors the analytics layer — a CLIENT can only ever see or
 * create requests for their own org, enforced here rather than in the UI.
 */

export type CreateSupportInput = {
  type: SupportType;
  subject: string;
  message: string;
  pageUrl?: string | null;
  priority?: SupportPriority;
  siteId?: string | null;
};

export async function createSupportRequest(input: CreateSupportInput) {
  const user = await requireUser();
  if (!user.organizationId) {
    throw new AccessError(
      "Support requests can only be raised from a client account.",
      403,
    );
  }

  // Only accept a siteId that actually belongs to the caller's organization.
  let siteId: string | null = null;
  if (input.siteId) {
    const site = await prisma.site.findUnique({ where: { id: input.siteId } });
    if (site && site.organizationId === user.organizationId) siteId = site.id;
  }

  return prisma.supportRequest.create({
    data: {
      type: input.type,
      subject: input.subject,
      message: input.message,
      pageUrl: input.pageUrl ?? null,
      priority: input.priority ?? "NORMAL",
      organizationId: user.organizationId,
      siteId,
      createdById: user.id,
      createdByEmail: user.email,
    },
  });
}

/**
 * The current client's own requests, most-recently-active first (a new reply
 * bumps `updatedAt`), optionally filtered by type. Includes a reply count.
 */
export async function listMySupportRequests(type?: SupportType) {
  const user = await requireUser();
  if (!user.organizationId) return [];
  return prisma.supportRequest.findMany({
    where: { organizationId: user.organizationId, ...(type ? { type } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: {
      site: { select: { name: true } },
      _count: { select: { replies: true } },
    },
  });
}

/** Every request across all clients, open tickets first. ADMIN only. */
export async function listAllSupportRequests() {
  await requireAdmin();
  return prisma.supportRequest.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 200,
    include: {
      organization: { select: { name: true } },
      site: { select: { name: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
  });
}

/**
 * Load a single request with its full conversation, authorised for the caller
 * (ADMIN sees any; a CLIENT only their own org's). Returns null when missing or
 * not permitted, so callers can render a 404 without leaking existence.
 */
export async function getSupportThread(id: string) {
  const user = await requireUser();
  const request = await prisma.supportRequest.findUnique({
    where: { id },
    include: {
      site: { select: { name: true } },
      organization: { select: { name: true } },
      replies: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) return null;
  if (user.role !== "ADMIN") {
    if (!user.organizationId || request.organizationId !== user.organizationId) {
      return null;
    }
  }
  return request;
}

/**
 * Append a reply to a request's conversation. ADMIN may reply to any request;
 * a CLIENT only to their own org's. Replying also nudges status so threads stay
 * accurate: an agency reply moves OPEN → IN_PROGRESS; a client reply reopens a
 * resolved ticket. Either way `updatedAt` bumps so the thread floats to the top.
 */
export async function addSupportReply(input: {
  requestId: string;
  body: string;
}) {
  const user = await requireUser();
  const request = await prisma.supportRequest.findUnique({
    where: { id: input.requestId },
  });
  if (!request) throw new AccessError("Request not found", 404);
  if (user.role !== "ADMIN") {
    if (!user.organizationId || request.organizationId !== user.organizationId) {
      throw new AccessError("You do not have access to this request.", 403);
    }
  }

  const nextStatus: SupportStatus =
    user.role === "ADMIN"
      ? request.status === "OPEN"
        ? "IN_PROGRESS"
        : request.status
      : request.status === "RESOLVED"
        ? "OPEN"
        : request.status;

  const [reply] = await prisma.$transaction([
    prisma.supportReply.create({
      data: {
        requestId: request.id,
        authorId: user.id,
        authorEmail: user.email,
        authorRole: user.role,
        body: input.body,
      },
    }),
    prisma.supportRequest.update({
      where: { id: request.id },
      // Touch updatedAt even when status is unchanged so ordering reflects activity.
      data: { status: nextStatus, updatedAt: new Date() },
    }),
  ]);
  return reply;
}

export async function updateSupportStatus(id: string, status: SupportStatus) {
  await requireAdmin();
  return prisma.supportRequest.update({ where: { id }, data: { status } });
}
