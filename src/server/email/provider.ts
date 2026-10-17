/**
 * ارائه‌دهندگان ارسال ایمیل.
 * - smtp: ارسال واقعی با nodemailer (هر سرویس SMTP مثل Mailgun، Postmark، سرور ایمیل اختصاصی).
 * - log: فقط برای توسعه؛ ایمیل در ‎.data/mail‎ ذخیره و در لاگ ثبت می‌شود و به هیچ گیرنده‌ای ارسال نمی‌شود.
 */
import "server-only";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { env } from "../env";
import { logger } from "../logger";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  readonly name: "smtp" | "log";
  /** آیا ایمیل واقعاً به صندوق گیرنده می‌رسد؟ */
  readonly delivers: boolean;
  send(message: OutgoingEmail): Promise<{ messageId?: string }>;
}

class LogEmailProvider implements EmailProvider {
  readonly name = "log" as const;
  readonly delivers = false;

  async send(message: OutgoingEmail) {
    // turbopackIgnore: ایمیل‌های ذخیره‌شدهٔ توسعه (حاوی لینک تأیید و بازیابی) نباید در خروجی ساخت کپی شوند
    // روی Vercel فایل‌سیستم فقط‌خواندنی است و تنها پوشهٔ موقت قابل نوشتن است
    const dir = process.env.VERCEL ? path.join(os.tmpdir(), "roshak-mail") : path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".data/mail");
    await fs.mkdir(dir, { recursive: true });
    const safeTo = message.to.replace(/[^a-z0-9@._-]/gi, "_");
    const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeTo}.html`);
    await fs.writeFile(file, `<!-- To: ${message.to} | Subject: ${message.subject} -->\n${message.html}`, "utf8");
    logger.info("email_logged_dev_only", { to: message.to, subject: message.subject, file });
    return { messageId: file };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp" as const;
  readonly delivers = true;
  private transporter: Promise<import("nodemailer").Mail> | null = null;

  private getTransporter() {
    this.transporter ??= (async () => {
      const e = env();
      if (!e.SMTP_HOST) throw new Error("SMTP_HOST تنظیم نشده است");
      const nodemailer = await import("nodemailer");
      return nodemailer.createTransport({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD ?? "" } : undefined,
      });
    })();
    return this.transporter;
  }

  async send(message: OutgoingEmail) {
    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: env().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { messageId: info.messageId };
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  provider = env().EMAIL_PROVIDER === "smtp" ? new SmtpEmailProvider() : new LogEmailProvider();
  return provider;
}
