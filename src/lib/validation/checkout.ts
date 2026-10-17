import { z } from "zod";
import { IRAN_PROVINCES } from "../iran";
import { emailSchema, mobileSchema, optionalText, postalCodeSchema, text } from "./common";

export const addressSchema = z.object({
  recipientName: text(2, 120, "نام تحویل‌گیرنده"),
  phone: mobileSchema,
  province: z.enum(IRAN_PROVINCES, { error: "استان را انتخاب کنید" }),
  city: text(2, 80, "شهر"),
  addressLine: text(10, 400, "نشانی"),
  postalCode: postalCodeSchema,
});
export type AddressInput = z.input<typeof addressSchema>;

export const savedAddressSchema = addressSchema.extend({
  label: optionalText(40, "عنوان آدرس"),
  isDefault: z.boolean().optional().default(false),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.uuid({ error: "شناسهٔ درخواست نامعتبر است" }),
  contact: z.object({
    firstName: text(1, 60, "نام"),
    lastName: text(1, 80, "نام خانوادگی"),
    email: emailSchema,
    phone: mobileSchema,
  }),
  shippingAddress: addressSchema,
  shippingMethodId: z.uuid({ error: "روش ارسال را انتخاب کنید" }),
  paymentProvider: z.enum(["TEST", "ZARINPAL"], { error: "روش پرداخت را انتخاب کنید" }),
  customerNote: optionalText(500, "توضیحات سفارش"),
  saveAddress: z.boolean().optional().default(false),
  acceptTerms: z.literal(true, { error: "پذیرش قوانین و شرایط خرید الزامی است" }),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const orderLookupSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^RSK-\d{6}-[0-9A-Z]{5}$/, { error: "شمارهٔ سفارش معتبر نیست (مثال: RSK-251016-7K4QZ)" }),
  email: emailSchema,
});
