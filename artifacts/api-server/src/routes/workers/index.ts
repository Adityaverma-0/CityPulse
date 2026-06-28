import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, workersTable } from "@workspace/db";
import { CreateWorkerBody, UpdateWorkerLocationBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/workers", async (req, res): Promise<void> => {
  const conditions = [];
  if (req.query.departmentId) conditions.push(eq(workersTable.departmentId, Number(req.query.departmentId)));
  if (req.query.status) conditions.push(eq(workersTable.status, req.query.status as "available" | "busy" | "off_duty" | "on_leave"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const workers = await db.select().from(workersTable).where(where).orderBy(workersTable.name);
  res.json(workers);
});

router.post("/workers", async (req, res): Promise<void> => {
  const parsed = CreateWorkerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [worker] = await db.insert(workersTable).values(parsed.data).returning();
  res.status(201).json(worker);
});

router.patch("/workers/:id/location", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateWorkerLocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.update(workersTable).set({
    currentLatitude: parsed.data.latitude,
    currentLongitude: parsed.data.longitude,
    currentAddress: parsed.data.address ?? null,
  }).where(eq(workersTable.id, id));

  res.json({ success: true, message: "Location updated" });
});

export default router;
