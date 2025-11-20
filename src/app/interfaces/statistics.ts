import { Checkin } from "./checkin";

export interface Statistics {
  checkins: Checkin[];
  members: number;
  activities: number;
}
