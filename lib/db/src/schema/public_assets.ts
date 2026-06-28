import {
  pgTable, serial, text, integer, real, boolean, timestamp, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assetTypeEnum = pgEnum("asset_type", [
  "public_toilet",
  "dustbin",
  "park",
  "bus_stop",
  "street_light",
  "water_atm",
  "drinking_water_point",
  "government_building",
  "community_hall",
  "other",
]);

export const publicAssetsTable = pgTable("public_assets", {
  id: serial("id").primaryKey(),
  assetCode: text("asset_code").notNull().unique(),
  name: text("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  address: text("address"),
  ward: text("ward"),
  departmentId: integer("department_id"),
  qrSignature: text("qr_signature"),
  healthScore: real("health_score").notNull().default(100),
  installedAt: timestamp("installed_at", { withTimezone: true }),
  lastMaintainedAt: timestamp("last_maintained_at", { withTimezone: true }),
  totalComplaints: integer("total_complaints").notNull().default(0),
  totalMaintenanceVisits: integer("total_maintenance_visits").notNull().default(0),
  avgCitizenRating: real("avg_citizen_rating"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPublicAssetSchema = createInsertSchema(publicAssetsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPublicAsset = z.infer<typeof insertPublicAssetSchema>;
export type PublicAsset = typeof publicAssetsTable.$inferSelect;
