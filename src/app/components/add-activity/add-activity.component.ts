import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Activity } from '../../interfaces/activity';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { HttpResult } from '../../types/httpResult';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-activity',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add-activity.component.html',
  styleUrl: './add-activity.component.css'
})
export class AddActivityComponent {
  @Output('canceled') emiterCancel = new EventEmitter<boolean>();
  @Output('showToast') emiterToast = new EventEmitter<string>();
  @Output('updatedData') sendData = new EventEmitter<{data: Activity, message: string}>();
  public error: {enabled: boolean, message: string} = {enabled: false, message: ''};
  @Input() mode: 'update' | 'insert' = 'insert';
  @Input() activityToUpdate!: Activity;
  @Input() title = 'Add Activity';
  public loading: boolean = false;
  public activity: Activity = {
    name: '',
    description: '',
    isActive: false
  };

  constructor(private activityService: ActivityService) {}

  cancel() {
    this.emiterCancel.emit(true);
  }

  ngOnInit() {
    if(this.mode == 'update') {
      this.activity = { ...this.activityToUpdate };
    }
  }

  checkValidation(): boolean {
    const m = this.activity;
    if (
      m.name?.trim() &&
      m.description
    ) {
      return true;
    }
    return false;
  }

  saveActivity() {
    this.loading = true;
    if(this.mode=='insert') {
      this.insertActivity();
    } else {
      this.updateActivity();
    }
  }

  insertActivity() {
    if (!this.checkValidation()) {
      this.error = {
            enabled: true,
            message: 'Please fill in all required fields.'
          }
      this.loading = false;
      return;
    }
    this.activityService.addActivity(this.activity)
      .subscribe(
        (result: HttpResult<Activity>) => {
          if(result.success) {
            this.error = {
              enabled: false,
              message: ''
            };
            this.emiterToast.emit(`Activity ${this.activity.name} created successfully`)
            this.activity = {
              name: '',
              description: '',
              isActive: false
            };
          }
          this.loading = false;
        },
        (error) => {
          console.log(error);
          
          this.error = {
            enabled: true,
            message: error.error.message
          }
        this.loading = false;
        }
      )
  }

  updateActivity() {
    if (!this.checkValidation()) {
      this.error = {
            enabled: true,
            message: 'Please fill in all required fields.'
          }
      this.loading = false;
      return;
    }
    this.activityService.updateActivity(this.activity)
      .subscribe(
        (result: HttpResult<Activity>) => {
          if(result.success) {
            this.error = {
              enabled: false,
              message: ''
            };
            this.sendData.emit({data: this.activity, message: `Activity ${this.activity.name} updated successfully`});
          }
          this.loading = false;
        },
        (error) => {
          this.error = {
            enabled: true,
            message: error.error.message
          }
          this.loading = false;
        }
      )
  }

}
