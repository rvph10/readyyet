import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "react-email";
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

// The Customer's own words, line breaks kept.
const quoteStyle = {
  ...styles.text,
  borderLeft: "4px solid #d4d4d8",
  paddingLeft: "12px",
  whiteSpace: "pre-wrap" as const,
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
      {/* Body sets its own lang, English unless told otherwise. */}
      <Body lang={locale.toLowerCase()} style={styles.body}>
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

export interface OwnershipTransferInput {
  locale: Locale;
  business: string;
  previousOwner: string;
  newOwner: string;
  newOwnerEmail: string;
}

export function buildNewOwnerEmail(input: OwnershipTransferInput & { appUrl: string }) {
  const messages = MESSAGES[input.locale].newOwner;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body}>
      <Heading as="h1" style={styles.heading}>
        {input.business}
      </Heading>
      <Text style={styles.text}>{body}</Text>
      <Text style={styles.text}>{messages.powers}</Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={input.appUrl} style={styles.button}>
          {messages.button}
        </Button>
      </Section>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

export function buildPreviousOwnerEmail(input: OwnershipTransferInput) {
  const messages = MESSAGES[input.locale].previousOwner;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body}>
      <Heading as="h1" style={styles.heading}>
        {input.business}
      </Heading>
      <Text style={styles.text}>{body}</Text>
      <Text style={styles.text}>{messages.stillAdmin}</Text>
      <Hr />
      {/* Body text, not the small footer: this line is the reason the email exists. */}
      <Text style={{ ...styles.text, fontWeight: "bold" }}>{messages.notYou}</Text>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

export function buildAccountDeletedEmail(input: { locale: Locale; email: string }) {
  const messages = MESSAGES[input.locale].accountDeleted;
  const body = messages.body(input.email);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body}>
      <Heading as="h1" style={styles.heading}>
        ReadyYet
      </Heading>
      <Text style={styles.text}>{body}</Text>
      <Text style={styles.text}>{messages.history}</Text>
      <Text style={styles.text}>{messages.newAccount}</Text>
      <Hr />
      <Text style={{ ...styles.text, fontWeight: "bold" }}>{messages.notYou}</Text>
    </Layout>
  );
  return { subject: messages.subject, react };
}

export function buildTrialEndingEmail(input: { locale: Locale; location: string; days: number; billingUrl: string }) {
  const messages = MESSAGES[input.locale].trialEnding;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body}>
      <Heading as="h1" style={styles.heading}>
        {input.location}
      </Heading>
      <Text style={styles.text}>{body}</Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={input.billingUrl} style={styles.button}>
          {messages.button}
        </Button>
      </Section>
      <Text style={styles.text}>{messages.kept}</Text>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

// ADR 0039: sent at once, private feedback is the shop's chance to fix a
// problem before it becomes a public review.
export function buildFeedbackReceivedEmail(input: {
  locale: Locale;
  location: string;
  customer: string;
  title: string;
  message: string;
  feedbackUrl: string;
}) {
  const messages = MESSAGES[input.locale].feedbackReceived;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body}>
      <Heading as="h1" style={styles.heading}>
        {input.location}
      </Heading>
      <Text style={styles.text}>{body}</Text>
      <Text style={quoteStyle}>{input.message}</Text>
      <Section style={{ margin: "24px 0" }}>
        <Button href={input.feedbackUrl} style={styles.button}>
          {messages.button}
        </Button>
      </Section>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}
