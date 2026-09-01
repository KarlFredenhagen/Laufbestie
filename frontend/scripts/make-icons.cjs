// One-off script to generate PWA icon PNGs without any native image dependency.
// Encodes raw RGBA pixel buffers straight into minimal PNG files using Node's built-in zlib.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  return zlib.crc32(buf) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // Each scanline needs a leading filter-type byte (0 = None).
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = chunk("IDAT", zlib.deflateSync(raw));
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple geometric "running track" glyph: blue rounded-square-ish background (left square,
// since OS launchers apply their own corner rounding/masking anyway), a white oval track
// ring, and a small solid dot marking a runner's position on the track.
function drawIcon(size, { maskable = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const bg = [0x33, 0x66, 0xcc];
  const fg = [0xff, 0xff, 0xff];

  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons get cropped to various shapes by the OS, so keep the artwork inside a
  // smaller safe zone; regular icons can use more of the canvas.
  const scale = maskable ? 0.68 : 0.82;
  const outerRx = (size / 2) * scale;
  const outerRy = outerRx * 0.62;
  const ringThickness = size * 0.09;

  const dotAngle = -0.6; // radians, position of the "runner" dot on the ring
  const dotX = cx + Math.cos(dotAngle) * outerRx;
  const dotY = cy + Math.sin(dotAngle) * outerRy;
  const dotR = size * 0.075;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      let [r, g, b] = bg;

      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;

      const outerVal = (dx * dx) / (outerRx * outerRx) + (dy * dy) / (outerRy * outerRy);
      const innerRx = outerRx - ringThickness;
      const innerRy = outerRy - ringThickness;
      const innerVal = (dx * dx) / (innerRx * innerRx) + (dy * dy) / (innerRy * innerRy);

      const onRing = outerVal <= 1 && innerVal >= 1;

      const ddx = x + 0.5 - dotX;
      const ddy = y + 0.5 - dotY;
      const onDot = ddx * ddx + ddy * ddy <= dotR * dotR;

      if (onRing || onDot) [r, g, b] = fg;

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, "icon-192.png"), drawIcon(192));
fs.writeFileSync(path.join(outDir, "icon-512.png"), drawIcon(512));
fs.writeFileSync(path.join(outDir, "icon-maskable-512.png"), drawIcon(512, { maskable: true }));
fs.writeFileSync(path.join(outDir, "apple-touch-icon.png"), drawIcon(180));

console.log("Icons written to", outDir);
