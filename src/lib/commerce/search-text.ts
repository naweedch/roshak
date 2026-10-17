import { normalizeSearchText } from "../persian";

/**
 * متن جست‌وجوی محصول: نام، زیرعنوان، توضیحات، پارچه، دسته، مجموعه‌ها، رنگ‌ها و سایزها.
 * این متن یکسان‌سازی‌شده در ستون Product.searchText ذخیره و با tsvector جست‌وجو می‌شود.
 */
export function buildProductSearchText(input: {
  name: string;
  subtitle?: string | null;
  description?: string | null;
  fabric?: string | null;
  sku?: string[];
  categoryName?: string | null;
  collectionNames?: string[];
  colorNames?: string[];
  sizeLabels?: string[];
}): string {
  return normalizeSearchText(
    [
      input.name,
      input.subtitle,
      input.categoryName,
      ...(input.collectionNames ?? []),
      ...(input.colorNames ?? []),
      ...(input.sizeLabels ?? []),
      input.fabric,
      ...(input.sku ?? []),
      input.description?.slice(0, 2000),
    ]
      .filter(Boolean)
      .join(" "),
  ).slice(0, 6000);
}
