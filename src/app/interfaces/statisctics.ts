import { Checkin } from "./checkin";

export interface Statistics {
  checkins: Checkin[];
  member: number;
  activity: number;
}
