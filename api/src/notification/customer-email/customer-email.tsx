import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Link } from "@react-email/link";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import type { Locale } from "@readyyet/db";
import type { ReactElement } from "react";
import { type CustomerEmailKind, jobNoun, MESSAGES } from "./messages";

export interface CustomerEmailInput {
  kind: CustomerEmailKind;
  locale: Locale;
  // Picks the word for the job ("repair", "retouche"...), see messages.ts.
  businessTypeCode: string;
  customerName: string;
  ticketTitle: string;
  location: { name: string; contactPhone: string; contactEmail: string };
  trackingUrl: string;
  stopUpdatesUrl: string;
}

// Email clients ignore stylesheets, inline styles are the only styling
// that renders reliably.
const styles = {
  body: { backgroundColor: "#f4f4f5", fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: "24px 0" },
  container: { backgroundColor: "#ffffff", borderRadius: "8px", maxWidth: "560px", padding: "32px" },
  heading: { color: "#18181b", fontSize: "20px", margin: "0 0 24px" },
  text: { color: "#27272a", fontSize: "16px", lineHeight: "24px" },
  button: {
    backgroundColor: "#18181b",
    borderRadius: "6px",
    color: "#ffffff",
    fontSize: "16px",
    padding: "12px 20px",
    textDecoration: "none",
  },
  contact: { color: "#3f3f46", fontSize: "14px", lineHeight: "22px", margin: "0" },
  footer: { color: "#71717a", fontSize: "12px", lineHeight: "18px" },
};

function CustomerEmail({ input }: { input: CustomerEmailInput }) {
  const messages = MESSAGES[input.locale];
  const job = jobNoun(input.locale, input.businessTypeCode);
  const params = { location: input.location.name, title: input.ticketTitle, job };
  const body = messages.kinds[input.kind].body(params);

  return (
    <Html lang={input.locale.toLowerCase()}>
      <Head />
      <Preview>{body}</Preview>
      <Body style={styles.body}>
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
