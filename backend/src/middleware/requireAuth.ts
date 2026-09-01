import { Request, Response, NextFunction } from "express";
import { getSessionUserId, SESSION_COOKIE_NAME } from "../auth/session";

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const userId = getSessionUserId(token);
  if (!userId) return res.status(401).json({ error: "Nicht angemeldet." });
  req.userId = userId;
  next();
}
