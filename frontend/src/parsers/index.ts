import { NormalizedActivity } from "../types";
import { parseGpx } from "./gpx";
import { parseTcx } from "./tcx";
import { parseFit } from "./fit";
import { parseCsv } from "./csv";
import { ParseError } from "./common";

export { ParseError };

export interface FileParseOutcome {
  filename: string;
  activities: NormalizedActivity[];
  skippedNonRunning: number;
  error?: string;
}

function extname(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

// Routes each uploaded file to the right parser based on its extension, since GPX/TCX/CSV are
// text and FIT is binary — there's no shared parsing path, just a shared output shape. Runs
// entirely client-side (no upload to any server) via the browser's File API.
export async function parseUploadedFile(file: File): Promise<FileParseOutcome> {
  const ext = extname(file.name);

  try {
    let result: { activities: NormalizedActivity[]; skipped: number };
    if (ext === ".gpx") {
      result = parseGpx(await file.text(), file.name);
    } else if (ext === ".tcx") {
      result = parseTcx(await file.text(), file.name);
    } else if (ext === ".csv") {
      result = parseCsv(await file.text(), file.name);
    } else if (ext === ".fit") {
      result = await parseFit(await file.arrayBuffer(), file.name);
    } else {
      throw new ParseError(`${file.name}: nicht unterstützter Dateityp "${ext || "unbekannt"}" (erwartet: .gpx, .tcx, .fit oder .csv)`);
    }
    return { filename: file.name, activities: result.activities, skippedNonRunning: result.skipped };
  } catch (err) {
    const message = err instanceof ParseError ? err.message : `${file.name}: ${(err as Error).message ?? "Datei konnte nicht verarbeitet werden"}`;
    return { filename: file.name, activities: [], skippedNonRunning: 0, error: message };
  }
}
