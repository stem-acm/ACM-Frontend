import { Activity } from './activity';
import { Member } from './member';

export interface Checkin {
  id?: number;
  registrationNumber: string;
  activityId: number;
  checkInTime: Date;
  checkOutTime?: Date;
  visitReason?: string;
  Member?: Member;
  Activity?: Activity;
}
