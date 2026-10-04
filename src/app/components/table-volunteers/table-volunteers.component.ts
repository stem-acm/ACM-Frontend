import { ZardButtonComponent } from '@/shared/components/button';
import { ZardTableImports } from '@/shared/components/table/table.imports';
import { Volunteer } from '@/app/interfaces/volunteer';
import { environment } from '@/environments/environment';
import { Component, Input, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateUtil } from '@/app/utils/date.util';

@Component({
  selector: 'app-table-volunteers',
  standalone: true,
  imports: [ZardButtonComponent, ZardTableImports, RouterModule, TranslateModule],
  templateUrl: './table-volunteers.component.html',
  styleUrl: './table-volunteers.component.css',
})
export class TableVolunteersComponent {
  @Input() data!: Volunteer[];
  private URL: string = environment.FILE_URL;
  private dateUtil = inject(DateUtil);

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  formatDate(date?: Date | null | undefined) {
    return this.dateUtil.formatDateFull(date);
  }
}
