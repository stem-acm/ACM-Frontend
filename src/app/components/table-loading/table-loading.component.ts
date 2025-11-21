import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-loading',
  standalone: true,
  imports: [],
  templateUrl: './table-loading.component.html',
  styleUrl: './table-loading.component.css',
})
export class TableLoadingComponent {
  @Input() data!: { columns: string[]; textLoading: string };
}
