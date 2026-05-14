import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DEMO_MODE } from "@/lib/demo/config";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";
import { AdminSettingsView } from "@/components/settings/AdminSettingsView";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (DEMO_MODE) {
    redirect("/settings");
  }
  const user = await getCurrentUser();
  if (!user || !isSuperAdminUser(user)) {
    redirect("/settings");
  }
  return <AdminSettingsView />;
}
