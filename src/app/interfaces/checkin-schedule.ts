/** The days of the check-in schedule, Monday first. */
export const CHECKIN_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type CheckinDay = (typeof CHECKIN_DAYS)[number];

/** One check-in slot: `start` included, `end` excluded, both `HH:mm` in Africa/Nairobi. */
export interface ScheduleSlot {
  start: string;
  end: string;
}

export interface DaySchedule {
  open: boolean;
  slots: ScheduleSlot[];
}

/** `GET /api/settings/checkin-schedule` and `GET /api/checkins/schedule`. */
export type CheckinSchedule = Record<CheckinDay, DaySchedule>;
