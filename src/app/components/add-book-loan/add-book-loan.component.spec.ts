import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpResult } from '@/app/types/httpResult';

import { BookLoanInput } from '@/app/interfaces/book-loan';
import { User } from '@/app/interfaces/user';
import { Member } from '@/app/interfaces/member';
import { MemberService } from '@/app/services/member.service';
import { BookLoanService } from '@/app/services/book-loan.service';
import { AddBookLoanComponent } from './add-book-loan.component';

describe('AddBookLoanComponent', () => {
  let component: AddBookLoanComponent;
  let fixture: ComponentFixture<AddBookLoanComponent>;
  let getAllMembers: jasmine.Spy;
  let getTitles: jasmine.Spy;
  const user: User = {
    id: 1,
    username: 'librarian',
    email: 'librarian@example.com',
    role: 'admin',
    active: true,
    permissions: {},
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
  const members = [
    {
      registrationNumber: 101,
      firstName: 'Ada',
      lastName: 'Lovelace',
      studyOrWorkPlace: 'University',
    },
    {
      registrationNumber: 202,
      firstName: 'James',
      lastName: 'Baldwin',
      studyOrWorkPlace: 'Library',
    },
  ] as Member[];

  beforeEach(async () => {
    getTitles = jasmine
      .createSpy('getTitles')
      .and.returnValue(of({ success: true, data: ['Things Fall Apart'] }));
    getAllMembers = jasmine
      .createSpy('getAllMembers')
      .and.callFake((_offset: number, _limit: number, search = '') =>
        of({
          success: true,
          data: search
            ? members.filter(member =>
                [member.registrationNumber, member.firstName, member.lastName].some(value =>
                  String(value).toLocaleLowerCase().includes(search.toLocaleLowerCase()),
                ),
              )
            : members,
        }),
      );
    await TestBed.configureTestingModule({
      imports: [AddBookLoanComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: MemberService,
          useValue: { getAllMembers },
        },
        {
          provide: BookLoanService,
          useValue: {
            getTitles,
            create: (loan: BookLoanInput) =>
              of({ success: true, message: 'Created', data: { ...loan, id: 1, User: user } }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddBookLoanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('initializes and recalculates the expected return date at seven days', () => {
    component.loanForm.controls.borrowingDate.setValue('2026-10-15');

    expect(component.loanForm.controls.expectedReturnDate.value).toBe('2026-10-22');
    expect(component.loanForm.controls.effectiveReturnDate.value).toBe('');
  });

  it('emits the saved loan including its server-provided user', () => {
    const success = jasmine.createSpy('success');
    component.success.subscribe(success);
    component.selectMember(members[0]);
    component.loanForm.patchValue({ bookTitle: ' Things Fall Apart ' });

    component.saveLoan();

    expect(success).toHaveBeenCalledWith(
      jasmine.objectContaining({
        registrationNumber: 101,
        id: 1,
        User: user,
        bookTitle: 'Things Fall Apart',
      }),
    );
  });

  it('rejects a return date before the borrowing date', () => {
    component.loanForm.patchValue({
      bookTitle: 'Things Fall Apart',
      borrowingDate: '2026-10-15',
      effectiveReturnDate: '2026-10-14',
    });

    component.saveLoan();

    expect(
      component.loanForm.controls.effectiveReturnDate.hasError('returnBeforeBorrowing'),
    ).toBeTrue();
  });

  it('searches the complete member source by registration number, first name and last name', fakeAsync(() => {
    component.searchMembers('101');
    tick(1000);
    expect(component.filteredMembers).toEqual([members[0]]);

    component.searchMembers('james');
    tick(1000);
    expect(component.filteredMembers).toEqual([members[1]]);

    component.searchMembers('lovelace');
    tick(1000);
    expect(component.filteredMembers).toEqual([members[0]]);
    expect(getAllMembers).toHaveBeenCalledWith(0, 200, 'lovelace');
  }));

  it('does not emit a loan until a real member is selected', () => {
    const success = jasmine.createSpy('success');
    component.success.subscribe(success);
    component.loanForm.controls.bookTitle.setValue('Things Fall Apart');

    component.saveLoan();

    expect(success).not.toHaveBeenCalled();
  });

  it('resets and emits when canceled', () => {
    const canceled = jasmine.createSpy('canceled');
    component.canceled.subscribe(canceled);
    component.selectMember(members[0]);

    component.cancel();

    expect(canceled).toHaveBeenCalled();
    expect(component.selectedMember).toBeNull();
    expect(component.memberSearch).toBe('');
  });
  it('debounces title searches and fills the input from a suggestion', fakeAsync(() => {
    component.loanForm.controls.bookTitle.setValue('Things');
    component.searchBookTitles();
    tick(299);
    expect(getTitles).not.toHaveBeenCalled();
    tick(1);
    expect(getTitles).toHaveBeenCalledWith('Things');
    fixture.detectChanges();
    const option = fixture.nativeElement.querySelector('#book-title-suggestions button');
    expect(option.textContent).toContain('Things Fall Apart');
    option.click();
    expect(component.loanForm.controls.bookTitle.value).toBe('Things Fall Apart');
    expect(component.bookTitles).toEqual([]);
    expect(component.titleSuggestionsOpen).toBeFalse();
  }));

  it('cancels outdated searches and clears suggestions for empty input', fakeAsync(() => {
    const oldResponse = new Subject<HttpResult<string[]>>();
    getTitles.and.returnValue(oldResponse);
    component.loanForm.controls.bookTitle.setValue('old');
    component.searchBookTitles();
    tick(300);
    getTitles.and.returnValue(of({ success: true, data: ['New title'] }));
    component.loanForm.controls.bookTitle.setValue('new');
    component.searchBookTitles();
    oldResponse.next({ success: true, message: '', data: ['Old title'] });
    expect(component.bookTitles).toEqual([]);
    tick(300);
    expect(component.bookTitles).toEqual(['New title']);
    component.loanForm.controls.bookTitle.setValue('   ');
    component.searchBookTitles();
    tick(300);
    expect(component.bookTitles).toEqual([]);
    expect(getTitles).toHaveBeenCalledTimes(2);
  }));

  it('recovers from suggestion errors and allows a new title', fakeAsync(() => {
    getTitles.and.returnValue(throwError(() => new Error('Failed')));
    component.loanForm.controls.bookTitle.setValue('Original title');
    component.searchBookTitles();
    tick(300);
    expect(component.titlesLoadError).toBeTrue();
    expect(component.loanForm.controls.bookTitle.valid).toBeTrue();
    getTitles.and.returnValue(of({ success: true, data: ['Other title'] }));
    component.loanForm.controls.bookTitle.setValue('Other');
    component.searchBookTitles();
    tick(300);
    expect(component.titlesLoadError).toBeFalse();
    expect(component.bookTitles).toEqual(['Other title']);
    component.cancel();
    expect(component.bookTitles).toEqual([]);
  }));
});
