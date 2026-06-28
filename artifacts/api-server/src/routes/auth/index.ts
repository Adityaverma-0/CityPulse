import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, workersTable } from "@workspace/db";
import { hashPassword, comparePassword, signToken } from "../../lib/auth";
import { requireAuth } from "../../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /auth/register  (citizen self-registration)
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, email, password, phone } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, phone: phone ?? null, role: "citizen" }).returning();

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
  if (!user.isActive) { res.status(403).json({ error: "Account is disabled" }); return; }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

  // Update last login
  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  // Get worker id for officer role
  let workerId: number | undefined;
  if (user.role === "officer") {
    const [worker] = await db.select().from(workersTable).where(eq(workersTable.email, user.email));
    workerId = worker?.id;
  }

  const token = signToken({ userId: user.id, email: user.email, role: user.role, workerId });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, workerId } });
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, phone: usersTable.phone }).from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user);
});

export default router;
