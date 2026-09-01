import { Router } from "express";
import multer from "multer";
import { db, dedupeKey } from "../db";
import { parseUploadedFile } from "../parsers";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const uploadRouter = Router();

const insertActivity = db.prepare(`
  INSERT OR IGNORE INTO activities
    (user_id, date, distance_km, duration_seconds, avg_pace_per_km, avg_heartrate, elevation_gain_m, activity_type, source_file, dedupe_key)
  VALUES (@user_id, @date, @distance_km, @duration_seconds, @avg_pace_per_km, @avg_heartrate, @elevation_gain_m, @activity_type, @source_file, @dedupe_key)
`);

uploadRouter.post("/", upload.array("files"), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "Keine Dateien hochgeladen." });
  }

  let imported = 0;
  let duplicates = 0;
  let skippedNonRunning = 0;
  const failures: { filename: string; reason: string }[] = [];

  for (const file of files) {
    const outcome = await parseUploadedFile(file.buffer, file.originalname);

    if (outcome.error) {
      failures.push({ filename: file.originalname, reason: outcome.error });
      continue;
    }

    skippedNonRunning += outcome.skippedNonRunning;

    for (const activity of outcome.activities) {
      const key = dedupeKey(activity.date, activity.distance_km, activity.duration_seconds);
      const info = insertActivity.run({
        ...activity,
        user_id: req.userId!,
        avg_heartrate: activity.avg_heartrate ?? null,
        elevation_gain_m: activity.elevation_gain_m ?? null,
        source_file: file.originalname,
        dedupe_key: key,
      });
      if (info.changes > 0) imported++;
      else duplicates++;
    }
  }

  res.json({
    imported,
    duplicates,
    skippedNonRunning,
    failures,
    summary: `${imported} ${imported === 1 ? "Lauf" : "Läufe"} importiert, ${skippedNonRunning} Nicht-Lauf-${skippedNonRunning === 1 ? "Aktivität" : "Aktivitäten"} übersprungen, ${duplicates} ${duplicates === 1 ? "Duplikat" : "Duplikate"} ignoriert${failures.length ? `, ${failures.length} ${failures.length === 1 ? "Datei konnte" : "Dateien konnten"} nicht verarbeitet werden` : ""}.`,
  });
});
