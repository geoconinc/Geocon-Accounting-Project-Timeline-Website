import type { ProjectGroup, ProjectStatus, SubitemStatus } from "./enums";

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  phone?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface FileRef {
  id: string;
  parentType: "project" | "subitem";
  parentId: string;
  blobPath: string;
  filename: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  ownerId: string | null;
  status: ProjectStatus;
  group: ProjectGroup;
  startDate: string | null;
  timelineStart: string | null;
  timelineEnd: string | null;
  dirNumber: string | null;
  union: boolean;
  reportingSystems: string | null;
  cprContact: string | null;
  sharepointUrl: string | null;
  office: string | null;
  /** Responsible for DAS 140 and related setup (notified on project creation). */
  projectManagerId: string | null;
  projectDirectorId: string | null;
  notes: string | null;
  lastUpdatedAt: string;
  lastUpdatedBy: string | null;
  position: number;
}

export interface Subitem {
  id: string;
  projectId: string;
  name: string;
  ownerId: string | null;
  status: SubitemStatus;
  dueDate: string | null;
  dateCompleted: string | null;
  notes: string | null;
  position: number;
}

export interface ActivityEvent {
  id: string;
  actorId: string | null;
  entityType: "project" | "subitem" | "file";
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
  createdAt: string;
}
