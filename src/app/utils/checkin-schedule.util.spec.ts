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
  zoneDayAndSeconds,
} from './checkin-schedule.util';

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
        expect(openingState(schedule, eat('2026-11-10', time)).open)
          .withContext(time)
          .toBe(open);
      }
      expect(openingState(schedule, eat('2026-11-10', '09:00:00'))).toEqual({
        open: true,
        day: 'tuesday',
        slot: { start: '08:00', end: '12:00' },
      });
    });

    it('counts the seconds until the next slot', () => {
      const schedule = defaultSchedule();
      expect(openingState(schedule, eat('2026-11-13', '12:00:00'))).toEqual({
        open: false,
        secondsUntilOpening: 10800,
      });
      expect(openingState(schedule, eat('2026-11-14', '16:00:00'))).toEqual({
        open: false,
        secondsUntilOpening: 57600,
      });

      schedule.sunday = closed();
      schedule.monday = closed();
      expect(openingState(schedule, eat('2026-11-14', '16:00:00'))).toEqual({
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
      expect(openingState(schedule, eat('2026-11-10', '13:00:00'))).toEqual({
        open: false,
        secondsUntilOpening: 586800,
      });
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
      expect(openingState(schedule, eat('2026-11-10', '09:00:00'))).toEqual({
        open: false,
        secondsUntilOpening: null,
      });
    });

    it('uses the Mahajanga time of the instant, whatever the device time zone', () => {
      // Monday 21:30 UTC is Tuesday 00:30 in Mahajanga.
      expect(zoneDayAndSeconds(new Date('2026-11-09T21:30:00Z'))).toEqual({
        dayIndex: 1,
        seconds: 1800,
      });
      expect(openingState(defaultSchedule(), new Date('2026-11-10T05:00:00Z')).open).toBeTrue();
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
