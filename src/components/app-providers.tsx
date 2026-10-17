"use client";

import * as React from "react";
import { MotionConfig } from "motion/react";
import { Direction } from "radix-ui";
import { Toaster } from "sonner";

/** تنظیمات سراسری کلاینت: جهت راست‌به‌چپ برای Radix، احترام به کاهش حرکت و اعلان‌ها */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <Direction.Provider dir="rtl">
      <MotionConfig reducedMotion="user">
        {children}
        <Toaster
          dir="rtl"
          position="top-center"
          closeButton
          toastOptions={{
            classNames: {
              toast: "!rounded-2xl !border-line !bg-ivory !font-sans !text-ink !shadow-float",
              actionButton: "!rounded-full !bg-burgundy !text-ivory",
              success: "[&_[data-icon]]:!text-success",
              error: "[&_[data-icon]]:!text-danger",
            },
          }}
        />
      </MotionConfig>
    </Direction.Provider>
  );
}
