import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required but was not set.");
}
const JWT_SECRET: string = process.env.SESSION_SECRET;
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: number;
  email: string;
  role: "admin" | "officer" | "citizen";
  workerId?: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
