import { Component, Input, inject } from '@angular/core';
import { environment } from '@/environments/environment';
import { Member } from '@/app/interfaces/member';
import { Volunteer } from '@/app/interfaces/volunteer';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalAlertComponent } from '../modal-alert/modal-alert.component';
import { MemberService } from '@/app/services/member.service';
import { ToastService } from '@/app/services/toast.service';
import { HttpResult } from '@/app/types/httpResult';
import { CommonModule } from '@angular/common';
import { Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-table-members',
  standalone: true,
  imports: [RouterModule, TranslateModule, ModalAlertComponent, CommonModule],
  templateUrl: './table-members.component.html',
  styleUrl: './table-members.component.css',
})
export class TableMembersComponent {
  private URL: string = environment.FILE_URL;
  public userImg = `${this.URL}/user.png`;
  @Input() data!: Member[];
  @Input() volunteersList!: Volunteer[];

  @Output() memberDeleted = new EventEmitter<void>();
  
  private translateService = inject(TranslateService);
  private memberService = inject(MemberService);
  private toastService = inject(ToastService);

  showDeleteModal = false;
  memberToDeleteId: number | null = null;
  deleteTitle = '';
  deleteMessage = '';

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  isVolunteer(memberId: number): boolean {
    return this.volunteersList.some(volunteer => volunteer.memberId === memberId);
  }

  formatDate(date?: Date | string): string {
    if (!date) return this.translateService.instant('table.noDate');

    const start = dayjs(date);
    const now = dayjs();

    const years = now.diff(start, 'year');
    const months = now.diff(start.add(years, 'year'), 'month');
    const weeks = now.diff(start.add(years, 'year').add(months, 'month'), 'week');
    const days = now.diff(start.add(years, 'year').add(months, 'month').add(weeks, 'week'), 'day');
    const hours = now.diff(
      start.add(years, 'year').add(months, 'month').add(weeks, 'week').add(days, 'day'),
      'hour',
    );

    if (years > 0)
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? months + ' month' + (months > 1 ? 's' : '') : ''}`;
    if (months > 0)
      return `${months} month${months > 1 ? 's' : ''} ${weeks > 0 ? weeks + ' week' + (weeks > 1 ? 's' : '') : ''}`;
    if (weeks > 0)
      return `${weeks} week${weeks > 1 ? 's' : ''} ${days > 0 ? days + ' day' + (days > 1 ? 's' : '') : ''}`;
    if (days > 0)
      return `${days} day${days > 1 ? 's' : ''} ${hours > 0 ? hours + ' hour' + (hours > 1 ? 's' : '') : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  onDeleteClick(member: Member) {
    this.memberToDeleteId = member.id!;
    this.deleteTitle = this.translateService.instant('alert.deleteTitle');
    this.deleteMessage = this.translateService.instant('alert.deleteMessage', { 
      name: `${member.firstName} ${member.lastName}` 
    });
    // Fallback if translation missing or not set up with params
    if (this.deleteTitle === 'alert.deleteTitle') this.deleteTitle = 'Delete Member';
    if (this.deleteMessage === 'alert.deleteMessage') this.deleteMessage = `Are you sure you want to delete ${member.firstName} ${member.lastName}?`;
    
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.memberToDeleteId = null;
  }

  confirmDelete() {
    if (this.memberToDeleteId) {
      this.memberService.deleteMember(this.memberToDeleteId).subscribe({
        next: (result: HttpResult<null>) => {
          if (result.success) {
            this.toastService.showToast('Member deleted successfully');
            this.memberDeleted.emit();
          } else {
            this.toastService.showToast(result.message || 'Failed to delete member');
          }
          this.showDeleteModal = false;
          this.memberToDeleteId = null;
        },
        error: (error) => {
          const msg = error.error?.message || error.message || 'Failed to delete member';
          this.toastService.showToast(msg);
          this.showDeleteModal = false;
          this.memberToDeleteId = null;
        }
      });
    }
  }
}
