// What must not reach the logs or Sentry: a tracking code gives access to a
// ticket (ADR 0004), a search term is usually a customer's name.

export function maskTrackingCode(url: string): string {
  return url.replace(/\/tracking\/[^/?#\s]+/, "/tracking/[redacted]");
}

export function maskSearchTerm(url: string): string {
  return url.replace(/([?&]q=)[^&#]*/g, "$1[redacted]");
}

// Prisma quotes the whole query, argument values included, between the line
// naming the call and the last line saying what's wrong with it.
export function withoutQueryArguments(message: string): string {
  const lines = message.split("\n").filter((line) => line.trim());
  return `${lines[0]} ${lines[lines.length - 1]}`;
}
