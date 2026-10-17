"use client";

import * as React from "react";
import { Ruler } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { SizeGuideDTO } from "@/lib/types/catalog";
import { toPersianDigits } from "@/lib/persian";

/** جدول اندازه‌ها در دیالوگ (جدول معنایی با سرستون برای صفحه‌خوان) */
export function SizeGuideDialog({ guide }: { guide: SizeGuideDTO }) {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1.5 text-sm text-burgundy underline-offset-[6px] hover:underline">
        <Ruler className="size-4" aria-hidden />
        راهنمای سایز
      </DialogTrigger>
      <DialogContent title="راهنمای سایز" description={guide.description ?? undefined} className="max-w-2xl">
        <SizeGuideTable guide={guide} />
        <div className="mt-6 rounded-2xl bg-ivory-deep p-4 text-sm leading-7 text-ink-muted">
          <p className="font-medium text-ink">چطور اندازه بگیریم؟</p>
          <ul className="mt-2 list-disc space-y-1 ps-5">
            <li>دور سینه: متر را از برجسته‌ترین قسمت سینه و موازی زمین دور بدن بچرخانید.</li>
            <li>دور کمر: باریک‌ترین قسمت کمر، حدود دو انگشت بالای ناف.</li>
            <li>دور باسن: برجسته‌ترین قسمت باسن، با پاهای جفت.</li>
          </ul>
          <p className="mt-2">اگر بین دو سایز هستید، سایز بزرگ‌تر را انتخاب کنید یا با پشتیبانی مشورت کنید.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SizeGuideTable({ guide }: { guide: SizeGuideDTO }) {
  const hasLength = guide.rows.some((r) => r.length !== undefined);
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full text-center text-sm">
        <caption className="sr-only">{guide.name} (سانتی‌متر)</caption>
        <thead className="bg-ivory-deep text-ink">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium">
              سایز
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              دور سینه
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              دور کمر
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              دور باسن
            </th>
            {hasLength ? (
              <th scope="col" className="px-3 py-3 font-medium">
                قد لباس
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="tabular divide-y divide-line">
          {guide.rows.map((row) => (
            <tr key={row.size} className="hover:bg-burgundy/[0.03]">
              <th scope="row" className="px-3 py-2.5 font-semibold text-burgundy">
                {toPersianDigits(row.size)}
              </th>
              <td className="px-3 py-2.5">{toPersianDigits(row.bust)}</td>
              <td className="px-3 py-2.5">{toPersianDigits(row.waist)}</td>
              <td className="px-3 py-2.5">{toPersianDigits(row.hips)}</td>
              {hasLength ? <td className="px-3 py-2.5">{row.length !== undefined ? toPersianDigits(row.length) : "—"}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
