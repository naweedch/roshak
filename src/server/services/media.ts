/**
 * بارگذاری امن تصویر:
 *  - سقف حجم ۸ مگابایت؛
 *  - نوع فایل از روی محتوای واقعی (نه پسوند یا هدر) با sharp تشخیص داده می‌شود؛ فقط JPEG/PNG/WebP/AVIF؛
 *  - SVG و فرمت‌های اجرایی رد می‌شوند؛
 *  - تصویر بازسازی می‌شود (چرخش EXIF، حذف متادیتا، حداکثر ۲۴۰۰ پیکسل، خروجی WebP)
 *    بنابراین هیچ بایت دلخواهی از فایل کاربر مستقیماً منتشر نمی‌شود.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import sharp, { type Metadata as SharpMetadata } from "sharp";
import { db } from "../db";
import { errors } from "../errors";
import { getStorage } from "../storage";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
const MAX_DIMENSION = 2400;
const MAX_INPUT_PIXELS = 50_000_000;

export interface ProcessedImage {
  id: string;
  url: string;
  storageKey: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function processAndStoreImage(
  input: Buffer,
  options: { folder: "products" | "content" | "collections"; alt?: string; uploadedById?: string | null },
): Promise<ProcessedImage> {
  if (input.byteLength === 0) throw errors.badRequest("فایل خالی است");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw errors.payloadTooLarge("حداکثر حجم تصویر ۸ مگابایت است");

  let metadata: SharpMetadata;
  try {
    metadata = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw errors.unsupportedMedia("فایل تصویر معتبر نیست");
  }
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw errors.unsupportedMedia("فقط تصاویر JPEG، PNG، WebP و AVIF پذیرفته می‌شوند");
  }

  const output = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });

  const now = new Date();
  const key = `${options.folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.webp`;
  const stored = await getStorage().put(key, output.data, "image/webp");

  const asset = await db.mediaAsset.create({
    data: {
      storageKey: stored.key,
      url: stored.url,
      mimeType: "image/webp",
      sizeBytes: output.data.byteLength,
      width: output.info.width,
      height: output.info.height,
      alt: options.alt,
      uploadedById: options.uploadedById ?? null,
    },
  });

  return {
    id: asset.id,
    url: asset.url,
    storageKey: asset.storageKey,
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
  };
}
