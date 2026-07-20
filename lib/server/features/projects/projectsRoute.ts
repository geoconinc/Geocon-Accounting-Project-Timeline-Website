import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/server/routeAuth";
import { getBoardPayloadForUser, hasFullBoardAccessAsync, forbidden } from "@/lib/server/access";
import { createProjectWithSubitems } from "@/lib/server/features/projects/createProjectWithSubitems";
import { parseJsonBody, badRequest } from "@/lib/server/http";
import type { Project } from "@/lib/types";

export async function GET(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;

  const includeFiles = new URL(req.url).searchParams.get("includeFiles") !== "false";
  return NextResponse.json(await getBoardPayloadForUser(user, { includeFiles }));
}

export async function POST(req: Request) {
  const user = await authenticateRequest();
  if (user instanceof Response) return user;
  if (!(await hasFullBoardAccessAsync(user))) return forbidden();
  const body = await parseJsonBody<
    Partial<Omit<Project, "id" | "lastUpdatedAt" | "position" | "lastUpdatedBy">>
  >(req);
  if (!body) return badRequest();

  const project = await createProjectWithSubitems({
    project: {
      code: body.code ?? "NEW",
      name: body.name ?? "New project",
      ownerId: body.ownerId ?? user.id,
      status: body.status ?? "New",
      group: body.group ?? "Current",
      startDate: body.startDate ?? null,
      timelineStart: body.timelineStart ?? null,
      timelineEnd: body.timelineEnd ?? null,
      dirNumber: body.dirNumber ?? null,
      union: body.union ?? false,
      reportingSystems: body.reportingSystems ?? null,
      cprContact: body.cprContact ?? null,
      sharepointUrl: body.sharepointUrl ?? null,
      office: body.office ?? null,
      projectManagerId:
        typeof body.projectManagerId === "string" && body.projectManagerId
          ? body.projectManagerId
          : null,
      projectDirectorId:
        typeof body.projectDirectorId === "string" && body.projectDirectorId
          ? body.projectDirectorId
          : null,
      notes: body.notes ?? null,
      gmsProposalId: body.gmsProposalId ?? null
    },
    actorId: user.id,
    actorName: user.name
  });

  return NextResponse.json({ project });
}
