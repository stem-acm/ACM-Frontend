import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpResult } from '@/app/types/httpResult';

import { BookLoan } from '@/app/interfaces/book-loan';
import { Member } from '@/app/interfaces/member';
import { BookLoanService } from '@/app/services/book-loan.service';
import { AuthService } from '@/app/services/auth.service';
import { BooksComponent } from './books.component';

describe('BooksComponent', () => {
  let component: BooksComponent;
  let fixture: ComponentFixture<BooksComponent>;
  let getAll: jasmine.Spy;

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
    getAll = jasmine
      .createSpy('getAll')
      .and.returnValue(of({ success: true, data: [], pagination: { total: 0 } }));
    await TestBed.configureTestingModule({
      imports: [BooksComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: BookLoanService,
          useValue: {
            getAll,
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
    getAll.and.returnValue(of({ success: true, data: [loan], pagination: { total: 26 } }));
    component.currentPage = 2;
    component.addLoan();
    expect(component.currentPage).toBe(1);
    expect(getAll).toHaveBeenCalledWith(0, 25, '');
    expect(component.totalLoans).toBe(26);

    expect(component.loans.length).toBe(1);
    expect(component.loans[0].registrationNumber).toBe(101);
    expect(component.showAddForm).toBeFalse();
  });

  it('marks a loan as returned', () => {
    component.loans = [{ ...loan, id: 1, borrowingDate: component.today }];
    component.markAsReturned(component.loans[0]);

    expect(component.loans[0].effectiveReturnDate).toBe(component.today);
  });
  it('requests page offsets and displays server totals and the final partial page', () => {
    component.totalLoans = 26;
    getAll.and.returnValue(of({ success: true, data: [loan], pagination: { total: 26 } }));
    component.changePage(2);
    fixture.detectChanges();
    expect(getAll).toHaveBeenCalledWith(25, 25, '');
    expect(component.firstLoan).toBe(26);
    expect(component.lastLoan).toBe(26);
    expect(component.totalPages).toBe(2);
    const buttons = fixture.nativeElement.querySelectorAll('.books-pagination button');
    expect(buttons[0].disabled).toBeFalse();
    expect(buttons[1].disabled).toBeTrue();
    component.changePage(1);
    expect(getAll).toHaveBeenCalledWith(0, 25, '');
  });

  it('prevents invalid navigation and duplicate requests while loading', () => {
    component.totalLoans = 60;
    const response = new Subject<HttpResult<BookLoan[]>>();
    getAll.and.returnValue(response);
    getAll.calls.reset();
    component.changePage(0);
    component.changePage(4);
    component.changePage(1);
    expect(getAll).not.toHaveBeenCalled();
    component.changePage(2);
    component.changePage(3);
    expect(getAll).toHaveBeenCalledTimes(1);
    expect(component.currentPage).toBe(2);
    response.next({
      success: true,
      message: '',
      data: [loan],
      pagination: { total: 60, offset: 25, limit: 25, hasMore: true },
    });
    response.complete();
  });

  it('retries a failed page and handles an empty list', () => {
    expect(component.firstLoan).toBe(0);
    expect(component.lastLoan).toBe(0);
    expect(component.totalPages).toBe(1);
    component.totalLoans = 26;
    getAll.and.returnValue(throwError(() => new Error('Failed')));
    component.changePage(2);
    expect(component.loadError).toBeTruthy();
    getAll.and.returnValue(of({ success: true, data: [loan], pagination: { total: 26 } }));
    component.loadLoans();
    expect(getAll).toHaveBeenCalledWith(25, 25, '');
    expect(component.loadError).toBe('');
    expect(component.loans).toEqual([loan]);
  });

  it('searches from the first page after the same debounce as Volunteer', fakeAsync(() => {
    getAll.calls.reset();
    component.currentPage = 2;

    component.search('Ada');
    tick(499);
    expect(getAll).not.toHaveBeenCalled();

    tick(1);
    expect(component.currentPage).toBe(1);
    expect(getAll).toHaveBeenCalledOnceWith(0, 25, 'Ada');
  }));

  it('clears the search and reloads all loans', fakeAsync(() => {
    component.searchWord = '2026-10-15';
    component.currentPage = 2;
    getAll.calls.reset();

    component.clearSearch();
    tick(500);

    expect(component.searchWord).toBe('');
    expect(component.currentPage).toBe(1);
    expect(getAll).toHaveBeenCalledOnceWith(0, 25, '');
  }));
});
