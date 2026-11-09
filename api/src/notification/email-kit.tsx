import { Body, Button, Column, Container, Font, Head, Html, Img, Link, Preview, Row, Section, Text } from "react-email";
import type { Locale } from "@readyyet/db";
import type { CSSProperties, ReactNode } from "react";

// ADR 0127: every email on the dashboard's tokens. Mail apps ignore
// stylesheets, so each style is inline; Figtree loads where the app allows
// web fonts (Apple Mail, iOS), Helvetica elsewhere.
export const colors = {
  canvas: "#eef0ec",
  surface: "#ffffff",
  subtle: "#f3f5f1",
  border: "#dcdfdb",
  ink: "#15211d",
  muted: "#4a5852",
  pine: "#17423a",
  brand: "#d6ff53",
  danger: "#b3261e",
};

const FONT = "Figtree, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
// The one variable file Google Fonts serves for Latin, every weight in it.
const FIGTREE_URL = "https://fonts.gstatic.com/s/figtree/v9/_Xms-HUzqDCFdgfMm4S9DQ.woff2";

// Served by the web app: Gmail and Outlook don't show SVG.
export const logoUrl = () => `${process.env.WEB_URL}/email/logo.png`;
export const SITE_URL = "https://readyyet.app";
const SENT_WITH: Record<Locale, string> = { EN: "Sent with ReadyYet", FR: "Envoyé avec ReadyYet" };

export const text: CSSProperties = {
  color: colors.ink,
  fontFamily: FONT,
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

// Bold and large: the one line read before deciding to open the rest.
export function Headline({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        ...text,
        fontSize: "30px",
        lineHeight: "36px",
        fontWeight: 800,
        letterSpacing: "-0.5px",
        margin: "0 0 16px",
      }}
    >
      {children}
    </Text>
  );
}

export function Paragraph({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <Text style={{ ...text, ...(muted && { color: colors.muted, fontSize: "14px", lineHeight: "22px" }) }}>
      {children}
    </Text>
  );
}

export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.pine,
          borderRadius: "999px",
          color: colors.surface,
          fontFamily: FONT,
          fontSize: "16px",
          fontWeight: 700,
          padding: "16px 28px",
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

// The email's reason to exist, the first thing the eye lands on: a code, a
// Ticket and its date, the stars to tap.
export function KeyCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Section style={{ backgroundColor: colors.pine, borderRadius: "20px", margin: "8px 0 24px", padding: "24px" }}>
      <Text
        style={{
          color: colors.brand,
          fontFamily: FONT,
          fontSize: "12px",
          fontWeight: 700,
          letterSpacing: "1px",
          lineHeight: "16px",
          margin: "0 0 8px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      {children}
    </Section>
  );
}

// Inside a KeyCard: white on pine, and a smaller line under it. Prose, like
// a reply that can run to paragraphs, reads at body size.
export function KeyValue({ children, detail, prose }: { children: ReactNode; detail?: ReactNode; prose?: boolean }) {
  return (
    <>
      <Text
        style={{
          color: colors.surface,
          fontFamily: FONT,
          fontSize: prose ? "17px" : "22px",
          fontWeight: prose ? 400 : 700,
          lineHeight: prose ? "27px" : "28px",
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {children}
      </Text>
      {detail && (
        <Text
          style={{ color: colors.brand, fontFamily: FONT, fontSize: "16px", lineHeight: "24px", margin: "8px 0 0" }}
        >
          {detail}
        </Text>
      )}
    </>
  );
}

// Alone in its line, one run of digits: what Apple Mail and Gmail look for
// to offer the code for autofill or copying.
export function Code({ code }: { code: string }) {
  return (
    <Text
      style={{
        color: colors.brand,
        fontFamily: MONO,
        fontSize: "40px",
        fontWeight: 700,
        letterSpacing: "10px",
        lineHeight: "48px",
        margin: 0,
      }}
    >
      {code}
    </Text>
  );
}

// Someone's own words, as they wrote them.
export function Quote({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        ...text,
        backgroundColor: colors.subtle,
        borderRadius: "16px",
        padding: "16px 20px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {children}
    </Text>
  );
}

// Labelled rows, each a large tap target: a phone number, an address.
export function Details({ title, rows }: { title: string; rows: { label: string; value: string; href: string }[] }) {
  return (
    <Section
      style={{ border: `1px solid ${colors.border}`, borderRadius: "20px", margin: "8px 0 0", padding: "8px 20px" }}
    >
      <Text style={{ ...text, fontSize: "14px", fontWeight: 700, margin: "12px 0 4px" }}>{title}</Text>
      {rows.map((row) => (
        <Row key={row.label}>
          <Column style={{ padding: "10px 0", width: "96px", verticalAlign: "top" }}>
            <Text style={{ ...text, color: colors.muted, fontSize: "14px", lineHeight: "22px", margin: 0 }}>
              {row.label}
            </Text>
          </Column>
          <Column style={{ padding: "10px 0" }}>
            <Link
              href={row.href}
              style={{ color: colors.ink, fontFamily: FONT, fontSize: "16px", fontWeight: 700, lineHeight: "22px" }}
            >
              {row.value}
            </Link>
          </Column>
        </Row>
      ))}
    </Section>
  );
}

function LogoMark({ size }: { size: number }) {
  return (
    <Img
      src={logoUrl()}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: `${size / 4}px`, display: "block" }}
    />
  );
}

// ReadyYet's own emails carry its logo; a shop's, its logo or its name.
export type Sender = { kind: "readyyet" } | { kind: "shop"; name: string; logoUrl: string | null };

function Header({ sender }: { sender: Sender }) {
  if (sender.kind === "shop") {
    return (
      <Section style={{ margin: "0 0 28px" }}>
        {sender.logoUrl ? (
          <Img src={sender.logoUrl} alt={sender.name} height={56} style={{ display: "block", maxWidth: "100%" }} />
        ) : (
          <Text style={{ ...text, fontSize: "18px", fontWeight: 800, margin: 0 }}>{sender.name}</Text>
        )}
      </Section>
    );
  }
  return (
    <Section style={{ margin: "0 0 28px" }}>
      <Row>
        <Column style={{ width: "48px" }}>
          <LogoMark size={36} />
        </Column>
        <Column>
          <Text style={{ ...text, fontSize: "20px", fontWeight: 800, letterSpacing: "-0.3px", margin: 0 }}>
            ReadyYet
          </Text>
        </Column>
      </Row>
    </Section>
  );
}

export function Layout({
  locale,
  preview,
  sender,
  footer,
  children,
}: {
  locale: Locale;
  preview: string;
  sender: Sender;
  // Under the card, small: why this email came, and how to stop it.
  footer?: ReactNode;
  children: ReactNode;
}) {
  const lang = locale.toLowerCase();
  return (
    <Html lang={lang}>
      <Head>
        {/* Light only: dark mode apps would otherwise invert the pine and lime. */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <Font
          fontFamily="Figtree"
          fallbackFontFamily={["Helvetica", "Arial", "sans-serif"]}
          webFont={{ url: FIGTREE_URL, format: "woff2" }}
          fontWeight="400 800"
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      {/* Body sets its own lang, English unless told otherwise. */}
      <Body lang={lang} style={{ backgroundColor: colors.canvas, fontFamily: FONT, margin: 0, padding: "32px 12px" }}>
        <Container
          style={{
            backgroundColor: colors.surface,
            borderRadius: "28px",
            maxWidth: "560px",
            padding: "36px 32px 32px",
          }}
        >
          <Header sender={sender} />
          {children}
        </Container>
        <Container style={{ maxWidth: "560px", padding: "24px 32px 0" }}>
          {footer && (
            <Text style={{ ...text, color: colors.muted, fontSize: "13px", lineHeight: "20px", margin: "0 0 16px" }}>
              {footer}
            </Text>
          )}
          <Link href={SITE_URL} style={{ textDecoration: "none" }}>
            <Row style={{ width: "auto" }}>
              <Column style={{ width: "28px" }}>
                <LogoMark size={20} />
              </Column>
              <Column>
                <Text style={{ ...text, color: colors.muted, fontSize: "13px", fontWeight: 700, margin: 0 }}>
                  {sender.kind === "shop" ? SENT_WITH[locale] : "ReadyYet"}
                </Text>
              </Column>
            </Row>
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

// A subject is a single header line, a line break in a name must not
// become a second header.
export const oneLine = (subject: string) => subject.replace(/\s+/g, " ").trim();
