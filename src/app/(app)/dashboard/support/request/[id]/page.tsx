import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/data/access";
import { getSupportThread } from "@/lib/data/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  StatusBadge,
  PriorityTag,
  SUPPORT_TYPE_LABEL,
} from "@/components/support/support-ui";
import { SupportThread, buildThread } from "@/components/support/thread";
import { ReplyForm } from "@/components/support/forms";
import { AutoRefresh } from "@/components/auto-refresh";
import { slugForType } from "@/lib/support-config";

export const dynamic = "force-dynamic";

export default async function SupportRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const request = await getSupportThread(id);
  if (!request) notFound();

  const messages = buildThread(request);
  const backHref = `/dashboard/support/${slugForType(request.type)}`;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Live: surfaces the agency's replies without a manual refresh. */}
      <AutoRefresh interval={15000} />
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} /> Back to support
      </Link>

      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">
            {request.subject}
          </h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span>{SUPPORT_TYPE_LABEL[request.type]}</span>
          <span>· Opened {format(request.createdAt, "d MMM yyyy")}</span>
          {request.site && <span>· {request.site.name}</span>}
          <PriorityTag priority={request.priority} />
        </p>
        {request.pageUrl && (
          <a
            href={request.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm text-[var(--accent)] hover:underline"
          >
            {request.pageUrl}
          </a>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <SupportThread messages={messages} viewerEmail={user.email} />
          <div className="border-t border-border pt-4">
            <ReplyForm
              requestId={request.id}
              placeholder="Reply to the Vylora X team…"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
