import { getTranslations } from "next-intl/server";
import { intlLocale } from "../locations/[locationId]/tickets/ticket-views";
import { formatCents } from "@/lib/commissions";

const HEIGHT = 200;
const TOP = 28;
const BOTTOM = 28;
const AXIS = 56;
const BAR = 24;
const RADIUS = 4;
const MIN_MONTHS = 6;
const MAX_MONTHS = 12;
const TIP_WIDTH = 120;

// Clean round steps for the axis, in cents.
function niceStep(max: number) {
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  return ([1, 2, 5, 10].map((n) => n * power).find((step) => step >= rough) ?? 10 * power) || 1000;
}

// Every month from the first earning, or the last six, to this one, so a
// month without earnings shows as an empty slot rather than vanishing.
function monthsShown(totals: { month: string }[], now: Date) {
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const first = totals.reduce((min, { month }) => {
    const [year, number] = month.split("-").map(Number);
    return Math.min(min, year * 12 + number - 1);
  }, current);
  const count = Math.min(Math.max(current - first + 1, MIN_MONTHS), MAX_MONTHS);
  return Array.from({ length: count }, (_, index) => {
    const value = current - count + 1 + index;
    return `${Math.floor(value / 12)}-${String((value % 12) + 1).padStart(2, "0")}`;
  });
}

// A column per month, rounded at its value and square on the baseline. Each
// column shows its month and amount on hover or focus and names them to a
// screen reader, and the highest one shows its amount on its cap.
export async function EarningsChart({
  totals,
  locale,
}: {
  totals: { month: string; amount: number }[];
  locale: string;
}) {
  const t = await getTranslations("salesPartner.earnings");
  const amounts = new Map(totals.map(({ month, amount }) => [month, amount]));
  const months = monthsShown(totals, new Date()).map((month) => ({ month, amount: amounts.get(month) ?? 0 }));
  const highest = Math.max(...months.map(({ amount }) => amount));
  const step = niceStep(highest);
  const top = Math.max(step * Math.ceil(highest / step), step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, index) => index * step);
  const plot = HEIGHT - TOP - BOTTOM;
  const y = (amount: number) => TOP + plot - (amount / top) * plot;
  const monthName = (month: string, style: "short" | "long") =>
    new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: "UTC",
      month: style,
      year: style === "long" ? "numeric" : undefined,
    }).format(new Date(`${month}-01T00:00:00Z`));
  const euros = (cents: number) => formatCents(cents, locale).replace(/[.,]00(?=\D*$)/, "");

  return (
    <figure className="flex flex-col">
      <div className="flex text-p-xs">
        <svg aria-hidden="true" width={AXIS} height={HEIGHT} className="shrink-0 overflow-visible">
          {ticks.map((tick) => (
            <text key={tick} x={AXIS - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted">
              {euros(tick)}
            </text>
          ))}
        </svg>
        <svg
          role="group"
          aria-label={t("title")}
          width="100%"
          height={HEIGHT}
          className="min-w-0 flex-1 overflow-visible"
        >
          {ticks.map((tick) => (
            <line
              key={tick}
              aria-hidden="true"
              x1="0"
              x2="100%"
              y1={y(tick)}
              y2={y(tick)}
              className="stroke-border"
              strokeWidth={1}
            />
          ))}
          {months.map(({ month, amount }, index) => {
            const centre = `${((index + 0.5) / months.length) * 100}%`;
            const height = y(0) - y(amount);
            const left = -BAR / 2;
            const capped = Math.min(RADIUS, height);
            const tipTop = Math.max(y(amount) - 52, 0);
            return (
              <svg key={month} x={centre} overflow="visible">
                <g
                  tabIndex={0}
                  role="img"
                  aria-label={`${monthName(month, "long")}, ${formatCents(amount, locale)}`}
                  className="group outline-none"
                >
                  <rect x={-24} y={TOP} width={48} height={plot} className="fill-transparent" />
                  {amount > 0 && (
                    <path
                      d={`M${left} ${y(0)}V${y(amount) + capped}q0 ${-capped} ${capped} ${-capped}h${BAR - 2 * capped}q${capped} 0 ${capped} ${capped}V${y(0)}z`}
                      className="fill-pine transition-colors group-hover:fill-pine-hover group-focus-visible:fill-pine-hover"
                    />
                  )}
                  {amount === highest && amount > 0 && (
                    <text
                      y={y(amount) - 8}
                      textAnchor="middle"
                      className="fill-ink text-label-xs font-semibold group-hover:opacity-0 group-focus-visible:opacity-0"
                    >
                      {formatCents(amount, locale)}
                    </text>
                  )}
                  <text y={HEIGHT - 8} textAnchor="middle" className="fill-muted">
                    {monthName(month, "short")}
                  </text>
                  <g className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <rect x={-TIP_WIDTH / 2} y={tipTop} width={TIP_WIDTH} height={44} rx={10} className="fill-ink" />
                    <text y={tipTop + 18} textAnchor="middle" className="fill-surface text-p-xs">
                      {monthName(month, "long")}
                    </text>
                    <text y={tipTop + 35} textAnchor="middle" className="fill-surface text-label-xs font-semibold">
                      {formatCents(amount, locale)}
                    </text>
                  </g>
                </g>
              </svg>
            );
          })}
        </svg>
      </div>
    </figure>
  );
}
