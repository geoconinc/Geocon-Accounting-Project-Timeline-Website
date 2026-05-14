import { DEMO_MODE } from "@/lib/demo/config";
import roster from "@/data/geoconRoleAssignees.json";
import officeDir from "@/data/officeAssigneeDirectory.json";
import { demoStore } from "@/lib/demo/localStore";
import { initialsFromName } from "@/lib/utils";

let didSync = false;

/** Upserts PM + director roster into demo localStorage so board pickers are populated. */
export function syncDemoRoleRosterUsersOnce(): void {
  if (!DEMO_MODE || didSync || typeof window === "undefined") return;
  didSync = true;
  for (const d of roster.projectDirectors) {
    const e = d.email?.trim();
    if (!e) continue;
    demoStore.upsertUser({ name: d.name, email: e });
  }
  for (const p of roster.projectManagers) {
    const e = p.email?.trim();
    if (!e) continue;
    demoStore.upsertUser({ name: p.name, email: e });
  }
  for (const row of officeDir.assignees) {
    const e = row.email?.trim();
    if (!e) continue;
    demoStore.upsertUser({
      name: row.employeeListName.trim(),
      email: e,
      initials: initialsFromName(row.employeeListName)
    });
  }
  window.dispatchEvent(new CustomEvent("geocon-demo-change"));
}
