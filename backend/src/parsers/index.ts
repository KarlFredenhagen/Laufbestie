import path from "path";
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

// Routes each uploaded file to the right parser based on its extension, since GPX/TCX are
// XML and FIT is binary — there's no shared parsing path, just a shared output shape.
export async function parseUploadedFile(buffer: Buffer, filename: string): Promise<FileParseOutcome> {
  const ext = path.extname(filename).toLowerCase();

  try {
    let result: { activities: NormalizedActivity[]; skipped: number };
    if (ext === ".gpx") {
      result = parseGpx(buffer, filename);
    } else if (ext === ".tcx") {
      result = parseTcx(buffer, filename);
    } else if (ext === ".fit") {
      result = await parseFit(buffer, filename);
    } else if (ext === ".csv") {
      result = parseCsv(buffer, filename);
    } else {
      throw new ParseError(`${filename}: nicht unterstützter Dateityp "${ext || "unbekannt"}" (erwartet: .gpx, .tcx, .fit oder .csv)`);
    }
    return { filename, activities: result.activities, skippedNonRunning: result.skipped };
  } catch (err) {
    const message = err instanceof ParseError ? err.message : `${filename}: ${(err as Error).message ?? "failed to parse"}`;
    return { filename, activities: [], skippedNonRunning: 0, error: message };
  }
}
