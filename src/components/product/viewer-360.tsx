"use client";

/**
 * نمایشگر چرخشی بر اساس عکس‌های زاویه‌دار واقعی (VIEW360) که برای محصول بارگذاری شده است.
 * با ۸ فریم یا بیشتر، چرخش پیوستهٔ ۳۶۰ درجه است؛ با تعداد کمتر، بین زاویه‌ها با محوشدگی نرم جابه‌جا می‌شود.
 * با کشیدن (موس/لمس)، کلیدهای جهت‌نما یا دکمه‌های زاویه کار می‌کند.
 */
import * as React from "react";
import Image from "next/image";
import { Rotate3d } from "lucide-react";
import type { ProductImageDTO } from "@/lib/types/catalog";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

export function Viewer360({ frames, productName }: { frames: ProductImageDTO[]; productName: string }) {
  const [frame, setFrame] = React.useState(0);
  const drag = React.useRef<{ x: number; frame: number } | null>(null);
  const box = React.useRef<HTMLDivElement>(null);
  const count = frames.length;
  const continuous = count >= 8;
  const wrap = (n: number) => ((n % count) + count) % count;

  return (
    <div className="space-y-3">
      <div
        ref={box}
        className="arch-3-4 relative aspect-[3/4] cursor-grab touch-pan-y select-none overflow-hidden bg-ivory-deep active:cursor-grabbing"
        role="slider"
        tabIndex={0}
        aria-label={`نمای چرخشی ${productName}`}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={frame + 1}
        aria-valuetext={`${frames[frame]?.alt ?? ""} (زاویهٔ ${toPersianDigits(frame + 1)} از ${toPersianDigits(count)})`}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setFrame((f) => wrap(f + 1));
          if (e.key === "ArrowRight") setFrame((f) => wrap(f - 1));
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, frame };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          // فاصلهٔ کشیدن لازم برای هر فریم متناسب با عرض قاب و تعداد فریم‌ها
          const width = box.current?.clientWidth ?? 400;
          const step = continuous ? Math.max(8, width / count / 1.5) : width / 3;
          const delta = Math.trunc((e.clientX - drag.current.x) / step);
          setFrame(wrap(drag.current.frame - delta));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {frames.map((f, i) => (
          <Image
            key={f.id}
            src={f.url}
            alt={i === frame ? f.alt : ""}
            aria-hidden={i !== frame}
            fill
            sizes="(min-width: 1024px) 46vw, 100vw"
            draggable={false}
            className={cn("object-cover", !continuous && "transition-opacity duration-500 ease-[var(--ease-silk)]")}
            style={{ opacity: i === frame ? 1 : 0 }}
            loading={i < 2 ? "eager" : "lazy"}
          />
        ))}
        <span className="pointer-events-none absolute end-4 top-[18%] grid size-11 place-items-center rounded-full bg-ivory/85 text-burgundy shadow-soft backdrop-blur" aria-hidden>
          <Rotate3d className="size-5" />
        </span>
      </div>
      {!continuous ? (
        <div className="flex justify-center gap-2" role="group" aria-label="انتخاب زاویه">
          {frames.map((f, i) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFrame(i)}
              aria-pressed={i === frame}
              className={cn("rounded-full px-4 py-1.5 text-xs transition-colors", i === frame ? "bg-burgundy text-ivory" : "border border-line hover:border-burgundy/40")}
            >
              {f.alt.split("،").pop()?.trim() || `زاویهٔ ${toPersianDigits(i + 1)}`}
            </button>
          ))}
        </div>
      ) : null}
      <p className="text-center text-xs text-ink-muted">برای چرخاندن، تصویر را به چپ و راست بکشید یا از کلیدهای جهت‌نما استفاده کنید.</p>
    </div>
  );
}
