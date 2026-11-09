const DAY_MS = 24 * 60 * 60 * 1000;

// Days after the Status event that set READY (ADR 0028).
const REMINDER_DAYS = [3, 10];

// When reminder number `sent` + 1 is due, null once both went out.
export function nextReadyReminderAt(readyAt: Date, sent: number): Date | null {
  return sent < REMINDER_DAYS.length ? new Date(readyAt.getTime() + REMINDER_DAYS[sent] * DAY_MS) : null;
}

// 9:00 to 19:00 on the Location's clock: a reminder at 3 in the morning
// is the kind of email that gets marked as spam.
export function isReminderHour(now: Date, timeZone: string): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  return hour >= 9 && hour < 19;
}
