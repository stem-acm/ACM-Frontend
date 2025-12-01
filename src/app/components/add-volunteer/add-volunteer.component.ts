import { Member } from '@/app/interfaces/member';
import { Volunteer } from '@/app/interfaces/volunteer';
import { MemberService } from '@/app/services/member.service';
import { HttpResult } from '@/app/types/httpResult';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardSkeletonComponent } from '../card-skeleton/card-skeleton.component';
import { CardComponent } from '../card/card.component';
import { MemberCardViewerComponent } from '../member-card-viewer/member-card-viewer.component';
import { VolunteerService } from '@/app/services/volunteer.service';

@Component({
  selector: 'app-add-volunteer',
  standalone: true,
  imports: [FormsModule, CommonModule, CardSkeletonComponent, CardComponent, MemberCardViewerComponent],
  templateUrl: './add-volunteer.component.html',
  styleUrl: './add-volunteer.component.css'
})
export class AddVolunteerComponent implements OnInit {
  @Output() canceled = new EventEmitter<boolean>();
  @Output() showToast = new EventEmitter<string>();
  @Output() success = new EventEmitter<boolean>();
  @Output() updatedData = new EventEmitter<{ data: Volunteer; message: string }>();

  public error: { enabled: boolean; message: string } = { enabled: false, message: '' };
  @Input() mode: 'update' | 'insert' = 'insert';
  @Input() title!: string;
  public loading = false;
  private memberService = inject(MemberService);
  private volunteerService = inject(VolunteerService);
  private member!: Member[];
  public memberFilter!: Member[];
  public membersChooseList: { selected: boolean; member: Member }[] = [];
  public membersChooseListFilter!: { selected: boolean; member: Member }[];
  public membersClicked!: Member[];
  public showCard = false;
  public searchWord!: string;
  public joinDate!: Date | null | undefined;
  public expirationDate!: Date | null | undefined;

  ngOnInit() {
    this.getMemberList();
  }

  getMemberList() {
    this.memberService.getAllMembers().subscribe((result: HttpResult<Member[]>) => {
      if (result.success && result.data) {
        this.member = result.data;
                this.member.map(e => {
          this.membersChooseList.push({
            selected: false,
            member: e,
          });
        });
        this.membersChooseListFilter = this.membersChooseList.slice(0, 10);
      }
    });
  }

  checkValidation(): boolean {
    if (
      this.joinDate &&
      this.expirationDate
    ) {
      return true;
    }
    return false;
  }

  saveVolunteer() {
    this.loading = true;
    if (this.mode == 'insert') {
      this.insertVolunteer();
    }
  }

  insertVolunteer() {
    if (!this.checkValidation()) {
      this.error = {
        enabled: true,
        message: 'Please fill in all required fields.',
      };
      this.loading = false;
      return;
    }
    
    const memberChoosed = this.membersChooseList.filter(e => e.selected === true);
    this.membersClicked = memberChoosed.map(e => e.member);
    const volunteerChoosed: Volunteer = {
      memberId: this.membersClicked[0].id??=0,
      joinDate: this.joinDate,
      expirationDate: this.expirationDate
    }
    
    this.volunteerService.addVolunteer(volunteerChoosed).subscribe(
      (result: HttpResult<Volunteer>) => {
        if (result.success && result.data) {
          this.loading = false;
          this.error = {
            enabled: false,
            message: '',
          };
          this.showToast.emit(
            `Member ${this.membersClicked[0].firstName} ${this.membersClicked[0].lastName} created successfully`,
          );
          this.success.emit(true);
        }
      }
    );
  }

  cancel() {
    this.canceled.emit(true);
  }

  onMemberSelectionChange(event: { member: Member; selected: boolean }) {
    this.membersChooseList.map(e => {
      if (e.member.registrationNumber === event.member.registrationNumber) {
        e.selected = event.selected;
      }
    });
  }

  open(event: Member) {
    this.membersClicked = [event];
    this.showCard = true;
  }

  close(_: boolean) {
    this.showCard = false;
  }

  search(keyWord: string) {
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.membersChooseListFilter = this.membersChooseList.filter(
      e =>
        e.member.firstName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
        e.member.lastName.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1,
    );
  }

}
