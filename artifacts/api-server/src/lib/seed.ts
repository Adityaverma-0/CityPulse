import { db, departmentsTable, workersTable, usersTable } from "@workspace/db";
import { logger } from "./logger";
import { hashPassword } from "./auth";

const DEPARTMENTS = [
  { name: "Public Works Department", code: "PWD", description: "Road repairs, bridges, and public infrastructure", issueTypes: ["pothole", "road_damage", "broken_footpath"] },
  { name: "Waste Management Department", code: "WMD", description: "Garbage collection and waste disposal", issueTypes: ["garbage", "illegal_dumping", "overflowing_dustbin"] },
  { name: "Electrical Department", code: "ELEC", description: "Street lights and electrical infrastructure", issueTypes: ["streetlight", "broken_streetlight", "power_outage"] },
  { name: "Water Supply Department", code: "WSD", description: "Water supply and pipe repairs", issueTypes: ["water_leakage", "no_water_supply"] },
  { name: "Sewerage Department", code: "SWD", description: "Drainage and sewage management", issueTypes: ["sewage", "drainage", "flooding"] },
  { name: "Parks & Environment Department", code: "PED", description: "Parks, trees, and green spaces", issueTypes: ["park", "fallen_tree"] },
  { name: "Traffic Department", code: "TRAF", description: "Traffic signals and road markings", issueTypes: ["traffic_signal", "road_marking"] },
  { name: "Public Facilities Department", code: "PFD", description: "Public toilets and civic amenities", issueTypes: ["public_toilet"] },
  { name: "Animal Control Department", code: "ACD", description: "Stray animals and animal welfare", issueTypes: ["stray_animals"] },
  { name: "Urban Development Department", code: "UDD", description: "Building damage and urban planning", issueTypes: ["building_damage"] },
];

export async function seedIfEmpty(): Promise<void> {
  try {
    // Always ensure admin exists
    const adminHash = await hashPassword("admin123");
    await db.insert(usersTable).values({ name: "City Administrator", email: "admin@cityhero.gov", passwordHash: adminHash, role: "admin", phone: "+91 11 2345 6789" }).onConflictDoNothing();

    const existing = await db.select().from(departmentsTable).limit(1);
    if (existing.length > 0) {
      // Ensure officer accounts exist for each worker
      const allWorkers = await db.select().from(workersTable);
      for (const worker of allWorkers) {
        if (!worker.email) continue;
        const workerHash = await hashPassword("officer123");
        await db.insert(usersTable).values({ name: worker.name, email: worker.email, passwordHash: workerHash, role: "officer", phone: worker.phone ?? undefined, workerId: worker.id }).onConflictDoNothing();
      }
      logger.info("Seed: admin + officer accounts ensured");
      return;
    }

    const insertedDepts = await db.insert(departmentsTable).values(DEPARTMENTS).returning();
    const deptMap = Object.fromEntries(insertedDepts.map((d) => [d.code, d.id]));

    const WORKERS = [
      { name: "Ramesh Kumar",  email: "ramesh@cityhero.gov",  phone: "+91 98100 11001", departmentId: deptMap["PWD"]!,  skills: ["road repair", "pothole filling", "heavy machinery"], currentLatitude: 28.6139, currentLongitude: 77.2090, status: "available" as const },
      { name: "Priya Singh",   email: "priya@cityhero.gov",   phone: "+91 98100 11002", departmentId: deptMap["PWD"]!,  skills: ["road repair", "concrete work"], currentLatitude: 28.6200, currentLongitude: 77.2150, status: "available" as const },
      { name: "Suresh Nair",   email: "suresh@cityhero.gov",  phone: "+91 98100 11003", departmentId: deptMap["WMD"]!,  skills: ["waste collection", "vehicle operation"], currentLatitude: 28.6050, currentLongitude: 77.2000, status: "available" as const },
      { name: "Anita Desai",   email: "anita@cityhero.gov",   phone: "+91 98100 11004", departmentId: deptMap["WMD"]!,  skills: ["waste management", "team coordination"], currentLatitude: 28.6300, currentLongitude: 77.2300, status: "available" as const },
      { name: "Mohan Rao",     email: "mohan@cityhero.gov",   phone: "+91 98100 11005", departmentId: deptMap["ELEC"]!, skills: ["electrical repair", "street light maintenance"], currentLatitude: 28.6100, currentLongitude: 77.2250, status: "available" as const },
      { name: "Kavitha Reddy", email: "kavitha@cityhero.gov", phone: "+91 98100 11006", departmentId: deptMap["ELEC"]!, skills: ["electrical repair", "panel work"], currentLatitude: 28.6250, currentLongitude: 77.2100, status: "available" as const },
      { name: "Arun Sharma",   email: "arun@cityhero.gov",    phone: "+91 98100 11007", departmentId: deptMap["WSD"]!,  skills: ["plumbing", "pipe repair", "water systems"], currentLatitude: 28.6180, currentLongitude: 77.2080, status: "available" as const },
      { name: "Deepa Pillai",  email: "deepa@cityhero.gov",   phone: "+91 98100 11008", departmentId: deptMap["SWD"]!,  skills: ["drainage repair", "sewage handling"], currentLatitude: 28.6220, currentLongitude: 77.2200, status: "available" as const },
      { name: "Vijay Gupta",   email: "vijay@cityhero.gov",   phone: "+91 98100 11009", departmentId: deptMap["PED"]!,  skills: ["tree surgery", "landscaping", "chainsaw operation"], currentLatitude: 28.6350, currentLongitude: 77.2350, status: "available" as const },
      { name: "Rekha Bose",    email: "rekha@cityhero.gov",   phone: "+91 98100 11010", departmentId: deptMap["TRAF"]!, skills: ["traffic signal repair", "road marking"], currentLatitude: 28.6080, currentLongitude: 77.2020, status: "available" as const },
    ];

    const insertedWorkers = await db.insert(workersTable).values(WORKERS).returning();

    // Seed default admin (same hash computed at top of function)
    await db.insert(usersTable).values({ name: "City Administrator", email: "admin@cityhero.gov", passwordHash: adminHash, role: "admin", phone: "+91 11 2345 6789" }).onConflictDoNothing();

    // Seed officer accounts linked to workers
    for (const worker of insertedWorkers) {
      if (!worker.email) continue;
      const workerHash = await hashPassword("officer123");
      await db.insert(usersTable).values({ name: worker.name, email: worker.email, passwordHash: workerHash, role: "officer", phone: worker.phone ?? undefined, workerId: worker.id }).onConflictDoNothing();
    }

    logger.info({ departments: insertedDepts.length, workers: insertedWorkers.length }, "Database seeded");
  } catch (err) {
    logger.warn({ err }, "Seed skipped or failed (non-fatal)");
  }
}
