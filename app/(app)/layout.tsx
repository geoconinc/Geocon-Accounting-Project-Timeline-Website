import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Sidebar from "@/components/nav/Sidebar";
import TopBar from "@/components/TopBar";
import { RoleRosterProvider } from "@/components/providers/RoleRosterProvider";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-100">
          <RoleRosterProvider>{children}</RoleRosterProvider>
        </main>
      </div>
    </div>
  );
}
