import { Component } from '@angular/core';
import { AddActivityComponent } from '../../components/add-activity/add-activity.component';
import { Activity } from '../../interfaces/activity';
import { ActivityService } from '../../services/activity.service';
import { AppComponent } from '../../app.component';
import { HttpResult } from '../../types/httpResult';
import { TableActivitiesComponent } from '../../components/table-activities/table-activities.component';
import { TableLoadingComponent } from '../../components/table-loading/table-loading.component';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [AddActivityComponent, TableActivitiesComponent, TableLoadingComponent, FormsModule],
  templateUrl: './activity.component.html',
  styleUrl: './activity.component.css'
})
export class ActivityComponent {
  private activity!: Activity[];
  public activityToUpdate!: Activity;
  public activityFilter!: Activity[];
  public showAddForm: boolean = false;
  public title: string = 'New Activity';
  public mode: 'insert' | 'update' = 'insert';
  public searchWord!: string;

  constructor(private activityService: ActivityService, private app: AppComponent) {}

  ngOnInit() {
    this.getActivityList();
  }

  getActivityList() {
    this.activityService.getAllActivity()
      .subscribe((result: HttpResult<Activity[]>) => {
        if(result.success && result.data) {
          this.activity = result.data;
          this.activityFilter = this.activity;          
        }
      })
  }

  addActivity() {
    this.showAddForm = true;
  }

  cancelForm(event: any) {
    if(event) this.showAddForm = false;
    this.app.showToast('Canceled form...');
  }

  showAlert(event: any) {
    this.app.showToast(event);
    this.getActivityList();
  }

  clickEdit(event: Activity) {
    this.mode = 'update';
    this.showAddForm = true;
    this.activityToUpdate = event;
  }

  showToast(event: any) {
    if(event) this.showAddForm = false;
    this.app.showToast(event.message);
    this.activityToUpdate = event.data;
    this.getActivityList();
  }

  search(keyWord: string) {
    this.searchByName(keyWord);
  }

  searchByName(keyWord: string) {
    this.activityFilter = this.activity.filter((e) => e.name.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1 || e.description?.toLocaleLowerCase().indexOf(keyWord.toLocaleLowerCase()) != -1);
  }

}
