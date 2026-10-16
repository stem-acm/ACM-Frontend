import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { BookLoan } from '@/app/interfaces/book-loan';
import { Member } from '@/app/interfaces/member';
import { BookLoanService } from '@/app/services/book-loan.service';
import { AuthService } from '@/app/services/auth.service';
import { BooksComponent } from './books.component';

describe('BooksComponent', () => {
  let component: BooksComponent;
  let fixture: ComponentFixture<BooksComponent>;

  const loan: BookLoan = {
    User: {
      id: 1,
      username: 'librarian',
      email: 'librarian@example.com',
      role: 'admin',
      active: true,
      permissions: {},
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    },
    registrationNumber: 101,
    Member: {
      firstName: 'Ada',
      lastName: 'Lovelace',
    } as Member,
    bookTitle: 'Things Fall Apart',
    borrowingDate: '2026-10-15',
    expectedReturnDate: '2026-10-22',
    effectiveReturnDate: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooksComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: BookLoanService,
          useValue: {
            getAll: () => of({ success: true, message: 'All loans', data: [] }),
            markReturned: (id: number, date: string) =>
              of({
                success: true,
                message: 'Returned',
                data: { ...loan, id, effectiveReturnDate: date },
              }),
          },
        },
        { provide: AuthService, useValue: { can: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BooksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens and closes the add dialog', () => {
    component.openAddForm();
    expect(component.showAddForm).toBeTrue();

    component.cancelAddForm();
    expect(component.showAddForm).toBeFalse();
  });

  it('adds a submitted loan and closes the dialog', () => {
    component.openAddForm();
    component.addLoan(loan);

    expect(component.loans.length).toBe(1);
    expect(component.loans[0].registrationNumber).toBe(101);
    expect(component.showAddForm).toBeFalse();
  });

  it('marks a loan as returned', () => {
    component.addLoan({ ...loan, id: 1, borrowingDate: component.today });
    component.markAsReturned(component.loans[0]);

    expect(component.loans[0].effectiveReturnDate).toBe(component.today);
  });
});
