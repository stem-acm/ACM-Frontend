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
import { debounceTime } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [
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
  private activity!: Activity[];
  public activityToUpdate!: Activity;
  public activityFilter!: Activity[];
  public showAddForm = false;
  public title = 'New Activity';
  public mode: 'insert' | 'update' = 'insert';
  public searchWord!: string;
  private searchSubject = new Subject<string>();
  public isLoading = false;

  private activityService = inject(ActivityService);
  private app = inject(AppComponent);

  ngOnInit() {
    /* this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.getActivityList();
    }); */
    this.searchSubject.pipe(debounceTime(500)).subscribe((keyword: string) => {
      this.searchByName(keyword);
    });
    this.getActivityList();
  }

  getActivityList() {
    this.isLoading = true;
    this.activityService
      .getAllActivity(this.searchWord)
      .subscribe((result: HttpResult<Activity[]>) => {
        if (result.success && result.data) {
          this.activity = result.data;
          this.activityFilter = this.activity;
        }
        this.isLoading = false;
      });
  }

  addActivity() {
    this.mode = 'insert';
    this.title = 'New Activity';
    this.activityToUpdate = undefined!; // Resetting to undefined to clear the form
    this.showAddForm = true;
  }

  cancelForm(event: boolean) {
    if (event) this.showAddForm = false;
  }

  closeForm(event: boolean) {
    if (event) this.showAddForm = false;
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

  searchByName(keyWord: string) {
    this.activityFilter = this.activity.filter(
      e =>
        e.name.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 ||
        e.description?.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1,
    );
  }
}
