import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { initialsFromName } from "@/lib/utils";
import { E2E_DATA_DIR, E2E_STORAGE_STATE, E2E_USER } from "./constants";

const SESSION_COOKIE = "session_token";
const nowIso = () => new Date().toISOString();
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

/**
 * Seeds an isolated JSON database with one user + one session, then writes a
 * Playwright storage state carrying that session cookie. This lets the suite
 * exercise authenticated pages without going through Microsoft/MSAL login.
 */
export default async function globalSetup() {
  const token = randomUUID() + randomUUID().replace(/-/g, "");

  const project = {
    id: "e2e-project-1",
    code: "E2E-001",
    name: "E2E Smoke Project",
    ownerId: E2E_USER.id,
    status: "InProgress",
    group: "Current",
    startDate: null,
    timelineStart: "2026-01-01",
    timelineEnd: "2026-06-01",
    dirNumber: null,
    union: false,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    office: "San Diego",
    projectManagerId: null,
    projectDirectorId: null,
    notes: null,
    lastUpdatedAt: nowIso(),
    lastUpdatedBy: null,
    position: 0,
    gmsProposalId: null,
    // Timeline board is PW-only; without this the seed is filtered out of /api/projects.
    prevailingWage: true
  };

  const db = {
    users: [
      {
        id: E2E_USER.id,
        email: E2E_USER.email,
        name: E2E_USER.name,
        initials: initialsFromName(E2E_USER.name),
        createdAt: nowIso(),
        lastLoginAt: nowIso()
      }
    ],
    sessions: [{ token, userId: E2E_USER.id, expiresAt: inDays(30) }],
    projects: [project],
    subitems: [
      {
        id: "e2e-sub-1",
        projectId: project.id,
        name: "DAS 140 & Confirmation",
        ownerId: E2E_USER.id,
        status: "NotStarted",
        dueDate: null,
        dateCompleted: null,
        notes: null,
        position: 0,
        createdAt: nowIso()
      }
    ],
    files: [],
    activity: []
  };

  await fs.mkdir(E2E_DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(E2E_DATA_DIR, "db.json"), JSON.stringify(db, null, 2), "utf8");

  await fs.mkdir(path.dirname(E2E_STORAGE_STATE), { recursive: true });
  await fs.writeFile(
    E2E_STORAGE_STATE,
    JSON.stringify(
      {
        cookies: [
          {
            name: SESSION_COOKIE,
            value: token,
            domain: "localhost",
            path: "/",
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
            expires: Math.floor(Date.now() / 1000) + 30 * 86_400
          }
        ],
        origins: []
      },
      null,
      2
    ),
    "utf8"
  );
}
