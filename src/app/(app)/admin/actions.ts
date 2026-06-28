"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createOrganization,
  createSite,
  createClientUser,
  deleteOrganization,
  deleteSite,
  deleteUser,
} from "@/lib/data/admin";
import { AccessError } from "@/lib/data/access";

export type ActionState = { ok: boolean; error: string | null };
const OK: ActionState = { ok: true, error: null };

function fail(error: string): ActionState {
  return { ok: false, error };
}

async function guard<T>(fn: () => Promise<T>): Promise<ActionState> {
  try {
    await fn();
    revalidatePath("/admin");
    return OK;
  } catch (err) {
    if (err instanceof AccessError) return fail(err.message);
    if (err instanceof z.ZodError) return fail(err.issues[0]?.message ?? "Invalid input");
    // Prisma unique-constraint (e.g. duplicate email) and friends.
    const message =
      err instanceof Error && err.message.includes("Unique constraint")
        ? "That email is already in use."
        : "Something went wrong. Please try again.";
    return fail(message);
  }
}

export async function createOrgAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = z.string().min(1, "Name is required").parse(formData.get("name"));
  return guard(() => createOrganization(name));
}

export async function createSiteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = z
    .object({
      organizationId: z.string().min(1),
      name: z.string().min(1, "Site name is required"),
      domain: z
        .string()
        .min(1, "Domain is required")
        .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/$/, "")),
    })
    .parse({
      organizationId: formData.get("organizationId"),
      name: formData.get("name"),
      domain: formData.get("domain"),
    });
  return guard(() => createSite(input));
}

export async function createClientAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = z
    .object({
      organizationId: z.string().min(1),
      email: z.string().email("Enter a valid email"),
      name: z.string().optional(),
      password: z.string().min(8, "Password must be at least 8 characters"),
    })
    .parse({
      organizationId: formData.get("organizationId"),
      email: formData.get("email"),
      name: formData.get("name") || undefined,
      password: formData.get("password"),
    });
  return guard(() => createClientUser(input));
}

export async function deleteOrgAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await deleteOrganization(id);
  revalidatePath("/admin");
}

export async function deleteSiteAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await deleteSite(id);
  revalidatePath("/admin");
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await deleteUser(id);
  revalidatePath("/admin");
}
