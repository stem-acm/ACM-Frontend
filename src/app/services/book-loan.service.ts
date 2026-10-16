import { BookLoan, BookLoanInput } from '@/app/interfaces/book-loan';
import { HttpResult } from '@/app/types/httpResult';
import { environment } from '@/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BookLoanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/book-loans`;

  getAll(offset = 0, limit = 100, search = '', status?: 'borrowed' | 'overdue' | 'returned') {
    let params = new HttpParams().set('offset', offset).set('limit', limit).set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<HttpResult<BookLoan[]>>(this.url, { params });
  }

  getById(id: number) {
    return this.http.get<HttpResult<BookLoan>>(`${this.url}/${id}`);
  }

  create(loan: BookLoanInput) {
    return this.http.post<HttpResult<BookLoan>>(this.url, {
      registrationNumber: loan.registrationNumber,
      bookTitle: loan.bookTitle,
      borrowingDate: loan.borrowingDate,
      expectedReturnDate: loan.expectedReturnDate,
      effectiveReturnDate: loan.effectiveReturnDate || null,
    });
  }

  update(loan: BookLoanInput & Pick<BookLoan, 'id'>) {
    return this.http.put<HttpResult<BookLoan>>(`${this.url}/${loan.id}`, {
      registrationNumber: loan.registrationNumber,
      bookTitle: loan.bookTitle,
      borrowingDate: loan.borrowingDate,
      expectedReturnDate: loan.expectedReturnDate,
      effectiveReturnDate: loan.effectiveReturnDate || null,
    });
  }

  markReturned(id: number, effectiveReturnDate: string) {
    return this.http.patch<HttpResult<BookLoan>>(`${this.url}/${id}/return`, {
      effectiveReturnDate,
    });
  }
}
