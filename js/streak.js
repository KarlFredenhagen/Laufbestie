// Wochen-Streak: wie viele Wochen in Folge (bis inkl. dieser Woche, falls
// schon ein Lauf drin ist) mindestens ein Lauf eingetragen wurde.
import { store } from './store.js';
import { todayIso, mondayOf, shiftIso } from './ui.js';
import { ico } from './icons.js';

export function computeStreak() {
  const acts = store.activities;
  if (!acts.length) return 0;
  const weeksWithRuns = new Set(acts.map(a => mondayOf(a.date)));
  let streak = 0;
  let monday = mondayOf(todayIso());
  if (!weeksWithRuns.has(monday)) monday = shiftIso(monday, -7);
  while (weeksWithRuns.has(monday)) {
    streak++;
    monday = shiftIso(monday, -7);
  }
  return streak;
}

export function renderStreakBadge() {
  const el = document.getElementById('streakBadge');
  if (!el) return;
  const streak = computeStreak();
  if (streak < 1) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  el.innerHTML = `${ico('flame', 14)} ${streak} ${streak === 1 ? 'Woche' : 'Wochen'}`;
}
