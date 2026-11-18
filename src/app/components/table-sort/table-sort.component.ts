import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SortDirection } from '@/app/utils/table-sort';

@Component({
  selector: 'app-table-sort',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <button type="button" (click)="sortChange.emit()">
      {{ label | translate }}
      <span aria-hidden="true">{{
        direction === 'ascending' ? '↑' : direction === 'descending' ? '↓' : '↕'
      }}</span>
    </button>
  `,
  styles: [
    `
      button {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
        font: inherit;
        color: inherit;
        text-align: inherit;
        background: transparent;
        border: 0;
        padding: 0.25rem 0;
      }
      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 3px;
        border-radius: 0.2rem;
      }
    `,
  ],
})
export class TableSortComponent {
  @Input({ required: true }) label = '';
  @Input() direction: SortDirection = 'none';
  @Output() sortChange = new EventEmitter<void>();
}
