import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Activity } from '../../interfaces/activity';

@Component({
  selector: 'app-table-activities',
  standalone: true,
  imports: [],
  templateUrl: './table-activities.component.html',
  styleUrl: './table-activities.component.css',
})
export class TableActivitiesComponent {
  @Input() data!: Activity[];
  @Output('editClicked') emiterEdit = new EventEmitter<Activity>();

  updateMember(activity: Activity) {
    this.emiterEdit.emit(activity);
  }
}
