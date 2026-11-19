import { ApiHelper } from './api';

/*
 * The API uses its own clock as the check-in time (stem-acm/ACM-Backend#65). A test that
 * scans through the API runs on the real time; it sets the time zone of the app to a
 * fixed-offset zone in which the real time is the hour it needs.
 */

/**
 * Runs `run` with another time zone of the app, then stores the previous time zone
 * again. The tests run one at a time (one worker), so no other test sees the change.
 */
export async function withTimezone(
  api: ApiHelper,
  timezone: string,
  run: () => Promise<void>,
): Promise<void> {
  const original = await api.getTimezone();
  await api.saveTimezone(timezone);
  try {
    await run();
  } finally {
    await api.saveTimezone(original);
  }
}

const HOUR_MS = 3_600_000;
export const pad = (value: number) => String(value).padStart(2, '0');

/** The real time of the test run, read in a fixed-offset time zone of the app. */
export interface LocalClock {
  /** The real instant; the browser clock is fixed on it. */
  now: Date;
  /** The time zone of the app, e.g. Etc/GMT-5 (UTC+5) or UTC. */
  zone: string;
  /** Hour and minute of `now` in `zone`. */
  hour: number;
  minute: number;
  /** The instant of `hour:minute` on the day of `now` in `zone`. */
  at(hour: number, minute: number): Date;
  /** Hour and minute of another instant in `zone`. */
  timeOf(date: Date): { hour: number; minute: number };
}

/** The clock in which the real instant `now` is `hour`:mm (UTC−12 to UTC+14). */
export function localClock(now: Date, hour: number): LocalClock {
  let offset = (((hour - now.getUTCHours()) % 24) + 24) % 24;
  if (offset > 14) offset -= 24;
  // Etc/GMT names have the opposite sign: Etc/GMT-5 is UTC+5.
  const zone = offset === 0 ? 'UTC' : offset > 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${-offset}`;
  const local = new Date(now.getTime() + offset * HOUR_MS);
  return {
    now,
    zone,
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    at: (h, m) =>
      new Date(
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), h, m) -
          offset * HOUR_MS,
      ),
    timeOf: date => {
      const shifted = new Date(date.getTime() + offset * HOUR_MS);
      return { hour: shifted.getUTCHours(), minute: shifted.getUTCMinutes() };
    },
  };
}

/**
 * Sets the time zone of the app so that the real time is `hour`:mm in it, runs `run`,
 * and puts the previous time zone back.
 */
export async function atLocalHour(
  api: ApiHelper,
  hour: number,
  run: (clock: LocalClock) => Promise<void>,
): Promise<void> {
  const clock = localClock(new Date(), hour);
  await withTimezone(api, clock.zone, () => run(clock));
}
