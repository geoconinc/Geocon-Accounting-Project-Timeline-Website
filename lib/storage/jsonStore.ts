import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import lockfile from "proper-lockfile";
import type { ActivityEvent, FileRef, Project, Session, Subitem, User } from "@/lib/types";
import type { Storage } from "./index";
import { initialsFromName } from "@/lib/utils";

// DATA_DIR can be overridden (e.g. for isolated E2E test data); defaults to ./data.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");
const FILES_DIR = path.join(DATA_DIR, "files");

interface DbShape {
  users: User[];
  sessions: Session[];
  projects: Project[];
  subitems: Subitem[];
  files: FileRef[];
  activity: ActivityEvent[];
}

const FILE = path.join(DATA_DIR, "db.json");

const empty: DbShape = {
  users: [],
  sessions: [],
  projects: [],
  subitems: [],
  files: [],
  activity: []
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(FILE);
  } catch {
    await fs.writeFile(FILE, JSON.stringify(empty, null, 2), "utf8");
  }
}

async function readDb(): Promise<DbShape> {
  await ensureFile();
  const raw = await fs.readFile(FILE, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    const projects = parsed.projects ?? [];
    const projectUpdated = new Map(projects.map((p) => [p.id, p.lastUpdatedAt]));
    const subitems = (parsed.subitems ?? []).map((s) => ({
      ...s,
      createdAt: s.createdAt ?? projectUpdated.get(s.projectId) ?? nowIso()
    }));
    return { ...empty, ...parsed, subitems };
  } catch {
    return { ...empty };
  }
}

async function writeDb(db: DbShape) {
  await ensureFile();
  const release = await lockfile.lock(FILE, { retries: { retries: 5, minTimeout: 30, maxTimeout: 200 } });
  try {
    const tmp = FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
    await fs.rename(tmp, FILE);
  } finally {
    await release();
  }
}

async function mutate<T>(fn: (db: DbShape) => Promise<T> | T): Promise<T> {
  const db = await readDb();
  const result = await fn(db);
  await writeDb(db);
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

export const jsonStore: Storage = {
  async listUsers() {
    return (await readDb()).users;
  },
  async getUserById(id) {
    return (await readDb()).users.find((u) => u.id === id) ?? null;
  },
  async getUserByEmail(email) {
    const lower = email.toLowerCase();
    return (await readDb()).users.find((u) => u.email.toLowerCase() === lower) ?? null;
  },
  async upsertUser(input) {
    return mutate((db) => {
      const existing = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
      if (existing) {
        Object.assign(existing, {
          name: input.name ?? existing.name,
          initials: input.initials ?? initialsFromName(input.name ?? existing.name),
          phone: input.phone ?? existing.phone,
          photoUrl: input.photoUrl ?? existing.photoUrl
        });
        return existing;
      }
      const user: User = {
        id: input.id ?? randomUUID(),
        email: input.email,
        name: input.name,
        initials: input.initials ?? initialsFromName(input.name),
        phone: input.phone,
        photoUrl: input.photoUrl,
        createdAt: nowIso()
      };
      db.users.push(user);
      return user;
    });
  },
  async updateUser(id, patch) {
    return mutate((db) => {
      const u = db.users.find((x) => x.id === id);
      if (!u) return null;
      Object.assign(u, patch);
      if (patch.name) u.initials = initialsFromName(patch.name);
      return u;
    });
  },

  async createSession(userId, ttlDays = 30) {
    return mutate((db) => {
      const session: Session = {
        token: randomUUID() + randomUUID().replace(/-/g, ""),
        userId,
        expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString()
      };
      db.sessions.push(session);
      return session;
    });
  },
  async getSession(token) {
    const db = await readDb();
    const s = db.sessions.find((x) => x.token === token);
    if (!s) return null;
    if (new Date(s.expiresAt).getTime() < Date.now()) return null;
    return s;
  },
  async deleteSession(token) {
    await mutate((db) => {
      db.sessions = db.sessions.filter((s) => s.token !== token);
    });
  },

  async listProjects() {
    const db = await readDb();
    return [...db.projects].sort((a, b) => a.position - b.position);
  },
  async getProject(id) {
    return (await readDb()).projects.find((p) => p.id === id) ?? null;
  },
  async getProjectByCode(code) {
    const target = code.trim().toLowerCase();
    return (await readDb()).projects.find((p) => p.code.trim().toLowerCase() === target) ?? null;
  },
  async getProjectByGmsProposalId(gmsProposalId) {
    return (await readDb()).projects.find((p) => p.gmsProposalId === gmsProposalId) ?? null;
  },
  async createProject(input) {
    return mutate((db) => {
      const groupCount = db.projects.filter((p) => p.group === input.group).length;
      const project: Project = {
        ...input,
        projectManagerId: input.projectManagerId ?? null,
        projectDirectorId: input.projectDirectorId ?? null,
        gmsProposalId: input.gmsProposalId ?? null,
        id: input.id ?? randomUUID(),
        position: groupCount,
        lastUpdatedAt: nowIso()
      };
      db.projects.push(project);
      return project;
    });
  },
  async updateProject(id, patch, actorId) {
    return mutate((db) => {
      const p = db.projects.find((x) => x.id === id);
      if (!p) return null;
      if (patch.status && patch.status !== p.status) {
        if (patch.status === "Completed") patch.group = "Completed";
        else if (patch.status === "Future") patch.group = "Future";
        else if (p.group === "Completed" || p.group === "Future") patch.group = "Current";
      }
      Object.assign(p, patch);
      p.lastUpdatedAt = nowIso();
      p.lastUpdatedBy = actorId;
      return p;
    });
  },
  async deleteProject(id) {
    const fileIds: string[] = [];
    await mutate((db) => {
      const subIds = new Set(db.subitems.filter((s) => s.projectId === id).map((s) => s.id));
      for (const f of db.files) {
        if (f.parentType === "project" && f.parentId === id) fileIds.push(f.id);
        if (f.parentType === "subitem" && subIds.has(f.parentId)) fileIds.push(f.id);
      }
      db.projects = db.projects.filter((p) => p.id !== id);
      db.subitems = db.subitems.filter((s) => s.projectId !== id);
      db.files = db.files.filter((f) => {
        if (f.parentType === "project" && f.parentId === id) return false;
        if (f.parentType === "subitem" && subIds.has(f.parentId)) return false;
        return true;
      });
    });
    await Promise.all(
      fileIds.map((fileId) => fs.unlink(path.join(FILES_DIR, fileId)).catch(() => {}))
    );
  },

  async listAllSubitems() {
    const db = await readDb();
    return [...db.subitems].sort((a, b) => {
      if (a.projectId !== b.projectId) return a.projectId.localeCompare(b.projectId);
      const aNa = a.status === "NA" ? 1 : 0;
      const bNa = b.status === "NA" ? 1 : 0;
      if (aNa !== bNa) return aNa - bNa;
      return a.position - b.position;
    });
  },

  async getSubitemById(id) {
    const db = await readDb();
    return db.subitems.find((s) => s.id === id) ?? null;
  },

  async listSubitems(projectId) {
    const db = await readDb();
    return db.subitems
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => {
        const aNa = a.status === "NA" ? 1 : 0;
        const bNa = b.status === "NA" ? 1 : 0;
        if (aNa !== bNa) return aNa - bNa;
        return a.position - b.position;
      });
  },
  async createSubitem(input) {
    return mutate((db) => {
      const count = db.subitems.filter((s) => s.projectId === input.projectId).length;
      const sub: Subitem = {
        ...input,
        id: input.id ?? randomUUID(),
        position: count,
        createdAt: nowIso()
      };
      db.subitems.push(sub);
      return sub;
    });
  },
  async updateSubitem(id, patch) {
    return mutate((db) => {
      const s = db.subitems.find((x) => x.id === id);
      if (!s) return null;
      Object.assign(s, patch);
      if (patch.status === "Completed" && !s.dateCompleted) {
        s.dateCompleted = new Date().toISOString().slice(0, 10);
      }
      if (patch.status && patch.status !== "Completed") {
        s.dateCompleted = null;
      }
      return s;
    });
  },
  async deleteSubitem(id) {
    const fileIds: string[] = [];
    await mutate((db) => {
      for (const f of db.files) {
        if (f.parentType === "subitem" && f.parentId === id) fileIds.push(f.id);
      }
      db.subitems = db.subitems.filter((s) => s.id !== id);
      db.files = db.files.filter((f) => !(f.parentType === "subitem" && f.parentId === id));
    });
    await Promise.all(
      fileIds.map((fileId) => fs.unlink(path.join(FILES_DIR, fileId)).catch(() => {}))
    );
  },
  async reorderSubitems(projectId, orderedIds) {
    await mutate((db) => {
      orderedIds.forEach((id, idx) => {
        const s = db.subitems.find((x) => x.id === id && x.projectId === projectId);
        if (s) s.position = idx;
      });
    });
  },

  async listAllFiles() {
    const db = await readDb();
    return db.files;
  },

  async getFileById(id) {
    const db = await readDb();
    return db.files.find((f) => f.id === id) ?? null;
  },

  async listFiles(parentType, parentId) {
    const db = await readDb();
    return db.files.filter((f) => f.parentType === parentType && f.parentId === parentId);
  },
  async addFile(input) {
    const id = input.id ?? randomUUID();
    await fs.mkdir(FILES_DIR, { recursive: true });
    await fs.writeFile(path.join(FILES_DIR, id), input.data);
    return mutate((db) => {
      const { data: _data, ...rest } = input;
      const file: FileRef = {
        ...rest,
        id,
        uploadedAt: nowIso()
      };
      db.files.push(file);
      return file;
    });
  },
  async getFileData(id) {
    try {
      return await fs.readFile(path.join(FILES_DIR, id));
    } catch {
      return null;
    }
  },
  async deleteFile(id) {
    await mutate((db) => {
      db.files = db.files.filter((f) => f.id !== id);
    });
    await fs.unlink(path.join(FILES_DIR, id)).catch(() => {});
  },

  async listRecentActivity(limit = 100) {
    const db = await readDb();
    return [...db.activity]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async appendActivity(event) {
    return mutate((db) => {
      const a: ActivityEvent = {
        ...event,
        id: randomUUID(),
        createdAt: nowIso()
      };
      db.activity.push(a);
      if (db.activity.length > 5000) db.activity = db.activity.slice(-5000);
      return a;
    });
  }
};
