import { noteSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { addOrderNote } from "@/server/services/orders";

export const POST = route<{ id: string }>({ auth: "staff", permission: "order:write", status: 201 }, async (ctx) => {
  const { note } = await ctx.body(noteSchema);
  await addOrderNote(parseId(ctx.params.id), note, actorFrom(ctx));
  return { ok: true };
});
