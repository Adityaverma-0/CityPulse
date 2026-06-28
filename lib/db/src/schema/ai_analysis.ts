import { pgTable, serial, integer, text, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiAnalysisTable = pgTable("ai_analysis", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").notNull(),
  issueCategory: text("issue_category"),
  issueDescription: text("issue_description"),
  detectedObjects: text("detected_objects").array().notNull().default([]),
  suggestedDepartment: text("suggested_department"),
  severity: text("severity"),
  confidence: real("confidence"),
  estimatedResolutionHours: real("estimated_resolution_hours"),
  equipmentRequired: text("equipment_required").array().notNull().default([]),
  workersRequired: integer("workers_required").default(1),
  requiredSkills: text("required_skills").array().notNull().default([]),
  emergencyLevel: text("emergency_level"),
  rawResponse: jsonb("raw_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiAnalysisSchema = createInsertSchema(aiAnalysisTable).omit({ id: true, createdAt: true });
export type InsertAiAnalysis = z.infer<typeof insertAiAnalysisSchema>;
export type AiAnalysis = typeof aiAnalysisTable.$inferSelect;
