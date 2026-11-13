import { describe, expect, it } from "vitest";
import { readyDateEvent } from "../src/notification/customer-email/calendar-event";

const decode = (content: string) => Buffer.from(content, "base64").toString("utf8");

// ADR 0127: the ready date as an all-day calendar event.
describe("Ready date event", () => {
  const event = readyDateEvent({
    trackingCode: "AbC123",
    date: "2026-11-14",
    title: "Collect your repair at Joe's Garage, Ixelles; today",
    location: "Joe's Garage",
    address: "Rue du Trône 100, 1050 Ixelles",
    trackingUrl: "https://app.readyyet.app/t/AbC123",
    now: new Date("2026-11-09T10:00:00Z"),
  });
  const ics = decode(event.content);

  it("is an all-day event on the ready date, the same one each time", () => {
    expect(event).toMatchObject({ filename: "ready-date.ics", contentType: expect.stringContaining("text/calendar") });
    expect(ics).toContain("DTSTART;VALUE=DATE:20261114\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20261115\r\n");
    expect(ics).toContain("UID:AbC123-ready@readyyet.app\r\n");
    expect(ics).toContain("DTSTAMP:20261109T100000Z\r\n");
  });

  it("escapes what would end a field", () => {
    expect(ics).toContain("SUMMARY:Collect your repair at Joe's Garage\\, Ixelles\\; today");
  });

  it("folds a long line at 75 octets, the space included, without cutting a character", () => {
    const title = `Votre réparation chez Vélo 🚲 Atelier ${"é".repeat(60)} devrait être prête`;
    const long = decode(
      readyDateEvent({
        trackingCode: "x",
        date: "2026-11-14",
        title,
        location: "l",
        address: null,
        trackingUrl: "https://x",
      }).content,
    );

    for (const line of long.split("\r\n")) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    }
    expect(long).not.toContain("\uFFFD");
    expect(long.replaceAll("\r\n ", "")).toContain(`SUMMARY:${title}`);
  });

  it("goes up in sequence, so a new date replaces the old one", () => {
    const later = readyDateEvent({
      trackingCode: "AbC123",
      date: "2026-11-20",
      title: "t",
      location: "l",
      address: null,
      trackingUrl: "https://x",
      now: new Date("2026-11-10T10:00:00Z"),
    });
    const sequence = (text: string) => Number(/SEQUENCE:(\d+)/.exec(text)![1]);

    expect(sequence(decode(later.content))).toBeGreaterThan(sequence(ics));
    expect(decode(later.content)).not.toContain("LOCATION:");
  });

  it("marks the event cancelled for a Ticket that ended, and only then", () => {
    const cancelled = readyDateEvent({
      trackingCode: "AbC123",
      date: "2026-11-14",
      title: "t",
      location: "l",
      address: null,
      trackingUrl: "https://x",
      cancelled: true,
    });

    expect(decode(cancelled.content)).toContain("UID:AbC123-ready@readyyet.app\r\nSEQUENCE:");
    expect(decode(cancelled.content)).toContain("STATUS:CANCELLED\r\n");
    expect(ics).not.toContain("STATUS:");
  });
});
