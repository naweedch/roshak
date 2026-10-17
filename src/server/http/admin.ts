/** ابزار مشترک مسیرهای API مدیریت */
import "server-only";
import type { Role } from "@/generated/prisma/enums";
import { errors } from "../errors";
import { MAX_UPLOAD_BYTES } from "../services/media";
import type { Actor } from "../services/admin/products";
import type { ApiContext } from "./handler";

export function actorFrom<P>(ctx: ApiContext<P>): Actor & { role: Role } {
  const staff = ctx.requireStaff();
  return { id: staff.user.id, email: staff.user.email, role: staff.user.role, ipAddress: ctx.ip, userAgent: ctx.userAgent };
}

/** خواندن فایل از فرم multipart با سقف حجم */
export async function readUpload<P>(ctx: ApiContext<P>, field = "file"): Promise<{ buffer: Buffer; form: FormData }> {
  const declared = Number(ctx.request.headers.get("content-length") ?? 0);
  if (declared > MAX_UPLOAD_BYTES + 64 * 1024) throw errors.payloadTooLarge("حداکثر حجم تصویر ۸ مگابایت است");
  if (!(ctx.request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) throw errors.unsupportedMedia("فایل باید به‌صورت multipart ارسال شود");
  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    throw errors.badRequest("فرم ارسال فایل نامعتبر است");
  }
  const file = form.get(field);
  if (!(file instanceof File)) throw errors.validation({ [field]: "فایلی انتخاب نشده است" });
  if (file.size > MAX_UPLOAD_BYTES) throw errors.payloadTooLarge("حداکثر حجم تصویر ۸ مگابایت است");
  return { buffer: Buffer.from(await file.arrayBuffer()), form };
}

export function parseId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw errors.notFound();
  return value;
}
