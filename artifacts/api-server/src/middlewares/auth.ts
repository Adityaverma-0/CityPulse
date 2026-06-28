import { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Array<"admin" | "officer" | "citizen">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: "Unauthorized" }); return; }
    if (!roles.includes(req.user.role)) { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  };
}
