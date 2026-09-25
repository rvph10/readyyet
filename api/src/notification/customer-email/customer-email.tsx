import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from "react-email";
import type { Locale } from "@readyyet/db";
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
  location: { name: string; contactPhone: string; contactEmail: string; address: PostalAddress | null };
  trackingUrl: string;
  stopUpdatesUrl: string;
}

function CustomerEmail({ input }: { input: CustomerEmailInput }) {
  const messages = MESSAGES[input.locale];
  const job = jobNoun(input.locale, input.businessTypeCode);
  const params = { location: input.location.name, title: input.ticketTitle, job };
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
          <Section style={{ margin: "24px 0" }}>
            <Button href={input.trackingUrl} style={styles.button}>
              {messages.trackButton(job)}
            </Button>
          </Section>
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
  const subject = MESSAGES[input.locale].kinds[input.kind].subject({
    location: input.location.name,
    title: input.ticketTitle,
    job: jobNoun(input.locale, input.businessTypeCode),
  });
  // A subject is a single header line, a line break in a Location's name
  // must not become a second header.
  return { subject: subject.replace(/\s+/g, " ").trim(), react: <CustomerEmail input={input} /> };
}
