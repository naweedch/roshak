/** ساختار نمایش سبد خرید (همهٔ مبالغ رشتهٔ اعشاری و محاسبه‌شده در سرور) */
export type CartItemIssue = "UNAVAILABLE" | "INSUFFICIENT_STOCK" | null;

export interface CartItemView {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image: { url: string; alt: string; width: number; height: number } | null;
  colorName: string;
  colorHex: string;
  sizeLabel: string;
  sku: string;
  unitPrice: string;
  compareAtPrice: string | null;
  quantity: number;
  lineTotal: string;
  maxQuantity: number;
  issue: CartItemIssue;
}

export interface CartView {
  currency: string;
  items: CartItemView[];
  itemCount: number;
  subtotal: string;
  discountCode: string | null;
  discountTotal: string;
  discountMessage: string | null;
  freeShipping: boolean;
  freeShippingThreshold: string | null;
  amountToFreeShipping: string | null;
  taxRate: string;
  pricesIncludeTax: boolean;
  taxTotal: string;
  /** جمع کل بدون هزینهٔ ارسال (هزینهٔ ارسال در مرحلهٔ تسویه مشخص می‌شود) */
  total: string;
  hasIssues: boolean;
}
