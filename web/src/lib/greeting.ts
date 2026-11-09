const MORNING_ENDS = 12;
const AFTERNOON_ENDS = 18;

export function greetingKey(now: Date, timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < MORNING_ENDS) return "morning";
  return hour < AFTERNOON_ENDS ? "afternoon" : "evening";
}
