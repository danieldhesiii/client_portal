import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser, listAccessibleSites } from "@/lib/data/access";
import { listMySupportRequests } from "@/lib/data/support";
import { categoryBySlug } from "@/lib/support-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestForm } from "@/components/support/forms";
import { MyRequestList } from "@/components/support/request-list";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function SupportCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categoryBySlug(slug);
  if (!category) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "ADMIN";
  const [sites, requests] = await Promise.all([
    listAccessibleSites(),
    isAdmin ? Promise.resolve([]) : listMySupportRequests(category.type),
  ]);
  const Icon = category.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-start gap-3">
        <span className="mt-0.5 rounded-md border border-border bg-muted p-2 text-foreground">
          <Icon size={18} />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {category.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            {category.description}
          </p>
        </div>
      </header>

      {isAdmin ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Support requests are raised by client logins. View and action
              every client request in the{" "}
              <Link
                href="/admin"
                className="font-medium text-[var(--accent)] hover:underline"
              >
                Admin
              </Link>{" "}
              area.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Keep the request list in sync as the agency replies / updates status. */}
          <AutoRefresh interval={20000} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">
                New request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RequestForm
                config={{
                  type: category.type,
                  fields: category.fields,
                  subjectLabel: category.subjectLabel,
                  subjectPlaceholder: category.subjectPlaceholder,
                  messageLabel: category.messageLabel,
                  messagePlaceholder: category.messagePlaceholder,
                  submitLabel: category.submitLabel,
                  successText: category.successText,
                }}
                sites={sites.map((s) => ({ id: s.id, name: s.name }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your requests</CardTitle>
            </CardHeader>
            <CardContent>
              <MyRequestList
                requests={requests}
                emptyLabel="No requests yet"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
