import { Body } from "@react-email/body";
import { Button } from "@react-email/button";
import { Container } from "@react-email/container";
import { Head } from "@react-email/head";
import { Heading } from "@react-email/heading";
import { Hr } from "@react-email/hr";
import { Html } from "@react-email/html";
import { Preview } from "@react-email/preview";
import { Section } from "@react-email/section";
import { Text } from "@react-email/text";
import { Locale } from "@readyyet/db";
import type { InvitationRole } from "@readyyet/db";
import type { ReactElement, ReactNode } from "react";
import { styles } from "../email-styles";
import { MESSAGES } from "./messages";

const codeStyle = {
  ...styles.text,
  backgroundColor: "#f4f4f5",
  borderRadius: "6px",
  fontSize: "32px",
  fontWeight: "bold",
  letterSpacing: "8px",
  padding: "16px",
  textAlign: "center" as const,
};

// A sign-in happens before we know anything about the User, the browser's
// preferred language is the only hint. English when none we support.
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  const preferred = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { language: tag.split("-")[0].toUpperCase(), q: q === undefined ? 1 : Number(q) };
    })
    .filter(({ q }) => q > 0)
    .sort((a, b) => b.q - a.q)
    .find(({ language }) => Object.hasOwn(Locale, language));
  return (preferred?.language as Locale | undefined) ?? Locale.EN;
}

function Layout({ locale, preview, children }: { locale: Locale; preview: string; children: ReactNode }) {
  return (
    <Html lang={locale.toLowerCase()}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>{children}</Container>
      </Body>
    </Html>
  );
}

// A subject is a single header line, a line break in a name must not
// become a second header.
const oneLine = (subject: string) => subject.replace(/\s+/g, " ").trim();

export function buildSignInCodeEmail(input: { locale: Locale; code: string; expiresInMinutes: number }) {
  const messages = MESSAGES[input.locale].signInCode;
  const react: ReactElement = (
    <Layout locale={input.locale} preview={messages.preview}>
      <Heading as="h1" style={styles.heading}>
        ReadyYet
      </Heading>
      <Text style={styles.text}>{messages.intro}</Text>
      <Text style={codeStyle}>{input.code}</Text>
      <Text style={styles.text}>{messages.expiry(input.expiresInMinutes)}</Text>
      <Hr />
      <Text style={styles.footer}>{messages.ignore}</Text>
    </Layout>
  );
  return { subject: messages.subject, react };
}

export interface InvitationEmailInput {
  locale: Locale;
  inviter: string;
  location: string;
  business: string;
  role: InvitationRole;
  email: string;
  expiresInDays: number;
  acceptUrl: string;
}

export function buildInvitationEmail(input: InvitationEmailInput) {
  const messages = MESSAGES[input.locale].invitation;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body}>
      <Heading as="h1" style={styles.heading}>
        {input.location}
      </Heading>
      <Text style={styles.text}>{body}</Text>
      <Text style={styles.text}>{messages.signInWith(input)}</Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={input.acceptUrl} style={styles.button}>
          {messages.button}
        </Button>
      </Section>
      <Text style={styles.text}>{messages.expiry(input)}</Text>
      <Hr />
      <Text style={styles.footer}>{messages.ignore}</Text>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}
