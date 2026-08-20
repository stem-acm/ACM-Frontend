import { Component, inject, Input, OnInit } from '@angular/core';
import { Member } from '@/app/interfaces/member';
import { ImgRoundComponent } from '../img-round/img-round.component';
import { TitleComponent } from '../title/title.component';
import { TextDescriptionComponent } from '../text-description/text-description.component';
import { CommonModule } from '@angular/common';
import { environment } from '@/environments/environment';
import dayjs from 'dayjs';
import { ListValueComponent } from '../list-value/list-value.component';
import { AddMemberComponent } from '../add-member/add-member.component';
import { AppComponent } from '@/app/app.component';
import { RouterModule } from '@angular/router';
import { MemberCardViewerComponent } from '../member-card-viewer/member-card-viewer.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VolunteerService } from '@/app/services/volunteer.service';
import { Volunteer } from '@/app/interfaces/volunteer';
import { ModalAlertComponent } from '../modal-alert/modal-alert.component';
import { MemberService } from '@/app/services/member.service';
import { ToastService } from '@/app/services/toast.service';
import { HttpResult } from '@/app/types/httpResult';
import { Router } from '@angular/router';

@Component({
  selector: 'app-member-card-detail',
  standalone: true,
  imports: [
    ImgRoundComponent,
    TitleComponent,
    TextDescriptionComponent,
    CommonModule,
    ListValueComponent,
    AddMemberComponent,
    RouterModule,
    MemberCardViewerComponent,
    TranslateModule,
    ModalAlertComponent,
  ],
  templateUrl: './member-card-detail.component.html',
  styleUrl: './member-card-detail.component.css',
})
export class MemberCardDetailComponent implements OnInit {
  @Input() member!: Member;
  private URL: string = environment.FILE_URL;
  public showAddForm = false;
  public showCard = false;
  private app = inject(AppComponent);
  private translateService = inject(TranslateService);
  private volunteerService = inject(VolunteerService);
  private volunteers: Volunteer[] = [];
  public isVolunteer = false;
  public isLoadingVolunteers = true;

  private memberService = inject(MemberService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  showDeleteModal = false;
  deleteTitle = '';
  deleteMessage = '';

  formatDate(date?: Date | string) {
    if (!date) return 'no date';
    const formatted = dayjs(date).format('dddd DD MMMM YYYY');
    const age = dayjs().diff(dayjs(date), 'year');
    return `${formatted} (${age} yrs)`;
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  cancelForm(event: boolean) {
    if (event) this.showAddForm = false;
  }

  showToast(event: { message: string; data: Member }) {
    if (event) this.showAddForm = false;
    this.app.showToast(event.message);
    this.member = event.data;
  }

  updateMember() {
    this.showAddForm = true;
  }

  close(_: boolean) {
    this.showCard = false;
  }

  open() {
    this.showCard = true;
  }

  getMemberNotFoundMessage(): string {
    if (!this.member?.registrationNumber) return '';
    return this.translateService.instant('errors.memberNotFound', {
      registrationNumber: this.member.registrationNumber,
    });
  }

  ngOnInit(): void {
    this.getVolunteersList();
  }

  getVolunteersList() {
    this.volunteerService.getAllVolunteers(0, 1000).subscribe(res => {
      this.volunteers = res.data;
      this.checkIfVolunteer();
      this.isLoadingVolunteers = false;
    });
  }

  checkIfVolunteer(): void {
    this.isVolunteer = this.volunteers.some(
      volunteer => volunteer.registrationNumber === this.member.registrationNumber,
    );
  }

  onDeleteClick() {
    this.deleteTitle = this.translateService.instant('alert.deleteTitle');
    this.deleteMessage = this.translateService.instant('alert.deleteMessage', {
      name: `${this.member.firstName} ${this.member.lastName}`,
    });
    // Fallback if translation missing
    if (this.deleteTitle === 'alert.deleteTitle') this.deleteTitle = 'Delete Member';
    if (this.deleteMessage === 'alert.deleteMessage') {
      this.deleteMessage = `Are you sure you want to delete ${this.member.firstName} ${this.member.lastName}?`;
    }

    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (this.member?.registrationNumber) {
      this.memberService.deleteMember(this.member.registrationNumber).subscribe({
        next: (result: HttpResult<null>) => {
          if (result.success) {
            this.toastService.showToast('Member deleted successfully');
            this.router.navigate(['/members']);
          } else {
            this.toastService.showToast(result.message || 'Failed to delete member');
          }
          this.showDeleteModal = false;
        },
        error: error => {
          const msg = error.error?.message || error.message || 'Failed to delete member';
          this.toastService.showToast(msg);
          this.showDeleteModal = false;
        },
      });
    }
  }
}
