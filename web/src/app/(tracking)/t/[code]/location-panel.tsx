import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
// Not the package's main entry, whose class component can't load on the server.
import { formatPhoneNumberIntl } from "react-phone-number-input/input";
import { Icon, type IconName } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { openingState, weekHours, type Tracking } from "./tracking";

const ROW = "-mx-2 flex min-h-11 items-start gap-3 rounded-2xl p-2";

function RowText({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-muted">
        <Icon name={icon} className="size-4" />
      </span>
      {/* wrap-anywhere: an email address is one long word, it has to be able
          to break anywhere rather than push the panel wider. */}
      <span className="min-w-0 flex-1 self-center text-label-sm wrap-anywhere">{children}</span>
    </>
  );
}

interface Props {
  location: Tracking["location"];
  locale: string;
  now: Date;
  // For placing it in the page's columns.
  className: string;
}

// Where, when and how to reach the Location, the questions a Customer would
// otherwise phone about (ADR 0029).
export async function LocationPanel({ location, locale, now, className }: Props) {
  const t = await getTranslations("tracking");
  const { address, mapsUrl, contactPhone, contactEmail, openingHours, timeZone } = location;
  const state = openingState(openingHours, timeZone, locale, now);
  const openingNow = state && (
    <span className={state.key === "openUntil" ? "text-success" : undefined}>{t(state.key, state)}</span>
  );
  const week = (
    <dl className="mt-1 mb-2 ml-12 flex flex-col gap-1.5 text-p-sm">
      {weekHours(openingHours, timeZone, locale, now).map(({ name, isToday, ranges }) => (
        <div key={name} className={`flex justify-between gap-3 ${isToday ? "font-semibold" : "text-muted"}`}>
          <dt className="first-letter:uppercase">{name}</dt>
          <dd className="text-right tabular-nums">
            {ranges.length === 0
              ? t("closed")
              : ranges.map(({ opens, closes }) => (
                  <span key={opens} className="block lg:inline lg:not-last:after:content-[',_']">
                    {t("hoursRange", { opens, closes })}
                  </span>
                ))}
          </dd>
        </div>
      ))}
    </dl>
  );

  return (
    <Panel as="aside" padding="lg" aria-labelledby="location-title" className={`flex flex-col ${className}`}>
      <h2 id="location-title" className="mb-3 text-label-lg">
        {t("location")}
      </h2>
      <div className="flex flex-1 flex-col gap-1">
        {state && (
          <>
            {/* On a phone the whole week is one tap away, in the browser's own
                disclosure, since today's answer is all most Customers need. */}
            <details className="group lg:hidden">
              <summary
                className={`${ROW} cursor-pointer list-none transition-colors hover:bg-subtle [&::-webkit-details-marker]:hidden`}
              >
                <RowText icon="time">{openingNow}</RowText>
                <Icon
                  name="arrow-down-1"
                  className="mt-3 size-3 shrink-0 text-muted transition-transform group-open:rotate-180"
                />
              </summary>
              {week}
            </details>
            {/* A large screen has the room, so it's simply shown. */}
            <div className="hidden lg:block">
              <div className={ROW}>
                <RowText icon="time">{openingNow}</RowText>
              </div>
              {week}
            </div>
          </>
        )}
        {/* Together at the bottom, whatever height a longer column leaves. */}
        <div className="flex flex-col gap-1 lg:mt-auto">
          {address && mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ROW} transition-colors hover:bg-subtle`}
            >
              <RowText icon="home">
                <span className="block">{address.streetAddress}</span>
                <span className="block font-normal text-muted">
                  {address.postalCode} {address.addressLocality}
                </span>
              </RowText>
            </a>
          )}
          <a href={`tel:${contactPhone}`} className={`${ROW} transition-colors hover:bg-subtle`}>
            <RowText icon="phone">
              <span className="tabular-nums">{formatPhoneNumberIntl(contactPhone) || contactPhone}</span>
            </RowText>
          </a>
          <a href={`mailto:${contactEmail}`} className={`${ROW} transition-colors hover:bg-subtle`}>
            <RowText icon="message">{contactEmail}</RowText>
          </a>
        </div>
      </div>
    </Panel>
  );
}
