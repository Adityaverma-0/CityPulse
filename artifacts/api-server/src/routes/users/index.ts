import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usersTable, workersTable, notificationsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../../middlewares/auth";
import { hashPassword } from "../../lib/auth";
import { z } from "zod";

const router: IRouter = Router();

const createOfficerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  departmentId: z.number().int().positive(),
  skills: z.array(z.string()).default([]),
});

// GET /users  — admin only
router.get("/users", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone, isActive: usersTable.isActive, createdAt: usersTable.createdAt }).from(usersTable).orderBy(usersTable.createdAt);
  res.json(users);
});

// POST /users/officers  — admin creates officer
router.post("/users/officers", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = createOfficerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, email, password, phone, departmentId, skills } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

  const passwordHash = await hashPassword(password);

  // Create worker profile first
  const [worker] = await db.insert(workersTable).values({ name, email, phone: phone ?? "", departmentId, skills, status: "available" }).returning();
  // Create user account
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, phone: phone ?? null, role: "officer", workerId: worker.id }).returning();

  res.status(201).json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, workerId: worker.id });
});

// PATCH /users/:id/status  — admin enable/disable
router.patch("/users/:id/status", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { isActive } = req.body as { isActive: boolean };
  await db.update(usersTable).set({ isActive }).where(eq(usersTable.id, id));
  res.json({ success: true });
});

// GET /notifications  — current user's notifications
router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.userId))
    .orderBy(notificationsTable.createdAt);
  res.json(notifications);
});

// PATCH /notifications/:id/read
router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.update(notificationsTable).set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.user!.userId)));
  res.json({ success: true });
});

export default router;
