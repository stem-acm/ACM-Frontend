import {
  CHECKIN_DAYS,
  CheckinDay,
  CheckinSchedule,
  DaySchedule,
  ScheduleSlot,
} from '@/app/interfaces/checkin-schedule';

/** The time zone of the check-in schedule (Mahajanga, EAT). */
export const CHECKIN_TIME_ZONE = 'Africa/Nairobi';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_SECONDS = 24 * 3600;

/** The error of a day, as `checkinSchedule.errors.*`. The API refuses the same cases. */
export type DayError = 'empty' | 'order' | 'overlap' | 'noSlot';

const byStart = (a: ScheduleSlot, b: ScheduleSlot) => a.start.localeCompare(b.start);

/** The first error of a day: an empty time, then an end before its start, then an overlap. */
export function dayError(day: DaySchedule): DayError | null {
  if (!day.open) return null;
  if (day.slots.length === 0) return 'noSlot';
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

const zoneFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: CHECKIN_TIME_ZONE,
  weekday: 'long',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** The day (0 = Monday … 6 = Sunday) and the seconds since midnight in Mahajanga. */
export function zoneDayAndSeconds(now: Date): { dayIndex: number; seconds: number } {
  const parts = zoneFormat.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(item => item.type === type)?.value ?? '';
  const dayIndex = CHECKIN_DAYS.indexOf(part('weekday').toLowerCase() as CheckinDay);
  const seconds =
    Number(part('hour')) * 3600 + Number(part('minute')) * 60 + Number(part('second'));
  return { dayIndex, seconds };
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
export function openingState(schedule: CheckinSchedule, now: Date): OpeningState {
  const { dayIndex, seconds } = zoneDayAndSeconds(now);
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
