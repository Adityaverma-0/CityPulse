import { pgTable, serial, integer, text, real, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assignmentStatusEnum = pgEnum("assignment_status", ["pending", "accepted", "in_progress", "rejected", "timed_out", "completed", "escalated"]);

export const assignmentsTable = pgTable("assignments", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").notNull(),
  workerId: integer("worker_id").notNull(),
  departmentId: integer("department_id").notNull(),
  status: assignmentStatusEnum("status").notNull().default("pending"),
  distanceKm: real("distance_km"),
  estimatedArrivalMinutes: real("estimated_arrival_minutes"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  rejectedAt: timestamp("rejected_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
