/**
 * ثبت سفارش از روی سبد خرید.
 *
 * تضمین‌ها:
 *  - قیمت، تخفیف، هزینهٔ ارسال و مالیات فقط در سرور و از دیتابیس محاسبه می‌شوند.
 *  - همه‌چیز در یک تراکنش: ایجاد سفارش، کسر اتمی موجودی، مصرف کد تخفیف، ایجاد پرداخت و خالی کردن سبد.
 *  - کلید idempotency از ثبت دوبارهٔ سفارش با کلیک یا ارسال مجدد جلوگیری می‌کند.
 *  - موجودی تا پایان مهلت پرداخت رزرو می‌ماند و در صورت عدم پرداخت به انبار برمی‌گردد.
 */
import "server-only";
import { computeTotals, DISCOUNT_REJECTION_MESSAGES, effectivePrice } from "@/lib/commerce/pricing";
import { moneyString, toDecimal } from "@/lib/money";
import type { CheckoutData } from "@/lib/validation/checkout";
import { db } from "../db";
import { errors, isUniqueViolation } from "../errors";
import { generateToken, hashToken } from "../auth/tokens";
import { initiatePayment } from "./payment-flow";
import { invalidate, TAGS } from "../cache";
import { availablePaymentProviders } from "../payments";
import { lineAvailability, lineImage, loadCartLines } from "./cart";
import { lookupDiscount } from "./discounts";
import { reserveStock } from "./inventory";
import { generateOrderNumber } from "./order-number";
import { confirmPaidOrder } from "./orders";
import { loadStoreSettings } from "./settings";

export interface CheckoutActor {
  userId: string | null;
  guestCartToken: string | null;
}

export interface CheckoutResult {
  orderNumber: string;
  /** آدرس هدایت به درگاه؛ اگر null باشد سفارش بدون نیاز به پرداخت تأیید شده یا ایجاد پرداخت ناموفق بوده است */
  redirectUrl: string | null;
  /** توکن دسترسی مهمان به صفحهٔ سفارش (فقط یک‌بار برگردانده می‌شود) */
  accessToken: string | null;
  paid: boolean;
  paymentInitError: string | null;
  duplicate: boolean;
}

export async function placeOrder(input: CheckoutData, actor: CheckoutActor): Promise<CheckoutResult> {
  // ۱. درخواست تکراری با همان کلید
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    const sameOwner = actor.userId ? existing.userId === actor.userId : existing.email === input.contact.email;
    if (!sameOwner) throw errors.conflict("این درخواست قبلاً ثبت شده است");
    return {
      orderNumber: existing.orderNumber,
      redirectUrl: null,
      accessToken: null,
      paid: existing.paymentStatus === "PAID",
      paymentInitError: null,
      duplicate: true,
    };
  }

  // ۲. یافتن سبد
  const cart = actor.userId
    ? await db.cart.findUnique({ where: { userId: actor.userId } })
    : actor.guestCartToken
      ? await db.cart.findUnique({ where: { tokenHash: hashToken(actor.guestCartToken) } })
      : null;
  if (!cart) throw errors.badRequest("سبد خرید شما خالی است");

  const settings = await loadStoreSettings();
  const provider = availablePaymentProviders(settings.enabledPaymentProviders).find((p) => p.id === input.paymentProvider);
  if (!provider) throw errors.validation({ paymentProvider: "این روش پرداخت در حال حاضر در دسترس نیست" });

  const accessToken = generateToken();
  let attempt = 0;

  while (true) {
    attempt += 1;
    try {
      const created = await db.$transaction(
        async (tx) => {
          const lines = await loadCartLines(cart.id, tx);
          if (lines.length === 0) throw errors.badRequest("سبد خرید شما خالی است");

          for (const line of lines) {
            const max = lineAvailability(line, settings.currency);
            if (max === 0) throw errors.outOfStock(`«${line.variant.product.name}» دیگر موجود نیست؛ آن را از سبد حذف کنید`);
            if (line.quantity > max) throw errors.outOfStock(`از «${line.variant.product.name}» فقط ${max} عدد موجود است`);
          }

          const shippingMethod = await tx.shippingMethod.findFirst({ where: { id: input.shippingMethodId, isActive: true } });
          if (!shippingMethod || shippingMethod.currency !== settings.currency) {
            throw errors.validation({ shippingMethodId: "روش ارسال انتخاب‌شده در دسترس نیست" });
          }

          let discountId: string | null = null;
          let pricingDiscount = null;
          if (cart.discountCode) {
            // قفل ردیف تخفیف تا بررسی سقف استفاده و ثبت مصرف، هم‌زمان با سفارش دیگری تداخل نکند
            await tx.$queryRaw`SELECT "id" FROM "Discount" WHERE "code" = ${cart.discountCode} FOR UPDATE`;
            const lookup = await lookupDiscount(cart.discountCode, { userId: actor.userId, email: input.contact.email }, tx);
            if (!lookup.ok) throw errors.conflict(`کد تخفیف «${cart.discountCode}» قابل استفاده نیست: ${lookup.reason}`);
            discountId = lookup.id;
            pricingDiscount = lookup.discount;
          }

          const totals = computeTotals({
            currency: settings.currency,
            lines: lines.map((line) => ({
              key: line.id,
              productId: line.variant.product.id,
              collectionIds: line.variant.product.collections.map((c) => c.collectionId),
              unitPrice: effectivePrice(line.variant.product.price, line.variant.product.salePrice),
              quantity: line.quantity,
            })),
            discount: pricingDiscount,
            shipping: { price: shippingMethod.price.toString(), freeShippingEligible: shippingMethod.freeShippingEligible },
            freeShippingThreshold: settings.freeShippingThreshold,
            tax: { rate: settings.taxRate, pricesIncludeTax: settings.pricesIncludeTax },
          });
          if (totals.discountRejection) throw errors.conflict(DISCOUNT_REJECTION_MESSAGES[totals.discountRejection]);

          const pricedByKey = new Map(totals.lines.map((l) => [l.key, l]));
          const needsPayment = totals.grandTotal.gt(0);
          const reservationExpiresAt = new Date(Date.now() + settings.reservationMinutes * 60 * 1000);

          const order = await tx.order.create({
            data: {
              orderNumber: generateOrderNumber(),
              userId: actor.userId,
              email: input.contact.email,
              phone: input.contact.phone,
              customerName: `${input.contact.firstName} ${input.contact.lastName}`,
              currency: settings.currency,
              subtotal: moneyString(totals.subtotal),
              discountTotal: moneyString(totals.discountTotal),
              shippingTotal: moneyString(totals.shippingTotal),
              taxTotal: moneyString(totals.taxTotal),
              grandTotal: moneyString(totals.grandTotal),
              taxRate: settings.taxRate,
              pricesIncludeTax: settings.pricesIncludeTax,
              discountCode: pricingDiscount ? cart.discountCode : null,
              shippingMethodId: shippingMethod.id,
              shippingMethodName: shippingMethod.name,
              shipRecipientName: input.shippingAddress.recipientName,
              shipPhone: input.shippingAddress.phone,
              shipProvince: input.shippingAddress.province,
              shipCity: input.shippingAddress.city,
              shipAddressLine: input.shippingAddress.addressLine,
              shipPostalCode: input.shippingAddress.postalCode,
              customerNote: input.customerNote,
              idempotencyKey: input.idempotencyKey,
              accessTokenHash: hashToken(accessToken),
              reservationExpiresAt: needsPayment ? reservationExpiresAt : null,
              items: {
                create: lines.map((line) => {
                  const priced = pricedByKey.get(line.id)!;
                  return {
                    productId: line.variant.product.id,
                    variantId: line.variantId,
                    productName: line.variant.product.name,
                    productSlug: line.variant.product.slug,
                    sku: line.variant.sku,
                    colorName: line.variant.color.name,
                    sizeLabel: line.variant.size.label,
                    imageUrl: lineImage(line)?.url ?? null,
                    unitPrice: moneyString(priced.unitPrice),
                    quantity: line.quantity,
                    lineTotal: moneyString(priced.lineTotal),
                    discountAmount: moneyString(priced.discountAmount),
                  };
                }),
              },
              events: {
                create: { type: "CREATED", toStatus: "PENDING_PAYMENT", message: "سفارش ثبت شد و در انتظار پرداخت است" },
              },
            },
          });

          for (const line of lines) {
            await reserveStock(tx, line.variantId, line.quantity, order.id, line.variant.product.name);
          }

          if (discountId && totals.discountApplied) {
            const updated = await tx.$executeRaw`
              UPDATE "Discount" SET "usageCount" = "usageCount" + 1, "updatedAt" = now()
              WHERE "id" = ${discountId}::uuid AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;
            if (updated !== 1) throw errors.conflict("ظرفیت این کد تخفیف همین الان تکمیل شد");
            await tx.discountRedemption.create({
              data: {
                discountId,
                orderId: order.id,
                userId: actor.userId,
                email: input.contact.email,
                amount: moneyString(totals.discountTotal),
              },
            });
          }

          let paymentId: string | null = null;
          if (needsPayment) {
            const payment = await tx.payment.create({
              data: {
                orderId: order.id,
                provider: input.paymentProvider,
                amount: moneyString(totals.grandTotal),
                currency: settings.currency,
                expiresAt: reservationExpiresAt,
              },
            });
            paymentId = payment.id;
          }

          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          await tx.cart.update({ where: { id: cart.id }, data: { discountCode: null } });

          if (actor.userId && input.saveAddress) {
            const duplicate = await tx.address.findFirst({
              where: { userId: actor.userId, postalCode: input.shippingAddress.postalCode, addressLine: input.shippingAddress.addressLine },
            });
            if (!duplicate) {
              const hasDefault = await tx.address.count({ where: { userId: actor.userId, isDefault: true } });
              await tx.address.create({ data: { ...input.shippingAddress, userId: actor.userId, isDefault: hasDefault === 0 } });
            }
          }

          return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentId,
            productSlugs: lines.map((l) => l.variant.product.slug),
          };
        },
        { timeout: 20_000, maxWait: 10_000 },
      );

      invalidate(TAGS.catalog, ...created.productSlugs.map((s) => TAGS.product(s)));

      if (!created.paymentId) {
        await confirmPaidOrder(created.orderId, null);
        return { orderNumber: created.orderNumber, redirectUrl: null, accessToken, paid: true, paymentInitError: null, duplicate: false };
      }

      const init = await initiatePayment(created.paymentId);
      return {
        orderNumber: created.orderNumber,
        redirectUrl: init.redirectUrl,
        accessToken,
        paid: false,
        paymentInitError: init.error,
        duplicate: false,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const target = JSON.stringify((error as { meta?: unknown }).meta ?? "");
        if (target.includes("idempotencyKey")) {
          const order = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
          if (order) {
            return { orderNumber: order.orderNumber, redirectUrl: null, accessToken: null, paid: order.paymentStatus === "PAID", paymentInitError: null, duplicate: true };
          }
        }
        if (attempt < 3) continue; // برخورد نادر شمارهٔ سفارش
      }
      throw error;
    }
  }
}

/** پیش‌نمایش مبلغ نهایی برای فرم تسویه (روش ارسال انتخاب‌شده) — بدون هیچ تغییری در دیتابیس */
export async function quoteCheckout(actor: CheckoutActor & { email?: string | null }, shippingMethodId: string | null) {
  const cart = actor.userId
    ? await db.cart.findUnique({ where: { userId: actor.userId } })
    : actor.guestCartToken
      ? await db.cart.findUnique({ where: { tokenHash: hashToken(actor.guestCartToken) } })
      : null;
  const settings = await loadStoreSettings();
  const lines = cart ? await loadCartLines(cart.id) : [];
  const shippingMethod = shippingMethodId ? await db.shippingMethod.findFirst({ where: { id: shippingMethodId, isActive: true } }) : null;

  let discount = null;
  let discountMessage: string | null = null;
  if (cart?.discountCode) {
    const lookup = await lookupDiscount(cart.discountCode, { userId: actor.userId, email: actor.email });
    if (lookup.ok) discount = lookup.discount;
    else discountMessage = lookup.reason;
  }

  const available = lines.filter((l) => lineAvailability(l, settings.currency) >= l.quantity);
  const totals = computeTotals({
    currency: settings.currency,
    lines: available.map((line) => ({
      key: line.id,
      productId: line.variant.product.id,
      collectionIds: line.variant.product.collections.map((c) => c.collectionId),
      unitPrice: effectivePrice(line.variant.product.price, line.variant.product.salePrice),
      quantity: line.quantity,
    })),
    discount,
    shipping: shippingMethod ? { price: shippingMethod.price.toString(), freeShippingEligible: shippingMethod.freeShippingEligible } : null,
    freeShippingThreshold: settings.freeShippingThreshold,
    tax: { rate: settings.taxRate, pricesIncludeTax: settings.pricesIncludeTax },
  });
  if (totals.discountRejection) discountMessage = DISCOUNT_REJECTION_MESSAGES[totals.discountRejection];

  return {
    currency: settings.currency,
    itemCount: available.reduce((acc, l) => acc + l.quantity, 0),
    hasUnavailableItems: available.length !== lines.length,
    subtotal: moneyString(totals.subtotal),
    discountCode: cart?.discountCode ?? null,
    discountTotal: moneyString(totals.discountTotal),
    discountMessage,
    shippingTotal: moneyString(totals.shippingTotal),
    shippingPending: totals.shippingPending,
    freeShipping: totals.freeShipping,
    taxTotal: moneyString(totals.taxTotal),
    taxRate: settings.taxRate,
    pricesIncludeTax: settings.pricesIncludeTax,
    grandTotal: moneyString(totals.grandTotal),
    isZero: toDecimal(totals.grandTotal).lte(0),
  };
}
