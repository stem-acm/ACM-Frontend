import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AddActivityComponent } from '@/app/components/add-activity/add-activity.component';
import { Activity } from '@/app/interfaces/activity';
import { ActivityService } from '@/app/services/activity.service';
import { AppComponent } from '@/app/app.component';
import { HttpResult } from '@/app/types/httpResult';
import { TableActivitiesComponent } from '@/app/components/table-activities/table-activities.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [
    CommonModule,
    AddActivityComponent,
    TableActivitiesComponent,
    TableLoadingComponent,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.css',
})
export class ActivityComponent implements OnInit {
  protected Math = Math;
  public activity!: Activity[];
  public activityToUpdate!: Activity;
  public showAddForm = false;
  public title = 'New Activity';
  public mode: 'insert' | 'update' = 'insert';
  public searchWord = '';
  private searchSubject = new Subject<string>();
  public isLoading = false;

  public currentPage = 1;
  public pageSize = 100;
  public totalActivities = 0;
  public pageInput = 1;

  private activityService = inject(ActivityService);
  private app = inject(AppComponent);

  ngOnInit() {
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.getActivityList();
    });
    this.getActivityList();
  }

  getActivityList() {
    this.isLoading = true;
    const offset = (this.currentPage - 1) * this.pageSize;
    this.activityService.getAllActivity(offset, this.pageSize, this.searchWord).subscribe({
      next: (result: HttpResult<Activity[]>) => {
        if (result.success && result.data) {
          this.activity = result.data;

          if (result.pagination) {
            this.totalActivities = result.pagination.total;

            if (this.activity.length === 0 && this.currentPage > 1) {
              this.currentPage--;
              this.getActivityList();
              return;
            }
          }
        }
        this.pageInput = this.currentPage;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  get totalPages(): number {
    return Math.ceil(this.totalActivities / this.pageSize);
  }

  changePage(page: number) {
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.pageInput = this.currentPage;
    this.getActivityList();
  }

  goToPage() {
    const page = Number(this.pageInput);
    if (!Number.isInteger(page) || page < 1) {
      this.pageInput = 1;
    } else if (page > this.totalPages) {
      this.pageInput = this.totalPages;
    }
    this.changePage(this.pageInput);
  }

  addActivity() {
    this.mode = 'insert';
    this.title = 'New Activity';
    this.activityToUpdate = undefined!;
    this.showAddForm = true;
  }

  cancelForm(event: boolean) {
    if (event) this.showAddForm = false;
  }

  closeForm(event: boolean) {
    if (event) {
      this.showAddForm = false;
      this.getActivityList();
    }
  }

  showAlert(event: string) {
    this.app.showToast(event);
    this.getActivityList();
  }

  clickEdit(event: Activity) {
    this.mode = 'update';
    this.title = 'Update Activity';
    this.showAddForm = true;
    this.activityToUpdate = event;
  }

  showToast(event: { data: Activity; message: string }) {
    if (event) this.showAddForm = false;
    this.app.showToast(event.message);
    this.activityToUpdate = event.data;
    this.getActivityList();
  }

  search(keyWord: string) {
    this.searchSubject.next(keyWord);
  }
}
