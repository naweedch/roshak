import { categorySchema, collectionSchema } from "@/lib/validation/admin";
import { route } from "@/server/http/handler";
import { actorFrom } from "@/server/http/admin";
import { errors } from "@/server/errors";
import { listCategoriesAdmin, listCollectionsAdmin, saveCategory, saveCollection } from "@/server/services/admin/catalog-admin";

type Kind = "categories" | "collections";
function kindOf(value: string): Kind {
  if (value !== "categories" && value !== "collections") throw errors.notFound();
  return value;
}

/** فهرست/ایجاد دسته‌ها و مجموعه‌ها */
export const GET = route<{ kind: string }>({ auth: "staff", permission: "product:read" }, async (ctx) =>
  kindOf(ctx.params.kind) === "categories" ? { items: await listCategoriesAdmin() } : { items: await listCollectionsAdmin() },
);

export const POST = route<{ kind: string }>({ auth: "staff", permission: "catalog:taxonomy", status: 201 }, async (ctx) => {
  const actor = actorFrom(ctx);
  if (kindOf(ctx.params.kind) === "categories") {
    const row = await saveCategory(null, await ctx.body(categorySchema), actor);
    return { id: row.id };
  }
  const row = await saveCollection(null, await ctx.body(collectionSchema), actor);
  return { id: row.id };
});
