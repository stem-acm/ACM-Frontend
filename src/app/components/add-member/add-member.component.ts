import { Component, EventEmitter, Output} from '@angular/core';
import { Occupation } from '../../types/occupation';
import { MemberService } from '../../services/member.service';
import { Member } from '../../interfaces/member';
import { HttpResult } from '../../types/httpResult';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastComponent } from '../toast/toast.component';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-add-member',
  standalone: true,
  imports: [FormsModule, CommonModule, ToastComponent],
  templateUrl: './add-member.component.html',
  styleUrl: './add-member.component.css'
})
export class AddMemberComponent {
  @Output('canceled') emiterCancel = new EventEmitter<boolean>();
  @Output('showToast') emiterToast = new EventEmitter<string>();
  public occupations: Occupation[] = ['employee', 'entrepreneur', 'student', 'unemployed'];
  public error: {enabled: boolean, message: string} = {enabled: false, message: ''};
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
    if (!this.checkValidation()) {
      this.error = {
            enabled: true,
            message: 'Please fill in all required fields.'
          }
      return;
    }
    this.memberService.addMember(this.member)
      .subscribe(
        (result: HttpResult) => {
          if(result.success) {
            this.error = {
              enabled: false,
              message: ''
            };
            this.emiterToast.emit(`Member ${this.member.firstName} ${this.member.lastName} created successfully`)
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
        },
        (error) => {
          this.error = {
            enabled: true,
            message: error.error.message
          }
        }
      )
  }

}
