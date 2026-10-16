import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { BookLoan } from '@/app/interfaces/book-loan';
import { TableBookLoansComponent } from './table-book-loans.component';

describe('TableBookLoansComponent', () => {
  let component: TableBookLoansComponent;
  let fixture: ComponentFixture<TableBookLoansComponent>;

  const loan: BookLoan = {
    id: 1,
    registrationNumber: 'ACM-001',
    bookTitle: 'Things Fall Apart',
    borrowingDate: '2026-10-01',
    expectedReturnDate: '2026-10-08',
    effectiveReturnDate: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableBookLoansComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(TableBookLoansComponent);
    component = fixture.componentInstance;
    component.today = '2026-10-15';
    fixture.componentRef.setInput('data', [loan]);
    fixture.componentRef.setInput('today', '2026-10-15');
    fixture.detectChanges();
  });

  it('identifies overdue and returned loans', () => {
    expect(component.getStatus(loan)).toBe('overdue');
    expect(component.getStatus({ ...loan, effectiveReturnDate: '2026-10-07' })).toBe('returned');
  });

  it('emits the selected loan to mark it as returned', () => {
    const returned = jasmine.createSpy('returned');
    component.returned.subscribe(returned);

    component.markAsReturned(loan);

    expect(returned).toHaveBeenCalledWith(loan);
  });
});
