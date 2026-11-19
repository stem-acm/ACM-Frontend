import { CheckinSchedule } from '@/app/interfaces/checkin-schedule';
import {
  closedDay as closed,
  defaultCheckinSchedule as defaultSchedule,
} from '@/testing/checkin-schedule';
import {
  dayError,
  formatCountdown,
  formatDaySchedule,
  normalizeSchedule,
  openingState,
  scheduleSummary,
  timeZoneNames,
  zoneDayAndSeconds,
  zoneHourMinute,
  zoneOffsetLabel,
  zoneDate,
  zoneTimeOfDay,
} from './checkin-schedule.util';

/** The default time zone of the app: Mahajanga, UTC+3. */
const MAHAJANGA = 'Indian/Antananarivo';

/** A wall-clock time in Mahajanga (UTC+3). */
const eat = (date: string, time: string) => new Date(`${date}T${time}+03:00`);

describe('checkin-schedule util', () => {
  describe('dayError', () => {
    it('accepts a closed day whatever its hidden slots', () => {
      expect(dayError({ open: false, slots: [{ start: '', end: '' }] })).toBeNull();
      expect(dayError(defaultSchedule().monday)).toBeNull();
    });

    it('finds the errors in order: no slot, empty time, order, overlap', () => {
      expect(dayError({ open: true, slots: [] })).toBe('noSlot');
      expect(
        dayError({
          open: true,
          slots: [
            { start: '', end: '12:00' },
            { start: '12:00', end: '08:00' },
          ],
        }),
      ).toBe('empty');
      expect(
        dayError({
          open: true,
          slots: [
            { start: '12:00', end: '12:00' },
            { start: '08:00', end: '13:00' },
          ],
        }),
      ).toBe('order');
      expect(
        dayError({
          open: true,
          slots: [
            { start: '11:00', end: '13:00' },
            { start: '08:00', end: '12:00' },
          ],
        }),
      ).toBe('overlap');
    });

    it('accepts touching slots', () => {
      expect(
        dayError({
          open: true,
          slots: [
            { start: '12:00', end: '15:00' },
            { start: '08:00', end: '12:00' },
          ],
        }),
      ).toBeNull();
    });
  });

  it('normalizes a schedule as the API stores it', () => {
    const schedule = defaultSchedule();
    schedule.sunday = { open: false, slots: [{ start: '08:00', end: '12:00' }] };
    schedule.monday.slots.reverse();
    const normalized = normalizeSchedule(schedule);
    expect(Object.keys(normalized)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
    expect(normalized.sunday).toEqual({ open: false, slots: [] });
    expect(normalized.monday).toEqual(defaultSchedule().monday);
    expect(schedule.sunday.slots.length).withContext('the form keeps its slots').toBe(1);
  });

  it('formats the slots of a day', () => {
    expect(formatDaySchedule(defaultSchedule().monday)).toBe('08:00–12:00, 15:00–18:00');
    expect(formatDaySchedule(closed())).toBeNull();
    expect(formatDaySchedule(null)).toBeNull();
  });

  describe('zoneDate', () => {
    it('gives the day and the date in the time zone', () => {
      // Wednesday 18:37 UTC is Wednesday in Mahajanga and Thursday in Kiritimati (UTC+14).
      const now = new Date('2026-11-18T18:37:00Z');
      expect(zoneDate(now, MAHAJANGA)).toEqual({ day: 'wednesday', date: '2026-11-18' });
      expect(zoneDate(now, 'Pacific/Kiritimati')).toEqual({
        day: 'thursday',
        date: '2026-11-19',
      });
    });
  });

  describe('dayError limit', () => {
    it('refuses more than 12 slots on a day', () => {
      const slots = Array.from({ length: 13 }, (_, i) => ({
        start: `${String(i + 8).padStart(2, '0')}:00`,
        end: `${String(i + 8).padStart(2, '0')}:30`,
      }));
      expect(dayError({ open: true, slots })).toBe('tooMany');
      expect(dayError({ open: true, slots: slots.slice(0, 12) })).toBeNull();
    });
  });

  describe('openingState', () => {
    it('opens at the start of a slot and closes at its end', () => {
      const schedule = defaultSchedule();
      for (const [time, open] of [
        ['07:59:59', false],
        ['08:00:00', true],
        ['11:59:59', true],
        ['12:00:00', false],
        ['15:00:00', true],
        ['18:00:00', false],
      ] as const) {
        expect(openingState(schedule, eat('2026-11-10', time), MAHAJANGA).open)
          .withContext(time)
          .toBe(open);
      }
      expect(openingState(schedule, eat('2026-11-10', '09:00:00'), MAHAJANGA)).toEqual({
        open: true,
        day: 'tuesday',
        slot: { start: '08:00', end: '12:00' },
      });
    });

    it('counts the seconds until the next slot', () => {
      const schedule = defaultSchedule();
      expect(openingState(schedule, eat('2026-11-13', '12:00:00'), MAHAJANGA)).toEqual({
        open: false,
        secondsUntilOpening: 10800,
      });
      expect(openingState(schedule, eat('2026-11-14', '16:00:00'), MAHAJANGA)).toEqual({
        open: false,
        secondsUntilOpening: 57600,
      });

      schedule.sunday = closed();
      schedule.monday = closed();
      expect(openingState(schedule, eat('2026-11-14', '16:00:00'), MAHAJANGA)).toEqual({
        open: false,
        secondsUntilOpening: 230400,
      });
    });

    it('waits a whole week for the only slot of the week', () => {
      const schedule = normalizeSchedule({
        ...defaultSchedule(),
        monday: closed(),
        tuesday: { open: true, slots: [{ start: '08:00', end: '12:00' }] },
        wednesday: closed(),
        thursday: closed(),
        friday: closed(),
        saturday: closed(),
        sunday: closed(),
      });
      expect(openingState(schedule, eat('2026-11-10', '13:00:00'), MAHAJANGA)).toEqual({
        open: false,
        secondsUntilOpening: 586800,
      });
    });

    it('counts the real seconds across a daylight saving time change (#149)', () => {
      // Sunday opens at 08:00 in Paris.
      // 2027-03-28 the clocks go forward: Saturday 20:00 CET to Sunday 08:00 CEST is 11 h.
      expect(
        openingState(defaultSchedule(), new Date('2027-03-27T19:00:00Z'), 'Europe/Paris'),
      ).toEqual({ open: false, secondsUntilOpening: 11 * 3600 });
      // 2026-10-25 the clocks go back: Saturday 20:00 CEST to Sunday 08:00 CET is 13 h.
      expect(
        openingState(defaultSchedule(), new Date('2026-10-24T18:00:00Z'), 'Europe/Paris'),
      ).toEqual({ open: false, secondsUntilOpening: 13 * 3600 });
    });

    it('has no next opening when every day is closed', () => {
      const schedule = normalizeSchedule({
        monday: closed(),
        tuesday: closed(),
        wednesday: closed(),
        thursday: closed(),
        friday: closed(),
        saturday: closed(),
        sunday: closed(),
      });
      expect(openingState(schedule, eat('2026-11-10', '09:00:00'), MAHAJANGA)).toEqual({
        open: false,
        secondsUntilOpening: null,
      });
    });

    it('uses the time of the instant in the given zone, whatever the device time zone', () => {
      // Monday 21:30 UTC is Tuesday 00:30 in Mahajanga.
      expect(zoneDayAndSeconds(new Date('2026-11-09T21:30:00Z'), MAHAJANGA)).toEqual({
        dayIndex: 1,
        seconds: 1800,
      });
      expect(
        openingState(defaultSchedule(), new Date('2026-11-10T05:00:00Z'), MAHAJANGA).open,
      ).toBeTrue();
    });

    it('reads the schedule in the time zone of the app', () => {
      // Tuesday 13:00 UTC is 16:00 in Mahajanga (open) and 13:00 in UTC (closed).
      const now = new Date('2026-11-10T13:00:00Z');
      expect(openingState(defaultSchedule(), now, MAHAJANGA).open).toBeTrue();
      expect(openingState(defaultSchedule(), now, 'UTC')).toEqual({
        open: false,
        secondsUntilOpening: 7200,
      });
      // Tuesday 06:00 UTC is 09:00 in Mahajanga and 06:00 in UTC.
      const morning = new Date('2026-11-10T06:00:00Z');
      expect(openingState(defaultSchedule(), morning, MAHAJANGA).open).toBeTrue();
      expect(openingState(defaultSchedule(), morning, 'UTC').open).toBeFalse();
      expect(zoneDayAndSeconds(morning, 'UTC')).toEqual({ dayIndex: 1, seconds: 6 * 3600 });
    });
  });

  describe('time zones', () => {
    it('gives the hour and the minute of an instant in a zone', () => {
      const now = new Date('2026-11-10T06:20:00Z');
      expect(zoneHourMinute(now, MAHAJANGA)).toEqual({ hour: 9, minute: 20 });
      expect(zoneHourMinute(now, 'UTC')).toEqual({ hour: 6, minute: 20 });
      expect(zoneHourMinute(now, 'America/New_York')).toEqual({ hour: 1, minute: 20 });
    });

    it('gives the instant of a time of the day in a zone', () => {
      const now = new Date('2026-11-10T06:20:00Z');
      expect(zoneTimeOfDay(now, 17, 30, MAHAJANGA).toISOString()).toBe('2026-11-10T14:30:00.000Z');
      expect(zoneTimeOfDay(now, 17, 30, 'UTC').toISOString()).toBe('2026-11-10T17:30:00.000Z');
      // 22:30 UTC on Tuesday is already Wednesday in Mahajanga.
      const late = new Date('2026-11-10T22:30:00Z');
      expect(zoneTimeOfDay(late, 8, 0, MAHAJANGA).toISOString()).toBe('2026-11-11T05:00:00.000Z');
    });

    it('follows a daylight saving time change', () => {
      // Paris is UTC+2 after 01:00 UTC on 2026-03-29, and UTC+1 before.
      const day = new Date('2026-03-29T00:30:00Z');
      expect(zoneTimeOfDay(day, 0, 30, 'Europe/Paris').toISOString()).toBe(
        '2026-03-28T23:30:00.000Z',
      );
      expect(zoneTimeOfDay(day, 10, 0, 'Europe/Paris').toISOString()).toBe(
        '2026-03-29T08:00:00.000Z',
      );
      expect(zoneOffsetLabel('Europe/Paris', new Date('2026-01-15T12:00:00Z'))).toBe('UTC+01:00');
      expect(zoneOffsetLabel('Europe/Paris', new Date('2026-07-15T12:00:00Z'))).toBe('UTC+02:00');
    });

    it('labels the offset of a zone from UTC', () => {
      const now = new Date('2026-11-10T12:00:00Z');
      expect(zoneOffsetLabel(MAHAJANGA, now)).toBe('UTC+03:00');
      expect(zoneOffsetLabel('UTC', now)).toBe('UTC+00:00');
      expect(zoneOffsetLabel('America/New_York', now)).toBe('UTC-05:00');
      expect(zoneOffsetLabel('Asia/Kolkata', now)).toBe('UTC+05:30');
    });

    it('lists the zones of the browser, UTC and the current value, sorted', () => {
      const names = timeZoneNames('Etc/GMT-3');
      expect(names).toContain(MAHAJANGA);
      expect(names).toContain('UTC');
      expect(names).toContain('Etc/GMT-3');
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
      expect(new Set(names).size).toBe(names.length);
    });
  });

  it('formats a countdown with hours above 24', () => {
    expect(formatCountdown(230400)).toBe('64:00:00');
    expect(formatCountdown(3661)).toBe('01:01:01');
    expect(formatCountdown(0)).toBe('00:00:00');
  });

  describe('scheduleSummary', () => {
    it('groups consecutive days with the same hours', () => {
      expect(scheduleSummary(defaultSchedule())).toEqual([
        { from: 'monday', to: 'friday', hours: '08:00–12:00, 15:00–18:00' },
        { from: 'saturday', to: 'saturday', hours: '09:00–16:00' },
        { from: 'sunday', to: 'sunday', hours: '08:00–12:00, 15:00–18:00' },
      ]);
    });

    it('skips closed days and does not join days across them', () => {
      const schedule = defaultSchedule();
      schedule.wednesday = closed();
      expect(scheduleSummary(schedule).map(group => [group.from, group.to])).toEqual([
        ['monday', 'tuesday'],
        ['thursday', 'friday'],
        ['saturday', 'saturday'],
        ['sunday', 'sunday'],
      ]);
    });

    it('is empty when every day is closed', () => {
      const schedule = defaultSchedule();
      for (const day of Object.keys(schedule) as (keyof CheckinSchedule)[]) {
        schedule[day] = closed();
      }
      expect(scheduleSummary(schedule)).toEqual([]);
    });
  });
});
