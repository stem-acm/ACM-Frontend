import { AddBookLoanComponent } from '@/app/components/add-book-loan/add-book-loan.component';
import { TableBookLoansComponent } from '@/app/components/table-book-loans/table-book-loans.component';
import { BookLoan } from '@/app/interfaces/book-loan';
import { ZardButtonComponent } from '@/shared/components/button';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [TranslateModule, ZardButtonComponent, AddBookLoanComponent, TableBookLoansComponent],
  templateUrl: './books.component.html',
  styleUrl: './books.component.css',
})
export class BooksComponent {
  readonly today = this.formatDate(new Date());
  loans: BookLoan[] = [];
  showAddForm = false;
  showSuccess = false;

  openAddForm(): void {
    this.showAddForm = true;
  }

  cancelAddForm(): void {
    this.showAddForm = false;
  }

  addLoan(loan: BookLoan): void {
    this.loans = [{ ...loan, id: Date.now() }, ...this.loans];
    this.showAddForm = false;
    this.showSuccess = true;
  }

  markAsReturned(loan: BookLoan): void {
    if (loan.borrowingDate > this.today) return;

    this.loans = this.loans.map(item =>
      item.id === loan.id ? { ...item, effectiveReturnDate: this.today } : item,
    );
    this.showSuccess = true;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
