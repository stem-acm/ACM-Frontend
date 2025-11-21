import { User } from './user';

export type DayOfWeek = 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Activity {
  id?: number;
  name: string;
  description?: string | null;
  image?: string | null;
  emoji?: string | null;
  isPeriodic: boolean;
  dayOfWeek?: DayOfWeek;
  startDate?: string;
  endDate?: string;
  startTime: string;
  endTime: string;
  createdBy?: number;
  user?: User;
  createdAt?: Date;
  updatedAt?: Date;
}
