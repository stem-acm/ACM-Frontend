import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { Occupation } from '../../types/occupation';
import { MemberService } from '../../services/member.service';
import { Member } from '../../interfaces/member';
import { HttpResult } from '../../types/httpResult';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastComponent } from '../toast/toast.component';

@Component({
  selector: 'app-add-member',
  standalone: true,
  imports: [FormsModule, CommonModule, ToastComponent],
  templateUrl: './add-member.component.html',
  styleUrl: './add-member.component.css',
})
export class AddMemberComponent implements OnInit {
  @Output('canceled') emiterCancel = new EventEmitter<boolean>();
  @Output('showToast') emiterToast = new EventEmitter<string>();
  @Output('updatedData') sendData = new EventEmitter<{ data: Member; message: string }>();
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
  };

  constructor(private memberService: MemberService) {}

  ngOnInit() {
    if (this.mode == 'update') {
      this.member = { ...this.memberToUpdate };
    }
  }

  cancel() {
    this.emiterCancel.emit(true);
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
        message: 'Please fill in all required fields.',
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
          this.emiterToast.emit(
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
          };
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
          this.sendData.emit({
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
