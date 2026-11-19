import { TableEmptyComponent } from '@/app/components/table-empty/table-empty.component';
import { TableSortComponent } from '@/app/components/table-sort/table-sort.component';
import { SortDirection } from '@/app/utils/table-sort';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardTableImports } from '@/shared/components/table/table.imports';
import { Volunteer } from '@/app/interfaces/volunteer';
import { environment } from '@/environments/environment';
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DateUtil } from '@/app/utils/date.util';
import { AuthService } from '@/app/services/auth.service';
import { AsyncPipe } from '@angular/common';
import { MemberPhotoPipe } from '@/app/pipes/member-photo.pipe';
import { MemberNamePipe } from '@/app/pipes/member-name.pipe';

@Component({
  selector: 'app-table-volunteers',
  standalone: true,
  imports: [
    MemberNamePipe,
    TableEmptyComponent,
    TableSortComponent,
    ZardButtonComponent,
    ZardTableImports,
    RouterModule,
    TranslateModule,
    AsyncPipe,
    MemberPhotoPipe,
  ],
  templateUrl: './table-volunteers.component.html',
  styleUrl: './table-volunteers.component.css',
})
export class TableVolunteersComponent {
  @Input() sortDirection: SortDirection = 'none';
  @Output() sortChange = new EventEmitter<void>();
  public auth = inject(AuthService);
  @Input() data: Volunteer[] = [];
  private URL: string = environment.FILE_URL;
  private dateUtil = inject(DateUtil);

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = `${this.URL}/user.png`;
  }

  formatDate(date?: Date | null | undefined) {
    return this.dateUtil.formatDateFull(date);
  }
}
