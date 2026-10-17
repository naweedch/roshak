"use client";

/**
 * فرم تسویه حساب: اطلاعات تماس، آدرس، روش ارسال، روش پرداخت و خلاصهٔ سفارش.
 * مبالغ همیشه از سرور (quote) خوانده می‌شوند و هنگام ثبت دوباره در سرور محاسبه می‌شوند.
 * کلید idempotency یک‌بار برای هر بارگذاری فرم ساخته می‌شود تا کلیک دوباره سفارش تکراری نسازد.
 */
import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, ShoppingBag } from "lucide-react";
import { useStore } from "@/components/store/store-provider";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, NativeSelect, Textarea } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api-client";
import { IRAN_PROVINCES } from "@/lib/iran";
import { formatMoney, toDecimal } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/checkout";

interface SavedAddress {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}

interface ShippingMethodOption {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  minDays: number | null;
  maxDays: number | null;
}

interface Quote {
  currency: string;
  itemCount: number;
  hasUnavailableItems: boolean;
  subtotal: string;
  discountCode: string | null;
  discountTotal: string;
  discountMessage: string | null;
  shippingTotal: string;
  shippingPending: boolean;
  freeShipping: boolean;
  taxTotal: string;
  taxRate: string;
  pricesIncludeTax: boolean;
  grandTotal: string;
}

interface Props {
  user: { firstName: string; lastName: string; email: string; phone: string | null } | null;
  addresses: SavedAddress[];
  shippingMethods: ShippingMethodOption[];
  paymentProviders: Array<{ id: "TEST" | "ZARINPAL"; label: string }>;
  reservationMinutes: number;
}

export function CheckoutForm({ user, addresses, shippingMethods, paymentProviders, reservationMinutes }: Props) {
  const router = useRouter();
  const { cart, loadCart, refreshSession } = useStore();
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const [addressMode, setAddressMode] = React.useState<string>(defaultAddress ? defaultAddress.id : "new");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      idempotencyKey,
      contact: { firstName: user?.firstName ?? "", lastName: user?.lastName ?? "", email: user?.email ?? "", phone: user?.phone ?? "" },
      shippingAddress: defaultAddress
        ? {
            recipientName: defaultAddress.recipientName,
            phone: defaultAddress.phone,
            province: defaultAddress.province as CheckoutInput["shippingAddress"]["province"],
            city: defaultAddress.city,
            addressLine: defaultAddress.addressLine,
            postalCode: defaultAddress.postalCode,
          }
        : { recipientName: "", phone: "", province: "اصفهان", city: "", addressLine: "", postalCode: "" },
      shippingMethodId: shippingMethods[0]?.id ?? "",
      paymentProvider: paymentProviders[0]?.id ?? "TEST",
      customerNote: "",
      saveAddress: !defaultAddress && Boolean(user),
      acceptTerms: false as unknown as true,
    },
  });

  const shippingMethodId = watch("shippingMethodId");
  const email = watch("contact.email");

  React.useEffect(() => {
    void loadCart();
  }, [loadCart]);

  React.useEffect(() => {
    const controller = new AbortController();
    api<Quote>("/api/v1/checkout/quote", {
      body: { shippingMethodId: shippingMethodId || null, ...(email && email.includes("@") ? { email } : {}) },
      signal: controller.signal,
    })
      .then(setQuote)
      .catch(() => {});
    return () => controller.abort();
  }, [shippingMethodId, email, cart?.itemCount, cart?.discountCode]);

  function chooseAddress(id: string) {
    setAddressMode(id);
    const a = addresses.find((x) => x.id === id);
    if (a) {
      setValue("shippingAddress.recipientName", a.recipientName, { shouldValidate: true });
      setValue("shippingAddress.phone", a.phone, { shouldValidate: true });
      setValue("shippingAddress.province", a.province as CheckoutInput["shippingAddress"]["province"], { shouldValidate: true });
      setValue("shippingAddress.city", a.city, { shouldValidate: true });
      setValue("shippingAddress.addressLine", a.addressLine, { shouldValidate: true });
      setValue("shippingAddress.postalCode", a.postalCode, { shouldValidate: true });
    }
  }

  const onSubmit: SubmitHandler<CheckoutInput> = async (values) => {
    setFormError(null);
    try {
      const result = await api<{ orderNumber: string; redirectUrl: string | null; paid: boolean; paymentInitError: string | null; duplicate: boolean }>(
        "/api/v1/checkout",
        { body: { ...values, idempotencyKey } },
      );
      await refreshSession();
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }
      if (result.paid) {
        router.push(`/checkout/result?order=${encodeURIComponent(result.orderNumber)}&status=paid`);
        return;
      }
      router.push(`/orders/${result.orderNumber}${result.paymentInitError ? "?payment=error" : ""}`);
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [key, message] of Object.entries(error.fields)) {
          setError(key as Parameters<typeof setError>[0], { message });
        }
        setFormError(error.message);
        if (error.code === "OUT_OF_STOCK" || error.code === "CONFLICT") void loadCart();
      } else {
        setFormError("ثبت سفارش ناموفق بود؛ دوباره تلاش کنید");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (cart && cart.items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-7" />}
        title="سبد خرید خالی است"
        description="برای تکمیل خرید، ابتدا لباسی به سبد اضافه کنید."
        action={
          <Button asChild>
            <Link href="/shop">مشاهدهٔ لباس‌ها</Link>
          </Button>
        }
      />
    );
  }

  const fe = errors;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-10">
        {formError ? <FormMessage>{formError}</FormMessage> : null}
        {!user ? (
          <FormMessage tone="info">
            خرید بدون ثبت‌نام ممکن است.{" "}
            <Link href="/account/login?next=/checkout" className="font-medium text-burgundy underline underline-offset-4">
              وارد شوید
            </Link>{" "}
            تا آدرس‌ها و سفارش‌های شما ذخیره شوند.
          </FormMessage>
        ) : null}

        <section aria-labelledby="contact-title" className="space-y-4">
          <h2 id="contact-title" className="font-display text-2xl text-ink">
            اطلاعات تماس
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام" htmlFor="firstName" error={fe.contact?.firstName?.message} required>
              <Input autoComplete="given-name" {...register("contact.firstName")} />
            </Field>
            <Field label="نام خانوادگی" htmlFor="lastName" error={fe.contact?.lastName?.message} required>
              <Input autoComplete="family-name" {...register("contact.lastName")} />
            </Field>
            <Field label="ایمیل" htmlFor="email" error={fe.contact?.email?.message} required hint="رسید و وضعیت سفارش به این نشانی ارسال می‌شود.">
              <Input type="email" dir="ltr" autoComplete="email" {...register("contact.email")} />
            </Field>
            <Field label="شمارهٔ موبایل" htmlFor="phone" error={fe.contact?.phone?.message} required>
              <Input type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09121234567" {...register("contact.phone")} />
            </Field>
          </div>
        </section>

        <section aria-labelledby="address-title" className="space-y-4">
          <h2 id="address-title" className="font-display text-2xl text-ink">
            نشانی تحویل
          </h2>
          {addresses.length ? (
            <div role="radiogroup" aria-label="انتخاب آدرس" className="grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <label key={a.id} className={cn("cursor-pointer rounded-2xl border p-4 text-sm transition-colors", addressMode === a.id ? "border-burgundy bg-burgundy/[0.04]" : "border-line hover:border-burgundy/40")}>
                  <input type="radio" name="address-choice" className="sr-only" checked={addressMode === a.id} onChange={() => chooseAddress(a.id)} />
                  <span className="font-medium">{a.label ?? a.recipientName}</span>
                  <span className="mt-1 block text-ink-muted">
                    {a.province}، {a.city}، {a.addressLine}
                  </span>
                </label>
              ))}
              <label className={cn("cursor-pointer rounded-2xl border border-dashed p-4 text-sm", addressMode === "new" ? "border-burgundy" : "border-line-strong")}>
                <input type="radio" name="address-choice" className="sr-only" checked={addressMode === "new"} onChange={() => setAddressMode("new")} />
                افزودن آدرس جدید
              </label>
            </div>
          ) : null}
          <div className={cn("grid gap-4 sm:grid-cols-2", addresses.length && addressMode !== "new" && "sr-only")} aria-hidden={addresses.length > 0 && addressMode !== "new" ? true : undefined}>
            <Field label="نام تحویل‌گیرنده" htmlFor="recipientName" error={fe.shippingAddress?.recipientName?.message} required>
              <Input autoComplete="name" {...register("shippingAddress.recipientName")} />
            </Field>
            <Field label="موبایل تحویل‌گیرنده" htmlFor="shipPhone" error={fe.shippingAddress?.phone?.message} required>
              <Input type="tel" dir="ltr" inputMode="tel" {...register("shippingAddress.phone")} />
            </Field>
            <Field label="استان" htmlFor="province" error={fe.shippingAddress?.province?.message} required>
              <NativeSelect autoComplete="address-level1" {...register("shippingAddress.province")}>
                {IRAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="شهر" htmlFor="city" error={fe.shippingAddress?.city?.message} required>
              <Input autoComplete="address-level2" {...register("shippingAddress.city")} />
            </Field>
            <Field label="نشانی کامل" htmlFor="addressLine" error={fe.shippingAddress?.addressLine?.message} required className="sm:col-span-2">
              <Textarea rows={3} autoComplete="street-address" placeholder="خیابان، کوچه، پلاک، واحد" {...register("shippingAddress.addressLine")} />
            </Field>
            <Field label="کد پستی" htmlFor="postalCode" error={fe.shippingAddress?.postalCode?.message} required hint="۱۰ رقم، بدون خط تیره">
              <Input dir="ltr" inputMode="numeric" autoComplete="postal-code" {...register("shippingAddress.postalCode")} />
            </Field>
            {user && addressMode === "new" ? (
              <label className="flex items-center gap-2 self-end pb-3 text-sm">
                <Checkbox {...register("saveAddress")} />
                ذخیرهٔ این آدرس در حساب من
              </label>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="shipping-title" className="space-y-4">
          <h2 id="shipping-title" className="font-display text-2xl text-ink">
            روش ارسال
          </h2>
          {shippingMethods.length === 0 ? <FormMessage>در حال حاضر هیچ روش ارسالی فعال نیست.</FormMessage> : null}
          <div className="grid gap-3" role="radiogroup" aria-label="روش ارسال">
            {shippingMethods.map((m) => (
              <label key={m.id} className={cn("flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4", shippingMethodId === m.id ? "border-burgundy bg-burgundy/[0.04]" : "border-line hover:border-burgundy/40")}>
                <span className="flex items-center gap-3">
                  <input type="radio" value={m.id} {...register("shippingMethodId")} className="size-4 accent-burgundy" />
                  <span>
                    <span className="block font-medium">{m.name}</span>
                    <span className="text-xs text-ink-muted">
                      {m.description}
                      {m.minDays ? ` (${toPersianDigits(m.minDays)}${m.maxDays && m.maxDays !== m.minDays ? ` تا ${toPersianDigits(m.maxDays)}` : ""} روز کاری)` : ""}
                    </span>
                  </span>
                </span>
                <span className="tabular text-sm">{quote?.freeShipping && shippingMethodId === m.id ? "رایگان" : formatMoney(m.price, m.currency)}</span>
              </label>
            ))}
          </div>
          {fe.shippingMethodId ? <p className="text-xs text-danger">{fe.shippingMethodId.message}</p> : null}
        </section>

        <section aria-labelledby="payment-title" className="space-y-4">
          <h2 id="payment-title" className="font-display text-2xl text-ink">
            روش پرداخت
          </h2>
          {paymentProviders.length === 0 ? (
            <FormMessage>درگاه پرداختی پیکربندی نشده است؛ در حال حاضر امکان ثبت سفارش وجود ندارد.</FormMessage>
          ) : (
            <div className="grid gap-3" role="radiogroup" aria-label="روش پرداخت">
              {paymentProviders.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-4 has-[:checked]:border-burgundy has-[:checked]:bg-burgundy/[0.04]">
                  <input type="radio" value={p.id} {...register("paymentProvider")} className="size-4 accent-burgundy" />
                  <span className="font-medium">{p.label}</span>
                  {p.id === "TEST" ? <span className="ms-auto rounded-full bg-warning-soft px-2.5 py-0.5 text-xs text-warning">محیط آزمایشی</span> : null}
                </label>
              ))}
            </div>
          )}
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <Lock className="size-3.5" aria-hidden />
            پرداخت در درگاه بانکی امن انجام می‌شود و اطلاعات کارت شما در روشاک ذخیره نمی‌شود. کالاها تا {toPersianDigits(reservationMinutes)} دقیقه برای شما رزرو می‌شوند.
          </p>
        </section>

        <section className="space-y-4">
          <Field label="توضیحات سفارش (اختیاری)" htmlFor="customerNote" error={fe.customerNote?.message}>
            <Textarea rows={2} {...register("customerNote")} />
          </Field>
          <label className="flex items-start gap-3 text-sm leading-7">
            <Checkbox {...register("acceptTerms")} aria-invalid={fe.acceptTerms ? true : undefined} aria-describedby={fe.acceptTerms ? "terms-error" : undefined} className="mt-1" />
            <span>
              <Link href="/pages/terms" target="_blank" className="text-burgundy underline underline-offset-4">
                قوانین و شرایط خرید
              </Link>{" "}
              و{" "}
              <Link href="/pages/returns" target="_blank" className="text-burgundy underline underline-offset-4">
                شرایط بازگشت کالا
              </Link>{" "}
              را می‌پذیرم.
            </span>
          </label>
          {fe.acceptTerms ? (
            <p id="terms-error" role="alert" className="text-xs text-danger">
              {fe.acceptTerms.message}
            </p>
          ) : null}
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-[var(--radius-panel)] border border-line bg-surface-raised p-6 lg:sticky lg:top-28" aria-label="خلاصهٔ سفارش">
        <h2 className="font-display text-2xl text-ink">خلاصهٔ سفارش</h2>
        {cart ? (
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {cart.items.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <span className="arch-3-4 relative block h-16 w-12 shrink-0 overflow-hidden bg-ivory-deep">
                  {item.image ? <Image src={item.image.url} alt="" fill sizes="48px" className="object-cover" /> : null}
                  <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-burgundy text-[0.65rem] text-ivory">{toPersianDigits(item.quantity)}</span>
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-xs text-ink-muted">
                    {item.colorName} / سایز {toPersianDigits(item.sizeLabel)}
                  </span>
                  {item.issue ? <span className="block text-xs text-danger">ناموجود</span> : null}
                </span>
                <span className="tabular">{formatMoney(item.lineTotal, cart.currency)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="skeleton h-24 rounded-2xl" />
        )}
        {quote ? (
          <dl className="space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">جمع کالاها</dt>
              <dd className="tabular">{formatMoney(quote.subtotal, quote.currency)}</dd>
            </div>
            {toDecimal(quote.discountTotal).gt(0) ? (
              <div className="flex justify-between text-success">
                <dt>تخفیف ({quote.discountCode})</dt>
                <dd className="tabular">−{formatMoney(quote.discountTotal, quote.currency)}</dd>
              </div>
            ) : null}
            {quote.discountMessage ? <p className="text-xs text-danger">{quote.discountMessage}</p> : null}
            <div className="flex justify-between">
              <dt className="text-ink-muted">ارسال</dt>
              <dd className="tabular">{quote.shippingPending ? "—" : quote.freeShipping ? "رایگان" : formatMoney(quote.shippingTotal, quote.currency)}</dd>
            </div>
            {toDecimal(quote.taxTotal).gt(0) ? (
              <div className="flex justify-between text-xs text-ink-soft">
                <dt>مالیات بر ارزش افزوده{quote.pricesIncludeTax ? " (لحاظ‌شده در قیمت)" : ""}</dt>
                <dd className="tabular">{formatMoney(quote.taxTotal, quote.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
              <dt>مبلغ قابل پرداخت</dt>
              <dd className="tabular text-burgundy">{formatMoney(quote.grandTotal, quote.currency)}</dd>
            </div>
          </dl>
        ) : null}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={paymentProviders.length === 0 || shippingMethods.length === 0 || Boolean(quote?.hasUnavailableItems) || cart?.hasIssues}>
          <Lock />
          ثبت سفارش و پرداخت
        </Button>
        {cart?.hasIssues ? (
          <p className="text-xs text-danger">
            برخی اقلام ناموجودند؛ <Link href="/cart" className="underline">سبد را اصلاح کنید</Link>.
          </p>
        ) : null}
      </aside>
    </form>
  );
}
