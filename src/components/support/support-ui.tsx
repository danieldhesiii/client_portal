import type {
  SupportStatus,
  SupportType,
  SupportPriority,
} from "@prisma/client";

const STATUS: Record<SupportStatus, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "var(--accent)" },
  IN_PROGRESS: { label: "In progress", color: "#f5a623" },
  RESOLVED: { label: "Resolved", color: "var(--success)" },
};

export const SUPPORT_TYPE_LABEL: Record<SupportType, string> = {
  CONTACT: "Contact",
  WEBSITE_EDIT: "Website edit",
  BUG_REPORT: "Issue",
  BILLING: "Billing",
};

const PRIORITY: Record<
  SupportPriority,
  { label: string; color: string } | null
> = {
  LOW: { label: "Low priority", color: "var(--muted-foreground)" },
  NORMAL: null,
  HIGH: { label: "High priority", color: "var(--danger)" },
};

/** Status pill with a coloured dot — shared by the client list and admin inbox. */
export function StatusBadge({ status }: { status: SupportStatus }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.color }}
        aria-hidden
      />
      {s.label}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: SupportPriority }) {
  const p = PRIORITY[priority];
  if (!p) return null;
  return (
    <span
      className="text-xs font-medium"
      style={{ color: p.color }}
    >
      {p.label}
    </span>
  );
}
