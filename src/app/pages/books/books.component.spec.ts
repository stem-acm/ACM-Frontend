import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { BookLoan } from '@/app/interfaces/book-loan';
import { Member } from '@/app/interfaces/member';
import { BooksComponent } from './books.component';

describe('BooksComponent', () => {
  let component: BooksComponent;
  let fixture: ComponentFixture<BooksComponent>;

  const loan: BookLoan = {
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
    expect(component.loans[0].id).toBeDefined();
    expect(component.showAddForm).toBeFalse();
  });

  it('marks a loan as returned', () => {
    component.addLoan({ ...loan, borrowingDate: component.today });
    component.markAsReturned(component.loans[0]);

    expect(component.loans[0].effectiveReturnDate).toBe(component.today);
  });
});
