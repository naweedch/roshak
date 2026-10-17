import { z } from "zod";
import { route } from "@/server/http/handler";
import { errors } from "@/server/errors";
import { ORDER_ACCESS_COOKIE, orderAccessFromCookie } from "@/server/http/cookies";
import { getOrderForCustomer } from "@/server/services/orders";

/**
 * جزئیات سفارش. دسترسی فقط برای صاحب سفارش (کاربر واردشده) یا دارندهٔ توکن دسترسی مهمان.
 * برای سفارش دیگران پاسخ ۴۰۴ است (وجود سفارش لو نمی‌رود).
 */
export const GET = route<{ orderNumber: string }>({ auth: "optional-customer" }, async (ctx) => {
  const orderNumber = ctx.params.orderNumber.toUpperCase().slice(0, 32);
  const { key } = ctx.query(z.object({ key: z.string().max(200).optional() }));
  const order = await getOrderForCustomer(orderNumber, {
    userId: ctx.customer?.user.id,
    accessToken: key ?? orderAccessFromCookie(ctx.cookies.get(ORDER_ACCESS_COOKIE), orderNumber),
  });
  if (!order) throw errors.notFound("سفارش یافت نشد");
  return order;
});
