import { CheckinSchedule, DaySchedule } from '@/app/interfaces/checkin-schedule';

const weekday = (): DaySchedule => ({
  open: true,
  slots: [
    { start: '08:00', end: '12:00' },
    { start: '15:00', end: '18:00' },
  ],
});

/** A closed day, as the API stores it. */
export const closedDay = (): DaySchedule => ({ open: false, slots: [] });

/** A new copy of the default schedule of the API. */
export function defaultCheckinSchedule(): CheckinSchedule {
  return {
    monday: weekday(),
    tuesday: weekday(),
    wednesday: weekday(),
    thursday: weekday(),
    friday: weekday(),
    saturday: { open: true, slots: [{ start: '09:00', end: '16:00' }] },
    sunday: weekday(),
  };
}
