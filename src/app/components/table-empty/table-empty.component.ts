import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-table-empty',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <div class="acm-list-state" role="status">
      <svg class="empty-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 4h16v16H4zM4 9h16M9 9v11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linejoin="round"
        />
      </svg>
      <p>{{ message | translate }}</p>
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .empty-icon {
        width: 2.5rem;
        height: 2.5rem;
        color: #94a3b8;
      }
    `,
  ],
})
export class TableEmptyComponent {
  @Input({ required: true }) message = '';
}
