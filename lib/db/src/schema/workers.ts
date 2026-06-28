import { pgTable, serial, text, integer, boolean, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workerStatusEnum = pgEnum("worker_status", ["available", "busy", "off_duty", "on_leave"]);

export const workersTable = pgTable("workers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  departmentId: integer("department_id").notNull(),
  status: workerStatusEnum("status").notNull().default("available"),
  skills: text("skills").array().notNull().default([]),
  certifications: text("certifications").array().notNull().default([]),
  currentLatitude: real("current_latitude"),
  currentLongitude: real("current_longitude"),
  currentAddress: text("current_address"),
  activeComplaintCount: integer("active_complaint_count").notNull().default(0),
  totalResolved: integer("total_resolved").notNull().default(0),
  avgRating: real("avg_rating"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWorkerSchema = createInsertSchema(workersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workersTable.$inferSelect;
