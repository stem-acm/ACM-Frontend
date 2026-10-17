import { AddBookLoanComponent } from '@/app/components/add-book-loan/add-book-loan.component';
import { TableBookLoansComponent } from '@/app/components/table-book-loans/table-book-loans.component';
import { BookLoan } from '@/app/interfaces/book-loan';
import { BookLoanService } from '@/app/services/book-loan.service';
import { AuthService } from '@/app/services/auth.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    ZardButtonComponent,
    ZardInputComponent,
    AddBookLoanComponent,
    TableBookLoansComponent,
  ],
  templateUrl: './books.component.html',
  styleUrl: './books.component.css',
})
export class BooksComponent implements OnInit {
  private readonly bookLoanService = inject(BookLoanService);
  readonly auth = inject(AuthService);

  readonly today = this.formatDate(new Date());
  loans: BookLoan[] = [];
  readonly pageSize = 25;
  currentPage = 1;
  totalLoans = 0;
  showAddForm = false;
  showSuccess = false;
  isLoading = false;
  loadError = '';
  searchWord = '';
  private readonly searchSubject = new Subject<string>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalLoans / this.pageSize));
  }

  get firstLoan(): number {
    return this.totalLoans === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastLoan(): number {
    return Math.min((this.currentPage - 1) * this.pageSize + this.loans.length, this.totalLoans);
  }

  changePage(page: number): void {
    if (this.isLoading || page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadLoans();
  }

  ngOnInit(): void {
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.loadLoans();
    });
    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.loadError = '';
    this.bookLoanService
      .getAll((this.currentPage - 1) * this.pageSize, this.pageSize, this.searchWord)
      .subscribe({
        next: result => {
          this.loans = result.data;
          this.totalLoans = result.pagination?.total ?? result.data.length;
          this.isLoading = false;
        },
        error: error => {
          this.isLoading = false;
          this.loadError = error.error?.message || 'Unable to load book loans.';
        },
      });
  }

  search(keyword: string): void {
    this.searchSubject.next(keyword);
  }

  clearSearch(): void {
    this.searchWord = '';
    this.currentPage = 1;
    this.searchSubject.next('');
  }

  openAddForm(): void {
    this.showAddForm = true;
  }

  cancelAddForm(): void {
    this.showAddForm = false;
  }

  addLoan(): void {
    this.currentPage = 1;
    this.loadLoans();
    this.showAddForm = false;
    this.showSuccess = true;
  }

  markAsReturned(loan: BookLoan): void {
    if (!loan.id || loan.borrowingDate > this.today) return;
    this.bookLoanService.markReturned(loan.id, this.today).subscribe({
      next: result => {
        this.loans = this.loans.map(item => (item.id === loan.id ? result.data : item));
        this.showSuccess = true;
      },
      error: error => {
        this.loadError = error.error?.message || 'Unable to return the book.';
      },
    });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
