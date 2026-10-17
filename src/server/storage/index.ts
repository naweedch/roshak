/**
 * لایهٔ انتزاعی ذخیره‌سازی رسانه.
 * - local: فایل‌ها در LOCAL_STORAGE_DIR ذخیره و از مسیر ‎/media/…‎ با کش بلندمدت سرو می‌شوند.
 * - s3: هر سرویس سازگار با S3 (AWS، MinIO، ابر آروان، Liara Object Storage و ...).
 * - blob: Vercel Blob (برای استقرار روی Vercel که فایل‌سیستم آن فقط‌خواندنی است؛ توکن BLOB_READ_WRITE_TOKEN).
 */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../env";

export interface StoredObject {
  key: string;
  url: string;
}

export interface StorageDriver {
  readonly name: "local" | "s3" | "blob";
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

/** کلید امن: فقط حروف لاتین کوچک، عدد، خط تیره، نقطه و اسلش؛ بدون «..» */
export function assertSafeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9/_.-]{0,200}$/.test(key) || key.includes("..") || key.includes("//")) {
    throw new Error("کلید فایل نامعتبر است");
  }
}

/**
 * ریشهٔ ذخیره‌سازی محلی در زمان اجرا تعیین می‌شود؛ turbopackIgnore مانع می‌شود که ابزار ساخت
 * کل پروژه را (به‌دلیل مسیر پویا) در خروجی standalone ردیابی و کپی کند.
 */
export function localStorageRoot(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.LOCAL_STORAGE_DIR ?? "./storage");
}

class LocalStorageDriver implements StorageDriver {
  readonly name = "local" as const;

  async put(key: string, body: Buffer): Promise<StoredObject> {
    assertSafeKey(key);
    const file = path.join(/*turbopackIgnore: true*/ localStorageRoot(), key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    return { key, url: `/media/${key}` };
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    await fs.rm(path.join(/*turbopackIgnore: true*/ localStorageRoot(), key), { force: true });
  }
}

class S3StorageDriver implements StorageDriver {
  readonly name = "s3" as const;
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null = null;

  private async client() {
    this.clientPromise ??= (async () => {
      const e = env();
      const { S3Client } = await import("@aws-sdk/client-s3");
      return new S3Client({
        region: e.S3_REGION,
        endpoint: e.S3_ENDPOINT,
        forcePathStyle: e.S3_FORCE_PATH_STYLE,
        credentials: { accessKeyId: e.S3_ACCESS_KEY_ID ?? "", secretAccessKey: e.S3_SECRET_ACCESS_KEY ?? "" },
      });
    })();
    return this.clientPromise;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    assertSafeKey(key);
    const e = env();
    if (!e.S3_BUCKET || !e.S3_PUBLIC_URL) throw new Error("S3_BUCKET و S3_PUBLIC_URL تنظیم نشده‌اند");
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(
      new PutObjectCommand({
        Bucket: e.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return { key, url: `${e.S3_PUBLIC_URL.replace(/\/+$/, "")}/${key}` };
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const e = env();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    await (await this.client()).send(new DeleteObjectCommand({ Bucket: e.S3_BUCKET, Key: key }));
  }
}

class BlobStorageDriver implements StorageDriver {
  readonly name = "blob" as const;

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    assertSafeKey(key);
    const { put } = await import("@vercel/blob");
    const blob = await put(key, body, { access: "public", contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 });
    return { key, url: blob.url };
  }

  async delete(key: string): Promise<void> {
    assertSafeKey(key);
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}

let driver: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  driver ??=
    process.env.STORAGE_DRIVER === "s3" ? new S3StorageDriver() : process.env.STORAGE_DRIVER === "blob" ? new BlobStorageDriver() : new LocalStorageDriver();
  return driver;
}
