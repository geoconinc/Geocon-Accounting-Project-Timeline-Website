import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { storage } from "@/lib/storage";
import { notifyUser } from "@/lib/notifications/dispatch";
import { buildManualProjectUpdateEmail } from "@/lib/notifications/templates/operational";
import { canManageProject, forbidden } from "@/lib/server/access";
import { isAccountingEmailRecipient } from "@/lib/notifications/accountingOnly";

export async function POST(req: Request) {
  const auth = await authenticateRequest();
  if (auth instanceof Response) return auth;
  const { userId, projectId, subject, message } = (await req.json()) as {
    userId: string;
    projectId?: string;
    subject: string;
    message: string;
  };

  if (projectId) {
    const project = await storage.getProject(projectId);
    if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
    if (!(await canManageProject(auth, project))) return forbidden();
    if (!isAccountingEmailRecipient(userId, project)) {
      return NextResponse.json(
        { error: "invalid_recipient", message: "Only accounting assignees can be emailed." },
        { status: 400 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "invalid_request", message: "projectId is required." },
      { status: 400 }
    );
  }

  const recipient = await storage.getUserById(userId);
  if (!recipient) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const project = (await storage.getProject(projectId))!;
  const mail = await buildManualProjectUpdateEmail({
    recipientName: recipient.name,
    actorName: auth.name,
    projectCode: project.code,
    projectName: project.name,
    messageBody: message,
    projectId: project.id
  });

  await notifyUser({
    userId,
    projectId,
    category: "manualMessage",
    subject: mail.subject,
    message: mail.message,
    html: mail.html
  });
  return NextResponse.json({ ok: true });
}
