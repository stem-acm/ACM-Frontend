import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Activity } from '@/app/interfaces/activity';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-table-activities',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './table-activities.component.html',
  styleUrl: './table-activities.component.css',
})
export class TableActivitiesComponent {
  @Input() data!: Activity[];
  @Output() editClicked = new EventEmitter<Activity>();

  updateMember(activity: Activity) {
    this.editClicked.emit(activity);
  }
}
