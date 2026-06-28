"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  createOrgAction,
  createSiteAction,
  createClientAction,
  type ActionState,
} from "@/app/(app)/admin/actions";

const initial: ActionState = { ok: false, error: null };

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-xs text-[var(--danger)]">{error}</p>;
}

/** Resets the form's fields once an action succeeds. */
function useResetOnSuccess(ok: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

export function NewOrgForm() {
  const [state, action, pending] = useActionState(createOrgAction, initial);
  const ref = useResetOnSuccess(state.ok);
  return (
    <form ref={ref} action={action} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="org-name">New client / organization</Label>
        <Input id="org-name" name="name" placeholder="Acme Coffee Co." required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add client"}
      </Button>
      <FormError error={state.error} />
    </form>
  );
}

export function NewSiteForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(createSiteAction, initial);
  const ref = useResetOnSuccess(state.ok);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Site name</Label>
          <Input name="name" placeholder="Marketing site" required />
        </div>
        <div className="space-y-1.5">
          <Label>Domain</Label>
          <Input name="domain" placeholder="acme.com" required />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Add site"}
        </Button>
        <FormError error={state.error} />
      </div>
    </form>
  );
}

export function NewClientUserForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(createClientAction, initial);
  const ref = useResetOnSuccess(state.ok);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="organizationId" value={organizationId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input name="name" placeholder="Jane Doe" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input name="email" type="email" placeholder="jane@acme.com" required />
        </div>
        <div className="space-y-1.5">
          <Label>Temp password</Label>
          <Input name="password" type="text" placeholder="min 8 chars" required />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Add login"}
        </Button>
        <FormError error={state.error} />
      </div>
    </form>
  );
}
