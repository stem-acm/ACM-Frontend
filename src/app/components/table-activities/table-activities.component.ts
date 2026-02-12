import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Activity } from '@/app/interfaces/activity';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ModalAlertComponent } from '../modal-alert/modal-alert.component';
import { ActivityService } from '@/app/services/activity.service';
import { ToastService } from '@/app/services/toast.service';
import { HttpResult } from '@/app/types/httpResult';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-activities',
  standalone: true,
  imports: [TranslateModule, ModalAlertComponent, CommonModule],
  templateUrl: './table-activities.component.html',
  styleUrl: './table-activities.component.css',
})
export class TableActivitiesComponent {
  @Input() data!: Activity[];
  @Output() editClicked = new EventEmitter<Activity>();
  @Output() activityDeleted = new EventEmitter<void>();

  private translateService = inject(TranslateService);
  private activityService = inject(ActivityService);
  private toastService = inject(ToastService);

  showDeleteModal = false;
  activityToDeleteId: number | null = null;
  deleteTitle = '';
  deleteMessage = '';

  updateMember(activity: Activity) {
    this.editClicked.emit(activity);
  }

  onDeleteClick(activity: Activity) {
    this.activityToDeleteId = activity.id!;
    this.deleteTitle = this.translateService.instant('alert.deleteTitle');
    this.deleteMessage = this.translateService.instant('alert.deleteMessage', {
      name: activity.name,
    });
    // Fallback if translation missing
    if (this.deleteTitle === 'alert.deleteTitle') this.deleteTitle = 'Delete Activity';
    if (this.deleteMessage === 'alert.deleteMessage')
      this.deleteMessage = `Are you sure you want to delete ${activity.name}?`;

    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.activityToDeleteId = null;
  }

  confirmDelete() {
    if (this.activityToDeleteId) {
      this.activityService.deleteActivity(this.activityToDeleteId).subscribe({
        next: (result: HttpResult<null>) => {
          if (result.success) {
            this.toastService.showToast('Activity deleted successfully');
            this.activityDeleted.emit();
          } else {
            this.toastService.showToast(result.message || 'Failed to delete activity');
          }
          this.showDeleteModal = false;
          this.activityToDeleteId = null;
        },
        error: error => {
          const msg = error.error?.message || error.message || 'Failed to delete activity';
          this.toastService.showToast(msg);
          this.showDeleteModal = false;
          this.activityToDeleteId = null;
        },
      });
    }
  }
}
