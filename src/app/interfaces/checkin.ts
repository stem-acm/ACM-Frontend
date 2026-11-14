import { Activity } from './activity';
import { Member } from './member';

export interface Checkin {
  createdAt?: Date | string;
  id?: number;
  registrationNumber: number;
  signature: string;
  activityId: number;
  checkInTime: Date;
  checkOutTime?: Date;
  visitReason?: string;
  Member?: Member;
  Activity?: Activity;
}
