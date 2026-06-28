import { pgTable, serial, integer, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const verificationResultsTable = pgTable("verification_results", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").notNull(),
  assignmentId: integer("assignment_id").notNull(),
  verdict: text("verdict").notNull(), // resolved, partially_resolved, failed
  confidence: real("confidence").notNull(),
  aiNotes: text("ai_notes"),
  workerNotes: text("worker_notes"),
  beforeImagePath: text("before_image_path"),
  afterImagePath: text("after_image_path"),
  isEscalated: boolean("is_escalated").notNull().default(false),
  escalationReason: text("escalation_reason"),
  citizenVerified: boolean("citizen_verified"),
  citizenRating: integer("citizen_rating"),
  citizenComment: text("citizen_comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertVerificationResultSchema = createInsertSchema(verificationResultsTable).omit({ id: true, createdAt: true });
export type InsertVerificationResult = z.infer<typeof insertVerificationResultSchema>;
export type VerificationResult = typeof verificationResultsTable.$inferSelect;
