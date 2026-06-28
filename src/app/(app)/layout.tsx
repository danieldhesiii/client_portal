import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser, listAccessibleSites } from "@/lib/data/access";
import { TopNav } from "@/components/app-shell/top-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sites = await listAccessibleSites();

  return (
    <div className="min-h-screen">
      <Suspense fallback={<div className="h-14 border-b border-border" />}>
        <TopNav
          sites={sites.map((s) => ({ id: s.id, name: s.name, domain: s.domain }))}
          isAdmin={user.role === "ADMIN"}
          user={{ name: user.name, email: user.email }}
        />
      </Suspense>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
