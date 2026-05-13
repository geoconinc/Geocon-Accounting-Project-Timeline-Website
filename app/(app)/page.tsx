import Board from "@/components/Board";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getBoardPayloadForUser } from "@/lib/server/access";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  if (DEMO_MODE) {
    return (
      <Board
        initialData={{ projects: [], subitems: [], users: [], files: [], me: DEMO_USER.id }}
      />
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return <Board initialData={{ projects: [], subitems: [], users: [], files: [], me: "" }} />;
  }

  return <Board initialData={await getBoardPayloadForUser(user)} />;
}
