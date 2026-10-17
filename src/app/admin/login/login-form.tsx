"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { api, ApiError } from "@/lib/api-client";
import { loginSchema } from "@/lib/validation/auth";

export function StaffLoginForm() {
  const router = useRouter();
  const [message, setMessage] = React.useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.input<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return (
    <form
      noValidate
      className="mt-8 space-y-5"
      onSubmit={handleSubmit(async (values) => {
        setMessage(null);
        try {
          await api("/api/v1/admin/auth/login", { body: values });
          router.replace("/admin");
          router.refresh();
        } catch (e) {
          setMessage(e instanceof ApiError ? e.message : "ورود ناموفق بود");
        }
      })}
    >
      {message ? <FormMessage>{message}</FormMessage> : null}
      <Field label="ایمیل" htmlFor="admin-email" error={formState.errors.email?.message} required>
        <Input type="email" dir="ltr" autoComplete="username" {...register("email")} />
      </Field>
      <Field label="رمز عبور" htmlFor="admin-password" error={formState.errors.password?.message} required>
        <Input type="password" dir="ltr" autoComplete="current-password" {...register("password")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={formState.isSubmitting}>
        ورود
      </Button>
    </form>
  );
}
