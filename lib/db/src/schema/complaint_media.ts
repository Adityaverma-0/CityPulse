import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintMediaTable = pgTable("complaint_media", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").notNull(),
  mediaType: text("media_type").notNull(), // image, video, audio
  mediaRole: text("media_role").notNull(), // original, before, after, evidence
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  uploadedBy: text("uploaded_by").notNull().default("citizen"), // citizen, worker, system
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertComplaintMediaSchema = createInsertSchema(complaintMediaTable).omit({ id: true, createdAt: true });
export type InsertComplaintMedia = z.infer<typeof insertComplaintMediaSchema>;
export type ComplaintMedia = typeof complaintMediaTable.$inferSelect;
