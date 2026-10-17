/**
 * خواندن آخرین پست‌های اینستاگرام از Instagram Graph API.
 * فقط با تنظیم INSTAGRAM_ACCESS_TOKEN فعال است؛ در صورت خطا یا نبود توکن، فهرست خالی برمی‌گرداند
 * (بخش اینستاگرام در این حالت فقط پیوند صفحه را نشان می‌دهد).
 */
import "server-only";
import { logger } from "../logger";

export interface InstagramMedia {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string | null;
}

export async function fetchInstagramMedia(limit = 6): Promise<InstagramMedia[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];
  try {
    const url = new URL("https://graph.instagram.com/me/media");
    url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink");
    url.searchParams.set("limit", String(limit * 2));
    url.searchParams.set("access_token", token);
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) {
      logger.warn("instagram_fetch_failed", { status: response.status });
      return [];
    }
    const json = (await response.json()) as {
      data?: Array<{ id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string }>;
    };
    return (json.data ?? [])
      .map((m) => ({
        id: m.id,
        imageUrl: m.media_type === "VIDEO" ? (m.thumbnail_url ?? "") : (m.media_url ?? ""),
        permalink: m.permalink,
        caption: m.caption ?? null,
      }))
      .filter((m) => m.imageUrl.startsWith("https://") && m.permalink.startsWith("https://www.instagram.com/"))
      .slice(0, limit);
  } catch (error) {
    logger.warn("instagram_fetch_error", { error });
    return [];
  }
}
