"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import {
  submitRequestAction,
  submitReplyAction,
  type SupportFormState,
} from "@/app/(app)/dashboard/support/actions";
import type { SupportType } from "@prisma/client";

const initial: SupportFormState = { ok: false, error: null };

export type SiteOption = { id: string; name: string };

/** Serializable subset of a SupportCategory the client form needs. */
export type RequestFormConfig = {
  type: SupportType;
  fields: "basic" | "detailed";
  subjectLabel: string;
  subjectPlaceholder: string;
  messageLabel: string;
  messagePlaceholder: string;
  submitLabel: string;
  successText: string;
};

/** Hidden when a client has a single site; a picker when they have several. */
function SiteField({ sites }: { sites: SiteOption[] }) {
  if (sites.length === 0) return null;
  if (sites.length === 1) {
    return <input type="hidden" name="siteId" value={sites[0].id} />;
  }
  return (
    <div className="space-y-1.5">
      <Label htmlFor="siteId">Website</Label>
      <Select id="siteId" name="siteId" defaultValue={sites[0].id}>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Feedback({
  state,
  successText,
}: {
  state: SupportFormState;
  successText: string;
}) {
  if (state.error) {
    return <p className="text-sm text-[var(--danger)]">{state.error}</p>;
  }
  if (state.ok) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-[var(--success)]">
        <CheckCircle2 size={14} /> {successText}
      </p>
    );
  }
  return null;
}

function useResetOnSuccess(ok: boolean) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

/** Generic "raise a support request" form, configured per category. */
export function RequestForm({
  config,
  sites,
}: {
  config: RequestFormConfig;
  sites: SiteOption[];
}) {
  const [state, action, pending] = useActionState(submitRequestAction, initial);
  const ref = useResetOnSuccess(state.ok);
  const detailed = config.fields === "detailed";

  return (
    <form ref={ref} action={action} className="space-y-4">
      <input type="hidden" name="type" value={config.type} />
      <SiteField sites={sites} />

      <div
        className={detailed ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : undefined}
      >
        <div className="space-y-1.5">
          <Label htmlFor="subject">{config.subjectLabel}</Label>
          <Input
            id="subject"
            name="subject"
            placeholder={config.subjectPlaceholder}
            required
          />
        </div>
        {detailed && (
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" name="priority" defaultValue="NORMAL">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
        )}
      </div>

      {detailed && (
        <div className="space-y-1.5">
          <Label htmlFor="pageUrl">Page URL (optional)</Label>
          <Input
            id="pageUrl"
            name="pageUrl"
            placeholder="https://yoursite.com/about"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="message">{config.messageLabel}</Label>
        <Textarea
          id="message"
          name="message"
          placeholder={config.messagePlaceholder}
          required
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : config.submitLabel}
        </Button>
        <Feedback state={state} successText={config.successText} />
      </div>
    </form>
  );
}

/** Append a turn to a request's conversation — used by both client and admin. */
export function ReplyForm({
  requestId,
  placeholder = "Write a reply…",
}: {
  requestId: string;
  placeholder?: string;
}) {
  const [state, action, pending] = useActionState(submitReplyAction, initial);
  const ref = useResetOnSuccess(state.ok);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      <Textarea
        name="body"
        placeholder={placeholder}
        required
        className="min-h-[72px]"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
        <Feedback state={state} successText="Reply sent." />
      </div>
    </form>
  );
}
