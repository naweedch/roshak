/**
 * نمودار ستونی فروش روزانه (SVG سبک، بدون کتابخانه).
 * هر ستون عنوان قابل‌خواندن دارد و جدول داده برای صفحه‌خوان در اختیار است.
 */
import { formatPersianDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { toPersianDigits } from "@/lib/persian";

export function SalesChart({ data, currency }: { data: Array<{ day: string; revenue: string | null; orders: number }>; currency: string }) {
  const values = data.map((d) => Number(d.revenue ?? 0));
  const max = Math.max(1, ...values);
  const showRevenue = data.some((d) => d.revenue !== null);
  const W = 720;
  const H = 200;
  const barW = W / data.length;
  const hasData = values.some((v) => v > 0) || data.some((d) => d.orders > 0);

  return (
    <figure>
      {hasData ? (
        <svg viewBox={`0 0 ${W} ${H + 24}`} className="h-56 w-full" role="img" aria-label="نمودار فروش روزانه">
          <line x1="0" y1={H} x2={W} y2={H} stroke="var(--color-line-strong)" />
          {data.map((d, i) => {
            const value = showRevenue ? Number(d.revenue ?? 0) : d.orders;
            const scaleMax = showRevenue ? max : Math.max(1, ...data.map((x) => x.orders));
            const h = Math.max(value > 0 ? 3 : 0, (value / scaleMax) * (H - 12));
            // در RTL زمان از راست به چپ پیش می‌رود
            const x = W - (i + 1) * barW;
            return (
              <g key={d.day}>
                <rect x={x + barW * 0.18} y={H - h} width={barW * 0.64} height={h} rx={Math.min(4, barW * 0.2)} fill="var(--color-burgundy)" opacity={0.85}>
                  {/* محتوای <title> باید یک رشتهٔ واحد باشد؛ چند گرهٔ متنی جدا باعث ناهمخوانی hydration می‌شود */}
                  <title>{`${formatPersianDate(d.day)}: ${showRevenue ? `${formatMoney(d.revenue ?? "0", currency)} ` : ""}(${toPersianDigits(d.orders)} سفارش)`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="grid h-56 place-items-center text-sm text-ink-muted">در این بازه هنوز فروش پرداخت‌شده‌ای ثبت نشده است.</p>
      )}
      <figcaption className="sr-only">
        <table>
          <thead>
            <tr>
              <th>روز</th>
              <th>درآمد</th>
              <th>سفارش</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.day}>
                <td>{formatPersianDate(d.day)}</td>
                <td>{d.revenue === null ? "—" : formatMoney(d.revenue, currency)}</td>
                <td>{d.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}
