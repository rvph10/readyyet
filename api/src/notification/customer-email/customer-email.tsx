import { Link, Text } from "react-email";
import type { Locale } from "@readyyet/db";
import type { CalendarDate } from "@readyyet/shared";
import type { ReactElement } from "react";
import { mapsUrl, type PostalAddress } from "../../location/location-info";
import { colors, Cta, Details, Headline, KeyCard, KeyValue, Layout, oneLine, Paragraph, text } from "../email-kit";
import { type CustomerEmailKind, jobNoun, MESSAGES } from "./messages";

export interface CustomerEmailInput {
  kind: CustomerEmailKind;
  locale: Locale;
  // Picks the word for the job ("repair", "retouche"...), see messages.ts.
  businessTypeCode: string;
  customerName: string;
  ticketTitle: string;
  // The shop's number for the Ticket, for the Customer to quote (ADR 0154).
  ticketNumber: number;
  // Shown in the ticket-created email when set, the subject of a
  // READY_DATE_CHANGED one.
  estimatedReadyDate: CalendarDate | null;
  location: {
    name: string;
    contactPhone: string;
    contactEmail: string;
    address: PostalAddress | null;
    logoUrl: string | null;
  };
  trackingUrl: string;
  // Only shown in a READY_REMINDER, to the page asking the Customer to confirm.
  collectedUrl: string;
  // Only in a FEEDBACK_REQUEST: each star links here with ?stars=. Opening it
  // records nothing, as a mail scanner opens them all, and 5 stars goes
  // straight on to Google (ADR 0076).
  ratingUrl: string;
  // The Location sends a FEEDBACK_REQUEST after COMPLETED (ADR 0039).
  asksForFeedback: boolean;
  // Only in a FEEDBACK_REPLY: what the shop wrote back.
  reply?: string;
  stopUpdatesUrl: string;
}

const DATE_LOCALES: Record<Locale, string> = { EN: "en-GB", FR: "fr-BE" };

// A date with no time: formatted in UTC, the zone it's parsed in, so no
// offset can move it to the day before.
function formatReadyDate(date: CalendarDate | null, locale: Locale) {
  return date
    ? new Intl.DateTimeFormat(DATE_LOCALES[locale], {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }).format(new Date(date))
    : "";
}

function messageParams(input: CustomerEmailInput) {
  return {
    location: input.location.name,
    title: input.ticketTitle,
    job: jobNoun(input.locale, input.businessTypeCode),
    readyDate: formatReadyDate(input.estimatedReadyDate, input.locale),
  };
}

function CustomerEmail({ input }: { input: CustomerEmailInput }) {
  const messages = MESSAGES[input.locale];
  const params = messageParams(input);
  const { job } = params;
  const kind = messages.kinds[input.kind];
  const body = kind.body(params);
  const { address } = input.location;
  const showsDate =
    (input.kind === "TICKET_CREATED" || input.kind === "READY_DATE_CHANGED") && input.estimatedReadyDate;

  return (
    <Layout
      locale={input.locale}
      preview={body}
      sender={{ kind: "shop", name: input.location.name, logoUrl: input.location.logoUrl }}
      footer={
        <>
          {messages.footer({ location: input.location.name, job })}{" "}
          <Link href={input.stopUpdatesUrl} style={{ color: colors.muted, textDecoration: "underline" }}>
            {messages.stopUpdates(job)}
          </Link>
        </>
      }
    >
      <Headline>{kind.subject(params)}</Headline>
      <Paragraph>{messages.greeting(input.customerName)}</Paragraph>
      <Paragraph>{body}</Paragraph>
      <KeyCard label={kind.status(params)}>
        {input.kind === "FEEDBACK_REQUEST" ? (
          <>
            <Text style={{ fontSize: "40px", lineHeight: "48px", margin: "0 0 4px" }}>
              {[1, 2, 3, 4, 5].map((stars) => (
                <Link
                  key={stars}
                  href={`${input.ratingUrl}?stars=${stars}`}
                  title={messages.starLabel(stars)}
                  aria-label={messages.starLabel(stars)}
                  style={{ color: colors.brand, padding: "0 4px", textDecoration: "none" }}
                >
                  ★
                </Link>
              ))}
            </Text>
            <Text style={{ ...text, color: colors.surface, fontSize: "14px", lineHeight: "20px", margin: 0 }}>
              {messages.starsHint}
            </Text>
          </>
        ) : input.kind === "FEEDBACK_REPLY" ? (
          <KeyValue prose>{input.reply}</KeyValue>
        ) : (
          <KeyValue detail={showsDate ? messages.readyBy(params) : undefined}>
            {input.ticketTitle} · #{input.ticketNumber}
          </KeyValue>
        )}
      </KeyCard>
      {input.kind === "TICKET_CREATED" && input.asksForFeedback && (
        <Paragraph muted>{messages.feedbackNotice}</Paragraph>
      )}
      {input.kind === "FEEDBACK_REPLY" ? (
        <Paragraph>{messages.replyHint(input.location.name)}</Paragraph>
      ) : (
        input.kind !== "FEEDBACK_REQUEST" && <Cta href={input.trackingUrl}>{messages.trackButton(job)}</Cta>
      )}
      {input.kind === "READY_REMINDER" && (
        <Paragraph>
          <Link href={input.collectedUrl} style={{ color: colors.ink, fontWeight: 700, textDecoration: "underline" }}>
            {messages.alreadyCollected(job)}
          </Link>
        </Paragraph>
      )}
      <Details
        title={messages.contact(input.location.name)}
        rows={[
          {
            label: messages.contactLabels.phone,
            value: input.location.contactPhone,
            href: `tel:${input.location.contactPhone}`,
          },
          {
            label: messages.contactLabels.email,
            value: input.location.contactEmail,
            href: `mailto:${input.location.contactEmail}`,
          },
          ...(address
            ? [
                {
                  label: messages.contactLabels.address,
                  value: `${address.streetAddress}, ${address.postalCode} ${address.addressLocality}`,
                  href: mapsUrl(address),
                },
              ]
            : []),
        ]}
      />
    </Layout>
  );
}

// The calendar event's name, in the Customer's language (ADR 0127).
export function calendarTitle(locale: Locale, businessTypeCode: string, location: string) {
  return MESSAGES[locale].calendarTitle({ location, job: jobNoun(locale, businessTypeCode) });
}

export function buildCustomerEmail(input: CustomerEmailInput): { subject: string; react: ReactElement } {
  const subject = MESSAGES[input.locale].kinds[input.kind].subject(messageParams(input));
  return { subject: oneLine(subject), react: <CustomerEmail input={input} /> };
}
