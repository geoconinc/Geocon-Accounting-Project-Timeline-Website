import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminAsync } from "@/lib/server/access";
import Sidebar from "@/components/nav/Sidebar";
import TopBar from "@/components/TopBar";
import PageTransition from "@/components/PageTransition";
import { syncOfficeAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncOfficeAssignees";
import { syncRoleAssigneeUsersIntoStorage } from "@/lib/server/site-data/syncRoleAssignees";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const showAdmin = await isAdminAsync(user);

  // Fire-and-forget: keep roster in sync without blocking page render
  Promise.all([
    syncRoleAssigneeUsersIntoStorage(),
    syncOfficeAssigneeUsersIntoStorage()
  ]).catch(() => {});

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar showAdmin={showAdmin} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-100">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
