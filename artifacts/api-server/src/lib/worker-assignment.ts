import { db, workersTable, departmentsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { logger } from "./logger";

// Haversine formula — returns distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Average urban travel speed assumption: 25 km/h
const AVG_SPEED_KMH = 25;

export interface WorkerCandidate {
  worker: typeof workersTable.$inferSelect;
  distanceKm: number;
  estimatedArrivalMinutes: number;
  score: number;
}

export async function findBestWorker(opts: {
  departmentName: string;
  requiredSkills: string[];
  latitude?: number | null;
  longitude?: number | null;
}): Promise<WorkerCandidate | null> {
  // 1. Find the department by name
  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(eq(departmentsTable.name, opts.departmentName));

  if (!dept) {
    logger.warn({ departmentName: opts.departmentName }, "Department not found for assignment");
    return null;
  }

  // 2. Get all available workers in that department
  const candidates = await db
    .select()
    .from(workersTable)
    .where(
      and(
        eq(workersTable.departmentId, dept.id),
        eq(workersTable.status, "available"),
        eq(workersTable.isActive, true)
      )
    )
    .orderBy(asc(workersTable.activeComplaintCount));

  if (candidates.length === 0) {
    logger.warn({ departmentName: opts.departmentName }, "No available workers found");
    return null;
  }

  // 3. Score each candidate
  const scored: WorkerCandidate[] = candidates.map((worker) => {
    let distanceKm = 0;
    let estimatedArrivalMinutes = 30; // default if no GPS

    if (
      opts.latitude != null &&
      opts.longitude != null &&
      worker.currentLatitude != null &&
      worker.currentLongitude != null
    ) {
      distanceKm = haversineKm(
        opts.latitude,
        opts.longitude,
        worker.currentLatitude,
        worker.currentLongitude
      );
      estimatedArrivalMinutes = (distanceKm / AVG_SPEED_KMH) * 60;
    }

    // Skill match bonus
    const matchedSkills = opts.requiredSkills.filter((s) =>
      worker.skills.some((ws) => ws.toLowerCase().includes(s.toLowerCase()))
    ).length;
    const skillScore = opts.requiredSkills.length > 0
      ? (matchedSkills / opts.requiredSkills.length) * 40
      : 20;

    // Distance score (lower is better — invert so closer = higher score)
    const distanceScore = Math.max(0, 30 - distanceKm * 2);

    // Workload score (fewer active complaints = higher score)
    const workloadScore = Math.max(0, 20 - worker.activeComplaintCount * 5);

    // Rating bonus
    const ratingScore = (worker.avgRating ?? 3) * 2;

    return {
      worker,
      distanceKm,
      estimatedArrivalMinutes,
      score: skillScore + distanceScore + workloadScore + ratingScore,
    };
  });

  // 4. Return the highest scorer
  scored.sort((a, b) => b.score - a.score);
  return scored[0] ?? null;
}
