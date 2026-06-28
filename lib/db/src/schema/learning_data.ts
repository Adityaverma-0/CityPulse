import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const learningDataTable = pgTable("learning_data", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").notNull().unique(),
  predictedDepartment: text("predicted_department"),
  actualDepartment: text("actual_department"),
  predictedResolutionHours: real("predicted_resolution_hours"),
  actualResolutionHours: real("actual_resolution_hours"),
  workerRating: real("worker_rating"),
  citizenRating: real("citizen_rating"),
  adminCorrected: text("admin_corrected"),
  verificationConfidence: real("verification_confidence"),
  issueCategory: text("issue_category"),
  priorityPredicted: text("priority_predicted"),
  priorityActual: text("priority_actual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLearningDataSchema = createInsertSchema(learningDataTable).omit({ id: true, createdAt: true });
export type InsertLearningData = z.infer<typeof insertLearningDataSchema>;
export type LearningData = typeof learningDataTable.$inferSelect;
