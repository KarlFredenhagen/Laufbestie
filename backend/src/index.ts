import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { uploadRouter } from "./routes/upload";
import { activitiesRouter } from "./routes/activities";
import { preferencesRouter } from "./routes/preferences";
import { planRouter } from "./routes/plan";
import { askRouter } from "./routes/ask";
import { eventsRouter } from "./routes/events";
import { authRouter } from "./routes/auth";
import { requireAuth } from "./middleware/requireAuth";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(express.json());
app.use(cookieParser());

// Frontend and API are always same-origin (Vite proxy in dev, same Express server in
// production), so there's no cross-site request to allow — no CORS middleware needed, and
// every route below except /auth itself requires a valid session.
app.use("/api/auth", authRouter);
app.use("/api/upload", requireAuth, uploadRouter);
app.use("/api/activities", requireAuth, activitiesRouter);
app.use("/api/preferences", requireAuth, preferencesRouter);
app.use("/api/plan", requireAuth, planRouter);
app.use("/api/ask", requireAuth, askRouter);
app.use("/api/events", requireAuth, eventsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// In production there's no separate Vite dev server, so this same process also serves the
// built frontend (single origin, single container/process to deploy).
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(__dirname, "..", "..", "frontend", "dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Running Plan Generator backend listening on http://localhost:${PORT}`);
});
