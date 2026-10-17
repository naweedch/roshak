import { route } from "@/server/http/handler";
import { getCategories, getCollections } from "@/server/queries/public";

/** فهرست مجموعه‌ها و دسته‌های قابل نمایش */
export const GET = route({ cache: "public-short" }, async () => {
  const [collections, categories] = await Promise.all([getCollections(), getCategories()]);
  return { collections, categories };
});
