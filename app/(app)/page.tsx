import Board from "@/components/Board";
import { getCurrentUser } from "@/lib/auth/session";
import { getBoardPayloadForUser } from "@/lib/server/access";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Board
        initialData={{
          projects: [],
          subitems: [],
          users: [],
          files: [],
          me: "",
          isAdmin: false,
          boardRole: "assignee" as const,
          viewAs: null
        }}
      />
    );
  }

  return <Board initialData={await getBoardPayloadForUser(user)} />;
}
