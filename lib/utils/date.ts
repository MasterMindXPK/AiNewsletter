export const DEFAULT_TIMEZONE = "Asia/Karachi";

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function safeTimezone(timezone: string): string {
  return isValidTimezone(timezone) ? timezone : DEFAULT_TIMEZONE;
}

/** "Saturday, October 17, 2026" in the reader's time zone. */
export function formatEditionDate(
  date: Date | string = new Date(),
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: safeTimezone(timezone),
  }).format(new Date(date));
}

/** "YYYY-MM-DD" for the current moment in the given time zone. */
export function todayInTimezone(timezone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: safeTimezone(timezone),
  }).format(new Date());
}
