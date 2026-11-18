import {
  CHECKIN_DAYS,
  CheckinDay,
  CheckinSchedule,
  DaySchedule,
  MAX_SLOTS_PER_DAY,
  ScheduleSlot,
} from '@/app/interfaces/checkin-schedule';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_SECONDS = 24 * 3600;

/** The error of a day, as `checkinSchedule.errors.*`. The API refuses the same cases. */
export type DayError = 'empty' | 'order' | 'overlap' | 'noSlot' | 'tooMany';

const byStart = (a: ScheduleSlot, b: ScheduleSlot) => a.start.localeCompare(b.start);

/** The first error of a day: an empty time, then an end before its start, then an overlap. */
export function dayError(day: DaySchedule): DayError | null {
  if (!day.open) return null;
  if (day.slots.length === 0) return 'noSlot';
  if (day.slots.length > MAX_SLOTS_PER_DAY) return 'tooMany';
  if (day.slots.some(slot => !TIME_PATTERN.test(slot.start) || !TIME_PATTERN.test(slot.end))) {
    return 'empty';
  }
  // `HH:mm` texts compare in the same order as the times.
  if (day.slots.some(slot => slot.end <= slot.start)) return 'order';
  const sorted = [...day.slots].sort(byStart);
  // A slot excludes its end: 08:00–12:00 and 12:00–15:00 touch but do not overlap.
  if (sorted.some((slot, index) => index > 0 && slot.start < sorted[index - 1].end)) {
    return 'overlap';
  }
  return null;
}

/** The schedule as the API stores it: a closed day without slots, open slots by start time. */
export function normalizeSchedule(schedule: CheckinSchedule): CheckinSchedule {
  return Object.fromEntries(
    CHECKIN_DAYS.map(day => {
      const value = schedule[day];
      return [
        day,
        value.open
          ? { open: true, slots: [...value.slots].map(slot => ({ ...slot })).sort(byStart) }
          : { open: false, slots: [] },
      ];
    }),
  ) as CheckinSchedule;
}

/** "08:00–12:00, 15:00–18:00", or `null` for a closed day. */
export function formatDaySchedule(day: DaySchedule | null | undefined): string | null {
  if (!day?.open || day.slots.length === 0) return null;
  return day.slots.map(slot => `${slot.start}–${slot.end}`).join(', ');
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** One formatter for each time zone: creating an `Intl.DateTimeFormat` is slow. */
function zoneFormat(timeZone: string): Intl.DateTimeFormat {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formats.set(timeZone, format);
  }
  return format;
}

/** The wall-clock date and time of an instant in a time zone. */
function zoneParts(now: Date, timeZone: string) {
  const parts = zoneFormat(timeZone).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? '';
  return {
    weekday: part('weekday'),
    year: Number(part('year')),
    month: Number(part('month')),
    day: Number(part('day')),
    hour: Number(part('hour')),
    minute: Number(part('minute')),
    second: Number(part('second')),
  };
}

/** The offset of a time zone from UTC at an instant, in milliseconds (UTC+3 gives 3 h). */
function zoneOffset(time: number, timeZone: string): number {
  const p = zoneParts(new Date(time), timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - Math.floor(time / 1000) * 1000;
}

/** The day (0 = Monday … 6 = Sunday) and the seconds since midnight in a time zone. */
export function zoneDayAndSeconds(
  now: Date,
  timeZone: string,
): { dayIndex: number; seconds: number } {
  const p = zoneParts(now, timeZone);
  const dayIndex = CHECKIN_DAYS.indexOf(p.weekday.toLowerCase() as CheckinDay);
  return { dayIndex, seconds: p.hour * 3600 + p.minute * 60 + p.second };
}

/** The day of the week and the `YYYY-MM-DD` date of an instant in a time zone. */
export function zoneDate(now: Date, timeZone: string): { day: CheckinDay; date: string } {
  const p = zoneParts(now, timeZone);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    day: p.weekday.toLowerCase() as CheckinDay,
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
  };
}

/** The hour and the minute of an instant in a time zone. */
export function zoneHourMinute(now: Date, timeZone: string): { hour: number; minute: number } {
  const p = zoneParts(now, timeZone);
  return { hour: p.hour, minute: p.minute };
}

/** The instant of `hour:minute` on the day of `now` in a time zone. */
export function zoneTimeOfDay(now: Date, hour: number, minute: number, timeZone: string): Date {
  const p = zoneParts(now, timeZone);
  const wall = Date.UTC(p.year, p.month - 1, p.day, hour, minute);
  // The offset can change on that day (daylight saving time): take it at the first guess.
  const guess = wall - zoneOffset(wall, timeZone);
  return new Date(wall - zoneOffset(guess, timeZone));
}

/** "UTC+03:00": the offset of a time zone from UTC at an instant. */
export function zoneOffsetLabel(timeZone: string, now = new Date()): string {
  const minutes = Math.round(zoneOffset(now.getTime(), timeZone) / 60_000);
  const sign = minutes < 0 ? '-' : '+';
  const hours = String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0');
  return `UTC${sign}${hours}:${String(Math.abs(minutes) % 60).padStart(2, '0')}`;
}

/**
 * The time zones that the browser knows, by name. `UTC` and the current value are added when
 * the list does not have them: `Intl.supportedValuesOf` lists only the canonical names.
 */
export function timeZoneNames(current?: string | null): string[] {
  const names = new Set(Intl.supportedValuesOf('timeZone'));
  names.add('UTC');
  if (current) names.add(current);
  return [...names].sort((a, b) => a.localeCompare(b));
}

function timeSeconds(time: string): number {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 3600 + minute * 60;
}

export type OpeningState =
  | { open: true; day: CheckinDay; slot: ScheduleSlot }
  | { open: false; secondsUntilOpening: number | null };

/**
 * Whether check-in is open now, and else the seconds until the next slot starts
 * (`null` when no day is open).
 */
export function openingState(schedule: CheckinSchedule, now: Date, timeZone: string): OpeningState {
  const { dayIndex, seconds } = zoneDayAndSeconds(now, timeZone);
  const day = CHECKIN_DAYS[dayIndex];
  const today = schedule[day];
  if (today?.open) {
    const slot = today.slots.find(
      item => timeSeconds(item.start) <= seconds && seconds < timeSeconds(item.end),
    );
    if (slot) return { open: true, day, slot };
  }

  for (let offset = 0; offset <= 7; offset++) {
    const candidate = schedule[CHECKIN_DAYS[(dayIndex + offset) % 7]];
    if (!candidate?.open) continue;
    for (const slot of [...candidate.slots].sort(byStart)) {
      const start = timeSeconds(slot.start);
      if (offset === 0 && start <= seconds) continue;
      return { open: false, secondsUntilOpening: offset * DAY_SECONDS + start - seconds };
    }
  }
  return { open: false, secondsUntilOpening: null };
}

/** "HH:MM:SS"; the hours can be more than 24. */
export function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours, minutes, seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
}

/** Consecutive open days with the same slots: "Monday–Friday: 08:00–12:00, 15:00–18:00". */
export interface HoursGroup {
  from: CheckinDay;
  to: CheckinDay;
  hours: string;
}

/** The open days of the week, Monday to Sunday, grouped when their hours are the same. */
export function scheduleSummary(schedule: CheckinSchedule): HoursGroup[] {
  const groups: HoursGroup[] = [];
  let previous: CheckinDay | null = null;
  for (const day of CHECKIN_DAYS) {
    const hours = formatDaySchedule(schedule[day]);
    if (hours === null) {
      previous = null;
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && previous === last.to && last.hours === hours) {
      last.to = day;
    } else {
      groups.push({ from: day, to: day, hours });
    }
    previous = day;
  }
  return groups;
}
