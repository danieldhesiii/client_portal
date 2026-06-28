import { format } from "date-fns";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

export type ThreadMessage = {
  id: string;
  role: Role;
  email: string;
  body: string;
  createdAt: Date;
};

/**
 * Flatten a request + its replies into a single ordered conversation. The
 * request's opening `message` is always the client's first turn.
 */
export function buildThread(req: {
  id: string;
  createdByEmail: string;
  message: string;
  createdAt: Date;
  replies: {
    id: string;
    authorRole: Role;
    authorEmail: string;
    body: string;
    createdAt: Date;
  }[];
}): ThreadMessage[] {
  return [
    {
      id: `req-${req.id}`,
      role: "CLIENT",
      email: req.createdByEmail,
      body: req.message,
      createdAt: req.createdAt,
    },
    ...req.replies.map((r) => ({
      id: r.id,
      role: r.authorRole,
      email: r.authorEmail,
      body: r.body,
      createdAt: r.createdAt,
    })),
  ];
}

const AGENCY_TINT = {
  backgroundColor: "color-mix(in oklab, var(--accent) 8%, transparent)",
  borderColor: "color-mix(in oklab, var(--accent) 35%, transparent)",
};

/** Renders a support conversation. Agency turns are accent-tinted and badged. */
export function SupportThread({
  messages,
  viewerEmail,
}: {
  messages: ThreadMessage[];
  viewerEmail?: string;
}) {
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const isAgency = m.role === "ADMIN";
        const isYou = viewerEmail != null && m.email === viewerEmail;
        const author = isYou ? "You" : isAgency ? "Vylora X team" : m.email;
        return (
          <div
            key={m.id}
            className={cn(
              "rounded-lg border px-3 py-2",
              !isAgency && "border-border bg-muted/40",
            )}
            style={isAgency ? AGENCY_TINT : undefined}
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                {author}
                {isAgency && (
                  <span className="rounded bg-[var(--accent)] px-1 py-0.5 text-[10px] font-medium text-[var(--accent-foreground)]">
                    Agency
                  </span>
                )}
              </span>
              <span className="shrink-0 text-muted-foreground tabular">
                {format(m.createdAt, "d MMM yyyy, HH:mm")}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {m.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
