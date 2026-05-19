import { randomUUID } from "node:crypto";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import type { ActivityEvent, FileRef, Project, Session, Subitem, User } from "@/lib/types";
import { getDb } from "@/lib/db/client";
import { activity, files, projects, sessions, subitems, users } from "@/lib/db/schema";
import { initialsFromName } from "@/lib/utils";
import type { Storage } from "./index";

function tsIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : v;
}

function dateOnly(v: Date | string | null): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v.slice(0, 10);
  return v.toISOString().slice(0, 10);
}

function mapUser(r: typeof users.$inferSelect): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    initials: r.initials,
    phone: r.phone ?? undefined,
    photoUrl: r.photoUrl ?? undefined,
    createdAt: tsIso(r.createdAt)
  };
}

function mapSession(r: typeof sessions.$inferSelect): Session {
  return { token: r.token, userId: r.userId, expiresAt: tsIso(r.expiresAt) };
}

function mapProject(r: typeof projects.$inferSelect): Project {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    ownerId: r.ownerId,
    status: r.status,
    group: r.group,
    startDate: dateOnly(r.startDate),
    timelineStart: dateOnly(r.timelineStart),
    timelineEnd: dateOnly(r.timelineEnd),
    dirNumber: r.dirNumber,
    union: r.union,
    reportingSystems: r.reportingSystems,
    cprContact: r.cprContact,
    sharepointUrl: r.sharepointUrl,
    office: r.office,
    projectManagerId: r.projectManagerId,
    projectDirectorId: r.projectDirectorId,
    notes: r.notes,
    lastUpdatedAt: tsIso(r.lastUpdatedAt),
    lastUpdatedBy: r.lastUpdatedBy,
    position: r.position
  };
}

function mapSubitem(r: typeof subitems.$inferSelect): Subitem {
  return {
    id: r.id,
    projectId: r.projectId,
    name: r.name,
    ownerId: r.ownerId,
    status: r.status,
    dueDate: dateOnly(r.dueDate),
    dateCompleted: dateOnly(r.dateCompleted),
    notes: r.notes,
    position: r.position
  };
}

function mapFile(r: typeof files.$inferSelect): FileRef {
  return {
    id: r.id,
    parentType: r.parentType,
    parentId: r.parentId,
    blobPath: r.blobPath,
    filename: r.filename,
    size: r.size,
    uploadedBy: r.uploadedBy ?? "",
    uploadedAt: tsIso(r.uploadedAt)
  };
}

function mapActivity(r: typeof activity.$inferSelect): ActivityEvent {
  return {
    id: r.id,
    actorId: r.actorId,
    entityType: r.entityType as ActivityEvent["entityType"],
    entityId: r.entityId,
    action: r.action,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    createdAt: tsIso(r.createdAt)
  };
}

function sessionToken(): string {
  return randomUUID() + randomUUID().replace(/-/g, "");
}

export const postgresStore: Storage = {
  async listUsers() {
    const db = getDb();
    const rows = await db.select().from(users);
    return rows.map(mapUser);
  },

  async getUserById(id) {
    const db = getDb();
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async getUserByEmail(email) {
    const db = getDb();
    const lower = email.toLowerCase();
    const rows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${lower}`)
      .limit(1);
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async upsertUser(input) {
    const db = getDb();
    const lower = input.email.toLowerCase();
    const found = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${lower}`)
      .limit(1);
    const existing = found[0] ? mapUser(found[0]) : null;
    if (existing) {
      const initials = input.initials ?? initialsFromName(input.name ?? existing.name);
      const [u] = await db
        .update(users)
        .set({
          name: input.name ?? existing.name,
          initials,
          phone: input.phone ?? existing.phone ?? null,
          photoUrl: input.photoUrl ?? existing.photoUrl ?? null
        })
        .where(eq(users.id, existing.id))
        .returning();
      return mapUser(u);
    }
    const [u] = await db
      .insert(users)
      .values({
        id: input.id ?? randomUUID(),
        email: input.email,
        name: input.name,
        initials: input.initials ?? initialsFromName(input.name),
        phone: input.phone ?? null,
        photoUrl: input.photoUrl ?? null
      })
      .returning();
    return mapUser(u);
  },

  async updateUser(id, patch) {
    const db = getDb();
    const nextName = patch.name;
    const nextInitials =
      patch.initials ?? (nextName ? initialsFromName(nextName) : undefined);
    const [u] = await db
      .update(users)
      .set({
        ...(patch.email !== undefined ? { email: patch.email } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(nextInitials !== undefined ? { initials: nextInitials } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.photoUrl !== undefined ? { photoUrl: patch.photoUrl } : {})
      })
      .where(eq(users.id, id))
      .returning();
    return u ? mapUser(u) : null;
  },

  async createSession(userId, ttlDays = 30) {
    const db = getDb();
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const [s] = await db
      .insert(sessions)
      .values({ token: sessionToken(), userId, expiresAt })
      .returning();
    return mapSession(s);
  },

  async getSession(token) {
    const db = getDb();
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.token, token), sql`${sessions.expiresAt} > now()`))
      .limit(1);
    return rows[0] ? mapSession(rows[0]) : null;
  },

  async deleteSession(token) {
    const db = getDb();
    await db.delete(sessions).where(eq(sessions.token, token));
  },

  async listProjects() {
    const db = getDb();
    const rows = await db.select().from(projects).orderBy(projects.position);
    return rows.map(mapProject);
  },

  async getProject(id) {
    const db = getDb();
    const rows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return rows[0] ? mapProject(rows[0]) : null;
  },

  async createProject(input) {
    const db = getDb();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.group, input.group));
    const [p] = await db
      .insert(projects)
      .values({
        id: input.id ?? randomUUID(),
        code: input.code,
        name: input.name,
        ownerId: input.ownerId,
        status: input.status,
        group: input.group,
        startDate: input.startDate,
        timelineStart: input.timelineStart,
        timelineEnd: input.timelineEnd,
        dirNumber: input.dirNumber,
        union: input.union,
        reportingSystems: input.reportingSystems,
        cprContact: input.cprContact,
        sharepointUrl: input.sharepointUrl,
        office: input.office,
        projectManagerId: input.projectManagerId ?? null,
        projectDirectorId: input.projectDirectorId ?? null,
        notes: input.notes,
        lastUpdatedBy: input.lastUpdatedBy ?? null,
        position: count
      })
      .returning();
    return mapProject(p);
  },

  async updateProject(id, patch, actorId) {
    const db = getDb();
    const curRows = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    const current = curRows[0] ? mapProject(curRows[0]) : null;
    if (!current) return null;

    let group = patch.group ?? current.group;
    if (patch.status && patch.status !== current.status) {
      if (patch.status === "Completed") group = "Completed";
      else if (patch.status === "Future") group = "Future";
      else if (current.group === "Completed" || current.group === "Future") group = "Current";
    }

    const [p] = await db
      .update(projects)
      .set({
        group,
        ...(patch.code !== undefined ? { code: patch.code } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.ownerId !== undefined ? { ownerId: patch.ownerId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
        ...(patch.timelineStart !== undefined ? { timelineStart: patch.timelineStart } : {}),
        ...(patch.timelineEnd !== undefined ? { timelineEnd: patch.timelineEnd } : {}),
        ...(patch.dirNumber !== undefined ? { dirNumber: patch.dirNumber } : {}),
        ...(patch.union !== undefined ? { union: patch.union } : {}),
        ...(patch.reportingSystems !== undefined ? { reportingSystems: patch.reportingSystems } : {}),
        ...(patch.cprContact !== undefined ? { cprContact: patch.cprContact } : {}),
        ...(patch.sharepointUrl !== undefined ? { sharepointUrl: patch.sharepointUrl } : {}),
        ...(patch.office !== undefined ? { office: patch.office } : {}),
        ...(patch.projectManagerId !== undefined ? { projectManagerId: patch.projectManagerId } : {}),
        ...(patch.projectDirectorId !== undefined ? { projectDirectorId: patch.projectDirectorId } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {}),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: actorId
      })
      .where(eq(projects.id, id))
      .returning();
    return p ? mapProject(p) : null;
  },

  async deleteProject(id) {
    const db = getDb();
    await db.transaction(async (tx) => {
      const subs = await tx.select({ id: subitems.id }).from(subitems).where(eq(subitems.projectId, id));
      const subIds = subs.map((s) => s.id);
      await tx.delete(files).where(
        subIds.length
          ? or(
              and(eq(files.parentType, "project"), eq(files.parentId, id)),
              and(eq(files.parentType, "subitem"), inArray(files.parentId, subIds))
            )
          : and(eq(files.parentType, "project"), eq(files.parentId, id))
      );
      await tx.delete(projects).where(eq(projects.id, id));
    });
  },

  async listAllSubitems() {
    const db = getDb();
    const rows = await db
      .select()
      .from(subitems)
      .orderBy(
        subitems.projectId,
        sql`CASE WHEN ${subitems.status} = 'NA' THEN 1 ELSE 0 END`,
        subitems.position
      );
    return rows.map(mapSubitem);
  },

  async getSubitemById(id) {
    const db = getDb();
    const rows = await db.select().from(subitems).where(eq(subitems.id, id)).limit(1);
    return rows[0] ? mapSubitem(rows[0]) : null;
  },

  async listSubitems(projectId) {
    const db = getDb();
    const rows = await db
      .select()
      .from(subitems)
      .where(eq(subitems.projectId, projectId))
      .orderBy(sql`CASE WHEN ${subitems.status} = 'NA' THEN 1 ELSE 0 END`, subitems.position);
    return rows.map(mapSubitem);
  },

  async createSubitem(input) {
    const db = getDb();
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subitems)
      .where(eq(subitems.projectId, input.projectId));
    const [s] = await db
      .insert(subitems)
      .values({
        id: input.id ?? randomUUID(),
        projectId: input.projectId,
        name: input.name,
        ownerId: input.ownerId,
        status: input.status,
        dueDate: input.dueDate,
        dateCompleted: input.dateCompleted,
        notes: input.notes,
        position: count
      })
      .returning();
    return mapSubitem(s);
  },

  async updateSubitem(id, patch) {
    const db = getDb();
    const current = await db.select().from(subitems).where(eq(subitems.id, id)).limit(1);
    const cur = current[0];
    if (!cur) return null;

    let nextDateCompleted =
      patch.dateCompleted !== undefined ? patch.dateCompleted : cur.dateCompleted;
    if (patch.status === "Completed" && !nextDateCompleted) {
      nextDateCompleted = new Date().toISOString().slice(0, 10);
    }

    const [s] = await db
      .update(subitems)
      .set({
        ...(patch.projectId !== undefined ? { projectId: patch.projectId } : {}),
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.ownerId !== undefined ? { ownerId: patch.ownerId } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.dueDate !== undefined ? { dueDate: patch.dueDate } : {}),
        ...(patch.dateCompleted !== undefined || patch.status === "Completed"
          ? { dateCompleted: nextDateCompleted }
          : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        ...(patch.position !== undefined ? { position: patch.position } : {})
      })
      .where(eq(subitems.id, id))
      .returning();
    return s ? mapSubitem(s) : null;
  },

  async deleteSubitem(id) {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.delete(files).where(and(eq(files.parentType, "subitem"), eq(files.parentId, id)));
      await tx.delete(subitems).where(eq(subitems.id, id));
    });
  },

  async reorderSubitems(projectId, orderedIds) {
    const db = getDb();
    await db.transaction(async (tx) => {
      for (let idx = 0; idx < orderedIds.length; idx++) {
        const sid = orderedIds[idx];
        await tx
          .update(subitems)
          .set({ position: idx })
          .where(and(eq(subitems.id, sid), eq(subitems.projectId, projectId)));
      }
    });
  },

  async listAllFiles() {
    const db = getDb();
    const rows = await db.select().from(files);
    return rows.map(mapFile);
  },

  async getFileById(id) {
    const db = getDb();
    const rows = await db.select().from(files).where(eq(files.id, id)).limit(1);
    return rows[0] ? mapFile(rows[0]) : null;
  },

  async listFiles(parentType, parentId) {
    const db = getDb();
    const rows = await db
      .select()
      .from(files)
      .where(and(eq(files.parentType, parentType), eq(files.parentId, parentId)));
    return rows.map(mapFile);
  },

  async addFile(input) {
    const db = getDb();
    const [f] = await db
      .insert(files)
      .values({
        id: input.id ?? randomUUID(),
        parentType: input.parentType,
        parentId: input.parentId,
        blobPath: input.blobPath,
        filename: input.filename,
        size: input.size,
        uploadedBy: input.uploadedBy || null
      })
      .returning();
    return mapFile(f);
  },

  async deleteFile(id) {
    const db = getDb();
    await db.delete(files).where(eq(files.id, id));
  },

  async appendActivity(event) {
    const db = getDb();
    const [row] = await db
      .insert(activity)
      .values({
        actorId: event.actorId,
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        payload: event.payload
      })
      .returning();
    const ev = mapActivity(row);
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(activity);
    if (count > 5000) {
      const excess = count - 5000;
      await db.execute(sql`
        DELETE FROM activity WHERE id IN (
          SELECT id FROM (
            SELECT id FROM activity ORDER BY created_at ASC LIMIT ${excess}
          ) t
        )
      `);
    }
    return ev;
  }
};
