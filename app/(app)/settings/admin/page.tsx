import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isSuperAdminUser } from "@/lib/auth/superAdmin";
import { AdminSettingsView } from "@/components/settings/AdminSettingsView";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !isSuperAdminUser(user)) {
    redirect("/settings");
  }
  return <AdminSettingsView />;
}
