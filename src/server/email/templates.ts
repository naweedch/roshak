/**
 * قالب‌های ایمیل تراکنشی (HTML راست‌به‌چپ + متن ساده).
 * همهٔ مقادیر پویا escape می‌شوند.
 */
import "server-only";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface LayoutInput {
  preheader: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
  rows?: Array<[string, string]>;
}

function layout(input: LayoutInput): { html: string; text: string } {
  const rows = input.rows?.length
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:16px 0">${input.rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 0;color:#6b5b5f;border-bottom:1px solid #eadfd3">${escapeHtml(k)}</td><td style="padding:8px 0;text-align:left;color:#242124;border-bottom:1px solid #eadfd3">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const action = input.action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(input.action.url)}" style="background:#641E32;color:#FFF8EF;text-decoration:none;padding:14px 28px;border-radius:999px;display:inline-block;font-weight:600">${escapeHtml(input.action.label)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(input.heading)}</title></head>
<body style="margin:0;background:#FFF8EF;font-family:Vazirmatn,Tahoma,sans-serif;color:#242124;direction:rtl">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(input.preheader)}</span>
<table role="presentation" width="100%" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;border:1px solid #eadfd3;padding:36px">
<tr><td style="text-align:center;padding-bottom:24px;border-bottom:1px solid #eadfd3">
<div style="font-size:28px;color:#641E32;font-weight:700">روشاک</div>
<div style="font-size:11px;letter-spacing:6px;color:#B08D45;margin-top:4px">ROSHAK</div></td></tr>
<tr><td style="padding-top:24px;text-align:right;line-height:2">
<h1 style="font-size:20px;color:#641E32;margin:0 0 12px">${escapeHtml(input.heading)}</h1>
${input.paragraphs.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join("")}
${rows}${action}
${input.footnote ? `<p style="font-size:12px;color:#8a7a7e;margin-top:24px">${escapeHtml(input.footnote)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    "روشاک | ROSHAK",
    "",
    input.heading,
    "",
    ...input.paragraphs,
    ...(input.rows ?? []).map(([k, v]) => `${k}: ${v}`),
    input.action ? `\n${input.action.label}: ${input.action.url}` : "",
    input.footnote ? `\n${input.footnote}` : "",
  ].join("\n");
  return { html, text };
}

export type EmailTemplate =
  | { template: "email-verification"; payload: { name: string; url: string } }
  | { template: "password-reset"; payload: { name: string; url: string } }
  | { template: "password-changed"; payload: { name: string } }
  | {
      template: "order-confirmation";
      payload: { name: string; orderNumber: string; total: string; url: string; items: Array<{ name: string; detail: string }> };
    }
  | { template: "order-status"; payload: { name: string; orderNumber: string; status: string; url: string; trackingNumber?: string } }
  | { template: "newsletter-confirm"; payload: { url: string } }
  | { template: "contact-notification"; payload: { name: string; email: string; subject: string; message: string } }
  | { template: "low-stock"; payload: { items: Array<{ sku: string; name: string; stock: number }> } };

export function renderEmail(input: EmailTemplate): RenderedEmail {
  switch (input.template) {
    case "email-verification": {
      const body = layout({
        preheader: "تأیید نشانی ایمیل حساب روشاک",
        heading: "ایمیل خود را تأیید کنید",
        paragraphs: [`${input.payload.name} عزیز، به روشاک خوش آمدید.`, "برای تأیید نشانی ایمیل روی دکمهٔ زیر بزنید. این پیوند تا ۲۴ ساعت معتبر است."],
        action: { label: "تأیید ایمیل", url: input.payload.url },
        footnote: "اگر شما این حساب را نساخته‌اید، این ایمیل را نادیده بگیرید.",
      });
      return { subject: "تأیید ایمیل | روشاک", ...body };
    }
    case "password-reset": {
      const body = layout({
        preheader: "بازیابی رمز عبور حساب روشاک",
        heading: "بازیابی رمز عبور",
        paragraphs: [`${input.payload.name} عزیز،`, "درخواستی برای تعیین رمز عبور جدید دریافت کردیم. این پیوند تا یک ساعت معتبر است و فقط یک بار قابل استفاده است."],
        action: { label: "تعیین رمز جدید", url: input.payload.url },
        footnote: "اگر این درخواست را شما نداده‌اید، کاری لازم نیست؛ رمز فعلی شما تغییری نمی‌کند.",
      });
      return { subject: "بازیابی رمز عبور | روشاک", ...body };
    }
    case "password-changed": {
      const body = layout({
        preheader: "رمز عبور حساب شما تغییر کرد",
        heading: "رمز عبور تغییر کرد",
        paragraphs: [`${input.payload.name} عزیز، رمز عبور حساب شما در روشاک تغییر کرد و همهٔ نشست‌های قبلی خارج شدند.`],
        footnote: "اگر این تغییر کار شما نبوده است، فوراً با پشتیبانی تماس بگیرید.",
      });
      return { subject: "تغییر رمز عبور | روشاک", ...body };
    }
    case "order-confirmation": {
      const body = layout({
        preheader: `سفارش ${input.payload.orderNumber} ثبت و پرداخت شد`,
        heading: "سفارش شما ثبت شد",
        paragraphs: [`${input.payload.name} عزیز، از خرید شما سپاسگزاریم. سفارش شما پرداخت شد و به‌زودی آماده‌سازی می‌شود.`],
        rows: [["شمارهٔ سفارش", input.payload.orderNumber], ...input.payload.items.map((i) => [i.name, i.detail] as [string, string]), ["مبلغ پرداختی", input.payload.total]],
        action: { label: "مشاهدهٔ سفارش", url: input.payload.url },
      });
      return { subject: `تأیید سفارش ${input.payload.orderNumber} | روشاک`, ...body };
    }
    case "order-status": {
      const rows: Array<[string, string]> = [
        ["شمارهٔ سفارش", input.payload.orderNumber],
        ["وضعیت جدید", input.payload.status],
      ];
      if (input.payload.trackingNumber) rows.push(["کد رهگیری مرسوله", input.payload.trackingNumber]);
      const body = layout({
        preheader: `وضعیت سفارش ${input.payload.orderNumber}: ${input.payload.status}`,
        heading: "به‌روزرسانی سفارش",
        paragraphs: [`${input.payload.name} عزیز، وضعیت سفارش شما تغییر کرد.`],
        rows,
        action: { label: "پیگیری سفارش", url: input.payload.url },
      });
      return { subject: `سفارش ${input.payload.orderNumber}: ${input.payload.status}`, ...body };
    }
    case "newsletter-confirm": {
      const body = layout({
        preheader: "تأیید عضویت در خبرنامهٔ روشاک",
        heading: "عضویت در خبرنامه",
        paragraphs: ["برای دریافت خبر کالکشن‌های تازه و رویدادهای روشاک، عضویت خود را تأیید کنید."],
        action: { label: "تأیید عضویت", url: input.payload.url },
        footnote: "اگر شما درخواست عضویت نداده‌اید، این ایمیل را نادیده بگیرید.",
      });
      return { subject: "تأیید عضویت در خبرنامه | روشاک", ...body };
    }
    case "contact-notification": {
      const body = layout({
        preheader: `پیام جدید از ${input.payload.name}`,
        heading: "پیام جدید از فرم تماس",
        paragraphs: [input.payload.message],
        rows: [
          ["نام", input.payload.name],
          ["ایمیل", input.payload.email],
          ["موضوع", input.payload.subject],
        ],
      });
      return { subject: `پیام تماس: ${input.payload.subject}`, ...body };
    }
    case "low-stock": {
      const body = layout({
        preheader: "هشدار کمبود موجودی",
        heading: "هشدار کمبود موجودی",
        paragraphs: ["موجودی تنوع‌های زیر به حد هشدار رسیده است:"],
        rows: input.payload.items.map((i) => [`${i.name} (${i.sku})`, `${i.stock} عدد`] as [string, string]),
      });
      return { subject: "هشدار کمبود موجودی | روشاک", ...body };
    }
  }
}
