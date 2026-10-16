import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { Member } from '@/app/interfaces/member';
import { MemberService } from '@/app/services/member.service';
import { BookLoanService } from '@/app/services/book-loan.service';
import { AddBookLoanComponent } from './add-book-loan.component';

describe('AddBookLoanComponent', () => {
  let component: AddBookLoanComponent;
  let fixture: ComponentFixture<AddBookLoanComponent>;
  let getAllMembers: jasmine.Spy;
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
            create: (loan: object) => of({ success: true, message: 'Created', data: loan }),
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

  it('emits a valid loan', () => {
    const success = jasmine.createSpy('success');
    component.success.subscribe(success);
    component.selectMember(members[0]);
    component.loanForm.patchValue({ bookTitle: ' Things Fall Apart ' });

    component.saveLoan();

    expect(success).toHaveBeenCalledWith(
      jasmine.objectContaining({
        registrationNumber: 101,
        Member: members[0],
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
});
