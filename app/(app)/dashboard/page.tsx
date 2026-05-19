import { DashboardView } from "@/components/dashboard/DashboardView";
import { getCurrentUser } from "@/lib/auth/session";
import { getBoardPayloadForUser } from "@/lib/server/access";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const initialData = user
    ? await getBoardPayloadForUser(user, { includeFiles: false })
    : { projects: [], subitems: [], users: [], files: [], me: "" };

  return <DashboardView initialData={initialData} />;
}
