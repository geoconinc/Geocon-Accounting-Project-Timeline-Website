// Postgres adapter template. Implements the same Storage interface as jsonStore.
// Activate with STORAGE_DRIVER=postgres and DATABASE_URL=... in env.
// Run `npm run db:migrate` to apply lib/db/migrations/0001_init.sql first.
//
// This is a template skeleton — fill in queries when you switch off JSON.
// All function shapes match jsonStore so the rest of the app needs no changes.

import type { Storage } from "./index";

function notImplemented(): never {
  throw new Error(
    "Postgres storage driver is a template. Implement queries in lib/storage/postgresStore.ts before setting STORAGE_DRIVER=postgres."
  );
}

export const postgresStore: Storage = {
  listUsers: notImplemented,
  getUserById: notImplemented,
  getUserByEmail: notImplemented,
  upsertUser: notImplemented,
  updateUser: notImplemented,
  createSession: notImplemented,
  getSession: notImplemented,
  deleteSession: notImplemented,
  listProjects: notImplemented,
  getProject: notImplemented,
  createProject: notImplemented,
  updateProject: notImplemented,
  deleteProject: notImplemented,
  listSubitems: notImplemented,
  createSubitem: notImplemented,
  updateSubitem: notImplemented,
  deleteSubitem: notImplemented,
  reorderSubitems: notImplemented,
  listFiles: notImplemented,
  addFile: notImplemented,
  deleteFile: notImplemented,
  getNotificationPref: notImplemented,
  setNotificationPref: notImplemented,
  appendActivity: notImplemented
};
