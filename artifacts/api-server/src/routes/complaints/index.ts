import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  db,
  complaintsTable,
  aiAnalysisTable,
  priorityScoresTable,
  assignmentsTable,
  workersTable,
  departmentsTable,
  verificationResultsTable,
  auditLogsTable,
  learningDataTable,
  complaintMediaTable,
} from "@workspace/db";
import {
  SubmitComplaintBody,
  VerifyCompletionBody,
  SubmitCitizenFeedbackBody,
} from "@workspace/api-zod";
import { analyzeComplaint, calculatePriorityScore, verifyCompletion } from "../../lib/ai-pipeline";
import { findBestWorker } from "../../lib/worker-assignment";
import { generateTicketId } from "../../lib/ticket-id";
import { logger } from "../../lib/logger";
import { requireAuth, requireRole } from "../../middlewares/auth";

const router: IRouter = Router();

// GET /complaints
router.get("/complaints", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;

  const conditions = [];
  if (req.query.status) conditions.push(eq(complaintsTable.status, req.query.status as "submitted" | "ai_processing" | "assigned" | "dispatched" | "in_progress" | "pending_admin_review" | "resolved" | "failed_verification" | "reopened" | "closed"));
  if (req.query.priority) conditions.push(eq(complaintsTable.priority, req.query.priority as "low" | "medium" | "high" | "critical" | "emergency"));
  if (req.query.departmentId) conditions.push(eq(complaintsTable.departmentId, Number(req.query.departmentId)));
  if (req.query.publicAssetId) conditions.push(eq(complaintsTable.publicAssetId, Number(req.query.publicAssetId)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(complaintsTable).where(where).orderBy(desc(complaintsTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(complaintsTable).where(where),
  ]);

  res.json({ items, total: Number(countResult[0]?.count ?? 0) });
});

// POST /complaints
router.post("/complaints", async (req, res): Promise<void> => {
  const parsed = SubmitComplaintBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { imageBase64, ...complaintData } = parsed.data;

  // 1. Create the complaint record
  const ticketId = generateTicketId();
  const [complaint] = await db
    .insert(complaintsTable)
    .values({ ...complaintData, ticketId, status: "submitted" })
    .returning();

  req.log.info({ complaintId: complaint.id, ticketId }, "Complaint submitted");

  // 2. Store image reference if provided
  if (imageBase64) {
    await db.insert(complaintMediaTable).values({
      complaintId: complaint.id,
      mediaType: "image",
      mediaRole: "original",
      filePath: `base64:${complaint.id}:original`,
      mimeType: "image/jpeg",
      uploadedBy: "citizen",
    });
  }

  // 3. Kick off async AI pipeline (non-blocking)
  setImmediate(async () => {
    try {
      await runAiPipeline(complaint.id, { imageBase64, description: complaintData.description, address: complaintData.address });
    } catch (err) {
      logger.error({ err, complaintId: complaint.id }, "Background AI pipeline failed");
    }
  });

  res.status(201).json(complaint);
});

// GET /complaints/ticket/:ticketId
router.get("/complaints/ticket/:ticketId", async (req, res): Promise<void> => {
  const rawTicketId = Array.isArray(req.params.ticketId) ? req.params.ticketId[0] : req.params.ticketId;
  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.ticketId, rawTicketId));
  if (!complaint) {
    res.status(404).json({ error: "Complaint not found" });
    return;
  }
  res.json(complaint);
});

// GET /complaints/:id
router.get("/complaints/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }
  res.json(complaint);
});

// POST /complaints/:id/analyze
router.post("/complaints/:id/analyze", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }

  const aiResult = await analyzeComplaint({
    description: complaint.description,
    address: complaint.address,
    imageBase64: null,
  });

  const [analysis] = await db.insert(aiAnalysisTable).values({
    ...aiResult,
    complaintId: id,
    rawResponse: aiResult as unknown as Record<string, unknown>,
  }).onConflictDoNothing().returning();

  await db.update(complaintsTable).set({ status: "ai_processing" }).where(eq(complaintsTable.id, id));

  req.log.info({ complaintId: id }, "AI analysis completed");
  const responseData = analysis ?? { complaintId: id, ...aiResult };
  res.json(responseData);
});

// POST /complaints/:id/assign
router.post("/complaints/:id/assign", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }

  const [analysis] = await db.select().from(aiAnalysisTable).where(eq(aiAnalysisTable.complaintId, id));
  const departmentName = analysis?.suggestedDepartment ?? "Public Works Department";
  const requiredSkills = analysis?.requiredSkills ?? [];

  const candidate = await findBestWorker({
    departmentName,
    requiredSkills,
    latitude: complaint.latitude,
    longitude: complaint.longitude,
  });

  if (!candidate) {
    res.status(404).json({ error: "No available workers found for this department" });
    return;
  }

  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.name, departmentName));

  const [assignment] = await db.insert(assignmentsTable).values({
    complaintId: id,
    workerId: candidate.worker.id,
    departmentId: dept?.id ?? candidate.worker.departmentId,
    distanceKm: candidate.distanceKm,
    estimatedArrivalMinutes: candidate.estimatedArrivalMinutes,
    status: "pending",
  }).returning();

  await Promise.all([
    db.update(complaintsTable).set({
      status: "assigned",
      assignedWorkerId: candidate.worker.id,
      departmentId: dept?.id ?? candidate.worker.departmentId,
    }).where(eq(complaintsTable.id, id)),
    db.update(workersTable).set({
      status: "busy",
      activeComplaintCount: (candidate.worker.activeComplaintCount ?? 0) + 1,
    }).where(eq(workersTable.id, candidate.worker.id)),
  ]);

  await db.insert(auditLogsTable).values({
    entityType: "complaint",
    entityId: id,
    action: "worker_assigned",
    performedBy: "system",
    newValue: { workerId: candidate.worker.id, assignmentId: assignment.id } as unknown as Record<string, unknown>,
  });

  req.log.info({ complaintId: id, workerId: candidate.worker.id }, "Worker assigned");

  res.json({
    assignmentId: assignment.id,
    workerId: candidate.worker.id,
    workerName: candidate.worker.name,
    workerPhone: candidate.worker.phone,
    distanceKm: candidate.distanceKm,
    estimatedArrivalMinutes: candidate.estimatedArrivalMinutes,
  });
});

// POST /complaints/:id/verify
// Issue 1: Now requires a geo-tagged completion photo from the officer.
// Stores photo path + GPS coordinates + timestamp in DB.
// Sets complaint to "pending_admin_review" on AI pass, "failed_verification" on AI fail.
// Worker is NOT freed here — that happens on admin approval.
router.post("/complaints/:id/verify", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = VerifyCompletionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Read new geo-tagged photo fields (outside the generated Zod schema)
  const {
    completionPhotoBase64,
    completionLatitude,
    completionLongitude,
  } = req.body as {
    completionPhotoBase64?: string;
    completionLatitude?: number;
    completionLongitude?: number;
  };

  // Require completion photo
  if (!completionPhotoBase64) {
    res.status(400).json({ error: "Completion photo is required. Please capture a geo-tagged photo before submitting." });
    return;
  }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }

  const [activeAssignment] = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.complaintId, id), eq(assignmentsTable.isActive, true)));

  // Store completion photo reference and GPS evidence in the complaint record
  const completionPhotoPath = `base64:${id}:completion`;
  const completionTimestamp = new Date();

  await db.insert(complaintMediaTable).values({
    complaintId: id,
    mediaType: "image",
    mediaRole: "completion_photo",
    filePath: completionPhotoPath,
    mimeType: "image/jpeg",
    uploadedBy: "officer",
  }).onConflictDoNothing();

  // Update complaint with geo-tagged evidence metadata
  await db.update(complaintsTable).set({
    completionPhotoPath,
    completionLatitude: completionLatitude ?? null,
    completionLongitude: completionLongitude ?? null,
    completionTimestamp,
    // Clear any previous rejection reason when officer resubmits
    adminRejectionReason: null,
  }).where(eq(complaintsTable.id, id));

  // Run AI verification on the submitted evidence
  const result = await verifyCompletion({
    originalDescription: complaint.description,
    workerNotes: parsed.data.workerNotes,
    beforeImageBase64: parsed.data.beforeImageBase64,
    afterImageBase64: completionPhotoBase64,
  });

  await db.insert(verificationResultsTable).values({
    complaintId: id,
    assignmentId: activeAssignment?.id ?? 0,
    verdict: result.verdict,
    confidence: result.confidence,
    aiNotes: result.notes,
    workerNotes: parsed.data.workerNotes,
    beforeImagePath: parsed.data.beforeImageBase64 ? `base64:${id}:before` : null,
    afterImagePath: completionPhotoPath,
    isEscalated: result.escalate,
    escalationReason: result.escalationReason,
  }).returning();

  // Issue 1: AI pass → "pending_admin_review" (not directly resolved).
  // Admin must approve before complaint is marked resolved.
  // AI fail → "failed_verification", officer must retry.
  const newStatus = (result.verdict === "resolved" || result.verdict === "partially_resolved")
    ? "pending_admin_review"
    : result.verdict === "failed"
    ? "failed_verification"
    : "in_progress";

  await db.update(complaintsTable).set({ status: newStatus }).where(eq(complaintsTable.id, id));

  req.log.info({ complaintId: id, verdict: result.verdict, newStatus }, "Verification completed — awaiting admin review");

  res.json({
    verdict: result.verdict,
    confidence: result.confidence,
    aiNotes: result.notes,
    status: newStatus,
    isEscalated: result.escalate,
    escalationReason: result.escalationReason ?? null,
  });
});

// POST /complaints/:id/admin-review
// Issue 1: Admin approves or rejects the officer's completion evidence.
// Approve → complaint "resolved", worker freed, assignment "completed".
// Reject → complaint back to "in_progress" with rejection reason for the officer.
router.post("/complaints/:id/admin-review", requireAuth, requireRole("admin"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { approved, reason } = req.body as { approved: boolean; reason?: string };
  if (typeof approved !== "boolean") {
    res.status(400).json({ error: "approved (boolean) is required" });
    return;
  }

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
  if (!complaint) { res.status(404).json({ error: "Complaint not found" }); return; }

  if (complaint.status !== "pending_admin_review") {
    res.status(409).json({ error: "Complaint is not pending admin review" });
    return;
  }

  const [activeAssignment] = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.complaintId, id), eq(assignmentsTable.isActive, true)));

  if (approved) {
    // Admin approves → mark resolved, free worker, complete assignment
    const resolvedAt = new Date();

    await db.update(complaintsTable).set({
      status: "resolved",
      resolvedAt,
      adminRejectionReason: null,
    }).where(eq(complaintsTable.id, id));

    if (activeAssignment) {
      await db.update(assignmentsTable).set({
        status: "completed",
        completedAt: resolvedAt,
      }).where(eq(assignmentsTable.id, activeAssignment.id));

      const [worker] = await db.select().from(workersTable).where(eq(workersTable.id, activeAssignment.workerId));
      if (worker) {
        await db.update(workersTable).set({
          status: "available",
          activeComplaintCount: Math.max(0, (worker.activeComplaintCount ?? 1) - 1),
          totalResolved: (worker.totalResolved ?? 0) + 1,
        }).where(eq(workersTable.id, worker.id));
      }

      await db.insert(learningDataTable).values({
        complaintId: id,
        verificationConfidence: 1.0,
        issueCategory: "resolved",
      }).onConflictDoNothing();
    }

    await db.insert(auditLogsTable).values({
      entityType: "complaint",
      entityId: id,
      action: "admin_approved",
      performedBy: String(req.user!.userId),
      newValue: { status: "resolved", approvedBy: req.user!.userId } as unknown as Record<string, unknown>,
    });

    req.log.info({ complaintId: id, adminId: req.user!.userId }, "Admin approved complaint resolution");
    res.json({ success: true, status: "resolved" });
  } else {
    // Admin rejects → return to officer with reason
    if (!reason?.trim()) {
      res.status(400).json({ error: "Rejection reason is required" });
      return;
    }

    await db.update(complaintsTable).set({
      status: "in_progress",
      adminRejectionReason: reason.trim(),
    }).where(eq(complaintsTable.id, id));

    await db.insert(auditLogsTable).values({
      entityType: "complaint",
      entityId: id,
      action: "admin_rejected",
      performedBy: String(req.user!.userId),
      newValue: { status: "in_progress", reason } as unknown as Record<string, unknown>,
    });

    req.log.info({ complaintId: id, adminId: req.user!.userId, reason }, "Admin rejected complaint — returned to officer");
    res.json({ success: true, status: "in_progress", reason });
  }
});

// POST /complaints/:id/citizen-feedback
router.post("/complaints/:id/citizen-feedback", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = SubmitCitizenFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [verification] = await db.select().from(verificationResultsTable)
    .where(eq(verificationResultsTable.complaintId, id))
    .orderBy(desc(verificationResultsTable.createdAt));

  if (verification) {
    await db.update(verificationResultsTable).set({
      citizenVerified: parsed.data.citizenVerified,
      citizenRating: parsed.data.citizenRating ?? null,
      citizenComment: parsed.data.citizenComment ?? null,
    }).where(eq(verificationResultsTable.id, verification.id));
  }

  if (parsed.data.citizenVerified === false) {
    await db.update(complaintsTable).set({ status: "reopened" }).where(eq(complaintsTable.id, id));
  } else if (parsed.data.citizenVerified === true) {
    await db.update(complaintsTable).set({ status: "closed" }).where(eq(complaintsTable.id, id));
  }

  if (parsed.data.citizenRating != null) {
    await db.update(learningDataTable).set({ citizenRating: parsed.data.citizenRating })
      .where(eq(learningDataTable.complaintId, id));
  }

  res.json({ success: true, message: "Feedback recorded" });
});

// ─── Background AI pipeline helper ───────────────────────────────────────────

async function runAiPipeline(
  complaintId: number,
  opts: { imageBase64?: string | null; description?: string | null; address?: string | null }
): Promise<void> {
  await db.update(complaintsTable).set({ status: "ai_processing" }).where(eq(complaintsTable.id, complaintId));

  const aiResult = await analyzeComplaint(opts);

  await db.insert(aiAnalysisTable).values({
    ...aiResult,
    complaintId,
    rawResponse: aiResult as unknown as Record<string, unknown>,
  }).onConflictDoNothing();

  const [complaint] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, complaintId));
  const priority = calculatePriorityScore({
    severity: aiResult.severity,
    emergencyLevel: aiResult.emergencyLevel,
    duplicateCount: complaint?.duplicateCount ?? 0,
    description: opts.description,
  });

  await db.insert(priorityScoresTable).values({
    complaintId,
    safetyRisk: priority.breakdown.safetyRisk ?? 0,
    affectedCitizens: 0,
    nearbySchools: priority.breakdown.nearbySchools ?? 0,
    nearbyHospitals: priority.breakdown.nearbyHospitals ?? 0,
    trafficDensity: priority.breakdown.trafficDensity ?? 0,
    weatherImpact: 0,
    complaintAge: 0,
    duplicateBonus: priority.breakdown.duplicateBonus ?? 0,
    communityVotes: 0,
    environmentalImpact: 0,
    totalScore: priority.score,
    priorityLevel: priority.level,
    breakdown: priority.breakdown as unknown as Record<string, unknown>,
  }).onConflictDoNothing();

  await db.update(complaintsTable).set({
    status: "assigned",
    priority: priority.level,
    priorityScore: priority.score,
    estimatedResolutionHours: aiResult.estimatedResolutionHours,
  }).where(eq(complaintsTable.id, complaintId));

  const candidate = await findBestWorker({
    departmentName: aiResult.suggestedDepartment,
    requiredSkills: aiResult.requiredSkills,
    latitude: complaint?.latitude,
    longitude: complaint?.longitude,
  });

  if (candidate) {
    const [dept] = await db.select().from(departmentsTable)
      .where(eq(departmentsTable.name, aiResult.suggestedDepartment));

    await db.insert(assignmentsTable).values({
      complaintId,
      workerId: candidate.worker.id,
      departmentId: dept?.id ?? candidate.worker.departmentId,
      distanceKm: candidate.distanceKm,
      estimatedArrivalMinutes: candidate.estimatedArrivalMinutes,
      status: "pending",
    });

    await Promise.all([
      db.update(complaintsTable).set({
        assignedWorkerId: candidate.worker.id,
        departmentId: dept?.id ?? candidate.worker.departmentId,
      }).where(eq(complaintsTable.id, complaintId)),
      db.update(workersTable).set({
        status: "busy",
        activeComplaintCount: (candidate.worker.activeComplaintCount ?? 0) + 1,
      }).where(eq(workersTable.id, candidate.worker.id)),
    ]);

    logger.info({ complaintId, workerId: candidate.worker.id }, "Auto-assigned worker via pipeline");
  }
}

export default router;
