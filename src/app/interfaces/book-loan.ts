export interface BookLoan {
  id?: number;
  registrationNumber: number;
  memberFirstName: string;
  memberLastName: string;
  bookTitle: string;
  borrowingDate: string;
  expectedReturnDate: string;
  effectiveReturnDate: string;
}
