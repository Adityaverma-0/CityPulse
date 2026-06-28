import {
  pgTable, serial, text, integer, timestamp, real, boolean, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priorityEnum = pgEnum("priority_level", ["low", "medium", "high", "critical", "emergency"]);
export const statusEnum = pgEnum("complaint_status", [
  "submitted", "ai_processing", "assigned", "dispatched", "in_progress",
  // Added: officer submitted photo evidence, awaiting admin approval before marking resolved
  "pending_admin_review",
  "resolved", "failed_verification", "reopened", "closed"
]);

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(),
  publicAssetId: integer("public_asset_id"),
  citizenName: text("citizen_name"),
  citizenPhone: text("citizen_phone"),
  citizenEmail: text("citizen_email"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  description: text("description"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  address: text("address"),
  ward: text("ward"),
  status: statusEnum("status").notNull().default("submitted"),
  priority: priorityEnum("priority"),
  priorityScore: real("priority_score"),
  departmentId: integer("department_id"),
  assignedWorkerId: integer("assigned_worker_id"),
  duplicateOfId: integer("duplicate_of_id"),
  duplicateCount: integer("duplicate_count").notNull().default(0),
  estimatedResolutionHours: real("estimated_resolution_hours"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  // Issue 1: geo-tagged completion evidence fields
  completionPhotoPath: text("completion_photo_path"),
  completionLatitude: real("completion_latitude"),
  completionLongitude: real("completion_longitude"),
  completionTimestamp: timestamp("completion_timestamp", { withTimezone: true }),
  adminRejectionReason: text("admin_rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
