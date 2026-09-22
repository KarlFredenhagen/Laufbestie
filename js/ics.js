// Baut eine .ics-Datei aus dem Trainingsplan, damit sie sich in jeden
// Kalender (Apple, Google, Outlook, ...) importieren lässt. Reine
// Ganztages-Termine, kein Zeitzonen-Gedöns nötig.
function pad(n) { return String(n).padStart(2, '0'); }

function dateStamp(d) {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

// YYYY-MM-DD -> YYYYMMDD
function dateOnly(isoStr) {
  return isoStr.replace(/-/g, '');
}

// Ein Tag nach dem gegebenen ISO-Datum, fuer DTEND (exklusiv bei Ganztages-Terminen).
function nextDay(isoStr) {
  const d = new Date(isoStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeText(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// RFC5545: Zeilen ueber 75 Oktetten falten (fortgesetzte Zeile beginnt mit einem Leerzeichen).
function foldLine(line) {
  if (line.length <= 75) return line;
  const parts = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

const TYPE_LABEL = {
  easy: 'Easy Run', long: 'Long Run', recovery: 'Recovery Run', tempo: 'Tempo',
  interval: 'Intervalle', marathon_pace: 'Marathon Pace', race: 'Race Simulation', rest: 'Rest'
};

function buildEvent(wo, week, dtstamp, uidSuffix) {
  const label = TYPE_LABEL[wo.type] || wo.type;
  const summaryParts = [label];
  if (wo.distance) summaryParts.push(`${wo.distance} km`);
  const summary = summaryParts.join(' · ');

  const descLines = [];
  if (wo.duration) descLines.push(`Dauer: ${wo.duration} min`);
  if (wo.pace) descLines.push(`Pace: ${wo.pace} min/km`);
  if (wo.heartRate) descLines.push(`Herzfrequenz: ${wo.heartRate}`);
  if (wo.goal) descLines.push(`Ziel: ${wo.goal}`);
  if (wo.description) descLines.push('', wo.description);
  if (week?.focus) descLines.push('', `Wochenfokus: ${week.focus}`);
  descLines.push('', 'Erstellt mit Laufbestie');

  const lines = [
    'BEGIN:VEVENT',
    `UID:laufbestie-${wo.date}-${uidSuffix}@laufbestie`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dateOnly(wo.date)}`,
    `DTEND;VALUE=DATE:${nextDay(wo.date)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(descLines.join('\n'))}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'END:VEVENT'
  ];
  return lines.map(foldLine).join('\r\n');
}

export function buildIcs(plan) {
  const dtstamp = dateStamp(new Date());
  const events = [];
  let i = 0;
  for (const week of plan.weeks || []) {
    for (const wo of week.workouts || []) {
      if (!wo || !wo.date || wo.type === 'rest') continue;
      events.push(buildEvent(wo, week, dtstamp, i++));
    }
  }
  const head = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Laufbestie//Trainingsplan//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Laufbestie Trainingsplan'
  ].map(foldLine).join('\r\n');
  const tail = foldLine('END:VCALENDAR');
  return [head, ...events, tail].join('\r\n') + '\r\n';
}

export function downloadIcs(plan, filename) {
  const ics = buildIcs(plan);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || 'laufbestie-plan.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
