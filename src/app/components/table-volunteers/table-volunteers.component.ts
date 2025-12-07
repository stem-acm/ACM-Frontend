import { Volunteer } from '@/app/interfaces/volunteer';
import { environment } from '@/environments/environment';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-table-volunteers',
  standalone: true,
  imports: [RouterModule, TranslateModule],
  templateUrl: './table-volunteers.component.html',
  styleUrl: './table-volunteers.component.css',
})
export class TableVolunteersComponent {
  @Input() data!: Volunteer[];
  @Output() showVolunteerCertificate = new EventEmitter<Volunteer>();
  private URL: string = environment.FILE_URL;
  private translateService = inject(TranslateService);

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  formatDate(date?: Date | null | undefined) {
    if (!date) return this.translateService.instant('table.noDate');
    return dayjs(date).format('dddd DD MMMM YYYY');
  }

  showCertificate(data: Volunteer) {
    this.showVolunteerCertificate.emit(data);
  }
}
