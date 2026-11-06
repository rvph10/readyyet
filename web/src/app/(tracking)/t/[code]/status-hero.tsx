import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Illustration, type IllustrationName } from "@/components/illustration";
import { statusDotClass, statusTone } from "@/components/status-pill";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PickedUpButton } from "./picked-up-button";
import { statusLabel } from "@/lib/status-label";
import { readyDate, type Tracking } from "./tracking";

// Statuses the Customer has to answer, the Location emails them about these too
// (ADR 0015), but this is where they'll look.
const NEEDS_CUSTOMER = ["AWAITING_APPROVAL", "AWAITING_CLIENT_INFO"];
const WAITING_ON_A_PART = ["AWAITING_PARTS", "PARTS_ORDERED", "BACKORDERED"];

// What the Status means for the Customer, since a Status label alone is the
// Location's word for its own work.
function meaning(code: string, collected: boolean) {
  if (code === "READY") return collected ? "collected" : "ready";
  if (code === "COMPLETED") return "completed";
  if (code === "RECEIVED") return "received";
  if (code === "CANCELLED") return "cancelled";
  if (code === "REJECTED") return "rejected";
  if (code === "AWAITING_APPROVAL") return "needsApproval";
  if (code === "AWAITING_CLIENT_INFO") return "needsInfo";
  if (code === "ON_HOLD") return "onHold";
  if (WAITING_ON_A_PART.includes(code)) return "waitingForPart";
  return statusTone(code) === "received" ? "looking" : "working";
}

const SCENES: Record<ReturnType<typeof meaning>, IllustrationName> = {
  ready: "trophy-on-lime",
  collected: "progress",
  completed: "progress",
  received: "carrying",
  looking: "analysing",
  working: "figuring",
  needsApproval: "talking",
  needsInfo: "talking",
  onHold: "tired",
  waitingForPart: "balancing",
  cancelled: "lost",
  rejected: "lost",
};

interface Props {
  tracking: Tracking;
  locale: string;
  now: Date;
  // For placing it in the page's grid.
  className: string;
}

// The answer to "is it ready yet?", the reason the page is opened. READY is
// the only lime fill (ADR 0042) and the one moment the headline grows, so
// it's unmistakable at a glance. The answer comes first, since a title can be
// 200 characters, and it wraps rather than truncates: it's how the Customer
// knows which item this is.
export async function StatusHero({ tracking, locale, now, className }: Props) {
  const t = await getTranslations("tracking");
  const { currentStatus, location, title, estimatedReadyDate, customerCollectedAt } = tracking;
  const { code } = currentStatus;
  const collected = customerCollectedAt !== null;
  const ready = code === "READY" && !collected;
  const expected = estimatedReadyDate && readyDate(estimatedReadyDate, location.timeZone, locale, now);
  const state = meaning(code, collected);

  return (
    <section
      className={`flex flex-col gap-6 rounded-sheet p-6 sm:flex-row sm:items-center sm:justify-between md:p-8 lg:col-span-2 ${
        ready ? "bg-brand" : "border border-border bg-surface"
      } ${className}`}
      aria-labelledby="status-title"
    >
      <div className="min-w-0 flex-1">
        <h1
          id="status-title"
          className={`wrap-anywhere ${ready ? "text-title-h3 md:text-title-h1" : "text-title-h4 md:text-title-h3"}`}
        >
          {!ready && (
            <span
              aria-hidden="true"
              className={`mr-3 mb-1 inline-block size-3 rounded-full align-middle md:size-3.5 ${statusDotClass(code)}`}
            />
          )}
          {statusLabel(currentStatus, locale)}
        </h1>
        <p className="mt-2 max-w-2xl text-p-md md:text-p-lg">{t(`meaning.${state}`)}</p>
        <p className={`mt-4 max-w-2xl text-label-sm wrap-anywhere ${ready ? "text-ink/70" : "text-muted"}`}>{title}</p>

        {expected && (
          <p className="mt-5 inline-flex items-start gap-2 rounded-xl bg-subtle px-3.5 py-2.5 text-label-sm">
            <Icon name="date" className="mt-0.75 size-3.5 shrink-0 text-muted" />
            {t(expected.key, "date" in expected ? { date: expected.date } : {})}
          </p>
        )}

        {ready && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {location.mapsUrl && (
              <a href={location.mapsUrl} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                {t("directions")}
              </a>
            )}
            <PickedUpButton code={tracking.trackingCode} variant="secondary" label={t("pickedUp")} />
          </div>
        )}

        {/* The way in for a Customer without an email address (ADR 0076). */}
        {tracking.reviewUrl && !tracking.feedbackSentAt && (
          <Link
            href={`/t/${encodeURIComponent(tracking.trackingCode)}/review`}
            className={`${buttonClass({ variant: "secondary" })} mt-6`}
          >
            {t("rateItem")}
          </Link>
        )}

        {NEEDS_CUSTOMER.includes(code) && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={`tel:${location.contactPhone}`} className={buttonClass()}>
              <Icon name="phone" className="size-3.5" />
              {t("callLocation")}
            </a>
            <a href={`mailto:${location.contactEmail}`} className={buttonClass({ variant: "secondary" })}>
              <Icon name="message" className="size-3.5" />
              {t("emailLocation")}
            </a>
          </div>
        )}
      </div>
      <Illustration name={SCENES[state]} className="h-40 w-auto shrink-0 self-center sm:h-52 lg:h-64" />
    </section>
  );
}
