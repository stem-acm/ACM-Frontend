import { ZardTableImports } from '@/shared/components/table/table.imports';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-table-loading',
  standalone: true,
  imports: [ZardTableImports, TranslateModule],
  templateUrl: './table-loading.component.html',
  styleUrl: './table-loading.component.css',
})
export class TableLoadingComponent {
  readonly rows = [0, 1, 2, 3, 4];
  @Input() data!: { columns: string[]; textLoading: string };
}
