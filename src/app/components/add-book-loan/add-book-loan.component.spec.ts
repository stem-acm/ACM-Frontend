import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { AddBookLoanComponent } from './add-book-loan.component';

describe('AddBookLoanComponent', () => {
  let component: AddBookLoanComponent;
  let fixture: ComponentFixture<AddBookLoanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBookLoanComponent, TranslateModule.forRoot()],
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
    component.loanForm.patchValue({
      registrationNumber: ' ACM-001 ',
      bookTitle: ' Things Fall Apart ',
    });

    component.saveLoan();

    expect(success).toHaveBeenCalledWith(
      jasmine.objectContaining({
        registrationNumber: 'ACM-001',
        bookTitle: 'Things Fall Apart',
      }),
    );
  });

  it('rejects a return date before the borrowing date', () => {
    component.loanForm.patchValue({
      registrationNumber: 'ACM-001',
      bookTitle: 'Things Fall Apart',
      borrowingDate: '2026-10-15',
      effectiveReturnDate: '2026-10-14',
    });

    component.saveLoan();

    expect(
      component.loanForm.controls.effectiveReturnDate.hasError('returnBeforeBorrowing'),
    ).toBeTrue();
  });

  it('resets and emits when canceled', () => {
    const canceled = jasmine.createSpy('canceled');
    component.canceled.subscribe(canceled);
    component.loanForm.controls.registrationNumber.setValue('ACM-001');

    component.cancel();

    expect(canceled).toHaveBeenCalled();
    expect(component.loanForm.controls.registrationNumber.value).toBe('');
  });
});
