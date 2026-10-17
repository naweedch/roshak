"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

/** اشتراک‌گذاری با Web Share API و در صورت نبود آن، کپی پیوند */
export function ShareButton({ title, url }: { title: string; url: string }) {
  async function share() {
    const shareUrl = new URL(url, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("پیوند محصول کپی شد");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("اشتراک‌گذاری ممکن نشد");
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="grid size-12 place-items-center rounded-full border border-burgundy/30 text-burgundy transition-colors hover:border-burgundy"
      aria-label="اشتراک‌گذاری این محصول"
    >
      <Share2 className="size-5" />
    </button>
  );
}
