import { Router } from "express";
import { db } from "../db";
import { verifyPassword } from "../auth/password";
import { createSession, deleteSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "../auth/session";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

// No public registration route — accounts are created manually via `npm run create-user`
// (see backend/scripts/create-user.ts), since this is meant for a small, known set of people.
authRouter.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: "E-Mail und Passwort sind erforderlich." });
  }

  const user = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email.trim().toLowerCase()) as
    | { id: number; password_hash: string }
    | undefined;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "E-Mail oder Passwort ist falsch." });
  }

  const token = createSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
  });
  res.json({ ok: true });
});

authRouter.post("/logout", (req, res) => {
  deleteSession(req.cookies?.[SESSION_COOKIE_NAME]);
  res.clearCookie(SESSION_COOKIE_NAME);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId!) as { email: string };
  res.json({ email: user.email });
});
