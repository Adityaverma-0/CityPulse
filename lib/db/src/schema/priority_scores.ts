import { pgTable, serial, integer, real, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const priorityScoresTable = pgTable("priority_scores", {
  id: serial("id").primaryKey(),
  complaintId: integer("complaint_id").notNull().unique(),
  safetyRisk: real("safety_risk").notNull().default(0),
  affectedCitizens: real("affected_citizens").notNull().default(0),
  nearbySchools: real("nearby_schools").notNull().default(0),
  nearbyHospitals: real("nearby_hospitals").notNull().default(0),
  trafficDensity: real("traffic_density").notNull().default(0),
  weatherImpact: real("weather_impact").notNull().default(0),
  complaintAge: real("complaint_age").notNull().default(0),
  duplicateBonus: real("duplicate_bonus").notNull().default(0),
  communityVotes: real("community_votes").notNull().default(0),
  environmentalImpact: real("environmental_impact").notNull().default(0),
  totalScore: real("total_score").notNull(),
  priorityLevel: text("priority_level").notNull(),
  breakdown: jsonb("breakdown"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPriorityScoreSchema = createInsertSchema(priorityScoresTable).omit({ id: true, createdAt: true });
export type InsertPriorityScore = z.infer<typeof insertPriorityScoreSchema>;
export type PriorityScore = typeof priorityScoresTable.$inferSelect;
