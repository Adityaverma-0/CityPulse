import OpenAI from "openai";
import { logger } from "./logger";

let _groq: OpenAI | null = null;
function getGroq(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY ?? "",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

export interface AiAnalysisOutput {
  issueCategory: string;
  issueDescription: string;
  detectedObjects: string[];
  suggestedDepartment: string;
  severity: string;
  confidence: number;
  estimatedResolutionHours: number;
  equipmentRequired: string[];
  workersRequired: number;
  requiredSkills: string[];
  emergencyLevel: string;
}

const DEPARTMENT_MAP: Record<string, string> = {
  pothole: "Public Works Department",
  road_damage: "Public Works Department",
  garbage: "Waste Management Department",
  illegal_dumping: "Waste Management Department",
  overflowing_dustbin: "Waste Management Department",
  streetlight: "Electrical Department",
  broken_streetlight: "Electrical Department",
  water_leakage: "Water Supply Department",
  sewage: "Sewerage Department",
  drainage: "Sewerage Department",
  flooding: "Sewerage Department",
  damaged_public_toilet: "Public Facilities Department",
  fallen_tree: "Parks & Environment Department",
  river_pollution: "Environment Department",
  traffic_signal: "Traffic Department",
  stray_animals: "Animal Control Department",
  building_damage: "Urban Development Department",
};

export function routeDepartment(category: string): string {
  const lower = category.toLowerCase().replace(/\s+/g, "_");
  for (const [key, dept] of Object.entries(DEPARTMENT_MAP)) {
    if (lower.includes(key)) return dept;
  }
  return "Public Works Department";
}

export async function analyzeComplaint(opts: {
  description?: string | null;
  imageBase64?: string | null;
  address?: string | null;
}): Promise<AiAnalysisOutput> {
  const systemPrompt = `You are an AI system for a Smart City civic platform called Community Hero.
Your job is to analyze citizen complaints and return a structured JSON object.

Return ONLY valid JSON with these exact fields:
{
  "issueCategory": string (e.g. "Pothole", "Water Leakage", "Garbage Overflow"),
  "issueDescription": string (concise description of the problem),
  "detectedObjects": string[] (list of detected problems, e.g. ["pothole", "road crack"]),
  "suggestedDepartment": string (responsible department),
  "severity": string (one of: "low", "medium", "high", "critical"),
  "confidence": number (0.0-1.0),
  "estimatedResolutionHours": number (realistic hours to fix),
  "equipmentRequired": string[] (tools/equipment needed),
  "workersRequired": number (how many workers needed),
  "requiredSkills": string[] (skills needed, e.g. ["road repair", "heavy machinery"]),
  "emergencyLevel": string (one of: "routine", "urgent", "emergency")
}`;

  const textParts: string[] = [];
  if (opts.description) textParts.push(`Citizen description: ${opts.description}`);
  if (opts.address) textParts.push(`Location: ${opts.address}`);
  if (textParts.length === 0) textParts.push("Classify this civic complaint and determine which city department should handle it.");

  const hasImage = !!opts.imageBase64;
  // Use vision model when image is provided, fast text model otherwise
  const model = hasImage
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  if (hasImage) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${opts.imageBase64}` },
    });
  }

  userContent.push({ type: "text", text: textParts.join("\n") });

  try {
    const response = await getGroq().chat.completions.create({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as AiAnalysisOutput;

    if (!parsed.suggestedDepartment || parsed.suggestedDepartment === "") {
      parsed.suggestedDepartment = routeDepartment(parsed.issueCategory ?? "");
    }

    return parsed;
  } catch (err) {
    logger.error({ err }, "AI analysis failed, using fallback");
    return {
      issueCategory: "General Issue",
      issueDescription: opts.description ?? "No description provided",
      detectedObjects: [],
      suggestedDepartment: routeDepartment(opts.description ?? ""),
      severity: "medium",
      confidence: 0.5,
      estimatedResolutionHours: 24,
      equipmentRequired: ["standard tools"],
      workersRequired: 1,
      requiredSkills: ["general maintenance"],
      emergencyLevel: "routine",
    };
  }
}

export interface PriorityScoreInput {
  severity: string;
  emergencyLevel: string;
  duplicateCount: number;
  description?: string | null;
}

export function calculatePriorityScore(input: PriorityScoreInput): {
  score: number;
  level: "low" | "medium" | "high" | "critical" | "emergency";
  breakdown: Record<string, number>;
} {
  const breakdown: Record<string, number> = {};

  const severityMap: Record<string, number> = { low: 10, medium: 25, high: 50, critical: 80 };
  breakdown.safetyRisk = severityMap[input.severity] ?? 25;

  const emergencyMap: Record<string, number> = { routine: 0, urgent: 20, emergency: 40 };
  breakdown.emergencyBonus = emergencyMap[input.emergencyLevel] ?? 0;

  breakdown.duplicateBonus = Math.min(input.duplicateCount * 5, 20);

  const desc = (input.description ?? "").toLowerCase();
  breakdown.nearbySchools = desc.includes("school") || desc.includes("college") ? 10 : 0;
  breakdown.nearbyHospitals = desc.includes("hospital") || desc.includes("clinic") ? 10 : 0;
  breakdown.trafficDensity = desc.includes("traffic") || desc.includes("junction") || desc.includes("highway") ? 8 : 0;
  breakdown.flooding = desc.includes("flood") || desc.includes("waterlog") ? 15 : 0;

  const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

  let level: "low" | "medium" | "high" | "critical" | "emergency";
  if (totalScore >= 100) level = "emergency";
  else if (totalScore >= 70) level = "critical";
  else if (totalScore >= 45) level = "high";
  else if (totalScore >= 20) level = "medium";
  else level = "low";

  return { score: totalScore, level, breakdown };
}

export async function verifyCompletion(opts: {
  originalDescription?: string | null;
  workerNotes?: string | null;
  beforeImageBase64?: string | null;
  afterImageBase64?: string | null;
}): Promise<{ verdict: "resolved" | "partially_resolved" | "failed"; confidence: number; notes: string; escalate: boolean; escalationReason?: string }> {
  const systemPrompt = `You are a quality verification AI for a civic issue resolution platform.
Analyze the evidence provided and determine if the issue was properly resolved.

Return ONLY valid JSON:
{
  "verdict": "resolved" | "partially_resolved" | "failed",
  "confidence": number (0.0-1.0),
  "notes": string (brief explanation),
  "escalate": boolean,
  "escalationReason": string | null
}`;

  const hasImages = opts.beforeImageBase64 || opts.afterImageBase64;
  const model = hasImages
    ? "meta-llama/llama-4-scout-17b-16e-instruct"
    : "llama-3.3-70b-versatile";

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  if (opts.beforeImageBase64) {
    userContent.push({ type: "text", text: "BEFORE image:" });
    userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${opts.beforeImageBase64}` } });
  }
  if (opts.afterImageBase64) {
    userContent.push({ type: "text", text: "AFTER image:" });
    userContent.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${opts.afterImageBase64}` } });
  }

  const contextParts: string[] = [];
  if (opts.originalDescription) contextParts.push(`Original complaint: ${opts.originalDescription}`);
  if (opts.workerNotes) contextParts.push(`Worker notes: ${opts.workerNotes}`);
  if (contextParts.length > 0) {
    userContent.push({ type: "text", text: contextParts.join("\n") });
  }

  if (userContent.length === 0) {
    userContent.push({ type: "text", text: "No evidence provided. Mark as partially_resolved with low confidence." });
  }

  try {
    const response = await getGroq().chat.completions.create({
      model,
      max_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    logger.error({ err }, "AI verification failed, using fallback");
    return {
      verdict: "partially_resolved",
      confidence: 0.5,
      notes: "Automatic verification could not be completed. Manual review recommended.",
      escalate: false,
    };
  }
}
