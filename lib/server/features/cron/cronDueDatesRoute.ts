import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";

// Hit daily by an Azure timer / WebJob with header X-Cron-Secret: $CRON_SHARED_SECRET.
// Sends a notification to the assignee for any subitem whose due date is today
// and which isn't already Completed or N/A.

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SHARED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const projects = await storage.listProjects();
  let sent = 0;

  for (const p of projects) {
    const subs = await storage.listSubitems(p.id);
    for (const s of subs) {
      if (!s.dueDate || s.dueDate !== today) continue;
      if (s.status === "Completed" || s.status === "NA") continue;
      if (!s.ownerId) continue;
      await notifyUser({
        userId: s.ownerId,
        projectId: p.id,
        subject: `Due today: ${s.name}`,
        message: `Reminder: "${s.name}" on project ${p.code} ${p.name} is due today.`
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent });
}
