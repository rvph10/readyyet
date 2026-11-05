import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { statusDotClass, statusTone } from "@/components/status-pill";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PickedUpButton } from "./picked-up-button";
import { statusLabel } from "@/lib/status-label";
import { readyDate, type Tracking } from "./tracking";

// Statuses the Customer has to answer, the shop emails them about these too
// (ADR 0015), but this is where they'll look.
const NEEDS_CUSTOMER = ["AWAITING_APPROVAL", "AWAITING_CLIENT_INFO"];
const WAITING_ON_A_PART = ["AWAITING_PARTS", "PARTS_ORDERED", "BACKORDERED"];

// What the Status means for the Customer, since a Status label alone is the
// shop's word for its own work.
function meaning(code: string, collected: boolean) {
  if (code === "READY") return collected ? "collected" : "ready";
  if (code === "COMPLETED" || code === "RECEIVED" || code === "CANCELLED" || code === "REJECTED") {
    return code.toLowerCase();
  }
  if (code === "AWAITING_APPROVAL") return "needsApproval";
  if (code === "AWAITING_CLIENT_INFO") return "needsInfo";
  if (code === "ON_HOLD") return "onHold";
  if (WAITING_ON_A_PART.includes(code)) return "waitingForPart";
  return statusTone(code) === "received" ? "looking" : "working";
}

interface Props {
  tracking: Tracking;
  locale: string;
  now: Date;
}

// The answer to "is it ready yet?", the reason the page is opened. READY is
// the only lime fill (ADR 0042) and the one moment the headline grows, so
// it's unmistakable at a glance. The answer comes first, since a title can be
// 200 characters, and it wraps rather than truncates: it's how the Customer
// knows which item this is.
export async function StatusHero({ tracking, locale, now }: Props) {
  const t = await getTranslations("tracking");
  const { currentStatus, location, title, estimatedReadyDate, customerCollectedAt } = tracking;
  const { code } = currentStatus;
  const collected = customerCollectedAt !== null;
  const ready = code === "READY" && !collected;
  const expected = estimatedReadyDate && readyDate(estimatedReadyDate, location.timeZone, locale, now);

  return (
    <section
      className={`rounded-3xl p-6 md:p-8 ${ready ? "bg-brand" : "bg-surface shadow-panel"}`}
      aria-labelledby="status-title"
    >
      <h1
        id="status-title"
        className={`font-display wrap-anywhere ${ready ? "text-title-h3 md:text-title-h1" : "text-title-h4 md:text-title-h3"}`}
      >
        {!ready && (
          <span
            aria-hidden="true"
            className={`mr-3 mb-1 inline-block size-3 rounded-full align-middle md:size-3.5 ${statusDotClass(code)}`}
          />
        )}
        {statusLabel(currentStatus, locale)}
      </h1>
      <p className="mt-2 max-w-2xl text-p-md md:text-p-lg">{t(`meaning.${meaning(code, collected)}`)}</p>
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
            {t("callShop")}
          </a>
          <a href={`mailto:${location.contactEmail}`} className={buttonClass({ variant: "secondary" })}>
            <Icon name="message" className="size-3.5" />
            {t("emailShop")}
          </a>
        </div>
      )}
    </section>
  );
}
