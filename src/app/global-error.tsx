"use client";

/** خطای سطح ریشه (وقتی حتی چیدمان اصلی رندر نشود)؛ بدون وابستگی به استایل‌های سایت */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ fontFamily: "Tahoma, sans-serif", background: "#FFF8EF", color: "#242124", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ color: "#641E32" }}>مشکلی پیش آمد</h1>
          <p>لطفاً چند لحظه بعد دوباره تلاش کنید.</p>
          <button onClick={reset} style={{ background: "#641E32", color: "#FFF8EF", border: 0, borderRadius: 999, padding: "12px 24px", cursor: "pointer" }}>
            تلاش دوباره
          </button>
        </div>
      </body>
    </html>
  );
}
