import { Volunteer } from '@/app/interfaces/volunteer';
import { environment } from '@/environments/environment';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateUtil } from '@/app/utils/date.util';

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
  private dateUtil = inject(DateUtil);

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  formatDate(date?: Date | null | undefined) {
    return this.dateUtil.formatDateFull(date);
  }

  showCertificate(data: Volunteer) {
    this.showVolunteerCertificate.emit(data);
  }
}
