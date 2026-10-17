import { noteSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { addCustomerNote } from "@/server/services/admin/customers";

export const POST = route<{ id: string }>({ auth: "staff", permission: "customer:write", status: 201 }, async (ctx) => {
  const { note } = await ctx.body(noteSchema);
  await addCustomerNote(parseId(ctx.params.id), note, actorFrom(ctx));
  return { ok: true };
});
