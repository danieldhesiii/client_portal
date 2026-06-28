"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupportRequest, addSupportReply } from "@/lib/data/support";
import { AccessError } from "@/lib/data/access";
import { slugForType } from "@/lib/support-config";

export type SupportFormState = { ok: boolean; error: string | null };
const OK: SupportFormState = { ok: true, error: null };
const fail = (error: string): SupportFormState => ({ ok: false, error });

function handle(err: unknown): SupportFormState {
  if (err instanceof AccessError) return fail(err.message);
  if (err instanceof z.ZodError) {
    return fail(err.issues[0]?.message ?? "Invalid input");
  }
  return fail("Something went wrong. Please try again.");
}

const optionalText = (v: FormDataEntryValue | null) =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

const requestSchema = z.object({
  type: z.enum(["CONTACT", "WEBSITE_EDIT", "BUG_REPORT", "BILLING"]),
  subject: z.string().trim().min(1, "Please add a subject").max(150),
  message: z.string().trim().min(1, "Please add some detail").max(5000),
  pageUrl: z.string().trim().max(2048).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
  siteId: z.string().optional(),
});

export async function submitRequestAction(
  _prev: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  try {
    const data = requestSchema.parse({
      type: formData.get("type"),
      subject: formData.get("subject"),
      message: formData.get("message"),
      pageUrl: optionalText(formData.get("pageUrl")),
      priority: optionalText(formData.get("priority")) ?? "NORMAL",
      siteId: optionalText(formData.get("siteId")),
    });
    await createSupportRequest({
      type: data.type,
      subject: data.subject,
      message: data.message,
      pageUrl: data.pageUrl ?? null,
      priority: data.priority,
      siteId: data.siteId ?? null,
    });
    revalidatePath(`/dashboard/support/${slugForType(data.type)}`);
    return OK;
  } catch (err) {
    return handle(err);
  }
}

const replySchema = z.object({
  requestId: z.string().min(1),
  body: z.string().trim().min(1, "Write a reply first").max(5000),
});

export async function submitReplyAction(
  _prev: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  try {
    const data = replySchema.parse({
      requestId: formData.get("requestId"),
      body: formData.get("body"),
    });
    await addSupportReply({ requestId: data.requestId, body: data.body });
    // Refresh both vantage points so each side sees the new turn immediately.
    revalidatePath("/admin");
    revalidatePath(`/dashboard/support/request/${data.requestId}`);
    return OK;
  } catch (err) {
    return handle(err);
  }
}
