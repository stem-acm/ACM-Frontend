import { Member } from './member';

export interface Volunteer {
  id?: number;
  registrationNumber?: number | null;
  role?: string | null;
  joinDate?: Date | null;
  expirationDate?: Date | null;
  createdBy?: number | null;
  Member?: Member | null;
  createdAt?: Date;
  updatedAt?: Date;
}
