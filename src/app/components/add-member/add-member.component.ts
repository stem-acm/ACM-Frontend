import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { Occupation } from '@/app/types/occupation';
import { MemberService } from '@/app/services/member.service';
import { Member } from '@/app/interfaces/member';
import { HttpResult } from '@/app/types/httpResult';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-add-member',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslateModule],
  templateUrl: './add-member.component.html',
  styleUrl: './add-member.component.css',
})
export class AddMemberComponent implements OnChanges, OnInit {
  @Output() canceled = new EventEmitter<boolean>();
  @Output() showToast = new EventEmitter<string>();
  @Output() success = new EventEmitter<boolean>();
  @Output() updatedData = new EventEmitter<{ data: Member; message: string }>();
  public occupations: Occupation[] = ['employee', 'entrepreneur', 'student', 'unemployed'];
  public error: { enabled: boolean; message: string } = { enabled: false, message: '' };
  @Input() mode: 'update' | 'insert' = 'insert';
  @Input() memberToUpdate!: Member;
  @Input() title!: string;
  public loading = false;
  public member: Member = {
    registrationNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    address: '',
    occupation: 'unemployed',
    phoneNumber: '',
    studyOrWorkPlace: '',
    joinDate: '',
    profileImage: '',
  };

  private memberService = inject(MemberService);

  ngOnInit() {
    if (this.mode == 'update') {
      this.member = { ...this.memberToUpdate };
    } else {
      this.member = {
        registrationNumber: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        birthPlace: '',
        address: '',
        occupation: 'unemployed',
        phoneNumber: '',
        studyOrWorkPlace: '',
        joinDate: '',
        profileImage: '',
      };
    }
  }

  cancel() {
    this.canceled.emit(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode']) {
      if (this.mode === 'insert') {
        this.member = {
          registrationNumber: '',
          firstName: '',
          lastName: '',
          birthDate: '',
          birthPlace: '',
          address: '',
          occupation: 'unemployed',
          phoneNumber: '',
          studyOrWorkPlace: '',
          joinDate: '',
          profileImage: '',
        };
      }
    }

    if (changes['memberToUpdate'] && this.mode === 'update') {
      this.member = { ...this.memberToUpdate };
    }
  }

  checkValidation(): boolean {
    const m = this.member;
    if (
      m.firstName?.trim() &&
      m.lastName?.trim() &&
      m.birthDate &&
      m.birthPlace?.trim() &&
      m.address?.trim() &&
      m.occupation &&
      m.studyOrWorkPlace?.trim() &&
      m.phoneNumber?.trim() &&
      m.joinDate
    ) {
      return true;
    }
    return false;
  }

  saveMember() {
    this.loading = true;
    if (this.mode == 'insert') {
      this.insertMember();
    } else {
      this.updateMember();
    }
  }

  insertMember() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all fields.',
      };
      this.loading = false;
      return;
    }
    this.memberService.addMember(this.member).subscribe(
      (result: HttpResult<Member>) => {
        if (result.success) {
          this.error = {
            enabled: false,
            message: '',
          };
          this.showToast.emit(
            `Member ${this.member.firstName} ${this.member.lastName} created successfully`,
          );
          this.member = {
            registrationNumber: '',
            firstName: '',
            lastName: '',
            birthDate: '',
            birthPlace: '',
            address: '',
            occupation: 'unemployed',
            phoneNumber: '',
            studyOrWorkPlace: '',
            joinDate: '',
            profileImage: '',
          };
          this.success.emit(true);
        }
        this.loading = false;
      },
      error => {
        this.error = {
          enabled: true,
          message: error.error.message,
        };
        this.loading = false;
      },
    );
  }

  updateMember() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all required fields.',
      };
      this.loading = false;
      return;
    }
    this.memberService.updateMember(this.member).subscribe(
      (result: HttpResult<Member>) => {
        if (result.success) {
          this.error = {
            enabled: false,
            message: '',
          };
          this.updatedData.emit({
            data: this.member,
            message: `Member ${this.member.firstName} ${this.member.lastName} updated successfully`,
          });
        }
        this.loading = false;
      },
      error => {
        this.error = {
          enabled: true,
          message: error.error.message,
        };
        this.loading = false;
      },
    );
  }
}
