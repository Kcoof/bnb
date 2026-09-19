import "server-only";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Current date-time in an IANA zone, formatted for prompts/logs. */
export function nowInZone(timezone: string): Date {
  // "now" re-expressed on the zone's wall clock: we only need local fields,
  // so we go through a formatted string and back.
  const now = new Date();
  const local = formatInTimeZone(now, timezone, "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(local + "Z");
}

/** Format helper for property-local display. */
export function fmtLocal(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd HH:mm");
}

/**
 * UTC instant for a local wall-clock time in a zone.
 * e.g. localAt("2026-09-21", "09:00", "Europe/Berlin")
 */
export function localAt(dateStr: string, hhmm: string, timezone: string): Date {
  return fromZonedTime(`${dateStr}T${hhmm}:00`, timezone);
}

/** Compare only the local date part of "now" in the zone. */
export function localDateStr(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

/** Local HH:mm of the current instant in the zone. */
export function localHHMM(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "HH:mm");
}
