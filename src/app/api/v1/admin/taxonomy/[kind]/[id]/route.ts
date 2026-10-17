import { z } from "zod";
import { categorySchema, collectionSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom, parseId } from "@/server/http/admin";
import { errors } from "@/server/errors";
import { deleteCategory, deleteCollection, reorderCollectionProducts, saveCategory, saveCollection } from "@/server/services/admin/catalog-admin";

function kindOf(value: string) {
  if (value !== "categories" && value !== "collections") throw errors.notFound();
  return value;
}

export const PATCH = route<{ kind: string; id: string }>({ auth: "staff", permission: "catalog:taxonomy" }, async (ctx) => {
  const id = parseId(ctx.params.id);
  const actor = actorFrom(ctx);
  if (kindOf(ctx.params.kind) === "categories") await saveCategory(id, await ctx.body(categorySchema), actor);
  else await saveCollection(id, await ctx.body(collectionSchema), actor);
  return { ok: true };
});

export const DELETE = route<{ kind: string; id: string }>({ auth: "staff", permission: "catalog:taxonomy" }, async (ctx) => {
  const id = parseId(ctx.params.id);
  if (kindOf(ctx.params.kind) === "categories") await deleteCategory(id, actorFrom(ctx));
  else await deleteCollection(id, actorFrom(ctx));
  return { ok: true };
});

/** ترتیب محصولات داخل مجموعه */
export const PUT = route<{ kind: string; id: string }>({ auth: "staff", permission: "catalog:taxonomy" }, async (ctx) => {
  if (kindOf(ctx.params.kind) !== "collections") throw errors.notFound();
  const { productIds } = await ctx.body(z.object({ productIds: z.array(z.uuid()).max(500) }));
  await reorderCollectionProducts(parseId(ctx.params.id), productIds, actorFrom(ctx));
  return { ok: true };
});
