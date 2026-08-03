import type { ActivityEvent, FileRef, Project, Session, Subitem, User } from "@/lib/types";
import { jsonStore } from "./jsonStore";
import { postgresStore } from "./postgresStore";

export interface Storage {
  // users
  listUsers(): Promise<User[]>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  upsertUser(input: Omit<User, "id" | "createdAt"> & { id?: string }): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User | null>;

  // sessions
  createSession(userId: string, ttlDays?: number): Promise<Session>;
  getSession(token: string): Promise<Session | null>;
  deleteSession(token: string): Promise<void>;

  // projects
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | null>;
  getProjectByCode(code: string): Promise<Project | null>;
  getProjectByGmsProposalId(gmsProposalId: string): Promise<Project | null>;
  createProject(input: Omit<Project, "id" | "lastUpdatedAt" | "position"> & { id?: string }): Promise<Project>;
  updateProject(id: string, patch: Partial<Project>, actorId: string | null): Promise<Project | null>;
  deleteProject(id: string): Promise<void>;
  /** Deletes every project (and cascading subitems/files). Returns deleted project ids. */
  deleteAllProjects(): Promise<string[]>;
  /** Clears the activity/audit log. */
  clearActivity(): Promise<number>;

  // subitems
  listAllSubitems(): Promise<Subitem[]>;
  getSubitemById(id: string): Promise<Subitem | null>;
  listSubitems(projectId: string): Promise<Subitem[]>;
  createSubitem(input: Omit<Subitem, "id" | "position" | "createdAt"> & { id?: string }): Promise<Subitem>;
  updateSubitem(id: string, patch: Partial<Subitem>): Promise<Subitem | null>;
  deleteSubitem(id: string): Promise<void>;
  reorderSubitems(projectId: string, orderedIds: string[]): Promise<void>;

  // files
  listAllFiles(): Promise<FileRef[]>;
  getFileById(id: string): Promise<FileRef | null>;
  listFiles(parentType: FileRef["parentType"], parentId: string): Promise<FileRef[]>;
  addFile(input: Omit<FileRef, "id" | "uploadedAt"> & { id?: string; data: Buffer }): Promise<FileRef>;
  getFileData(id: string): Promise<Buffer | null>;
  deleteFile(id: string): Promise<void>;

  // activity
  appendActivity(event: Omit<ActivityEvent, "id" | "createdAt">): Promise<ActivityEvent>;
  listRecentActivity(limit?: number): Promise<ActivityEvent[]>;
}

const driver = process.env.STORAGE_DRIVER ?? "json";

export const storage: Storage = driver === "postgres" ? postgresStore : jsonStore;
