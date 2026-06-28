import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, assignmentsTable, complaintsTable, workersTable, notificationsTable, auditLogsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../../middlewares/auth";

const router: IRouter = Router();

// GET /assignments/my  — officer's own assignments
router.get("/assignments/my", requireAuth, requireRole("officer"), async (req, res): Promise<void> => {
  const workerId = req.user!.workerId;
  if (!workerId) { res.status(400).json({ error: "No worker profile linked to this account" }); return; }

  const assignments = await db
    .select({
      assignment: assignmentsTable,
      complaint: complaintsTable,
    })
    .from(assignmentsTable)
    .innerJoin(complaintsTable, eq(complaintsTable.id, assignmentsTable.complaintId))
    .where(eq(assignmentsTable.workerId, workerId))
    .orderBy(desc(assignmentsTable.createdAt));

  res.json(assignments);
});

// PATCH /assignments/:id/accept  — officer accepts task
router.patch("/assignments/:id/accept", requireAuth, requireRole("officer"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!assignment) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (assignment.workerId !== req.user!.workerId) { res.status(403).json({ error: "Not your assignment" }); return; }

  await db.update(assignmentsTable).set({ status: "accepted", acceptedAt: new Date() }).where(eq(assignmentsTable.id, id));
  await db.update(complaintsTable).set({ status: "dispatched" }).where(eq(complaintsTable.id, assignment.complaintId));

  res.json({ success: true, message: "Assignment accepted" });
});

// PATCH /assignments/:id/status  — officer updates progress
router.patch("/assignments/:id/status", requireAuth, requireRole("officer"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { status, notes } = req.body as { status: string; notes?: string };
  const validStatuses = ["in_progress", "completed", "rejected", "escalated"] as const;
  if (!validStatuses.includes(status as typeof validStatuses[number])) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, id));
  if (!assignment) { res.status(404).json({ error: "Assignment not found" }); return; }
  if (assignment.workerId !== req.user!.workerId) { res.status(403).json({ error: "Not your assignment" }); return; }

  const updates: Partial<typeof assignmentsTable.$inferInsert> = { status: status as "in_progress" | "completed" | "rejected" };
  if (status === "completed") updates.completedAt = new Date();

  await db.update(assignmentsTable).set(updates).where(eq(assignmentsTable.id, id));

  // Mirror to complaint
  if (status === "in_progress") {
    await db.update(complaintsTable).set({ status: "in_progress" }).where(eq(complaintsTable.id, assignment.complaintId));
  } else if (status === "rejected") {
    await db.update(complaintsTable).set({ status: "submitted" }).where(eq(complaintsTable.id, assignment.complaintId));
    // Free worker
    if (req.user!.workerId) {
      const [w] = await db.select().from(workersTable).where(eq(workersTable.id, req.user!.workerId));
      if (w) await db.update(workersTable).set({ status: "available", activeComplaintCount: Math.max(0, (w.activeComplaintCount ?? 1) - 1) }).where(eq(workersTable.id, w.id));
    }
  }

  await db.insert(auditLogsTable).values({
    entityType: "assignment",
    entityId: id,
    action: `status_changed_to_${status}`,
    performedBy: String(req.user!.userId),
    newValue: { status, notes } as unknown as Record<string, unknown>,
  });

  res.json({ success: true, message: `Assignment marked as ${status}` });
});

// GET /assignments/:id  — get single assignment detail
router.get("/assignments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select({ assignment: assignmentsTable, complaint: complaintsTable })
    .from(assignmentsTable)
    .innerJoin(complaintsTable, eq(complaintsTable.id, assignmentsTable.complaintId))
    .where(eq(assignmentsTable.id, id));

  if (!row) { res.status(404).json({ error: "Assignment not found" }); return; }
  res.json(row);
});

export default router;
