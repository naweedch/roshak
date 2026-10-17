import fs from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { assertSafeKey, localStorageRoot } from "@/server/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
};

/**
 * سرو فایل‌های رسانهٔ ذخیره‌شده در درایور محلی (در حالت S3 از CDN/باکت سرو می‌شوند).
 * کلید فایل اعتبارسنجی می‌شود تا دسترسی به خارج از پوشهٔ رسانه (path traversal) ممکن نباشد.
 */
export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  await connection();
  const { key: segments } = await context.params;
  const key = segments.join("/");
  try {
    assertSafeKey(key);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const root = localStorageRoot();
  const file = path.resolve(/*turbopackIgnore: true*/ root, key);
  if (!file.startsWith(root + path.sep)) return new Response("Not found", { status: 404 });
  const type = CONTENT_TYPES[path.extname(file).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": type,
        "content-length": String(data.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
