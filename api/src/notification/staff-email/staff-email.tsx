import { Column, Row, Section, Text } from "react-email";
import type { InvitationRole, Locale } from "@readyyet/db";
import type { ReactElement } from "react";
import { Code, colors, Cta, Headline, KeyCard, KeyValue, Layout, oneLine, Paragraph, Quote, text } from "../email-kit";
import { MESSAGES, ROLE_NAMES } from "./messages";

const READYYET = { kind: "readyyet" } as const;

export function buildSignInCodeEmail(input: { locale: Locale; code: string; expiresInMinutes: number }) {
  const messages = MESSAGES[input.locale].signInCode;
  const react: ReactElement = (
    <Layout locale={input.locale} preview={messages.preview} sender={READYYET} footer={messages.ignore}>
      <Headline>{messages.headline}</Headline>
      <Paragraph>{messages.intro}</Paragraph>
      <KeyCard label={messages.label}>
        <Code code={input.code} />
      </KeyCard>
      <Paragraph muted>{messages.expiry(input.expiresInMinutes)}</Paragraph>
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
    <Layout locale={input.locale} preview={body} sender={READYYET} footer={messages.ignore}>
      <Headline>{messages.headline(input)}</Headline>
      <Paragraph>{body}</Paragraph>
      <KeyCard label={messages.label}>
        <KeyValue detail={messages.asRole(input)}>{input.location}</KeyValue>
      </KeyCard>
      <Cta href={input.acceptUrl}>{messages.button}</Cta>
      <Paragraph muted>
        {messages.signInWith(input)} {messages.expiry(input)}
      </Paragraph>
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
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline(input)}</Headline>
      <Paragraph>{body}</Paragraph>
      <Paragraph>{messages.powers}</Paragraph>
      <Cta href={input.appUrl}>{messages.button}</Cta>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

// Bold and boxed: this line is the reason the email exists.
function Warning({ children }: { children: string }) {
  return (
    <Text
      style={{
        ...text,
        backgroundColor: "#fdeeec",
        borderRadius: "16px",
        color: colors.danger,
        fontWeight: 700,
        padding: "16px 20px",
      }}
    >
      {children}
    </Text>
  );
}

export function buildPreviousOwnerEmail(input: OwnershipTransferInput) {
  const messages = MESSAGES[input.locale].previousOwner;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline}</Headline>
      <Paragraph>{body}</Paragraph>
      <Paragraph>{messages.stillAdmin}</Paragraph>
      <Warning>{messages.notYou}</Warning>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

export function buildAccountDeletedEmail(input: { locale: Locale; email: string }) {
  const messages = MESSAGES[input.locale].accountDeleted;
  const body = messages.body(input.email);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline}</Headline>
      <Paragraph>{body}</Paragraph>
      <Paragraph>{messages.history}</Paragraph>
      <Paragraph>{messages.newAccount}</Paragraph>
      <Warning>{messages.notYou}</Warning>
    </Layout>
  );
  return { subject: messages.subject, react };
}

export function buildTrialEndingEmail(input: { locale: Locale; location: string; days: number; billingUrl: string }) {
  const messages = MESSAGES[input.locale].trialEnding;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline(input)}</Headline>
      <Paragraph>{body}</Paragraph>
      <Cta href={input.billingUrl}>{messages.button}</Cta>
      <Paragraph muted>{messages.kept}</Paragraph>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

const stars = (count: number) => `${"★".repeat(count)}${"☆".repeat(5 - count)}`;

// ADR 0039: sent at once, private feedback is the shop's chance to fix a
// problem before it becomes a public review.
export function buildFeedbackReceivedEmail(input: {
  locale: Locale;
  location: string;
  customer: string;
  title: string;
  stars: number | null;
  // Null for a low rating sent without a word (ADR 0125).
  message: string | null;
  feedbackUrl: string;
}) {
  const messages = MESSAGES[input.locale].feedbackReceived;
  const body = input.message === null ? messages.lowRating(input) : messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline}</Headline>
      <Paragraph>{body}</Paragraph>
      <KeyCard label={input.customer}>
        <KeyValue detail={input.title}>{input.stars === null ? input.location : stars(input.stars)}</KeyValue>
      </KeyCard>
      {input.message !== null && <Quote>{input.message}</Quote>}
      <Cta href={input.feedbackUrl}>{messages.button}</Cta>
    </Layout>
  );
  const subject = input.message === null ? messages.lowRatingSubject(input) : messages.subject(input);
  return { subject: oneLine(subject), react };
}

// ADR 0127: to an Owner whose first shop was just created.
export function buildWelcomeEmail(input: { locale: Locale; location: string; trialEndsOn: string; appUrl: string }) {
  const messages = MESSAGES[input.locale].welcome;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET} footer={messages.help}>
      <Headline>{messages.headline}</Headline>
      <Paragraph>{body}</Paragraph>
      <KeyCard label={messages.trialLabel}>
        <KeyValue detail={messages.trialDetail(input)}>{messages.trialValue}</KeyValue>
      </KeyCard>
      <Text style={{ ...text, fontSize: "18px", fontWeight: 800, margin: "0 0 12px" }}>{messages.stepsTitle}</Text>
      {messages.steps.map((step, index) => (
        <Section key={step} style={{ margin: "0 0 12px" }}>
          <Row>
            <Column style={{ verticalAlign: "top", width: "44px" }}>
              <Text
                style={{
                  ...text,
                  backgroundColor: colors.brand,
                  borderRadius: "999px",
                  fontWeight: 800,
                  height: "32px",
                  lineHeight: "32px",
                  margin: 0,
                  textAlign: "center",
                  width: "32px",
                }}
              >
                {index + 1}
              </Text>
            </Column>
            <Column>
              <Text style={{ ...text, margin: "3px 0 0" }}>{step}</Text>
            </Column>
          </Row>
        </Section>
      ))}
      <Section style={{ height: "12px" }} />
      <Cta href={input.appUrl}>{messages.button}</Cta>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

export interface JoinedInput {
  member: string;
  memberEmail: string;
  location: string;
  business: string;
  role: InvitationRole;
}

// ADR 0127: to the new member once they accepted an invitation.
export function buildJoinedTeamEmail(input: JoinedInput & { locale: Locale; locationUrl: string }) {
  const messages = MESSAGES[input.locale].joinedTeam;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline(input)}</Headline>
      <Paragraph>{body}</Paragraph>
      <KeyCard label={messages.label}>
        <KeyValue detail={`${input.location}, ${input.business}`}>{ROLE_NAMES[input.locale][input.role]}</KeyValue>
      </KeyCard>
      <Cta href={input.locationUrl}>{messages.button(input)}</Cta>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}

// ADR 0127: to whoever sent the invitation the new member accepted.
export function buildMemberJoinedEmail(input: JoinedInput & { locale: Locale; teamUrl: string }) {
  const messages = MESSAGES[input.locale].memberJoined;
  const body = messages.body(input);
  const react: ReactElement = (
    <Layout locale={input.locale} preview={body} sender={READYYET}>
      <Headline>{messages.headline(input)}</Headline>
      <Paragraph>{body}</Paragraph>
      <Cta href={input.teamUrl}>{messages.button}</Cta>
    </Layout>
  );
  return { subject: oneLine(messages.subject(input)), react };
}
