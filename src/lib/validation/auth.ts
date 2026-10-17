import { z } from "zod";
import { emailSchema, mobileSchema, passwordSchema, text } from "./common";

export const registerSchema = z.object({
  firstName: text(1, 60, "نام"),
  lastName: text(1, 80, "نام خانوادگی"),
  email: emailSchema,
  phone: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v : undefined))
    .pipe(mobileSchema.optional()),
  password: passwordSchema,
  marketingOptIn: z.boolean().optional().default(false),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "رمز عبور الزامی است" }).max(128),
});
export type LoginInput = z.input<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: "رمز فعلی الزامی است" }).max(128),
  newPassword: passwordSchema,
});

export const profileSchema = z.object({
  firstName: text(1, 60, "نام"),
  lastName: text(1, 80, "نام خانوادگی"),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v : undefined))
    .pipe(mobileSchema.optional()),
  marketingOptIn: z.boolean(),
});
