import { useRef, useState } from "react";
import { api } from "../api";
import { UploadResult } from "../types";

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.uploadFiles(files);
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <h2>Läufe hochladen</h2>
      <p className="muted">
        Ziehe GPX-, TCX-, FIT- oder CSV-Dateien hierher, die du aus Garmin Connect, Strava oder deiner Uhr
        exportiert hast. Der einfachste Weg bei Garmin: Aktivitäten-Liste öffnen und auf „Exportieren nach CSV"
        klicken. Du kannst mehrere Dateien gleichzeitig auswählen.
      </p>

      <div
        className={`dropzone ${dragActive ? "active" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".gpx,.tcx,.fit,.csv"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p>{uploading ? "Wird hochgeladen & verarbeitet..." : "Dateien hierher ziehen oder klicken zum Auswählen"}</p>
      </div>

      {error && <div className="banner error">{error}</div>}

      {result && (
        <div className="banner success">
          <p>{result.summary}</p>
          {result.failures.length > 0 && (
            <ul className="failures">
              {result.failures.map((f) => (
                <li key={f.filename}>
                  <strong>{f.filename}</strong>: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
