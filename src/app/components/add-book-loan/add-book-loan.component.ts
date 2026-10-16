import { ZardButtonComponent } from '@/shared/components/button';
import { ZardInputComponent } from '@/shared/components/input';
import { BookLoan } from '@/app/interfaces/book-loan';
import { Member } from '@/app/interfaces/member';
import { MemberService } from '@/app/services/member.service';
import { BookLoanService } from '@/app/services/book-loan.service';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';

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
  private readonly memberService = inject(MemberService);
  private readonly bookLoanService = inject(BookLoanService);

  readonly today = this.formatDate(new Date());
  submitted = false;
  filteredMembers: Member[] = [];
  selectedMember: Member | null = null;
  memberSearch = '';
  membersLoading = false;
  membersLoadError = false;
  saving = false;
  saveError = '';
  private readonly searchSubject = new Subject<string>();
  private readonly pageSize = 200;

  readonly loanForm = this.formBuilder.nonNullable.group({
    bookTitle: ['', [Validators.required, Validators.pattern(/\S/)]],
    borrowingDate: [this.today, [Validators.required]],
    expectedReturnDate: [this.addDays(this.today, 7), [Validators.required]],
    effectiveReturnDate: [''],
  });

  ngOnInit(): void {
    this.loadMembers();
    this.searchSubject
      .pipe(
        debounceTime(1000),
        distinctUntilChanged(),
        switchMap(value => {
          this.membersLoading = true;
          this.membersLoadError = false;
          return this.memberService.getAllMembers(0, this.pageSize, value);
        }),
      )
      .subscribe({
        next: result => {
          this.filteredMembers = result.success && result.data ? result.data : [];
          this.membersLoading = false;
        },
        error: () => {
          this.filteredMembers = [];
          this.membersLoading = false;
          this.membersLoadError = true;
        },
      });
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

    if (this.loanForm.invalid || !this.selectedMember?.registrationNumber) {
      this.loanForm.markAllAsTouched();
      return;
    }

    const value = this.loanForm.getRawValue();
    const loan: BookLoan = {
      registrationNumber: this.selectedMember.registrationNumber,
      bookTitle: value.bookTitle.trim(),
      borrowingDate: value.borrowingDate,
      expectedReturnDate: value.expectedReturnDate,
      effectiveReturnDate: value.effectiveReturnDate,
      Member: this.selectedMember,
    };

    this.saving = true;
    this.saveError = '';
    this.bookLoanService.create(loan).subscribe({
      next: result => {
        this.saving = false;
        this.success.emit(result.data);
        this.resetForm();
      },
      error: error => {
        this.saving = false;
        this.saveError = error.error?.message || 'Unable to save the book loan.';
      },
    });
  }

  cancel(): void {
    this.resetForm();
    this.canceled.emit();
  }

  showError(controlName: keyof typeof this.loanForm.controls): boolean {
    const control = this.loanForm.controls[controlName];
    return control.invalid && (control.touched || this.submitted);
  }

  searchMembers(value: string): void {
    this.memberSearch = value;
    this.selectedMember = null;
    this.filteredMembers = [];
    this.searchSubject.next(value);
  }

  selectMember(member: Member): void {
    this.selectedMember = member;
    this.memberSearch = `${member.firstName} ${member.lastName} · ${member.registrationNumber}`;
    this.filteredMembers = [];
  }

  private loadMembers(): void {
    this.membersLoading = true;
    this.membersLoadError = false;
    this.memberService.getAllMembers(0, this.pageSize, this.memberSearch).subscribe({
      next: result => {
        this.filteredMembers = result.success && result.data ? result.data : [];
        this.membersLoading = false;
      },
      error: () => {
        this.filteredMembers = [];
        this.membersLoading = false;
        this.membersLoadError = true;
      },
    });
  }

  private resetForm(): void {
    const borrowingDate = this.formatDate(new Date());
    this.loanForm.reset({
      bookTitle: '',
      borrowingDate,
      expectedReturnDate: this.addDays(borrowingDate, 7),
      effectiveReturnDate: '',
    });
    this.memberSearch = '';
    this.selectedMember = null;
    this.filteredMembers = [];
    this.submitted = false;
    this.saveError = '';
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
