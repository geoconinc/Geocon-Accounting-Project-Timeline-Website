"use client";

import type { FileRef, Project, Subitem, User } from "@/lib/types";
import { initialsFromName } from "@/lib/utils";
import { DEMO_USER } from "./config";

const KEY = "geocon-demo-db-v3";

export { DEFAULT_SUBITEM_NAMES, CPR_SUBITEM_NAME } from "@/lib/projectDefaults";
import { CPR_SUBITEM_NAME, DEFAULT_SUBITEM_NAMES } from "@/lib/projectDefaults";

export interface DocumentRef {
  id: string;
  name: string;
  category: string;
  filename: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AppSettings {
  defaultMute: boolean;
  emailOnAssignment: boolean;
  emailOnStatusChange: boolean;
  emailOnDueDate: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  name: string;
  invitedAt: string;
  invitedBy: string;
  status: "pending" | "accepted";
}

export interface DemoDb {
  projects: Project[];
  subitems: Subitem[];
  users: User[];
  files: FileRef[];
  // For demo, file content stored as data URLs keyed by file id.
  fileBlobs: Record<string, string>;
  mutedProjects: string[];
  documents: DocumentRef[];
  documentBlobs: Record<string, string>;
  settings: AppSettings;
  invitations: Invitation[];
}

function seedDb(): DemoDb {
  const now = new Date().toISOString();
  const ml: User = {
    id: "user-ml",
    email: "ml@geoconinc.com",
    name: "Matt Lawson",
    initials: "ML",
    createdAt: now
  };
  const me: User = { ...DEMO_USER, createdAt: now };

  const aroviste: Project = {
    id: "proj-aroviste",
    code: "W16288802",
    name: "Aroviste",
    ownerId: ml.id,
    status: "InProgress",
    group: "Current",
    startDate: "2026-04-22",
    timelineStart: "2026-04-22",
    timelineEnd: "2026-04-23",
    dirNumber: null,
    union: true,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    notes: null,
    lastUpdatedAt: now,
    lastUpdatedBy: ml.id,
    position: 0
  };
  const future: Project = {
    id: "proj-test",
    code: "TEST",
    name: "TEST",
    ownerId: null,
    status: "Future",
    group: "Future",
    startDate: null,
    timelineStart: null,
    timelineEnd: null,
    dirNumber: null,
    union: false,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    notes: null,
    lastUpdatedAt: now,
    lastUpdatedBy: ml.id,
    position: 0
  };
  const completed: Project = {
    id: "proj-mac",
    code: "W1500-06-26",
    name: "Mac",
    ownerId: ml.id,
    status: "Completed",
    group: "Completed",
    startDate: "2026-04-23",
    timelineStart: "2026-04-24",
    timelineEnd: "2026-04-25",
    dirNumber: null,
    union: false,
    reportingSystems: null,
    cprContact: null,
    sharepointUrl: null,
    notes: null,
    lastUpdatedAt: now,
    lastUpdatedBy: ml.id,
    position: 0
  };

  const subs: Subitem[] = [
    { id: "sub-1", projectId: aroviste.id, name: "DAS 140 & 142 Setup Form", ownerId: ml.id, status: "Completed", dueDate: "2026-04-23", dateCompleted: "2026-04-23", notes: null, position: 0 },
    { id: "sub-2", projectId: aroviste.id, name: "DAS 140", ownerId: null, status: "Missing", dueDate: null, dateCompleted: null, notes: null, position: 1 },
    { id: "sub-3", projectId: aroviste.id, name: "DAS 142", ownerId: null, status: "Missing", dueDate: "2026-04-30", dateCompleted: null, notes: null, position: 2 },
    { id: "sub-4", projectId: aroviste.id, name: "Fringe Benefit Statement", ownerId: null, status: "NotStarted", dueDate: null, dateCompleted: null, notes: null, position: 3 },
    { id: "sub-5", projectId: aroviste.id, name: "Training Fund", ownerId: null, status: "NotStarted", dueDate: null, dateCompleted: null, notes: null, position: 4 },
    { id: "sub-6", projectId: aroviste.id, name: "Other Setup Forms", ownerId: null, status: "NA", dueDate: null, dateCompleted: null, notes: null, position: 5 }
  ];

  return {
    projects: [aroviste, future, completed],
    subitems: subs,
    users: [me, ml],
    files: [],
    fileBlobs: {},
    mutedProjects: [],
    documents: [],
    documentBlobs: {},
    settings: {
      defaultMute: false,
      emailOnAssignment: true,
      emailOnStatusChange: true,
      emailOnDueDate: true
    },
    invitations: []
  };
}

export function loadDb(): DemoDb {
  if (typeof window === "undefined") return seedDb();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      const seed = seedDb();
      window.localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as Partial<DemoDb>;
    return { ...seedDb(), ...parsed } as DemoDb;
  } catch {
    return seedDb();
  }
}

export function saveDb(db: DemoDb) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("localStorage save failed (quota?):", e);
  }
}

export function resetDb(): DemoDb {
  const fresh = seedDb();
  saveDb(fresh);
  return fresh;
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export const demoStore = {
  loadDb,
  saveDb,
  resetDb,

  createProject(input: Partial<Project>, actorId: string): Project {
    const db = loadDb();
    const group = input.group ?? "Current";
    const project: Project = {
      id: uid("proj"),
      code: input.code ?? "NEW",
      name: input.name ?? "New project",
      ownerId: input.ownerId ?? actorId,
      status: input.status ?? "New",
      group,
      startDate: input.startDate ?? null,
      timelineStart: input.timelineStart ?? null,
      timelineEnd: input.timelineEnd ?? null,
      dirNumber: input.dirNumber ?? null,
      union: input.union ?? false,
      reportingSystems: input.reportingSystems ?? null,
      cprContact: input.cprContact ?? null,
      sharepointUrl: input.sharepointUrl ?? null,
      notes: input.notes ?? null,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: actorId,
      position: db.projects.filter((p) => p.group === group).length
    };
    db.projects.push(project);
    DEFAULT_SUBITEM_NAMES.forEach((name, idx) => {
      db.subitems.push({
        id: uid("sub"),
        projectId: project.id,
        name,
        ownerId: null,
        status: "NotStarted",
        dueDate: null,
        dateCompleted: null,
        notes: null,
        position: idx
      });
    });
    saveDb(db);
    return project;
  },

  patchProject(id: string, patch: Partial<Project>, actorId: string): Project | null {
    const db = loadDb();
    const p = db.projects.find((x) => x.id === id);
    if (!p) return null;
    if (patch.status && patch.status !== p.status) {
      if (patch.status === "Completed") patch.group = "Completed";
      else if (patch.status === "Future") patch.group = "Future";
      else if (p.group === "Completed" || p.group === "Future") patch.group = "Current";
    }
    Object.assign(p, patch);
    p.lastUpdatedAt = new Date().toISOString();
    p.lastUpdatedBy = actorId;
    saveDb(db);
    return p;
  },

  deleteProject(id: string) {
    const db = loadDb();
    db.projects = db.projects.filter((p) => p.id !== id);
    db.subitems = db.subitems.filter((s) => s.projectId !== id);
    db.files = db.files.filter((f) => !(f.parentType === "project" && f.parentId === id));
    saveDb(db);
  },

  createSubitem(projectId: string, input: Partial<Subitem>): Subitem {
    const db = loadDb();
    const count = db.subitems.filter((s) => s.projectId === projectId).length;
    const sub: Subitem = {
      id: uid("sub"),
      projectId,
      name: input.name ?? "New subitem",
      ownerId: input.ownerId ?? null,
      status: input.status ?? "NotStarted",
      dueDate: input.dueDate ?? null,
      dateCompleted: null,
      notes: input.notes ?? null,
      position: count
    };
    db.subitems.push(sub);
    saveDb(db);
    return sub;
  },

  patchSubitem(id: string, patch: Partial<Subitem>): Subitem | null {
    const db = loadDb();
    const s = db.subitems.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch);
    if (patch.status === "Completed" && !s.dateCompleted) {
      s.dateCompleted = new Date().toISOString().slice(0, 10);
    }
    recomputeProjectStatus(db, s.projectId);
    saveDb(db);
    return s;
  },

  deleteSubitem(id: string) {
    const db = loadDb();
    db.subitems = db.subitems.filter((s) => s.id !== id);
    db.files = db.files.filter((f) => !(f.parentType === "subitem" && f.parentId === id));
    saveDb(db);
  },

  reorderSubitems(projectId: string, orderedIds: string[]) {
    const db = loadDb();
    orderedIds.forEach((id, idx) => {
      const s = db.subitems.find((x) => x.id === id && x.projectId === projectId);
      if (s) s.position = idx;
    });
    saveDb(db);
  },

  upsertUser(input: Partial<User> & { email: string; name: string }): User {
    const db = loadDb();
    const existing = db.users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      Object.assign(existing, input);
      saveDb(db);
      return existing;
    }
    const user: User = {
      id: uid("user"),
      email: input.email,
      name: input.name,
      initials: input.initials ?? initialsFromName(input.name),
      phone: input.phone,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    saveDb(db);
    return user;
  },

  async addFile(input: {
    parentType: "project" | "subitem";
    parentId: string;
    file: File;
    uploadedBy: string;
  }): Promise<FileRef> {
    const db = loadDb();
    const id = uid("file");
    const dataUrl = await readAsDataUrl(input.file);
    const ref: FileRef = {
      id,
      parentType: input.parentType,
      parentId: input.parentId,
      blobPath: id,
      filename: input.file.name,
      size: input.file.size,
      uploadedBy: input.uploadedBy,
      uploadedAt: new Date().toISOString()
    };
    db.files.push(ref);
    db.fileBlobs[id] = dataUrl;
    saveDb(db);
    return ref;
  },

  getFileUrl(id: string): string | null {
    return loadDb().fileBlobs[id] ?? null;
  },

  setMute(projectId: string, mute: boolean) {
    const db = loadDb();
    const has = db.mutedProjects.includes(projectId);
    if (mute && !has) db.mutedProjects.push(projectId);
    if (!mute && has) db.mutedProjects = db.mutedProjects.filter((p) => p !== projectId);
    saveDb(db);
  },

  async addDocument(input: {
    name: string;
    category: string;
    file: File;
    uploadedBy: string;
  }): Promise<DocumentRef> {
    const db = loadDb();
    const id = uid("doc");
    const dataUrl = await readAsDataUrl(input.file);
    const ref: DocumentRef = {
      id,
      name: input.name,
      category: input.category,
      filename: input.file.name,
      size: input.file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: input.uploadedBy
    };
    db.documents.push(ref);
    db.documentBlobs[id] = dataUrl;
    saveDb(db);
    return ref;
  },

  deleteDocument(id: string) {
    const db = loadDb();
    db.documents = db.documents.filter((d) => d.id !== id);
    delete db.documentBlobs[id];
    saveDb(db);
  },

  getDocumentUrl(id: string): string | null {
    return loadDb().documentBlobs[id] ?? null;
  },

  updateSettings(patch: Partial<AppSettings>) {
    const db = loadDb();
    db.settings = { ...db.settings, ...patch };
    saveDb(db);
  },

  invitePerson(input: { email: string; name: string; invitedBy: string }): Invitation {
    const db = loadDb();
    const inv: Invitation = {
      id: uid("inv"),
      email: input.email,
      name: input.name,
      invitedAt: new Date().toISOString(),
      invitedBy: input.invitedBy,
      status: "pending"
    };
    db.invitations.push(inv);
    // Also create the user so they show up in pickers immediately.
    if (!db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      db.users.push({
        id: uid("user"),
        email: input.email,
        name: input.name,
        initials: initialsFromName(input.name),
        createdAt: new Date().toISOString()
      });
    }
    saveDb(db);
    return inv;
  },

  acceptInvitation(id: string) {
    const db = loadDb();
    const inv = db.invitations.find((i) => i.id === id);
    if (inv) inv.status = "accepted";
    saveDb(db);
  },

  removeInvitation(id: string) {
    const db = loadDb();
    db.invitations = db.invitations.filter((i) => i.id !== id);
    saveDb(db);
  },

  updateUserProfile(id: string, patch: Partial<User>) {
    const db = loadDb();
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    Object.assign(u, patch);
    if (patch.name) u.initials = initialsFromName(patch.name);
    saveDb(db);
    return u;
  }
};

function recomputeProjectStatus(db: DemoDb, projectId: string) {
  const project = db.projects.find((p) => p.id === projectId);
  if (!project) return;
  const subs = db.subitems.filter((s) => s.projectId === projectId);
  if (subs.length === 0) return;

  const allDone = subs.every((s) => s.status === "Completed" || s.status === "NA");
  const someCompleted = subs.some((s) => s.status === "Completed");
  const cpr = subs.find((s) => s.name.trim().toLowerCase() === CPR_SUBITEM_NAME.toLowerCase());
  const cprOk = !cpr || cpr.status === "Completed";

  if (allDone && someCompleted && cprOk && project.status !== "Completed") {
    project.status = "Completed";
    project.group = "Completed";
    project.lastUpdatedAt = new Date().toISOString();
  }
}

export function getCurrentDemoUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("geocon-demo-auth-v1");
    if (!raw) return null;
    const session = JSON.parse(raw) as { email?: string };
    if (!session.email) return null;
    const db = loadDb();
    const me = db.users.find((u) => u.email.toLowerCase() === session.email!.toLowerCase());
    return me?.id ?? null;
  } catch {
    return null;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
