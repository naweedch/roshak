"use client";

/**
 * گالری تصاویر محصول: قاب طاق‌نما، تصاویر کوچک، پیمایش با کیبورد، کشیدن روی موبایل (scroll-snap)
 * و نمای بزرگ‌نمایی‌شده (کلیک یا Enter) که با حرکت نشانگر جابه‌جا می‌شود.
 */
import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { ProductImageDTO } from "@/lib/types/catalog";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, productName, activeColorId }: { images: ProductImageDTO[]; productName: string; activeColorId: string | null }) {
  // تصاویر رنگ انتخاب‌شده در ابتدای گالری قرار می‌گیرند
  const ordered = React.useMemo(() => {
    if (!activeColorId) return images;
    const match = images.filter((i) => i.colorId === activeColorId);
    return match.length ? [...match, ...images.filter((i) => i.colorId !== activeColorId)] : images;
  }, [images, activeColorId]);

  const [index, setIndex] = React.useState(0);
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const [origin, setOrigin] = React.useState({ x: 50, y: 50 });
  const track = React.useRef<HTMLDivElement>(null);

  // با تغییر رنگ، گالری از تصویر اول همان رنگ شروع می‌شود (تنظیم در همان رندر، بدون effect)
  const [prevColorId, setPrevColorId] = React.useState(activeColorId);
  if (prevColorId !== activeColorId) {
    setPrevColorId(activeColorId);
    setIndex(0);
  }

  const current = ordered[index] ?? ordered[0];
  if (!current) {
    return <div className="arch-3-4 grid aspect-[3/4] place-items-center bg-ivory-deep text-ink-soft">تصویری ثبت نشده است</div>;
  }

  const go = (next: number) => setIndex((next + ordered.length) % ordered.length);

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row lg:items-start">
      {ordered.length > 1 ? (
        <ul className="no-scrollbar flex gap-3 overflow-x-auto lg:max-h-[42rem] lg:w-24 lg:flex-col lg:overflow-y-auto" aria-label="تصاویر محصول">
          {ordered.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`نمایش تصویر ${toPersianDigits(i + 1)}: ${img.alt}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "arch-3-4 relative block h-24 w-[4.5rem] overflow-hidden bg-ivory-deep ring-offset-2 ring-offset-ivory transition-[box-shadow,opacity] lg:h-32 lg:w-24",
                  i === index ? "ring-2 ring-burgundy" : "opacity-70 hover:opacity-100",
                )}
              >
                <Image src={img.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative flex-1">
        <div
          ref={track}
          className="arch-3-4 group relative aspect-[3/4] overflow-hidden bg-ivory-deep"
          role="group"
          aria-roledescription="گالری"
          aria-label={`${productName}، تصویر ${toPersianDigits(index + 1)} از ${toPersianDigits(ordered.length)}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") go(index + 1);
            if (e.key === "ArrowRight") go(index - 1);
            if (e.key === "Enter") setZoomOpen(true);
          }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0"
            >
              <Image src={current.url} alt={current.alt} fill priority={index === 0} sizes="(min-width: 1024px) 46vw, 100vw" quality={85} className="cursor-zoom-in object-cover" onClick={() => setZoomOpen(true)} />
            </motion.div>
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="absolute bottom-4 end-4 grid size-11 place-items-center rounded-full bg-ivory/85 text-burgundy shadow-soft backdrop-blur transition-colors hover:bg-ivory"
            aria-label="بزرگ‌نمایی تصویر"
          >
            <Maximize2 className="size-5" />
          </button>
          {ordered.length > 1 ? (
            <div className="absolute inset-x-4 bottom-4 flex justify-start gap-2">
              <button type="button" onClick={() => go(index - 1)} className="grid size-11 place-items-center rounded-full bg-ivory/85 text-burgundy shadow-soft backdrop-blur hover:bg-ivory" aria-label="تصویر قبلی">
                <ChevronRight className="size-5" />
              </button>
              <button type="button" onClick={() => go(index + 1)} className="grid size-11 place-items-center rounded-full bg-ivory/85 text-burgundy shadow-soft backdrop-blur hover:bg-ivory" aria-label="تصویر بعدی">
                <ChevronLeft className="size-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent title={`${productName}، نمای بزرگ`} hideTitle className="max-w-[min(92vw,64rem)] p-2 sm:p-3">
          <div
            className="relative aspect-[3/4] max-h-[84dvh] w-full cursor-zoom-out overflow-hidden rounded-2xl bg-ivory-deep"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setOrigin({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
            }}
            onClick={() => setZoomOpen(false)}
          >
            <Image
              src={current.url}
              alt={current.alt}
              fill
              sizes="(min-width: 1024px) 64rem, 92vw"
              quality={85}
              className="object-cover transition-transform duration-200 ease-out motion-reduce:transition-none"
              style={{ transform: "scale(1.8)", transformOrigin: `${origin.x}% ${origin.y}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-ink-muted">برای جابه‌جایی، نشانگر را روی تصویر حرکت دهید؛ برای بستن کلیک کنید.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
