import { storage } from "@/lib/storage";
import Board from "@/components/Board";
import { DEMO_MODE, DEMO_USER } from "@/lib/demo/config";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  if (DEMO_MODE) {
    return (
      <Board
        initialData={{ projects: [], subitems: [], users: [], files: [], me: DEMO_USER.id }}
      />
    );
  }

  const [projects, users] = await Promise.all([storage.listProjects(), storage.listUsers()]);
  const subitemArrays = await Promise.all(projects.map((p) => storage.listSubitems(p.id)));
  const fileArrays = await Promise.all(projects.map((p) => storage.listFiles("project", p.id)));
  const subitems = subitemArrays.flat();
  const subitemFileArrays = await Promise.all(
    subitems.map((s) => storage.listFiles("subitem", s.id))
  );

  return (
    <Board
      initialData={{
        projects,
        subitems,
        users,
        files: [...fileArrays.flat(), ...subitemFileArrays.flat()],
        me: users.find((u) => u.email)?.id ?? ""
      }}
    />
  );
}
