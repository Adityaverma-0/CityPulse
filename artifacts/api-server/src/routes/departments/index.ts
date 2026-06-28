import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, departmentsTable } from "@workspace/db";
import { CreateDepartmentBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/departments", async (_req, res): Promise<void> => {
  const departments = await db.select().from(departmentsTable).orderBy(departmentsTable.name);
  res.json(departments);
});

router.post("/departments", async (req, res): Promise<void> => {
  const parsed = CreateDepartmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [dept] = await db.insert(departmentsTable).values(parsed.data).returning();
  res.status(201).json(dept);
});

export default router;
