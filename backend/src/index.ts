import "dotenv/config";
import express from "express";
import cors from "cors";
import { uploadRouter } from "./routes/upload";
import { activitiesRouter } from "./routes/activities";
import { preferencesRouter } from "./routes/preferences";
import { planRouter } from "./routes/plan";
import { askRouter } from "./routes/ask";
import { eventsRouter } from "./routes/events";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

app.use("/api/upload", uploadRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/preferences", preferencesRouter);
app.use("/api/plan", planRouter);
app.use("/api/ask", askRouter);
app.use("/api/events", eventsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Running Plan Generator backend listening on http://localhost:${PORT}`);
});
