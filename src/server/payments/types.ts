/** قرارداد مشترک ارائه‌دهندگان پرداخت */
import type { PaymentProvider } from "@/generated/prisma/enums";

export interface CreatePaymentInput {
  paymentId: string;
  orderNumber: string;
  /** مبلغ به ارز فروشگاه (رشتهٔ اعشاری) */
  amount: string;
  currency: string;
  callbackUrl: string;
  description: string;
  email?: string;
  mobile?: string;
}

export interface CreatePaymentResult {
  /** شناسهٔ تراکنش نزد درگاه */
  reference: string;
  /** آدرسی که مرورگر کاربر باید به آن هدایت شود */
  redirectUrl: string;
}

export interface VerifyPaymentInput {
  reference: string;
  amount: string;
  currency: string;
  /** پارامترهای بازگشتی درگاه؛ فقط به‌عنوان سرنخ استفاده می‌شوند، نه منبع حقیقت */
  callbackParams?: URLSearchParams;
}

export type VerifyPaymentResult =
  | { status: "SUCCEEDED"; transactionId: string; cardPanMasked?: string }
  | { status: "FAILED"; reason: string }
  | { status: "PENDING" };

export interface PaymentProviderAdapter {
  readonly id: PaymentProvider;
  readonly label: string;
  /** آیا با پیکربندی فعلی قابل استفاده است؟ */
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  /** تأیید سمت سرور از منبع معتبر درگاه (API تأیید یا پایگاه دادهٔ درگاه آزمایشی) */
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
