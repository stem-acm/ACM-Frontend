import { Volunteer } from '@/app/interfaces/volunteer';
import { environment } from '@/environments/environment';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';

@Component({
  selector: 'app-table-volunteers',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './table-volunteers.component.html',
  styleUrl: './table-volunteers.component.css',
})
export class TableVolunteersComponent {
  @Input() data!: Volunteer[];
  private URL: string = environment.FILE_URL;

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  formatDate(date?: Date | null | undefined) {
    if (!date) return 'no date';
    return dayjs(date).format('dddd DD MMMM YYYY');
  }
}
