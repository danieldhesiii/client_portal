import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/misc";
import { StatusBadge, PriorityTag, SUPPORT_TYPE_LABEL } from "./support-ui";
import type { listMySupportRequests } from "@/lib/data/support";

type MyRequest = Awaited<ReturnType<typeof listMySupportRequests>>[number];

/** A client's own requests; each row opens its conversation thread. */
export function MyRequestList({
  requests,
  emptyLabel = "No requests yet",
}: {
  requests: MyRequest[];
  emptyLabel?: string;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title={emptyLabel}
        description="Anything you submit will appear here so you can track its progress."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {requests.map((r) => (
        <li key={r.id}>
          <Link
            href={`/dashboard/support/request/${r.id}`}
            className="group -mx-2 flex items-start gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.subject}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span>{SUPPORT_TYPE_LABEL[r.type]}</span>
                    <span>· {format(r.updatedAt, "d MMM yyyy")}</span>
                    {r.site && <span>· {r.site.name}</span>}
                    {r._count.replies > 0 && (
                      <span className="inline-flex items-center gap-1">
                        ·<MessageSquare size={11} /> {r._count.replies}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={r.status} />
                  <PriorityTag priority={r.priority} />
                </div>
              </div>
              {r.message && (
                <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">
                  {r.message}
                </p>
              )}
            </div>
            <ChevronRight
              size={16}
              className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
