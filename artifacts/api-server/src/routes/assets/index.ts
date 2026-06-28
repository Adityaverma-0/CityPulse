import { Router, type IRouter } from "express";
import { eq, and, sql, desc, gte, lt } from "drizzle-orm";
import crypto from "crypto";
import { db, publicAssetsTable, complaintsTable, departmentsTable } from "@workspace/db";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

const QR_SECRET = process.env.SESSION_SECRET ?? "community-hero-qr-secret";

function generateAssetCode(type: string, id: number): string {
  const prefix: Record<string, string> = {
    public_toilet: "PT",
    dustbin: "DB",
    park: "PK",
    bus_stop: "BS",
    street_light: "SL",
    water_atm: "WA",
    drinking_water_point: "DW",
    government_building: "GB",
    community_hall: "CH",
    other: "OT",
  };
  const p = prefix[type] ?? "AS";
  return `${p}-${String(id).padStart(3, "0")}`;
}

function generateQrSignature(assetCode: string, lat: number, lng: number): string {
  return crypto
    .createHmac("sha256", QR_SECRET)
    .update(`${assetCode}:${lat.toFixed(5)}:${lng.toFixed(5)}`)
    .digest("hex")
    .slice(0, 16);
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function enrichAsset(asset: typeof publicAssetsTable.$inferSelect, includeRecent = false) {
  const [dept] = asset.departmentId
    ? await db.select({ name: departmentsTable.name }).from(departmentsTable).where(eq(departmentsTable.id, asset.departmentId))
    : [null];

  let recentComplaints: unknown[] = [];
  if (includeRecent) {
    recentComplaints = await db
      .select()
      .from(complaintsTable)
      .where(eq(complaintsTable.publicAssetId, asset.id))
      .orderBy(desc(complaintsTable.createdAt))
      .limit(5);
  }

  return {
    ...asset,
    departmentName: dept?.name ?? null,
    installedAt: asset.installedAt?.toISOString() ?? null,
    lastMaintainedAt: asset.lastMaintainedAt?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString(),
    recentComplaints,
  };
}

// GET /assets
router.get("/assets", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (req.query.type) conditions.push(eq(publicAssetsTable.type, req.query.type as typeof publicAssetsTable.type._.data));
  if (req.query.departmentId) conditions.push(eq(publicAssetsTable.departmentId, Number(req.query.departmentId)));
  if (req.query.ward) conditions.push(eq(publicAssetsTable.ward, req.query.ward as string));
  if (req.query.minHealth) conditions.push(gte(publicAssetsTable.healthScore, Number(req.query.minHealth)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(publicAssetsTable).where(where).orderBy(desc(publicAssetsTable.updatedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(publicAssetsTable).where(where),
  ]);

  const enriched = await Promise.all(items.map((a) => enrichAsset(a, false)));
  res.json({ items: enriched, total: Number(countResult[0]?.count ?? 0) });
});

// POST /assets
router.post("/assets", async (req, res): Promise<void> => {
  const { name, type, latitude, longitude, address, ward, departmentId, notes, assetCode: providedCode } = req.body as {
    name: string; type: string; latitude: number; longitude: number;
    address?: string; ward?: string; departmentId?: number; notes?: string; assetCode?: string;
  };

  if (!name || !type || latitude == null || longitude == null) {
    res.status(400).json({ error: "name, type, latitude, longitude are required" });
    return;
  }

  const [asset] = await db
    .insert(publicAssetsTable)
    .values({
      assetCode: providedCode ?? `TEMP-0`,
      name,
      type: type as typeof publicAssetsTable.type._.data,
      latitude,
      longitude,
      address: address ?? null,
      ward: ward ?? null,
      departmentId: departmentId ?? null,
      notes: notes ?? null,
      qrSignature: null,
    })
    .returning();

  const assetCode = providedCode ?? generateAssetCode(type, asset.id);
  const qrSignature = generateQrSignature(assetCode, latitude, longitude);

  const [updated] = await db
    .update(publicAssetsTable)
    .set({ assetCode, qrSignature })
    .where(eq(publicAssetsTable.id, asset.id))
    .returning();

  logger.info({ assetId: updated.id, assetCode }, "Asset created");
  res.status(201).json(await enrichAsset(updated, false));
});

// GET /assets/summary/stats  — must come before /assets/:id
router.get("/assets/summary/stats", async (_req, res): Promise<void> => {
  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(publicAssetsTable);
  const [activeRow] = await db.select({ count: sql<number>`count(*)` }).from(publicAssetsTable).where(eq(publicAssetsTable.isActive, true));
  const [avgRow] = await db.select({ avg: sql<number>`avg(health_score)` }).from(publicAssetsTable);
  const [criticalRow] = await db.select({ count: sql<number>`count(*)` }).from(publicAssetsTable).where(lt(publicAssetsTable.healthScore, 40));

  const byType = await db
    .select({
      type: publicAssetsTable.type,
      count: sql<number>`count(*)`,
      avgHealth: sql<number>`avg(health_score)`,
    })
    .from(publicAssetsTable)
    .groupBy(publicAssetsTable.type);

  const lowestHealth = await db
    .select()
    .from(publicAssetsTable)
    .where(eq(publicAssetsTable.isActive, true))
    .orderBy(publicAssetsTable.healthScore)
    .limit(5);

  const enrichedLowest = await Promise.all(lowestHealth.map((a) => enrichAsset(a, false)));

  res.json({
    totalAssets: Number(totalRow?.count ?? 0),
    activeAssets: Number(activeRow?.count ?? 0),
    avgHealthScore: Math.round((Number(avgRow?.avg ?? 100)) * 10) / 10,
    criticalAssets: Number(criticalRow?.count ?? 0),
    byType: byType.map((r) => ({
      type: r.type,
      count: Number(r.count),
      avgHealth: Math.round(Number(r.avgHealth ?? 100) * 10) / 10,
    })),
    lowestHealthAssets: enrichedLowest,
  });
});

// GET /assets/qr/:assetCode  — must come before /assets/:id
router.get("/assets/qr/:assetCode", async (req, res): Promise<void> => {
  const [asset] = await db
    .select()
    .from(publicAssetsTable)
    .where(eq(publicAssetsTable.assetCode, req.params.assetCode));

  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  res.json(await enrichAsset(asset, false));
});

// GET /assets/:id
router.get("/assets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [asset] = await db.select().from(publicAssetsTable).where(eq(publicAssetsTable.id, id));

  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  res.json(await enrichAsset(asset, true));
});

// PATCH /assets/:id
router.patch("/assets/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { name, type, address, ward, departmentId, notes, isActive } = req.body as {
    name?: string; type?: string; address?: string; ward?: string;
    departmentId?: number | null; notes?: string; isActive?: boolean;
  };

  const updateData: Partial<typeof publicAssetsTable.$inferInsert> = {};
  if (name != null) updateData.name = name;
  if (type != null) updateData.type = type as typeof publicAssetsTable.type._.data;
  if (address !== undefined) updateData.address = address;
  if (ward !== undefined) updateData.ward = ward;
  if (departmentId !== undefined) updateData.departmentId = departmentId;
  if (notes !== undefined) updateData.notes = notes;
  if (isActive != null) updateData.isActive = isActive;

  const [updated] = await db
    .update(publicAssetsTable)
    .set(updateData)
    .where(eq(publicAssetsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  res.json(await enrichAsset(updated, false));
});

// GET /assets/:id/complaints
router.get("/assets/:id/complaints", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const [items, countResult] = await Promise.all([
    db.select().from(complaintsTable).where(eq(complaintsTable.publicAssetId, id)).orderBy(desc(complaintsTable.createdAt)).limit(limit),
    db.select({ count: sql<number>`count(*)` }).from(complaintsTable).where(eq(complaintsTable.publicAssetId, id)),
  ]);

  res.json({ items, total: Number(countResult[0]?.count ?? 0) });
});

// POST /assets/:id/verify-officer
router.post("/assets/:id/verify-officer", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const { latitude, longitude } = req.body as { latitude: number; longitude: number; officerId?: number };

  if (latitude == null || longitude == null) {
    res.status(400).json({ error: "latitude and longitude are required" });
    return;
  }

  const [asset] = await db.select().from(publicAssetsTable).where(eq(publicAssetsTable.id, id));
  if (!asset) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }

  const distanceMeters = haversineMeters(latitude, longitude, asset.latitude, asset.longitude);
  const THRESHOLD_METERS = 20;
  const verified = distanceMeters <= THRESHOLD_METERS;

  res.json({
    verified,
    distanceMeters: Math.round(distanceMeters * 10) / 10,
    message: verified
      ? `Verified — you are ${Math.round(distanceMeters)}m from the asset.`
      : `Too far — you are ${Math.round(distanceMeters)}m away. Must be within ${THRESHOLD_METERS}m.`,
  });
});

export default router;
