import { User } from './user';

export type DayOfWeek = 'everyday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Activity {
  id?: number;
  name: string;
  description?: string | null;
  image?: string | null;
  emoji?: string | null;
  isPeriodic: boolean;
  dayOfWeek?: DayOfWeek | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  createdBy?: number;
  user?: User;
  createdAt?: Date;
  updatedAt?: Date;
}
