// Format a Date as YYYY-MM-DD using the LOCAL timezone, not UTC.
// Using toISOString() converts to UTC first, which can shift the date
// by one day for users in negative-UTC-offset timezones after 8pm local time.
export function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayLocalDateString(): string {
  return localDateString(new Date());
}
