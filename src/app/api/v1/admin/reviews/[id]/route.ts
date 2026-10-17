import { reviewModerationSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { moderateReview } from "@/server/services/admin/content-admin";

export const PATCH = route<{ id: string }>({ auth: "staff", permission: "review:moderate" }, async (ctx) => {
  await moderateReview(parseId(ctx.params.id), await ctx.body(reviewModerationSchema), actorFrom(ctx));
  return { ok: true };
});
