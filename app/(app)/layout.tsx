import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/demo/config";
import Sidebar from "@/components/nav/Sidebar";
import TopBar from "@/components/TopBar";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (DEMO_MODE) {
    return <AppShell>{children}</AppShell>;
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar user={user} />
        <main className="flex-1 overflow-hidden bg-slate-100">{children}</main>
      </div>
    </div>
  );
}
