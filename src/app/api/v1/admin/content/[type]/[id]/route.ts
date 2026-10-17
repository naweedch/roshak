import { z } from "zod";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { CONTENT_TYPES, contentTypeOf } from "@/server/services/admin/content-registry";

export const PATCH = route<{ type: string; id: string }>({ auth: "staff", permission: "content:write" }, async (ctx) => {
  const def = CONTENT_TYPES[contentTypeOf(ctx.params.type)];
  await def.save(parseId(ctx.params.id), await ctx.body(z.unknown()), actorFrom(ctx));
  return { ok: true };
});

export const DELETE = route<{ type: string; id: string }>({ auth: "staff", permission: "content:write" }, async (ctx) => {
  await CONTENT_TYPES[contentTypeOf(ctx.params.type)].remove(parseId(ctx.params.id), actorFrom(ctx));
  return { ok: true };
});
