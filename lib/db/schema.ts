// Drizzle ORM schema. This is the canonical Postgres schema for Geocon Project Timeline.
// While STORAGE_DRIVER=json the JSON store mirrors this shape exactly.
// Postgres: set STORAGE_DRIVER=postgres + DATABASE_URL, run `npm run db:migrate`
// (applies lib/db/migrations/*.sql). Storage implementation: lib/storage/postgresStore.ts.

import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  date,
  jsonb,
  pgEnum,
  customType
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  }
});

export const projectStatusEnum = pgEnum("project_status", [
  "New",
  "Completed",
  "InProgress",
  "Missing",
  "Future"
]);
export const projectGroupEnum = pgEnum("project_group", ["Current", "Future", "Completed"]);
export const subitemStatusEnum = pgEnum("subitem_status", [
  "Completed",
  "InProgress",
  "Missing",
  "NotStarted",
  "NA"
]);
export const fileParentEnum = pgEnum("file_parent", ["project", "subitem"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  phone: text("phone"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true })
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  status: projectStatusEnum("status").notNull().default("New"),
  group: projectGroupEnum("group").notNull().default("Current"),
  startDate: date("start_date"),
  timelineStart: date("timeline_start"),
  timelineEnd: date("timeline_end"),
  dirNumber: text("dir_number"),
  dirContractNumber: text("dir_contract_number"),
  union: boolean("union").notNull().default(false),
  payrollCycle: text("payroll_cycle").notNull().default("biweekly"),
  reportingSystems: text("reporting_systems"),
  cprContact: text("cpr_contact"),
  sharepointUrl: text("sharepoint_url"),
  office: text("office"),
  projectManagerId: uuid("project_manager_id").references(() => users.id, { onDelete: "set null" }),
  projectDirectorId: uuid("project_director_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedBy: uuid("last_updated_by").references(() => users.id, { onDelete: "set null" }),
  position: integer("position").notNull().default(0),
  gmsProposalId: text("gms_proposal_id"),
  prevailingWage: boolean("prevailing_wage").notNull().default(false),
  prevailingWageType: text("prevailing_wage_type"),
  pwCategory: text("pw_category"),
  dasRequired: boolean("das_required").notNull().default(false),
  dasStatus: text("das_status"),
  dasCompletedAt: timestamp("das_completed_at", { withTimezone: true })
});

export const subitems = pgTable("subitems", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
  status: subitemStatusEnum("status").notNull().default("NotStarted"),
  dueDate: date("due_date"),
  dateCompleted: date("date_completed"),
  notes: text("notes"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentType: fileParentEnum("parent_type").notNull(),
  parentId: uuid("parent_id").notNull(),
  blobPath: text("blob_path").notNull().default(""),
  filename: text("filename").notNull(),
  size: integer("size").notNull(),
  contentType: text("content_type"),
  data: bytea("data").notNull(),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow()
});

export const activity = pgTable("activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
