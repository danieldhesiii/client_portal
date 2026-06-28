import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import {
  StatusBadge,
  PriorityTag,
  SUPPORT_TYPE_LABEL,
} from "@/components/support/support-ui";
import { SupportThread, buildThread } from "@/components/support/thread";
import { ReplyForm } from "@/components/support/forms";
import { updateSupportStatusAction } from "@/app/(app)/admin/actions";
import type { listAllSupportRequests } from "@/lib/data/support";

type Request = Awaited<ReturnType<typeof listAllSupportRequests>>[number];

/**
 * Agency-side inbox: every client request as a conversation the admin can reply
 * to inline, plus a status control. `viewerEmail` lets the thread label the
 * admin's own turns as "You".
 */
export function SupportInbox({
  requests,
  viewerEmail,
}: {
  requests: Request[];
  viewerEmail: string;
}) {
  const open = requests.filter((r) => r.status !== "RESOLVED").length;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">
        Support requests
        {open > 0 && (
          <span className="ml-2 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-xs font-medium text-[var(--accent-foreground)]">
            {open} open
          </span>
        )}
      </h2>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="No support requests"
              description="Messages and website-edit requests from clients will appear here."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{r.subject}</span>
                    <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">
                      {SUPPORT_TYPE_LABEL[r.type]}
                    </span>
                    <PriorityTag priority={r.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.organization.name}
                    {r.site ? ` · ${r.site.name}` : ""} · {r.createdByEmail} ·{" "}
                    {format(r.createdAt, "d MMM yyyy, HH:mm")}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {r.pageUrl && (
                <a
                  href={r.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                >
                  {r.pageUrl} <ExternalLink size={11} />
                </a>
              )}

              <div className="mt-3">
                <SupportThread
                  messages={buildThread(r)}
                  viewerEmail={viewerEmail}
                />
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <ReplyForm
                  requestId={r.id}
                  placeholder={`Reply to ${r.organization.name}…`}
                />
              </div>

              <form
                action={updateSupportStatusAction}
                className="mt-3 flex items-center gap-2 border-t border-border pt-3"
              >
                <input type="hidden" name="id" value={r.id} />
                <Select
                  name="status"
                  defaultValue={r.status}
                  className="h-8 w-auto text-xs"
                  aria-label="Update status"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="RESOLVED">Resolved</option>
                </Select>
                <Button type="submit" size="sm" variant="secondary">
                  Update status
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
