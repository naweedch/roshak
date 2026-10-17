/**
 * ساخت حساب مدیر (اولین مدیر محیط عملیاتی یا کارمند جدید) از خط فرمان.
 *
 * هیچ رمز پیش‌فرضی وجود ندارد: رمز به‌صورت پنهان از ترمینال پرسیده می‌شود
 * یا (برای اجرای غیرتعاملی، مثلاً در CI) از متغیر محیطی ADMIN_PASSWORD خوانده می‌شود.
 *
 * نمونه:
 *   npm run admin:create -- --email owner@example.com --first-name نام --last-name خانوادگی
 *   npm run admin:create -- --email staff@example.com --role ORDER_MANAGER
 *   npm run admin:create -- --email owner@example.com --reset   (تغییر رمز/نقش حساب موجود و ابطال نشست‌ها)
 */
import "dotenv/config";
import { parseArgs } from "node:util";
import readline from "node:readline";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { STAFF_ROLES } from "@/lib/rbac";
import { emailSchema, passwordSchema } from "@/lib/validation/common";

const ADMIN_PASSWORD_MIN = 12;

function usage(message?: string): never {
  if (message) console.error(`خطا: ${message}\n`);
  console.error(
    [
      "استفاده: npm run admin:create -- --email <ایمیل> [--first-name <نام>] [--last-name <نام خانوادگی>] [--role <نقش>] [--reset]",
      `نقش‌ها: ${STAFF_ROLES.join("، ")} (پیش‌فرض SUPER_ADMIN)`,
      "رمز عبور پنهان پرسیده می‌شود یا از ADMIN_PASSWORD خوانده می‌شود.",
    ].join("\n"),
  );
  process.exit(1);
}

/** خواندن رمز از ترمینال بدون نمایش کاراکترها */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("ترمینال تعاملی نیست؛ رمز را با ADMIN_PASSWORD بدهید"));
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    output._writeToOutput = (s: string) => {
      if (!muted || s.includes("\n")) process.stdout.write(muted ? "\n" : s);
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  if (fromEnv) return fromEnv;
  const first = await promptHidden("رمز عبور (حداقل ۱۲ کاراکتر): ");
  const second = await promptHidden("تکرار رمز عبور: ");
  if (first !== second) throw new Error("دو رمز واردشده یکسان نیستند");
  return first;
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      "first-name": { type: "string", default: "مدیر" },
      "last-name": { type: "string", default: "فروشگاه" },
      role: { type: "string", default: "SUPER_ADMIN" },
      reset: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  if (values.help) usage();
  if (!process.env.DATABASE_URL) usage("DATABASE_URL تنظیم نشده است");

  const email = emailSchema.safeParse(values.email ?? "");
  if (!email.success) usage("ایمیل معتبر با --email لازم است");
  const role = z.enum(STAFF_ROLES).safeParse(values.role);
  if (!role.success) usage(`نقش نامعتبر: ${values.role}`);

  const password = await readPassword();
  const checked = passwordSchema.safeParse(password);
  if (!checked.success) usage(checked.error.issues[0]?.message ?? "رمز نامعتبر است");
  if (password.length < ADMIN_PASSWORD_MIN) usage(`رمز حساب مدیریتی باید حداقل ${ADMIN_PASSWORD_MIN} کاراکتر باشد`);
  if (password.toLowerCase().includes(email.data.split("@")[0])) usage("رمز نباید شامل نام کاربری ایمیل باشد");

  const passwordHash = await hashPassword(password);
  const existing = await db.user.findUnique({ where: { email: email.data }, select: { id: true, role: true } });

  if (existing && !values.reset) {
    usage(`حسابی با این ایمیل وجود دارد (نقش فعلی: ${existing.role}). برای تغییر رمز و نقش آن، --reset را اضافه کنید.`);
  }

  const user = await db.$transaction(async (tx) => {
    const now = new Date();
    const saved = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { passwordHash, role: role.data, status: "ACTIVE", passwordChangedAt: now } })
      : await tx.user.create({
          data: {
            email: email.data,
            passwordHash,
            firstName: values["first-name"]!,
            lastName: values["last-name"]!,
            role: role.data,
            emailVerifiedAt: now,
          },
        });
    // تغییر رمز یا نقش، همهٔ نشست‌های قبلی را باطل می‌کند
    if (existing) await tx.session.deleteMany({ where: { userId: saved.id } });
    await tx.adminAuditLog.create({
      data: {
        actorId: null,
        actorEmail: "cli",
        action: existing ? "user.cli_reset" : "user.cli_create",
        entityType: "User",
        entityId: saved.id,
        summary: existing ? `بازنشانی رمز/نقش ${saved.email} از خط فرمان` : `ایجاد حساب ${saved.email} از خط فرمان`,
        changes: { role: role.data },
      },
    });
    return saved;
  });

  console.log(`${existing ? "حساب به‌روز شد" : "حساب ساخته شد"}: ${user.email} — نقش ${user.role}`);
  console.log("ورود: /admin/login");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
