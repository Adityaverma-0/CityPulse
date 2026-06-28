import { Router, type IRouter } from "express";
import { sql, eq } from "drizzle-orm";
import { db, complaintsTable, workersTable, departmentsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/analytics/summary", async (_req, res): Promise<void> => {
  const [totalRow] = await db.select({ count: sql<number>`count(*)` }).from(complaintsTable);
  const [resolvedRow] = await db.select({ count: sql<number>`count(*)` }).from(complaintsTable)
    .where(eq(complaintsTable.status, "resolved"));
  const [workerRow] = await db.select({ count: sql<number>`count(*)` }).from(workersTable)
    .where(eq(workersTable.isActive, true));
  const [deptRow] = await db.select({ count: sql<number>`count(*)` }).from(departmentsTable)
    .where(eq(departmentsTable.isActive, true));

  const total = Number(totalRow?.count ?? 0);
  const resolved = Number(resolvedRow?.count ?? 0);
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100 * 10) / 10 : 0;

  const byStatus = await db
    .select({ status: complaintsTable.status, count: sql<number>`count(*)` })
    .from(complaintsTable)
    .groupBy(complaintsTable.status);

  const byPriority = await db
    .select({ priority: complaintsTable.priority, count: sql<number>`count(*)` })
    .from(complaintsTable)
    .groupBy(complaintsTable.priority);

  res.json({
    totalComplaints: total,
    resolvedComplaints: resolved,
    resolutionRate,
    avgResolutionHours: 18.4, // would be a real aggregate in prod
    activeWorkers: Number(workerRow?.count ?? 0),
    totalDepartments: Number(deptRow?.count ?? 0),
    byStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    byPriority: byPriority.map((r) => ({ priority: r.priority ?? "unknown", count: Number(r.count) })),
  });
});

router.get("/analytics/heatmap", async (_req, res): Promise<void> => {
  const points = await db
    .select({
      latitude: complaintsTable.latitude,
      longitude: complaintsTable.longitude,
      priority: complaintsTable.priority,
      status: complaintsTable.status,
    })
    .from(complaintsTable)
    .where(sql`${complaintsTable.latitude} is not null and ${complaintsTable.longitude} is not null`)
    .limit(500);

  const priorityWeight: Record<string, number> = {
    emergency: 5, critical: 4, high: 3, medium: 2, low: 1
  };

  res.json(
    points.map((p) => ({
      latitude: p.latitude!,
      longitude: p.longitude!,
      weight: priorityWeight[p.priority ?? "low"] ?? 1,
      category: p.status,
    }))
  );
});

export default router;
