// Pace- und Zeit-Helfer. Alle Zeiten intern in Sekunden.

// "58:32" -> 3512, "1:02:10" -> 3730, akzeptiert auch Komma/Punkt fuer Sekunden.
export function parseDuration(str) {
  if (str == null || str === '') return 0;
  const parts = String(str).trim().split(':').map(s => s.replace(',', '.'));
  if (parts.some(p => p === '' || isNaN(Number(p)))) return 0;
  const nums = parts.map(Number);
  if (nums.length === 1) return Math.round(nums[0] * 60); // reine Minutenzahl
  if (nums.length === 2) return Math.round(nums[0] * 60 + nums[1]);
  if (nums.length === 3) return Math.round(nums[0] * 3600 + nums[1] * 60 + nums[2]);
  return 0;
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// Pace in Sekunden pro Kilometer.
export function calcPaceSecPerKm(distanceKm, totalSeconds) {
  const km = Number(distanceKm) || 0;
  if (km <= 0) return 0;
  return (Number(totalSeconds) || 0) / km;
}

export function formatPace(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0) return '–';
  return `${formatDuration(secPerKm)} min/km`;
}

export function formatPaceShort(secPerKm) {
  if (!secPerKm || !isFinite(secPerKm) || secPerKm <= 0) return '–';
  return formatDuration(secPerKm);
}

// "5:44" min/km -> Sekunden pro km
export function parsePace(str) {
  return parseDuration(str);
}

// Geschwindigkeit in km/h aus Pace-Sekunden/km.
export function paceToKmh(secPerKm) {
  if (!secPerKm) return 0;
  return 3600 / secPerKm;
}
