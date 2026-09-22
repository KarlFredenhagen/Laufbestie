// Winzige abhängigkeitsfreie Canvas-Charts: Balken (einzeln/gruppiert) und Linien.
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}
function setupCanvas(canvas, height) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.parentElement.clientWidth || 300;
  canvas.width = w * dpr;
  canvas.height = height * dpr;
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w, h: height };
}

export function drawGroupedBars(canvas, labels, seriesA, seriesB, opts = {}) {
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 140);
  ctx.clearRect(0, 0, w, h);
  const padL = 4, padR = 4, padB = 20, padT = 10;
  const chartH = h - padB - padT;
  const n = labels.length || 1;
  const groupW = (w - padL - padR) / n;
  const barW = Math.min(16, groupW * 0.32);
  const max = Math.max(1, ...seriesA, ...seriesB);
  const muted = cssVar('--muted');
  const colA = opts.colorA || cssVar('--line');
  const colB = opts.colorB || cssVar('--accent');

  ctx.font = '10px -apple-system,sans-serif';
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';

  for (let i = 0; i < n; i++) {
    const cx = padL + groupW * i + groupW / 2;
    const av = seriesA[i] || 0, bv = seriesB[i] || 0;
    const ah = (av / max) * chartH, bh = (bv / max) * chartH;
    ctx.fillStyle = colA;
    roundRect(ctx, cx - barW - 2, padT + chartH - ah, barW, Math.max(1, ah), 4);
    ctx.fillStyle = colB;
    roundRect(ctx, cx + 2, padT + chartH - bh, barW, Math.max(1, bh), 4);
    ctx.fillStyle = muted;
    ctx.fillText(labels[i], cx, h - 4);
  }
}

export function drawBars(canvas, labels, values, opts = {}) {
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 120);
  ctx.clearRect(0, 0, w, h);
  const padL = 4, padR = 4, padB = 20, padT = 10;
  const chartH = h - padB - padT;
  const n = labels.length || 1;
  const slotW = (w - padL - padR) / n;
  const barW = Math.min(22, slotW * 0.55);
  const max = Math.max(1, ...values);
  const col = opts.color || cssVar('--accent');
  const muted = cssVar('--muted');

  ctx.font = '10px -apple-system,sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < n; i++) {
    const cx = padL + slotW * i + slotW / 2;
    const v = values[i] || 0;
    const bh = (v / max) * chartH;
    ctx.fillStyle = col;
    roundRect(ctx, cx - barW / 2, padT + chartH - bh, barW, Math.max(1, bh), 4);
    ctx.fillStyle = muted;
    ctx.fillText(labels[i], cx, h - 4);
  }
}

export function drawLine(canvas, labels, values, opts = {}) {
  const { ctx, w, h } = setupCanvas(canvas, opts.height || 120);
  ctx.clearRect(0, 0, w, h);
  const padL = 8, padR = 8, padB = 20, padT = 12;
  const chartH = h - padB - padT;
  const chartW = w - padL - padR;
  const pts = values.map((v, i) => v).filter(v => v != null && v > 0);
  const max = Math.max(1, ...pts);
  const min = Math.min(...(pts.length ? pts : [0]));
  const range = Math.max(1, max - min);
  const col = opts.color || cssVar('--accent');
  const muted = cssVar('--muted');
  const n = labels.length || 1;

  ctx.beginPath();
  let started = false;
  values.forEach((v, i) => {
    if (v == null) { started = false; return; }
    const x = padL + (n <= 1 ? 0 : (chartW * i) / (n - 1));
    const y = padT + chartH - ((v - min) / range) * chartH;
    if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  values.forEach((v, i) => {
    if (v == null) return;
    const x = padL + (n <= 1 ? 0 : (chartW * i) / (n - 1));
    const y = padT + chartH - ((v - min) / range) * chartH;
    ctx.beginPath();
    ctx.fillStyle = col;
    ctx.arc(x, y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = '10px -apple-system,sans-serif';
  ctx.fillStyle = muted;
  ctx.textAlign = 'center';
  labels.forEach((l, i) => {
    const x = padL + (n <= 1 ? 0 : (chartW * i) / (n - 1));
    ctx.fillText(l, x, h - 4);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.fill();
}
