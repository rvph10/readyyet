import type { CalendarDate } from "@readyyet/shared";
import type { EmailAttachment } from "../../email/email.service";

// RFC 5545 text: these four would otherwise end a value or a field.
const escape = (value: string) => value.replace(/[\\;,]/g, "\\$&").replace(/\r?\n/g, "\\n");

// Lines longer than 75 octets continue on the next, after a space.
function fold(line: string) {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return [...parts, rest].join("\r\n ");
}

const compact = (date: string) => date.replaceAll("-", "");
const stamp = (instant: Date) => `${instant.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

// ADR 0127: the ready date as an all-day event, attached to the emails that
// state it, which mail apps offer to add to the calendar. One UID per
// Ticket and a growing SEQUENCE, so a new date replaces the old one.
export function readyDateEvent(input: {
  trackingCode: string;
  date: CalendarDate;
  title: string;
  location: string;
  address: string | null;
  trackingUrl: string;
  now?: Date;
}): EmailAttachment {
  const now = input.now ?? new Date();
  const next = new Date(`${input.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReadyYet//Ready date//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.trackingCode}-ready@readyyet.app`,
    `SEQUENCE:${Math.floor(now.getTime() / 1000)}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${compact(input.date)}`,
    `DTEND;VALUE=DATE:${compact(next.toISOString().slice(0, 10))}`,
    `SUMMARY:${escape(input.title)}`,
    ...(input.address ? [`LOCATION:${escape(`${input.location}, ${input.address}`)}`] : []),
    `DESCRIPTION:${escape(input.trackingUrl)}`,
    `URL:${input.trackingUrl}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return {
    filename: "ready-date.ics",
    content: Buffer.from(`${lines.map(fold).join("\r\n")}\r\n`).toString("base64"),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };
}
