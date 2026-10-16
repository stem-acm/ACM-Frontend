import { Member } from './member';

export interface BookLoan {
  id?: number;
  registrationNumber: number;
  bookTitle: string;
  borrowingDate: string;
  expectedReturnDate: string;
  effectiveReturnDate: string;
  createdBy?: number | null;
  Member?: Member | null;
  createdAt?: Date;
  updatedAt?: Date;
}
