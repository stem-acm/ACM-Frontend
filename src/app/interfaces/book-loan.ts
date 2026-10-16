import { Member } from './member';
import { User } from './user';

export interface BookLoan {
  id?: number;
  registrationNumber: number;
  bookTitle: string;
  borrowingDate: string;
  expectedReturnDate: string;
  effectiveReturnDate: string;
  createdBy?: number | null;
  Member?: Member | null;
  User: User | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BookLoanInput = Pick<
  BookLoan,
  | 'registrationNumber'
  | 'bookTitle'
  | 'borrowingDate'
  | 'expectedReturnDate'
  | 'effectiveReturnDate'
>;
