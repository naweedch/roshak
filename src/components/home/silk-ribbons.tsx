"use client";

/**
 * نوارهای ساتن نیمه‌شفاف متحرک با Canvas دوبعدی (بدون کتابخانه و موتور سه‌بعدی).
 * هر نوار یک منحنی است که در طول خود می‌پیچد؛ پهنای ظاهری و روشنایی هر بخش از زاویهٔ پیچش
 * محاسبه می‌شود و هر بخش در عرض به سه نوار باریک تقسیم می‌شود تا انحنای براق ساتن دیده شود.
 *
 * کارایی:
 *  - نوارها مات کشیده می‌شوند و شفافیت با opacity خود بوم اعمال می‌شود (بدون لایهٔ میانی و درز).
 *  - وضوح داخلی کمتر از وضوح صفحه است (ساتن نرم است و کشیدگی جزئی دیده نمی‌شود).
 *  - حداکثر ۳۰ فریم در ثانیه؛ زمان رسم اندازه‌گیری می‌شود و در دستگاه کند، کیفیت خودکار پایین می‌آید
 *    و در صورت نیاز انیمیشن روی یک فریم ثابت متوقف می‌شود.
 *  - بیرون از دید و در زبانهٔ پنهان، رندر متوقف است؛ با «کاهش حرکت» فقط یک فریم ثابت کشیده می‌شود.
 */
import * as React from "react";

type Rgb = readonly [number, number, number];

export interface RibbonSpec {
  /** نقطهٔ مرکزی منحنی در مختصات نرمال‌شده (۰ تا ۱) برای پارامتر s و زمان t */
  path: (s: number, t: number) => readonly [number, number];
  /** پهنای نوار نسبت به ضلع کوچک‌تر بوم */
  width: (s: number) => number;
  /** زاویهٔ پیچش (رادیان) */
  twist: (s: number, t: number) => number;
  dark: Rgb;
  light: Rgb;
}

const SHEEN: Rgb = [255, 214, 200];
/** ضریب روشنایی سه نوار عرضی: لبه‌ها تیره‌تر، میانه روشن‌تر (انحنای پارچه) */
const STRIPS = [
  { from: -1, to: -0.33, k: 0.78 },
  { from: -0.33, to: 0.33, k: 1.08 },
  { from: 0.33, to: 1, k: 0.86 },
] as const;

function mix(a: Rgb, b: Rgb, k: number): Rgb {
  const c = Math.max(0, Math.min(1, k));
  return [a[0] + (b[0] - a[0]) * c, a[1] + (b[1] - a[1]) * c, a[2] + (b[2] - a[2]) * c];
}

interface Sample {
  x: number;
  y: number;
  /** بردار یکهٔ مماس و عمود */
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  hw: number;
  shade: number;
  sheen: number;
}

function sample(spec: RibbonSpec, w: number, h: number, t: number, segments: number): Sample[] {
  const unit = Math.min(w, h);
  const pts: Sample[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = i / segments;
    const [x, y] = spec.path(s, t);
    const [x2, y2] = spec.path(Math.min(1, s + 0.003), t);
    const [x0, y0] = spec.path(Math.max(0, s - 0.003), t);
    let dx = (x2 - x0) * w;
    let dy = (y2 - y0) * h;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const phi = spec.twist(s, t);
    const facing = Math.cos(phi);
    // پهنای ظاهری با پیچش کم و زیاد می‌شود ولی هرگز کاملاً صفر نمی‌شود
    const hw = (spec.width(s) * unit * Math.max(0.12, Math.abs(facing))) / 2;
    const shade = (0.3 + 0.7 * Math.pow(Math.abs(facing), 0.7)) * (facing > 0 ? 1 : 0.66);
    // برق پهن و نرم که در طول نوار حرکت می‌کند
    const sheen = Math.pow(Math.max(0, Math.sin(phi * 0.9 + s * 3.2 - t * 0.6)), 6) * Math.abs(facing) * 0.55;
    pts.push({ x: x * w, y: y * h, tx: dx, ty: dy, nx: -dy, ny: dx, hw, shade, sheen });
  }
  return pts;
}

/** هم‌پوشانی کوچک هر بخش با بخش بعدی تا درز ضدپله‌ای دیده نشود (به‌جای stroke پرهزینه) */
const OVERLAP = 0.8;

function drawRibbon(ctx: CanvasRenderingContext2D, spec: RibbonSpec, pts: Sample[]) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const shade = (a.shade + b.shade) / 2;
    const sheen = (a.sheen + b.sheen) / 2;
    const bx = b.x + b.tx * OVERLAP;
    const by = b.y + b.ty * OVERLAP;
    for (const strip of STRIPS) {
      const base = mix(spec.dark, spec.light, shade * strip.k);
      const c = mix(base, SHEEN, sheen * (strip.k > 1 ? 1 : 0.45));
      ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      ctx.beginPath();
      ctx.moveTo(a.x + a.nx * a.hw * strip.from, a.y + a.ny * a.hw * strip.from);
      ctx.lineTo(bx + b.nx * b.hw * strip.from, by + b.ny * b.hw * strip.from);
      ctx.lineTo(bx + b.nx * b.hw * strip.to, by + b.ny * b.hw * strip.to);
      ctx.lineTo(a.x + a.nx * a.hw * strip.to, a.y + a.ny * a.hw * strip.to);
      ctx.closePath();
      ctx.fill();
    }
  }
  // برق لبهٔ بالایی
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = p.x + p.nx * p.hw;
    const y = p.y + p.ny * p.hw;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "rgba(255,206,190,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function SilkRibbons({ ribbons, className, opacity = 1 }: { ribbons: readonly RibbonSpec[]; className?: string; opacity?: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ribbonsRef = React.useRef(ribbons);
  React.useEffect(() => {
    ribbonsRef.current = ribbons;
  }, [ribbons]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 768px)").matches;
    const weakCpu = (navigator.hardwareConcurrency ?? 8) <= 4;
    // کیفیت اولیه؛ با اندازه‌گیری زمان رسم تنظیم می‌شود
    let scale = small || weakCpu ? 0.6 : 0.85;
    let segments = small || weakCpu ? 64 : 96;
    const FRAME_MS = 1000 / 30;
    const BUDGET_MS = 10;
    const STILL_MS = 2400;

    let width = 0;
    let height = 0;
    let raf = 0;
    let visible = true;
    let stopped = reduce;
    let last = 0;
    let avg = 0;
    let slowFrames = 0;
    const start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2) * scale;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      const t = (time - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      for (const r of ribbonsRef.current) drawRibbon(ctx, r, sample(r, width, height, t, segments));
    };

    const loop = (now: number) => {
      raf = 0;
      if (stopped || !visible || document.hidden) return;
      if (now - last >= FRAME_MS) {
        last = now;
        const before = performance.now();
        draw(now);
        const cost = performance.now() - before;
        avg = avg ? avg * 0.85 + cost * 0.15 : cost;
        if (avg > BUDGET_MS) {
          slowFrames += 1;
          if (slowFrames > 8) {
            slowFrames = 0;
            avg = 0;
            if (scale > 0.4 || segments > 40) {
              // پایین آوردن کیفیت به‌جای کند کردن کل صفحه
              scale = Math.max(0.4, scale * 0.75);
              segments = Math.max(40, Math.round(segments * 0.7));
              resize();
            } else {
              // دستگاه بسیار کند: انیمیشن متوقف و آخرین فریم حفظ می‌شود
              stopped = true;
              return;
            }
          }
        } else slowFrames = 0;
      }
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!raf && !stopped && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };

    resize();
    // فریم اول (و تنها فریم در حالت کاهش حرکت) با زمانی ثابت تا ترکیب‌بندی همیشه یکسان باشد
    draw(start + STILL_MS);

    const ro = new ResizeObserver(() => {
      resize();
      draw(stopped ? start + STILL_MS : performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      kick();
    });
    io.observe(canvas);
    const onVisibility = () => kick();
    document.addEventListener("visibilitychange", onVisibility);
    // شروع انیمیشن پس از بارگذاری اولیه تا با رندر نخست صفحه رقابت نکند
    const idle = window.requestIdleCallback ? window.requestIdleCallback(kick, { timeout: 1500 }) : window.setTimeout(kick, 600);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      if (window.cancelIdleCallback && typeof idle === "number") window.cancelIdleCallback(idle);
      window.clearTimeout(idle as number);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} style={{ opacity }} />;
}

// ─────────────── ترکیب‌بندی نوارهای صحنهٔ آغازین ───────────────

const CRIMSON_DARK: Rgb = [52, 5, 18];
const CRIMSON_LIGHT: Rgb = [214, 46, 70];
const WINE_DARK: Rgb = [64, 8, 22];
const WINE_LIGHT: Rgb = [178, 34, 58];

/** نوارهای پشت مدل: قوسی بلند که از پشت شانه‌ها می‌گذرد و نواری تیره‌تر که از بالا به پایین می‌ریزد */
export const BACK_RIBBONS: readonly RibbonSpec[] = [
  {
    path: (s, t) => [0.96 - 0.92 * s + 0.025 * Math.sin(t * 0.3 + 3 * s), 0.06 + 0.8 * s + 0.06 * Math.sin(2.4 * Math.PI * s + t * 0.35)],
    width: (s) => 0.025 + 0.045 * Math.sin(Math.PI * s),
    twist: (s, t) => 1.6 * Math.PI * s - t * 0.38,
    dark: WINE_DARK,
    light: WINE_LIGHT,
  },
  {
    path: (s, t) => [-0.04 + 1.08 * s, 0.84 - 0.58 * Math.sin(Math.PI * s) + 0.035 * Math.sin(2 * Math.PI * 1.2 * s + t * 0.4)],
    width: (s) => 0.05 + 0.07 * Math.sin(Math.PI * s),
    twist: (s, t) => 1.25 * Math.PI * s + t * 0.45 + 0.35 * Math.sin(5 * s + t * 0.6),
    dark: CRIMSON_DARK,
    light: CRIMSON_LIGHT,
  },
];

/** نوار جلوی مدل: گذری نرم روی پایین دامن (با شفافیت بیشتر تا لباس همچنان دیده شود) */
export const FRONT_RIBBONS: readonly RibbonSpec[] = [
  {
    path: (s, t) => [-0.06 + 1.12 * s, 0.9 - 0.11 * Math.sin(Math.PI * s) + 0.02 * Math.sin(4 * s + t * 0.6)],
    width: (s) => 0.02 + 0.045 * Math.sin(Math.PI * s),
    twist: (s, t) => 1.8 * Math.PI * s + t * 0.6,
    dark: CRIMSON_DARK,
    light: CRIMSON_LIGHT,
  },
];
