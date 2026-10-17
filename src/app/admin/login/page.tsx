import { RoshakLogo } from "@/components/brand/logo";
import { StaffLoginForm } from "./login-form";

export const metadata = { title: "ورود کارکنان" };

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-midnight-deep px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-panel)] bg-ivory p-8 shadow-float">
        <div className="flex justify-center text-burgundy">
          <RoshakLogo />
        </div>
        <h1 className="mt-6 text-center font-display text-3xl text-ink">ورود به پنل مدیریت</h1>
        <p className="mt-1 text-center text-sm text-ink-muted">فقط برای کارکنان روشاک</p>
        <StaffLoginForm />
      </div>
    </main>
  );
}
