import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { BookLoan } from '@/app/interfaces/book-loan';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-add-book-loan',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, ZardButtonComponent, ZardInputComponent],
  templateUrl: './add-book-loan.component.html',
  styleUrl: './add-book-loan.component.css',
})
export class AddBookLoanComponent implements OnInit {
  @Output() canceled = new EventEmitter<void>();
  @Output() success = new EventEmitter<BookLoan>();

  private readonly formBuilder = inject(FormBuilder);

  readonly today = this.formatDate(new Date());
  submitted = false;

  readonly loanForm = this.formBuilder.nonNullable.group({
    registrationNumber: ['', [Validators.required, Validators.pattern(/\S/)]],
    bookTitle: ['', [Validators.required, Validators.pattern(/\S/)]],
    borrowingDate: [this.today, [Validators.required]],
    expectedReturnDate: [this.addDays(this.today, 7), [Validators.required]],
    effectiveReturnDate: [''],
  });

  ngOnInit(): void {
    this.loanForm.controls.borrowingDate.valueChanges.subscribe(date => {
      if (date) {
        this.loanForm.controls.expectedReturnDate.setValue(this.addDays(date, 7));
      }
      this.validateEffectiveReturnDate();
    });

    this.loanForm.controls.effectiveReturnDate.valueChanges.subscribe(() => {
      this.validateEffectiveReturnDate();
    });
  }

  saveLoan(): void {
    this.submitted = true;
    this.validateEffectiveReturnDate();

    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      return;
    }

    const value = this.loanForm.getRawValue();
    this.success.emit({
      registrationNumber: value.registrationNumber.trim(),
      bookTitle: value.bookTitle.trim(),
      borrowingDate: value.borrowingDate,
      expectedReturnDate: value.expectedReturnDate,
      effectiveReturnDate: value.effectiveReturnDate,
    });
    this.resetForm();
  }

  cancel(): void {
    this.resetForm();
    this.canceled.emit();
  }

  showError(controlName: keyof typeof this.loanForm.controls): boolean {
    const control = this.loanForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted);
  }

  private resetForm(): void {
    const borrowingDate = this.formatDate(new Date());
    this.loanForm.reset({
      registrationNumber: '',
      bookTitle: '',
      borrowingDate,
      expectedReturnDate: this.addDays(borrowingDate, 7),
      effectiveReturnDate: '',
    });
    this.submitted = false;
  }

  private validateEffectiveReturnDate(): void {
    const control = this.loanForm.controls.effectiveReturnDate;
    const borrowingDate = this.loanForm.controls.borrowingDate.value;
    const effectiveReturnDate = control.value;

    if (effectiveReturnDate && borrowingDate && effectiveReturnDate < borrowingDate) {
      control.setErrors({ returnBeforeBorrowing: true });
    } else if (control.hasError('returnBeforeBorrowing')) {
      control.setErrors(null);
    }
  }

  private addDays(date: string, days: number): string {
    const result = new Date(`${date}T00:00:00`);
    result.setDate(result.getDate() + days);
    return this.formatDate(result);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
