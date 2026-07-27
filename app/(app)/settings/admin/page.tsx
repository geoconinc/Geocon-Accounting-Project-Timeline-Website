import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { isOwnerUser } from "@/lib/auth/superAdmin";
import { isAdminAsync } from "@/lib/server/access";
import { AdminSettingsView } from "@/components/settings/AdminSettingsView";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || !(await isAdminAsync(user))) {
    redirect("/settings");
  }
  return <AdminSettingsView isOwner={isOwnerUser(user)} />;
}
