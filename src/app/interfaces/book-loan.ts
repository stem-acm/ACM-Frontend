export interface BookLoan {
  id?: number;
  registrationNumber: string;
  bookTitle: string;
  borrowingDate: string;
  expectedReturnDate: string;
  effectiveReturnDate: string;
}
