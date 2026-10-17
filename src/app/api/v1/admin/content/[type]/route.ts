import { z } from "zod";
import { route } from "@/server/http/handler";
import { actorFrom } from "@/server/http/admin";
import { CONTENT_TYPES, contentTypeOf } from "@/server/services/admin/content-registry";

/** فهرست و ایجاد محتوای مدیریت‌پذیر: banners | announcements | pages | articles | faq */
export const GET = route<{ type: string }>({ auth: "staff", permission: "content:write" }, async (ctx) => ({ items: await CONTENT_TYPES[contentTypeOf(ctx.params.type)].list() }));

export const POST = route<{ type: string }>({ auth: "staff", permission: "content:write", status: 201 }, async (ctx) => {
  const def = CONTENT_TYPES[contentTypeOf(ctx.params.type)];
  const row = await def.save(null, await ctx.body(z.unknown()), actorFrom(ctx));
  return { id: row.id };
});
