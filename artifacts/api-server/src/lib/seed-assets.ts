import crypto from "crypto";
import { db, publicAssetsTable, departmentsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

const QR_SECRET = process.env.SESSION_SECRET ?? "community-hero-qr-secret";

function generateQrSignature(assetCode: string, lat: number, lng: number): string {
  return crypto
    .createHmac("sha256", QR_SECRET)
    .update(`${assetCode}:${lat.toFixed(5)}:${lng.toFixed(5)}`)
    .digest("hex")
    .slice(0, 16);
}

const SAMPLE_ASSETS = [
  { assetCode: "PT-001", name: "Public Toilet - City Center", type: "public_toilet" as const, latitude: 18.5204, longitude: 73.8567, address: "MG Road, Pune", ward: "Ward 1", deptCode: "SAN" },
  { assetCode: "PT-002", name: "Public Toilet - Railway Station", type: "public_toilet" as const, latitude: 18.5285, longitude: 73.8738, address: "Station Road, Pune", ward: "Ward 2", deptCode: "SAN" },
  { assetCode: "DB-001", name: "Dustbin Cluster - Market Area", type: "dustbin" as const, latitude: 18.5167, longitude: 73.8558, address: "Laxmi Road, Pune", ward: "Ward 3", deptCode: "SAN" },
  { assetCode: "DB-002", name: "Dustbin - Park Gate", type: "dustbin" as const, latitude: 18.5320, longitude: 73.8456, address: "Fergusson College Road, Pune", ward: "Ward 4", deptCode: "SAN" },
  { assetCode: "PK-001", name: "Kamla Nehru Park", type: "park" as const, latitude: 18.5362, longitude: 73.8490, address: "Prabhat Road, Pune", ward: "Ward 5", deptCode: "PARKS" },
  { assetCode: "PK-002", name: "Empress Garden", type: "park" as const, latitude: 18.5214, longitude: 73.8775, address: "Empress Garden, Pune", ward: "Ward 6", deptCode: "PARKS" },
  { assetCode: "BS-001", name: "Bus Stop - PMC Square", type: "bus_stop" as const, latitude: 18.5018, longitude: 73.8618, address: "Swargate, Pune", ward: "Ward 7", deptCode: "TRANS" },
  { assetCode: "BS-002", name: "Bus Stop - Deccan Gymkhana", type: "bus_stop" as const, latitude: 18.5167, longitude: 73.8418, address: "Deccan, Pune", ward: "Ward 8", deptCode: "TRANS" },
  { assetCode: "SL-001", name: "Street Light Cluster - FC Road", type: "street_light" as const, latitude: 18.5236, longitude: 73.8397, address: "FC Road, Pune", ward: "Ward 9", deptCode: "ELEC" },
  { assetCode: "SL-002", name: "Street Light - Koregaon Park", type: "street_light" as const, latitude: 18.5362, longitude: 73.8929, address: "Koregaon Park, Pune", ward: "Ward 10", deptCode: "ELEC" },
  { assetCode: "WA-001", name: "Water ATM - Hadapsar", type: "water_atm" as const, latitude: 18.5018, longitude: 73.9298, address: "Hadapsar, Pune", ward: "Ward 11", deptCode: "WATER" },
  { assetCode: "DW-001", name: "Drinking Water Point - Shivajinagar", type: "drinking_water_point" as const, latitude: 18.5308, longitude: 73.8474, address: "Shivajinagar, Pune", ward: "Ward 12", deptCode: "WATER" },
  { assetCode: "GB-001", name: "Pune Municipal Corporation Building", type: "government_building" as const, latitude: 18.5196, longitude: 73.8553, address: "Shivajinagar, Pune", ward: "Ward 1", deptCode: "ADMIN" },
  { assetCode: "CH-001", name: "Tilak Smarak Community Hall", type: "community_hall" as const, latitude: 18.5249, longitude: 73.8601, address: "Tilak Road, Pune", ward: "Ward 2", deptCode: "ADMIN" },
  { assetCode: "SL-003", name: "Street Light - Aundh Road", type: "street_light" as const, latitude: 18.5649, longitude: 73.8076, address: "Aundh, Pune", ward: "Ward 13", deptCode: "ELEC" },
  { assetCode: "DB-003", name: "Dustbin - Wakad Junction", type: "dustbin" as const, latitude: 18.5989, longitude: 73.7602, address: "Wakad, Pune", ward: "Ward 14", deptCode: "SAN" },
  { assetCode: "PT-003", name: "Public Toilet - Kothrud", type: "public_toilet" as const, latitude: 18.5074, longitude: 73.8076, address: "Kothrud, Pune", ward: "Ward 15", deptCode: "SAN" },
  { assetCode: "BS-003", name: "Bus Stop - Hinjewadi Phase 1", type: "bus_stop" as const, latitude: 18.5910, longitude: 73.7395, address: "Hinjewadi, Pune", ward: "Ward 16", deptCode: "TRANS" },
  { assetCode: "PK-003", name: "Baner Hill Park", type: "park" as const, latitude: 18.5603, longitude: 73.7820, address: "Baner, Pune", ward: "Ward 17", deptCode: "PARKS" },
  { assetCode: "WA-002", name: "Water ATM - Kharadi", type: "water_atm" as const, latitude: 18.5555, longitude: 73.9449, address: "Kharadi, Pune", ward: "Ward 18", deptCode: "WATER" },
];

export async function seedAssets() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(publicAssetsTable);
  if (Number(count) > 0) {
    logger.info("Assets already seeded, skipping");
    return;
  }

  const depts = await db.select({ id: departmentsTable.id, code: departmentsTable.code }).from(departmentsTable);
  const deptMap = new Map(depts.map((d) => [d.code, d.id]));

  const toInsert = SAMPLE_ASSETS.map((a) => ({
    assetCode: a.assetCode,
    name: a.name,
    type: a.type,
    latitude: a.latitude,
    longitude: a.longitude,
    address: a.address,
    ward: a.ward,
    departmentId: deptMap.get(a.deptCode) ?? null,
    qrSignature: generateQrSignature(a.assetCode, a.latitude, a.longitude),
    healthScore: 75 + Math.random() * 25,
    installedAt: new Date(Date.now() - Math.random() * 365 * 2 * 24 * 60 * 60 * 1000),
    lastMaintainedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    totalComplaints: Math.floor(Math.random() * 20),
    totalMaintenanceVisits: Math.floor(Math.random() * 40) + 1,
    avgCitizenRating: 3.5 + Math.random() * 1.5,
  }));

  await db.insert(publicAssetsTable).values(toInsert);
  logger.info({ count: toInsert.length }, "Seeded public assets");
}
