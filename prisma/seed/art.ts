/**
 * تولید تصاویر جایگزین (placeholder) برای داده‌های نمونه.
 *
 * این تصاویر عکس واقعی محصول نیستند: تصویرسازی‌های برداری از لباس روی «مانکن خیاطی» و
 * ترکیب‌بندی‌های انتزاعی پارچه‌اند که فقط برای نمایش ساختار سایت ساخته می‌شوند.
 * پیش از انتشار عمومی باید با عکاسی واقعی و دارای مجوز برند جایگزین شوند (راهنما در docs/).
 */

export type Silhouette = "aline" | "ballgown" | "mermaid" | "column" | "midi" | "mini" | "jumpsuit" | "cape";
export type Neckline = "sweetheart" | "vneck" | "offshoulder" | "halter" | "oneshoulder" | "boat";

export interface DressArtOptions {
  silhouette: Silhouette;
  neckline: Neckline;
  color: string;
  background: [string, string];
  /** پولک/سنگ‌دوزی */
  embellished?: boolean;
  /** کمربند طلایی */
  belt?: boolean;
  /** پارچهٔ براق (ساتن/ابریشم) یا مات (مخمل/کرپ) */
  finish: "satin" | "matte" | "velvet" | "sequin";
  seed: number;
  /** نمای نزدیک از بالاتنه */
  detail?: boolean;
}

// ─────────────── ابزار رنگ ───────────────

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  return [Number.parseInt(v.slice(0, 2), 16), Number.parseInt(v.slice(2, 4), 16), Number.parseInt(v.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** روشن‌تر (amount مثبت) یا تیره‌تر (amount منفی) کردن رنگ */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  if (amount >= 0) return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  return rgbToHex(r * (1 + amount), g * (1 + amount), b * (1 + amount));
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** مولد عدد شبه‌تصادفی قطعی (برای تکرارپذیری تصاویر) */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

// ─────────────── اجزای لباس ───────────────

const WAIST_Y = 560;

function bodicePath(neckline: Neckline): string {
  switch (neckline) {
    case "sweetheart":
      return `M 466 425 C 470 470 488 520 505 ${WAIST_Y} L 695 ${WAIST_Y} C 712 520 730 470 734 425
        Q 700 382 650 398 Q 618 410 600 438 Q 582 410 550 398 Q 500 382 466 425 Z`;
    case "vneck":
      return `M 452 338 L 498 334 L 600 492 L 702 334 L 748 338 C 742 380 736 420 734 440
        C 730 480 712 520 695 ${WAIST_Y} L 505 ${WAIST_Y} C 488 520 470 480 466 440 C 464 420 458 380 452 338 Z`;
    case "offshoulder":
      return `M 418 392 Q 600 428 782 392 L 776 430 C 748 452 735 470 732 488 C 724 520 712 540 695 ${WAIST_Y}
        L 505 ${WAIST_Y} C 488 540 476 520 468 488 C 465 470 452 452 424 430 Z`;
    case "halter":
      return `M 566 292 L 634 292 L 700 400 C 726 430 734 450 732 470 C 726 510 712 535 695 ${WAIST_Y}
        L 505 ${WAIST_Y} C 488 535 474 510 468 470 C 466 450 474 430 500 400 Z`;
    case "oneshoulder":
      return `M 456 338 L 512 330 L 736 428 C 734 470 716 520 695 ${WAIST_Y} L 505 ${WAIST_Y}
        C 488 520 468 470 464 430 C 460 400 458 370 456 338 Z`;
    case "boat":
    default:
      return `M 456 352 Q 600 372 744 352 C 742 400 736 430 734 450 C 730 490 712 528 695 ${WAIST_Y}
        L 505 ${WAIST_Y} C 488 528 470 490 466 450 C 464 430 458 400 456 352 Z`;
  }
}

interface SkirtShape {
  path: string;
  hemY: number;
  hemLeft: number;
  hemRight: number;
  /** نقطهٔ شروع چین‌ها روی کمر/باسن */
  topY: number;
}

function skirtShape(s: Silhouette): SkirtShape {
  switch (s) {
    case "ballgown":
      return {
        path: `M 505 ${WAIST_Y} C 420 640 250 900 230 1470 Q 600 1520 970 1470 C 950 900 780 640 695 ${WAIST_Y} Z`,
        hemY: 1480,
        hemLeft: 230,
        hemRight: 970,
        topY: WAIST_Y,
      };
    case "mermaid":
      return {
        path: `M 505 ${WAIST_Y} C 470 620 452 680 456 760 C 462 900 492 1010 500 1090 C 470 1220 380 1380 335 1475
          Q 600 1515 865 1475 C 820 1380 730 1220 700 1090 C 708 1010 738 900 744 760 C 748 680 730 620 695 ${WAIST_Y} Z`,
        hemY: 1480,
        hemLeft: 335,
        hemRight: 865,
        topY: 1090,
      };
    case "column":
      return {
        path: `M 505 ${WAIST_Y} C 470 620 452 690 458 780 C 466 1000 448 1300 440 1478 Q 600 1496 760 1478
          C 752 1300 734 1000 742 780 C 748 690 730 620 695 ${WAIST_Y} Z`,
        hemY: 1480,
        hemLeft: 440,
        hemRight: 760,
        topY: 780,
      };
    case "midi":
      return {
        path: `M 505 ${WAIST_Y} C 455 680 400 960 372 1215 Q 600 1250 828 1215 C 800 960 745 680 695 ${WAIST_Y} Z`,
        hemY: 1222,
        hemLeft: 372,
        hemRight: 828,
        topY: WAIST_Y,
      };
    case "mini":
      return {
        path: `M 505 ${WAIST_Y} C 465 640 420 760 395 905 Q 600 940 805 905 C 780 760 735 640 695 ${WAIST_Y} Z`,
        hemY: 912,
        hemLeft: 395,
        hemRight: 805,
        topY: WAIST_Y,
      };
    case "jumpsuit":
      return {
        path: `M 505 ${WAIST_Y} C 470 640 440 760 420 900 C 400 1100 378 1320 368 1478 L 586 1478 C 590 1260 596 1000 600 790
          C 604 1000 610 1260 614 1478 L 832 1478 C 822 1320 800 1100 780 900 C 760 760 730 640 695 ${WAIST_Y} Z`,
        hemY: 1478,
        hemLeft: 368,
        hemRight: 832,
        topY: WAIST_Y,
      };
    case "cape":
    case "aline":
    default:
      return {
        path: `M 505 ${WAIST_Y} C 455 700 360 1050 320 1470 Q 600 1510 880 1470 C 840 1050 745 700 695 ${WAIST_Y} Z`,
        hemY: 1480,
        hemLeft: 320,
        hemRight: 880,
        topY: WAIST_Y,
      };
  }
}

function folds(shape: SkirtShape, count: number, random: () => number): string {
  const lines: string[] = [];
  const top = shape.topY;
  const width = shape.hemRight - shape.hemLeft;
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const hx = shape.hemLeft + width * t + (random() - 0.5) * 30;
    const tx = 520 + 160 * t + (random() - 0.5) * 20;
    const midY = top + (shape.hemY - top) * (0.45 + random() * 0.2);
    const bend = (random() - 0.5) * 60;
    lines.push(`M ${tx.toFixed(1)} ${top + 10} Q ${((tx + hx) / 2 + bend).toFixed(1)} ${midY.toFixed(1)} ${hx.toFixed(1)} ${shape.hemY - 8}`);
  }
  return lines.join(" ");
}

function dressForm(shape: SkirtShape, color: string): string {
  const base = shade(color, -0.35);
  const neck = `<path d="M 560 238 Q 600 222 640 238 L 646 330 Q 600 346 554 330 Z" fill="url(#formGrad)"/>
    <ellipse cx="600" cy="236" rx="40" ry="10" fill="${shade("#d9c8b4", -0.05)}"/>
    <rect x="594" y="205" width="12" height="34" rx="6" fill="#b08d45"/>
    <circle cx="600" cy="200" r="11" fill="#c9a45a"/>`;
  const stand =
    shape.hemY < 1400
      ? `<rect x="594" y="${shape.hemY - 12}" width="12" height="${1440 - shape.hemY}" rx="5" fill="#9c7a3c"/>
         <ellipse cx="600" cy="1452" rx="120" ry="20" fill="${base}" opacity="0.55"/>
         <ellipse cx="600" cy="1446" rx="108" ry="14" fill="#b08d45"/>`
      : "";
  return neck + stand;
}

function sparkles(random: () => number, count: number, color: string, area: { x: number; y: number; w: number; h: number }): string {
  let out = "";
  for (let i = 0; i < count; i++) {
    const x = area.x + random() * area.w;
    const y = area.y + random() * area.h;
    const r = 1.2 + random() * 2.6;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${(0.45 + random() * 0.5).toFixed(2)}"/>`;
  }
  return out;
}

/** تصویرسازی لباس روی مانکن با سایه‌زنی پارچه */
export function dressSvg(o: DressArtOptions): string {
  const random = rng(o.seed);
  const shape = skirtShape(o.silhouette);
  const [bgTop, bgBottom] = o.background;
  const light = shade(o.color, o.finish === "matte" ? 0.12 : 0.28);
  const dark = shade(o.color, o.finish === "velvet" ? -0.55 : -0.38);
  const mid = o.color;
  const sheenOpacity = o.finish === "satin" ? 0.32 : o.finish === "sequin" ? 0.22 : o.finish === "velvet" ? 0.12 : 0.08;
  const viewBox = o.detail ? "330 230 540 720" : "0 0 1200 1600";
  const archColor = shade(bgBottom, -0.05);

  const cape =
    o.silhouette === "cape"
      ? `<path d="M 452 338 C 380 520 320 900 300 1430 Q 330 1450 360 1440 C 400 1000 440 640 505 ${WAIST_Y} Z" fill="url(#skirtGrad)" opacity="0.55"/>
         <path d="M 748 338 C 820 520 880 900 900 1430 Q 870 1450 840 1440 C 800 1000 760 640 695 ${WAIST_Y} Z" fill="url(#skirtGrad)" opacity="0.55"/>`
      : "";

  const belt = o.belt
    ? `<path d="M 503 ${WAIST_Y - 14} Q 600 ${WAIST_Y - 4} 697 ${WAIST_Y - 14} L 699 ${WAIST_Y + 10} Q 600 ${WAIST_Y + 20} 501 ${WAIST_Y + 10} Z" fill="url(#goldGrad)"/>
       <circle cx="600" cy="${WAIST_Y}" r="13" fill="#f3dfa6" stroke="#9c7a3c" stroke-width="3"/>`
    : "";

  const embellish = o.embellished
    ? sparkles(random, o.finish === "sequin" ? 260 : 120, "#f6e3a8", { x: 470, y: 340, w: 260, h: 260 }) +
      (o.finish === "sequin" ? sparkles(random, 320, shade(o.color, 0.6), { x: shape.hemLeft + 40, y: shape.topY + 40, w: shape.hemRight - shape.hemLeft - 80, h: shape.hemY - shape.topY - 80 }) : "")
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="${viewBox}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bgTop}"/><stop offset="1" stop-color="${bgBottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.38" r="0.6">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="skirtGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${dark}"/><stop offset="0.28" stop-color="${mid}"/>
      <stop offset="0.5" stop-color="${light}"/><stop offset="0.72" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="bodiceGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${dark}"/><stop offset="0.45" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <linearGradient id="hemShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="0.7" stop-color="#000" stop-opacity="0.08"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0.25" stop-color="#fff" stop-opacity="0"/><stop offset="0.45" stop-color="#fff" stop-opacity="${sheenOpacity}"/>
      <stop offset="0.55" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9c7a3c"/><stop offset="0.5" stop-color="#f1d9a0"/><stop offset="1" stop-color="#9c7a3c"/>
    </linearGradient>
    <linearGradient id="formGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#cbb8a2"/><stop offset="0.5" stop-color="#eadccb"/><stop offset="1" stop-color="#c1ad96"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
    <clipPath id="skirtClip"><path d="${shape.path}"/></clipPath>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <path d="M 250 1600 L 250 640 A 350 350 0 0 1 950 640 L 950 1600 Z" fill="${archColor}" opacity="0.55"/>
  <path d="M 285 1600 L 285 650 A 315 315 0 0 1 915 650 L 915 1600" fill="none" stroke="#b08d45" stroke-width="2" opacity="0.45"/>
  <rect width="1200" height="1600" fill="url(#glow)"/>
  <ellipse cx="600" cy="${Math.min(1490, shape.hemY + 10)}" rx="${(shape.hemRight - shape.hemLeft) / 2 + 30}" ry="34" fill="#2a1a1f" opacity="0.28" filter="url(#shadow)"/>
  ${dressForm(shape, o.color)}
  ${cape}
  <path d="${shape.path}" fill="url(#skirtGrad)"/>
  <g clip-path="url(#skirtClip)">
    <path d="${folds(shape, o.silhouette === "ballgown" ? 11 : 8, random)}" stroke="${dark}" stroke-width="26" fill="none" opacity="0.35" filter="url(#soft)"/>
    <path d="${folds(shape, o.silhouette === "ballgown" ? 9 : 6, random)}" stroke="${light}" stroke-width="16" fill="none" opacity="${o.finish === "matte" ? 0.18 : 0.4}" filter="url(#soft)"/>
    <rect x="0" y="0" width="1200" height="1600" fill="url(#sheen)"/>
    <rect x="0" y="${shape.topY}" width="1200" height="${shape.hemY - shape.topY + 20}" fill="url(#hemShade)"/>
  </g>
  <path d="${bodicePath(o.neckline)}" fill="url(#bodiceGrad)"/>
  <path d="${bodicePath(o.neckline)}" fill="url(#sheen)"/>
  <path d="M 600 470 Q 596 520 600 ${WAIST_Y}" stroke="${dark}" stroke-width="6" opacity="0.25" fill="none" filter="url(#soft)"/>
  ${belt}
  ${embellish}
</svg>`;
}

// ─────────────── ترکیب‌بندی‌های انتزاعی (هیرو، کمپین، کاور مجموعه) ───────────────

export interface SilkArtOptions {
  width: number;
  height: number;
  background: [string, string];
  ribbon: [string, string, string];
  seed: number;
  arch?: boolean;
  sparkle?: boolean;
}

/** نوارهای ابریشم روان با سایه‌روشن؛ برای پس‌زمینهٔ کمپین‌ها و نسخهٔ جایگزین صحنهٔ سه‌بعدی */
export function silkSvg(o: SilkArtOptions): string {
  const random = rng(o.seed);
  const { width: w, height: h } = o;
  const ribbons: string[] = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    // نوارهای مورب با لبه‌های ناهم‌راستا تا حس پیچ‌وتاب پارچه ایجاد شود
    const y0 = h * (0.05 + 0.9 * random());
    const y1 = y0 + h * (random() - 0.5) * 0.9;
    const amp = h * (0.18 + random() * 0.3);
    const t0 = h * (0.03 + random() * 0.08);
    const t1 = h * (0.08 + random() * 0.18);
    const twist = h * (random() - 0.5) * 0.35;
    const x0 = -w * 0.15;
    const x1 = w * 1.15;
    const c1x = w * (0.2 + random() * 0.15);
    const c2x = w * (0.55 + random() * 0.2);
    const top = `M ${x0} ${y0} C ${c1x} ${y0 - amp} ${c2x} ${y1 + amp} ${x1} ${y1}`;
    const bottom = `L ${x1} ${y1 + t1} C ${c2x} ${y1 + amp + t1 + twist} ${c1x} ${y0 - amp + t0 - twist} ${x0} ${y0 + t0} Z`;
    ribbons.push(
      `<path d="${top} ${bottom}" fill="url(#rib${i % 3})" opacity="${(0.6 + random() * 0.35).toFixed(2)}"/>` +
        `<path d="${top}" stroke="#fff" stroke-opacity="${(0.15 + random() * 0.25).toFixed(2)}" stroke-width="${(2 + random() * 4).toFixed(1)}" fill="none" filter="url(#blur)"/>`,
    );
  }
  const arch = o.arch
    ? `<path d="M ${w * 0.32} ${h} L ${w * 0.32} ${h * 0.42} A ${w * 0.18} ${w * 0.18} 0 0 1 ${w * 0.68} ${h * 0.42} L ${w * 0.68} ${h}" fill="none" stroke="#d6b56d" stroke-width="3" opacity="0.6"/>
       <path d="M ${w * 0.345} ${h} L ${w * 0.345} ${h * 0.43} A ${w * 0.155} ${w * 0.155} 0 0 1 ${w * 0.655} ${h * 0.43} L ${w * 0.655} ${h}" fill="none" stroke="#d6b56d" stroke-width="1.5" opacity="0.35"/>`
    : "";
  const sparkle = o.sparkle ? sparkles(random, 140, "#f6e3a8", { x: 0, y: 0, w, h }) : "";
  const [r0, r1, r2] = o.ribbon;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.background[0]}"/><stop offset="1" stop-color="${o.background[1]}"/></linearGradient>
    <radialGradient id="glow" cx="0.62" cy="0.4" r="0.55"><stop offset="0" stop-color="${shade(r1, 0.2)}" stop-opacity="0.55"/><stop offset="1" stop-color="${r1}" stop-opacity="0"/></radialGradient>
    <linearGradient id="rib0" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(r0, -0.4)}"/><stop offset="0.5" stop-color="${shade(r0, 0.25)}"/><stop offset="1" stop-color="${shade(r0, -0.3)}"/></linearGradient>
    <linearGradient id="rib1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(r1, -0.35)}"/><stop offset="0.45" stop-color="${shade(r1, 0.3)}"/><stop offset="1" stop-color="${shade(r1, -0.25)}"/></linearGradient>
    <linearGradient id="rib2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(r2, -0.3)}"/><stop offset="0.5" stop-color="${shade(r2, 0.35)}"/><stop offset="1" stop-color="${shade(r2, -0.35)}"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${ribbons.join("\n")}
  ${arch}
  ${sparkle}
</svg>`;
}
