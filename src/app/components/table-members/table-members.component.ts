import { TableEmptyComponent } from '@/app/components/table-empty/table-empty.component';
import { TableSortComponent } from '@/app/components/table-sort/table-sort.component';
import { SortDirection } from '@/app/utils/table-sort';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardTableImports } from '@/shared/components/table/table.imports';
import { Component, Input, Output, inject, EventEmitter } from '@angular/core';
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
import { AuthService } from '@/app/services/auth.service';
import { MemberPhotoPipe } from '@/app/pipes/member-photo.pipe';
import { MemberNamePipe, memberFullName } from '@/app/pipes/member-name.pipe';

@Component({
  selector: 'app-table-members',
  standalone: true,
  imports: [
    MemberNamePipe,
    TableEmptyComponent,
    TableSortComponent,
    ZardButtonComponent,
    ZardTableImports,
    RouterModule,
    TranslateModule,
    ModalAlertComponent,
    CommonModule,
    MemberPhotoPipe,
  ],
  templateUrl: './table-members.component.html',
  styleUrl: './table-members.component.css',
})
export class TableMembersComponent {
  @Input() sortDirection: SortDirection = 'none';
  @Output() sortChange = new EventEmitter<void>();
  public auth = inject(AuthService);
  private URL: string = environment.FILE_URL;
  public userImg = `${this.URL}/user.png`;
  @Input() data: { selected: boolean; member: Member }[] = [];
  @Input() volunteersList: Volunteer[] = [];

  @Output() memberDeleted = new EventEmitter<number>();
  @Output() pageSelectionChange = new EventEmitter<boolean>();

  get allPageSelected(): boolean {
    return this.data.length > 0 && this.data.every(item => item.selected);
  }

  get somePageSelected(): boolean {
    return !this.allPageSelected && this.data.some(item => item.selected);
  }

  selectPage(event: Event): void {
    this.pageSelectionChange.emit((event.target as HTMLInputElement).checked);
  }

  private translateService = inject(TranslateService);
  private memberService = inject(MemberService);
  private toastService = inject(ToastService);

  showDeleteModal = false;
  memberToDeleteId: number | null = null;
  deleteTitle = '';
  deleteMessage = '';

  //public membersClicked!: Member[];
  //public membersChooseList: { selected: boolean; member: Member }[] = [];
  //public membersChooseListFilter: { selected: boolean; member: Member }[] = [];
  //public showCard = false;
  // private member!: Member;

  // @Input() memberChoose!: { selected: boolean; member: Member };
  // @Output() setSelectedMember = new EventEmitter<Member>();
  @Output() memberSelectionChange = new EventEmitter<{
    selected: boolean;
    member: Member;
  }>();

  /*   openCard(_member: Member) {
    this.setSelectedMember.emit(_member);
  } */

  onCheckboxChange(event: Event, _member: Member) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.memberSelectionChange.emit({
      member: _member,
      selected: isChecked,
    });
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = `${this.URL}/user.png`;
  }

  isVolunteer(registrationNumber: number): boolean {
    return this.volunteersList.some(
      volunteer => volunteer.registrationNumber === registrationNumber,
    );
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
    this.memberToDeleteId = member.registrationNumber!;
    this.deleteTitle = this.translateService.instant('alert.deleteTitle');
    this.deleteMessage = this.translateService.instant('alert.deleteMessage', {
      name: memberFullName(member),
    });
    // Fallback if translation missing or not set up with params
    if (this.deleteTitle === 'alert.deleteTitle') this.deleteTitle = 'Delete Member';
    if (this.deleteMessage === 'alert.deleteMessage')
      this.deleteMessage = `Are you sure you want to delete ${memberFullName(member)}?`;

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
            this.memberDeleted.emit(this.memberToDeleteId!);
          } else {
            this.toastService.showToast(result.message || 'Failed to delete member');
          }
          this.showDeleteModal = false;
          this.memberToDeleteId = null;
        },
        error: error => {
          const msg = error.error?.message || error.message || 'Failed to delete member';
          this.toastService.showToast(msg);
          this.showDeleteModal = false;
          this.memberToDeleteId = null;
        },
      });
    }
  }
}
