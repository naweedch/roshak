"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { contactSchema } from "@/lib/validation/engagement";

type Values = z.input<typeof contactSchema>;

export function ContactForm() {
  const [message, setMessage] = React.useState<{ tone: "success" | "error"; text: string } | null>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<Values>({ resolver: zodResolver(contactSchema) });
  return (
    <form
      noValidate
      className="grid gap-5 rounded-[var(--radius-panel)] border border-line bg-surface-raised p-6 sm:grid-cols-2 sm:p-8"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          const r = await api<{ message: string }>("/api/v1/contact", { body: values });
          setMessage({ tone: "success", text: r.message });
          reset();
        } catch (e) {
          if (e instanceof ApiError) for (const [k, m] of Object.entries(e.fields)) setError(k as keyof Values, { message: m });
          setMessage({ tone: "error", text: e instanceof ApiError ? e.message : "ارسال پیام ناموفق بود" });
        }
      })}
    >
      {message ? (
        <FormMessage tone={message.tone} className="sm:col-span-2">
          {message.text}
        </FormMessage>
      ) : null}
      <Field label="نام" htmlFor="c-name" error={formState.errors.name?.message} required>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="ایمیل" htmlFor="c-email" error={formState.errors.email?.message} required>
        <Input type="email" dir="ltr" autoComplete="email" {...register("email")} />
      </Field>
      <Field label="موبایل (اختیاری)" htmlFor="c-phone" error={formState.errors.phone?.message}>
        <Input type="tel" dir="ltr" {...register("phone")} />
      </Field>
      <Field label="موضوع" htmlFor="c-subject" error={formState.errors.subject?.message} required>
        <Input {...register("subject")} />
      </Field>
      <Field label="پیام" htmlFor="c-message" error={formState.errors.message?.message} required className="sm:col-span-2">
        <Textarea rows={6} {...register("message")} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" loading={formState.isSubmitting}>
          ارسال پیام
        </Button>
      </div>
    </form>
  );
}
