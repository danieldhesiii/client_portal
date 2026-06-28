import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getCurrentUser } from "@/lib/data/access";
import { listOrganizations, adminSiteOverview } from "@/lib/data/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { EmbedSnippet } from "@/components/admin/embed-snippet";
import {
  NewOrgForm,
  NewSiteForm,
  NewClientUserForm,
} from "@/components/admin/forms";
import {
  deleteOrgAction,
  deleteSiteAction,
  deleteUserAction,
} from "./actions";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const [orgs, overview] = await Promise.all([
    listOrganizations(),
    adminSiteOverview(30),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage clients, sites, and logins.
        </p>
      </div>

      {/* Cross-site overview */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          All sites · last 30 days
        </h2>
        {overview.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState title="No sites yet" description="Add a client and a site below." />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.map(({ site, pageviews, visitors }) => (
              <Card key={site.id} className="p-4">
                <p className="text-sm font-medium">{site.name}</p>
                <p className="text-xs text-muted-foreground">
                  {site.organization.name}
                </p>
                <div className="mt-3 flex gap-6">
                  <div>
                    <p className="text-xl font-semibold tabular">
                      {formatNumber(visitors)}
                    </p>
                    <p className="text-xs text-muted-foreground">visitors</p>
                  </div>
                  <div>
                    <p className="text-xl font-semibold tabular">
                      {formatNumber(pageviews)}
                    </p>
                    <p className="text-xs text-muted-foreground">views</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* New client */}
      <section>
        <Card>
          <CardContent className="pt-6">
            <NewOrgForm />
          </CardContent>
        </Card>
      </section>

      {/* Per-organization management */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">Clients</h2>
        {orgs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState title="No clients yet" description="Add your first client above." />
            </CardContent>
          </Card>
        ) : (
          orgs.map((org) => (
            <Card key={org.id}>
              <CardHeader className="flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base text-foreground">
                    {org.name}
                  </CardTitle>
                  <Badge>{org._count.sites} sites</Badge>
                  <Badge>{org._count.users} logins</Badge>
                </div>
                <form action={deleteOrgAction}>
                  <input type="hidden" name="id" value={org.id} />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="submit"
                    aria-label="Delete client"
                    title="Delete client and all its data"
                  >
                    <Trash2 size={15} />
                  </Button>
                </form>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Sites */}
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Sites
                  </p>
                  {org.sites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sites yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {org.sites.map((site) => (
                        <div
                          key={site.id}
                          className="rounded-md border border-border p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{site.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {site.domain}
                              </p>
                            </div>
                            <form action={deleteSiteAction}>
                              <input type="hidden" name="id" value={site.id} />
                              <Button
                                variant="ghost"
                                size="icon"
                                type="submit"
                                aria-label="Delete site"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </form>
                          </div>
                          <EmbedSnippet
                            publicId={site.publicId}
                            appUrl={appUrl}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <NewSiteForm organizationId={org.id} />
                </div>

                {/* Logins */}
                <div className="space-y-3 border-t border-border pt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Client logins
                  </p>
                  {org.users.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No logins yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {org.users.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {u.name ? `${u.name} · ` : ""}
                            <span className="text-muted-foreground">
                              {u.email}
                            </span>
                          </span>
                          <form action={deleteUserAction}>
                            <input type="hidden" name="id" value={u.id} />
                            <Button
                              variant="ghost"
                              size="icon"
                              type="submit"
                              aria-label="Delete login"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <NewClientUserForm organizationId={org.id} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
