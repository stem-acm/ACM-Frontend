import { Component, Input, inject } from '@angular/core';
import { environment } from '@/environments/environment';
import { Member } from '@/app/interfaces/member';
import { Volunteer } from '@/app/interfaces/volunteer';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ImgRoundComponent } from '../img-round/img-round.component';

@Component({
  selector: 'app-table-members',
  standalone: true,
  imports: [RouterModule, TranslateModule, ImgRoundComponent],
  templateUrl: './table-members.component.html',
  styleUrl: './table-members.component.css',
})
export class TableMembersComponent {
  private URL: string = environment.FILE_URL;
  public userImg = `${this.URL}/user.png`;
  @Input() data!: Member[];
  @Input() volunteers: Volunteer[] = [];
  private translateService = inject(TranslateService);

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  isVolunteer(memberId: string): boolean {
    return this.volunteers.some(volunteer => volunteer.memberId === memberId);
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
}
