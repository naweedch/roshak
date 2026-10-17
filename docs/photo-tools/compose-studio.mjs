// قرار دادن لباس‌های بریده‌شده روی «استودیوی یکسان» روشاک: دیوار عاجی، طاق ظریف، کف روشن و سایهٔ نرم.
// همهٔ عکس‌ها هم‌اندازه (۱۲۰۰×۱۶۰۰، نسبت ۳:۴) و با خط کف یکسان خروجی می‌گیرند تا کاتالوگ یکدست دیده شود.
//   npm install sharp   (در همان پوشهٔ ابزار)
//   node compose-studio.mjs <پوشهٔ-png-بریده‌شده> <پوشهٔ-خروجی-webp>
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [inputDir = "cutouts", outputDir = "composed"] = process.argv.slice(2);
const W = 1200;
const H = 1600;
const FLOOR = 1430; // خط پایین لباس روی کف
fs.mkdirSync(outputDir, { recursive: true });

const studio = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ece2"/><stop offset="1" stop-color="#e9ddcf"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3d6c6"/><stop offset="1" stop-color="#efe6db"/></linearGradient>
    <radialGradient id="light" cx="0.5" cy="0.35" r="0.6"><stop offset="0" stop-color="#fffaf3" stop-opacity="0.9"/><stop offset="1" stop-color="#fffaf3" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <path d="M220 ${FLOOR - 40} V560 A380 380 0 0 1 980 560 V${FLOOR - 40} Z" fill="#efe4d6"/>
  <path d="M250 ${FLOOR - 40} V570 A350 350 0 0 1 950 570 V${FLOOR - 40}" fill="none" stroke="#c9a961" stroke-width="2" opacity="0.45"/>
  <rect width="${W}" height="${H}" fill="url(#light)"/>
  <rect y="${FLOOR - 40}" width="${W}" height="${H - FLOOR + 40}" fill="url(#floor)"/>
  <line x1="0" y1="${FLOOR - 40}" x2="${W}" y2="${FLOOR - 40}" stroke="#d8c9b6" stroke-width="2"/>
</svg>`;

for (const file of fs.readdirSync(inputDir).filter((f) => f.endsWith(".png"))) {
  // برش به محدودهٔ پیکسل‌های غیرشفاف
  const trimmed = await sharp(path.join(inputDir, file)).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  const { width, height } = trimmed.info;
  // ارتفاع سوژه حداکثر ۹۰٪ قاب، عرض حداکثر ۹۲٪، پایین لباس روی خط کف
  const targetH = Math.min(Math.round(H * 0.9), FLOOR - 40);
  const scale = Math.min(targetH / height, (W * 0.92) / width);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const subject = await sharp(trimmed.data).resize(w, h).png().toBuffer();
  const shadow = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><filter id="b"><feGaussianBlur stdDeviation="22"/></filter></defs><ellipse cx="${W / 2}" cy="${FLOOR - 6}" rx="${Math.round(w * 0.46)}" ry="30" fill="#3a2a22" opacity="0.28" filter="url(#b)"/></svg>`,
  );
  const out = path.join(outputDir, file.replace(/\.png$/, ".webp"));
  await sharp(Buffer.from(studio))
    .composite([{ input: shadow }, { input: subject, left: Math.round((W - w) / 2), top: FLOOR - h }])
    .webp({ quality: 88 })
    .toFile(out);
  console.log(file, "→", out, `${w}×${h}`);
}
