import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "react-email";
import type { Locale } from "@readyyet/db";
import type { CalendarDate } from "@readyyet/shared";
import type { ReactElement } from "react";
import { mapsUrl, type PostalAddress } from "../../location/location-info";
import { styles } from "../email-styles";
import { type CustomerEmailKind, jobNoun, MESSAGES } from "./messages";

export interface CustomerEmailInput {
  kind: CustomerEmailKind;
  locale: Locale;
  // Picks the word for the job ("repair", "retouche"...), see messages.ts.
  businessTypeCode: string;
  customerName: string;
  ticketTitle: string;
  // Shown in the ticket-created email when set, the subject of a
  // READY_DATE_CHANGED one.
  estimatedReadyDate: CalendarDate | null;
  location: { name: string; contactPhone: string; contactEmail: string; address: PostalAddress | null };
  trackingUrl: string;
  // Only shown in a READY_REMINDER, to the page asking the Customer to confirm.
  collectedUrl: string;
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
  const body = messages.kinds[input.kind].body(params);

  return (
    <Html lang={input.locale.toLowerCase()}>
      <Head />
      <Preview>{body}</Preview>
      {/* Body sets its own lang, English unless told otherwise. */}
      <Body lang={input.locale.toLowerCase()} style={styles.body}>
        <Container style={styles.container}>
          <Heading as="h1" style={styles.heading}>
            {input.location.name}
          </Heading>
          <Text style={styles.text}>{messages.greeting(input.customerName)}</Text>
          <Text style={styles.text}>{body}</Text>
          {input.kind === "TICKET_CREATED" && input.estimatedReadyDate && (
            <Text style={styles.text}>{messages.readyBy(params)}</Text>
          )}
          <Section style={{ margin: "24px 0" }}>
            <Button href={input.trackingUrl} style={styles.button}>
              {messages.trackButton(job)}
            </Button>
          </Section>
          {input.kind === "READY_REMINDER" && (
            <Text style={styles.text}>
              <Link href={input.collectedUrl}>{messages.alreadyCollected(job)}</Link>
            </Text>
          )}
          <Hr />
          <Text style={styles.contact}>{messages.contact(input.location.name)}</Text>
          <Text style={styles.contact}>
            <Link href={`tel:${input.location.contactPhone}`}>{input.location.contactPhone}</Link>
            {" · "}
            <Link href={`mailto:${input.location.contactEmail}`}>{input.location.contactEmail}</Link>
          </Text>
          {input.location.address && (
            <Text style={styles.contact}>
              <Link href={mapsUrl(input.location.address)}>
                {`${input.location.address.streetAddress}, ${input.location.address.postalCode} ${input.location.address.addressLocality}`}
              </Link>
            </Text>
          )}
          <Hr />
          <Text style={styles.footer}>
            {messages.footer({ location: input.location.name, job })}{" "}
            <Link href={input.stopUpdatesUrl}>{messages.stopUpdates(job)}</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function buildCustomerEmail(input: CustomerEmailInput): { subject: string; react: ReactElement } {
  const subject = MESSAGES[input.locale].kinds[input.kind].subject(messageParams(input));
  // A subject is a single header line, a line break in a Location's name
  // must not become a second header.
  return { subject: subject.replace(/\s+/g, " ").trim(), react: <CustomerEmail input={input} /> };
}
