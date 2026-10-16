import { AddBookLoanComponent } from '@/app/components/add-book-loan/add-book-loan.component';
import { TableBookLoansComponent } from '@/app/components/table-book-loans/table-book-loans.component';
import { BookLoan } from '@/app/interfaces/book-loan';
import { BookLoanService } from '@/app/services/book-loan.service';
import { AuthService } from '@/app/services/auth.service';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [TranslateModule, ZardButtonComponent, AddBookLoanComponent, TableBookLoansComponent],
  templateUrl: './books.component.html',
  styleUrl: './books.component.css',
})
export class BooksComponent implements OnInit {
  private readonly bookLoanService = inject(BookLoanService);
  readonly auth = inject(AuthService);

  readonly today = this.formatDate(new Date());
  loans: BookLoan[] = [];
  showAddForm = false;
  showSuccess = false;
  isLoading = false;
  loadError = '';

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.isLoading = true;
    this.loadError = '';
    this.bookLoanService.getAll().subscribe({
      next: result => {
        this.loans = result.data;
        this.isLoading = false;
      },
      error: error => {
        this.isLoading = false;
        this.loadError = error.error?.message || 'Unable to load book loans.';
      },
    });
  }

  openAddForm(): void {
    this.showAddForm = true;
  }

  cancelAddForm(): void {
    this.showAddForm = false;
  }

  addLoan(loan: BookLoan): void {
    this.loans = [loan, ...this.loans];
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
