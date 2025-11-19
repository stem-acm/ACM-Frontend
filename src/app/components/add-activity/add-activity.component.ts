import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Activity, DayOfWeek } from '../../interfaces/activity';
import { FormsModule } from '@angular/forms';
import { ActivityService } from '../../services/activity.service';
import { HttpResult } from '../../types/httpResult';
import { CommonModule } from '@angular/common';
import dayjs from 'dayjs';

@Component({
  selector: 'app-add-activity',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './add-activity.component.html',
  styleUrl: './add-activity.component.css'
})
export class AddActivityComponent implements OnChanges {
  @Output('canceled') emiterCancel = new EventEmitter<boolean>();
  @Output('success') emiterSuccess = new EventEmitter<boolean>();
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
    image: '',
    isPeriodic: true,
    dayOfWeek: 'tuesday',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: ''
  };

  constructor(private activityService: ActivityService) {}

  cancel() {
    this.emiterCancel.emit(true);
    this.activity = {
      name: '',
      description: '',
      image: '',
      isPeriodic: true,
      dayOfWeek: 'tuesday',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: ''
    };
  }

  ngOnInit() {
    if(this.mode == 'update') {
      this.activity = { ...this.activityToUpdate };
    } else {
      // Explicitly reset the form when in insert mode
      this.activity = {
        name: '',
        description: '',
        image: '',
        isPeriodic: true,
        dayOfWeek: 'tuesday',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: ''
      };
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['mode']) {
      if (this.mode === 'insert') {
        this.activity = {
          name: '',
          description: '',
          image: '',
          isPeriodic: true,
          dayOfWeek: 'tuesday',
          startDate: '',
          endDate: '',
          startTime: '',
          endTime: ''
        };
      }
    }
    
    if (changes['activityToUpdate'] && this.mode === 'update') {
      this.activity = { ...this.activityToUpdate };
    }
  }

  formatDate(date: Date | string) {
    return dayjs(date).format('YYYY-MM-DD');
  }

  formatTime(time: string) {
    if (!time) return '';
    
    // If it's an ISO timestamp (contains 'T'), extract just the time portion
    if (time.includes('T')) {
      try {
        const date = new Date(time);
        // Use UTC to avoid timezone issues
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const seconds = date.getUTCSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
      } catch (e) {
        console.error('Error formatting time:', time, e);
        return '';
      }
    }
    
    // If it's already in HH:mm format, add seconds
    if (time.length === 5) {
      return time + ':00';
    }
    
    // Otherwise return as-is (already in HH:mm:ss format)
    return time;
  }

  checkValidation(): boolean {
    const m = this.activity;
    const commonFields = m.name?.trim() && m.description && m.startTime && m.endTime;
    
    if (!commonFields) return false;

    if (m.isPeriodic) {
      return !!m.dayOfWeek;
    } else {
      return !!(m.startDate && m.endDate);
    }
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

    const baseDate = this.activity.startDate ? this.activity.startDate : new Date();
    const formattedStartTime = this.formatTime(this.activity.startTime);
    const formattedEndTime = this.formatTime(this.activity.endTime);
    
    // Always send startDate and endDate, defaulting to baseDate if not present
    // Only send startDate and endDate if NOT periodic
    const formattedStartDate = !this.activity.isPeriodic ? this.formatDate(this.activity.startDate || baseDate) : undefined;
    const formattedEndDate = !this.activity.isPeriodic ? this.formatDate(this.activity.endDate || baseDate) : undefined;

    this.activity = { 
      ...this.activity, 
      startDate: formattedStartDate, 
      endDate: formattedEndDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    };

    this.activityService.addActivity(this.activity)
      .subscribe(
        (result: HttpResult<Activity>) => {
          if(result.success) {
            this.error = {
              enabled: false,
              message: ''
            };
            this.emiterToast.emit(`Activity ${this.activity.name} created successfully`)
            console.log("Activity=" + JSON.stringify(this.activity));
            this.activity = {
              name: '',
              description: '',
              image: '',
              isPeriodic: true,
              dayOfWeek: 'tuesday',
              startDate: '',
              endDate: '',
              startTime: '',
              endTime: ''
            };
            this.emiterSuccess.emit(true);
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
    const baseDate = this.activity.startDate ? this.activity.startDate : new Date();
    const formattedStartTime = this.formatTime(this.activity.startTime);
    const formattedEndTime = this.formatTime(this.activity.endTime);

    const formattedStartDate = !this.activity.isPeriodic ? this.formatDate(this.activity.startDate || baseDate) : undefined;
    const formattedEndDate = !this.activity.isPeriodic ? this.formatDate(this.activity.endDate || baseDate) : undefined;

    this.activity = { 
      ...this.activity, 
      startDate: formattedStartDate, 
      endDate: formattedEndDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime
    };

    this.activityService.updateActivity(this.activity)
      .subscribe(
        (result: HttpResult<Activity>) => {
          if(result.success) {
            this.error = {
              enabled: false,
              message: ''
            };
            this.sendData.emit({data: this.activity, message: `Activity ${this.activity.name} updated successfully`});
             this.activity = {
              name: '',
              description: '',
              image: '',
              isPeriodic: true,
              dayOfWeek: 'tuesday',
              startDate: '',
              endDate: '',
              startTime: '',
              endTime: ''
            };
            this.emiterSuccess.emit(true);
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
