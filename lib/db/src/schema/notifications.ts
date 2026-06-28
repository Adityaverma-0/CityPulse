import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const notificationTypeEnum = pgEnum("notification_type", [
  "complaint_received",
  "complaint_assigned",
  "officer_arriving",
  "complaint_resolved",
  "verification_request",
  "complaint_reopened",
  "emergency_alert",
  "low_ai_confidence",
  "officer_inactive",
  "new_assignment",
  "deadline_reminder",
  "reassignment",
]);

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  complaintId: integer("complaint_id"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
