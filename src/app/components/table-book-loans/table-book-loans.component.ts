import { BookLoan } from '@/app/interfaces/book-loan';
import { ZardButtonComponent } from '@/shared/components/button';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

type LoanStatus = 'returned' | 'overdue' | 'borrowed';

@Component({
  selector: 'app-table-book-loans',
  standalone: true,
  imports: [CommonModule, TranslateModule, ZardButtonComponent],
  templateUrl: './table-book-loans.component.html',
  styleUrl: './table-book-loans.component.css',
})
export class TableBookLoansComponent {
  @Input({ required: true }) data: BookLoan[] = [];
  @Input({ required: true }) today = '';
  @Output() returned = new EventEmitter<BookLoan>();

  getStatus(loan: BookLoan): LoanStatus {
    if (loan.effectiveReturnDate) return 'returned';
    return loan.expectedReturnDate < this.today ? 'overdue' : 'borrowed';
  }

  markAsReturned(loan: BookLoan): void {
    this.returned.emit(loan);
  }
}
