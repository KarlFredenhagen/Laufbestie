// better-sqlite3 requires a native compile toolchain that isn't guaranteed to be present
// (e.g. no prebuilt binary + no Visual Studio build tools on Windows), so this uses Node's
// built-in node:sqlite instead — same synchronous API shape, zero native dependencies.
import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "app.db"));
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    distance_km REAL NOT NULL,
    duration_seconds REAL NOT NULL,
    avg_pace_per_km REAL NOT NULL,
    avg_heartrate REAL,
    elevation_gain_m REAL,
    activity_type TEXT NOT NULL,
    source_file TEXT NOT NULL,
    dedupe_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_json TEXT NOT NULL,
    summary_json TEXT NOT NULL,
    preferences_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Round distance/duration so near-identical float exports of the same run collide on the same key.
export function dedupeKey(date: string, distance_km: number, duration_seconds: number): string {
  return `${date}|${distance_km.toFixed(2)}|${Math.round(duration_seconds)}`;
}
