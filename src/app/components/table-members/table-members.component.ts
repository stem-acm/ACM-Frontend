import { Component, Input } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Member } from '../../interfaces/member';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';

@Component({
  selector: 'app-table-members',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './table-members.component.html',
  styleUrl: './table-members.component.css',
})
export class TableMembersComponent {
  private URL: string = environment.FILE_URL;
  public userImg = `${this.URL}/user.png`;
  @Input() data!: Member[];

  getfileUrl(fileName: any) {
    return `${this.URL}/${(fileName ??= 'user.png')}`;
  }

  formatDate(date?: Date | string): string {
    if (!date) return 'no date';

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
