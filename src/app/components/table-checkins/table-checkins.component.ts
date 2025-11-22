import { Component, Input } from '@angular/core';
import { Checkin } from '@/app/interfaces/checkin';
import { environment } from '@/environments/environment';
import dayjs from 'dayjs';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-table-checkins',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './table-checkins.component.html',
  styleUrl: './table-checkins.component.css',
})
export class TableCheckinsComponent {
  private URL: string = environment.FILE_URL;
  @Input() checkins!: Checkin[];

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${(fileName && fileName != '' ? fileName : 'user.png')}`;
  }

  formatTime(date?: Date | string): string {
    if (!date) return 'no time';
    return dayjs(date).format('h:mm A');
  }
}
