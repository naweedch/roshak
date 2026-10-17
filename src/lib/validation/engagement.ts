import { z } from "zod";
import { emailSchema, mobileSchema, optionalText, text, uuidSchema } from "./common";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, { error: "امتیاز را انتخاب کنید" }).max(5),
  title: optionalText(120, "عنوان نظر"),
  body: text(10, 2000, "متن نظر"),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  source: z.string().max(40).optional().default("footer"),
  consent: z.literal(true, { error: "برای عضویت، دریافت ایمیل را تأیید کنید" }),
});

export const contactSchema = z.object({
  name: text(2, 100, "نام"),
  email: emailSchema,
  phone: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined))
    .pipe(mobileSchema.optional()),
  subject: text(3, 150, "موضوع"),
  message: text(10, 3000, "پیام"),
});

export const cartAddSchema = z.object({
  variantId: uuidSchema,
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

export const cartUpdateSchema = z.object({
  quantity: z.coerce.number().int().min(0).max(10),
});

export const discountCodeSchema = z.object({
  code: z.string().trim().min(2, { error: "کد تخفیف را وارد کنید" }).max(40),
});

export const wishlistSchema = z.object({ productId: uuidSchema });
