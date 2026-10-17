"use client";

/** فرم‌های احراز هویت مشتری (ورود، ثبت‌نام، فراموشی رمز، تعیین رمز جدید، تأیید ایمیل) */
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input } from "@/components/ui/form";
import { useStore } from "@/components/store/store-provider";
import { api, ApiError } from "@/lib/api-client";
import { safeInternalPath } from "@/lib/utils";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/validation/auth";

function applyFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): string {
  if (error instanceof ApiError) {
    for (const [key, message] of Object.entries(error.fields)) setError(key as Path<T>, { message });
    return error.message;
  }
  return "خطای غیرمنتظره‌ای رخ داد؛ دوباره تلاش کنید";
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} dir="ltr" className="pe-12" />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute end-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-ink/5"
        aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refreshSession } = useStore();
  const [message, setMessage] = React.useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          await api("/api/v1/auth/login", { body: values });
          await refreshSession();
          router.replace(safeInternalPath(next, "/account"));
          router.refresh();
        } catch (error) {
          setMessage(applyFieldErrors(error, setError));
        }
      })}
    >
      {message ? <FormMessage>{message}</FormMessage> : null}
      <Field label="ایمیل" htmlFor="login-email" error={formState.errors.email?.message} required>
        <Input type="email" dir="ltr" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="رمز عبور" htmlFor="login-password" error={formState.errors.password?.message} required>
        <PasswordInput autoComplete="current-password" {...register("password")} />
      </Field>
      <div className="flex justify-end">
        <Link href="/account/forgot-password" className="text-sm text-burgundy underline-offset-4 hover:underline">
          رمز عبور را فراموش کرده‌اید؟
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        ورود
      </Button>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { refreshSession } = useStore();
  const [message, setMessage] = React.useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.input<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { marketingOptIn: false },
  });
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          await api("/api/v1/auth/register", { body: values });
          await refreshSession();
          router.replace(safeInternalPath(next, "/account?welcome=1"));
          router.refresh();
        } catch (error) {
          setMessage(applyFieldErrors(error, setError));
        }
      })}
    >
      {message ? <FormMessage>{message}</FormMessage> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="نام" htmlFor="reg-first" error={formState.errors.firstName?.message} required>
          <Input autoComplete="given-name" {...register("firstName")} />
        </Field>
        <Field label="نام خانوادگی" htmlFor="reg-last" error={formState.errors.lastName?.message} required>
          <Input autoComplete="family-name" {...register("lastName")} />
        </Field>
      </div>
      <Field label="ایمیل" htmlFor="reg-email" error={formState.errors.email?.message} required>
        <Input type="email" dir="ltr" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="شمارهٔ موبایل (اختیاری)" htmlFor="reg-phone" error={formState.errors.phone?.message}>
        <Input type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09121234567" {...register("phone")} />
      </Field>
      <Field label="رمز عبور" htmlFor="reg-password" error={formState.errors.password?.message} required hint="حداقل ۸ کاراکتر؛ از رمزهای رایج استفاده نکنید.">
        <PasswordInput autoComplete="new-password" {...register("password")} />
      </Field>
      <label className="flex items-start gap-3 text-sm leading-7 text-ink-muted">
        <Checkbox {...register("marketingOptIn")} className="mt-1" />
        خبر کالکشن‌های تازه و رویدادهای روشاک را با ایمیل دریافت کنم.
      </label>
      <p className="text-xs leading-6 text-ink-muted">
        با ساخت حساب،{" "}
        <Link href="/pages/terms" className="text-burgundy underline underline-offset-4">
          قوانین
        </Link>{" "}
        و{" "}
        <Link href="/pages/privacy" className="text-burgundy underline underline-offset-4">
          سیاست حریم خصوصی
        </Link>{" "}
        روشاک را می‌پذیرید.
      </p>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        ساخت حساب
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [done, setDone] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.input<typeof forgotPasswordSchema>>({ resolver: zodResolver(forgotPasswordSchema) });
  if (done) return <FormMessage tone="success">{done}</FormMessage>;
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          const r = await api<{ message: string }>("/api/v1/auth/forgot-password", { body: values });
          setDone(r.message);
        } catch (error) {
          setMessage(applyFieldErrors(error, setError));
        }
      })}
    >
      {message ? <FormMessage>{message}</FormMessage> : null}
      <Field label="ایمیل حساب" htmlFor="forgot-email" error={formState.errors.email?.message} required>
        <Input type="email" dir="ltr" autoComplete="email" {...register("email")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        ارسال پیوند بازیابی
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const { register, handleSubmit, setError, formState } = useForm<z.input<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });
  if (done) {
    return (
      <div className="space-y-5">
        <FormMessage tone="success">{done}</FormMessage>
        <Button asChild className="w-full">
          <Link href="/account/login">ورود به حساب</Link>
        </Button>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          const r = await api<{ message: string }>("/api/v1/auth/reset-password", { body: values });
          setDone(r.message);
        } catch (error) {
          setMessage(applyFieldErrors(error, setError));
        }
      })}
    >
      {message ? <FormMessage>{message}</FormMessage> : null}
      <input type="hidden" {...register("token")} />
      <Field label="رمز عبور جدید" htmlFor="reset-password" error={formState.errors.password?.message} required hint="حداقل ۸ کاراکتر">
        <PasswordInput autoComplete="new-password" {...register("password")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        ذخیرهٔ رمز جدید
      </Button>
    </form>
  );
}

export function VerifyEmail({ token }: { token: string | null }) {
  const [state, setState] = React.useState<{ tone: "success" | "error" | "info"; text: string }>(() =>
    token ? { tone: "info", text: "در حال تأیید ایمیل..." } : { tone: "error", text: "پیوند تأیید ناقص است." },
  );
  const started = React.useRef(false);
  React.useEffect(() => {
    if (started.current || !token) return;
    started.current = true;
    api<{ message: string }>("/api/v1/auth/verify-email", { body: { token } })
      .then((r) => setState({ tone: "success", text: r.message }))
      .catch((e) => setState({ tone: "error", text: e instanceof ApiError ? e.message : "تأیید ایمیل ناموفق بود" }));
  }, [token]);
  return (
    <div className="space-y-5">
      <FormMessage tone={state.tone}>{state.text}</FormMessage>
      <Button asChild variant="secondary" className="w-full">
        <Link href="/account">رفتن به حساب کاربری</Link>
      </Button>
    </div>
  );
}
