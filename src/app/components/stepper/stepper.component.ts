import { Component, EventEmitter, inject, Output, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScannerComponent } from '../scanner/scanner.component';
import { CheckinService } from '../../services/checkin.service';
import { HttpResult } from '../../types/httpResult';
import { ActivityService } from '../../services/activity.service';
import { Activity } from '../../interfaces/activity';
import { ToastService } from '../../services/toast.service';
import { NgxSpinnerModule } from 'ngx-spinner';
import { Checkin } from '../../interfaces/checkin';

interface ActivityToDsiplay {
  id: number;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule, ScannerComponent, NgxSpinnerModule],
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.css'],
})
export class StepperComponent implements OnInit {
  @Output() emiterToast = new EventEmitter<string>();

  icon = '🔎';

  loading = false;
  currentStep = 1;
  selectedActivities: ActivityToDsiplay[] = [];
  showMinutePicker = false;
  showHourPicker = false;
  scannedBadgeId: string | null = null;

  checkinService = inject(CheckinService);
  activityService = inject(ActivityService);
  private toastService = inject(ToastService);

  activities: Activity[] = [];
  finalActivities: ActivityToDsiplay[] = [];

  selectedTime = { hour: 18, minute: 0 };

  weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  normalWeekDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  today = this.weekday[new Date().getDay()];

  dateToday = new Date();
  currentHour = new Date(Date.now()).getHours();
  currentTime = new Date(Date.now()).getMinutes();

  hours: number[] | undefined;
  minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  ngOnInit() {
    this.setTimeInput();
    this.getActivities();
  }

  getActivities() {
    this.loading = true;

    this.activityService.getAllActivity().subscribe((result: HttpResult<Activity[]>) => {
      console.log({ result });

      if (result.success) {
        // Then filter by current day
        this.activities = this.filterActivitiesByCurrentDay(result.data);

        this.loading = false;
      } else {
        alert(result.message);
      }
    });
  }

  filterActivitiesByCurrentDay(activities: Activity[]): Activity[] {
    const today = new Date();
    const todayDayOfWeek = this.today as any; // Current day name in lowercase

    console.log('Today is:', todayDayOfWeek);
    console.log('All activities before filtering:', activities);

    const filtered = activities.filter(activity => {
      console.log(
        'Checking activity:',
        activity.name,
        'isPeriodic:',
        activity.isPeriodic,
        'dayOfWeek:',
        activity.dayOfWeek,
      );

      if (activity.isPeriodic) {
        // For periodic activities, check if dayOfWeek matches today
        const matches = activity.dayOfWeek === todayDayOfWeek;
        console.log(
          `  Periodic activity "${activity.name}": dayOfWeek=${activity.dayOfWeek}, today=${todayDayOfWeek}, matches=${matches}`,
        );
        return matches;
      } else {
        // For non-periodic activities, check if today falls within the date range
        if (!activity.startDate || !activity.endDate) {
          console.log(`  Non-periodic activity "${activity.name}": missing dates`);
          return false;
        }

        const startDate = new Date(activity.startDate);
        const endDate = new Date(activity.endDate);

        // Reset time to compare only dates
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const inRange = today >= startDate && today <= endDate;
        console.log(
          `  Non-periodic activity "${activity.name}": startDate=${activity.startDate}, endDate=${activity.endDate}, inRange=${inRange}`,
        );
        return inRange;
      }
    });

    console.log('Filtered activities:', filtered);
    return filtered;
  }

  setTimeInput() {
    if (this.normalWeekDay.includes(this.today)) {
      if (this.currentHour <= 12 && this.currentHour >= 6) {
        this.hours = Array.from(
          { length: 12 - this.currentHour + 1 },
          (_, index) => this.currentHour + index,
        );
      } else if (this.currentHour <= 18 && this.currentHour >= 14) {
        this.hours = Array.from(
          { length: 18 - this.currentHour + 1 },
          (_, index) => this.currentHour + index,
        );
      }
    } else {
      if (this.currentHour <= 16 && this.currentHour >= 6) {
        this.hours = Array.from(
          { length: 16 - this.currentHour + 1 },
          (_, index) => this.currentHour + index,
        );
      }
    }

    // choose closest minute by excess (round up to next configured minute)
    const desired = this.currentTime + 5;
    const nextMinute = this.minutes.find(m => m >= desired);
    const wrapped = nextMinute === undefined;

    // if wrapped, take the first minute (0) and advance hour if possible
    this.selectedTime.minute = wrapped ? this.minutes[0] : (nextMinute as number);

    if (wrapped) {
      // prefer advancing within allowed hours if `this.hours` is defined
      if (this.hours && this.hours.length) {
        const currentIdx = this.hours.indexOf(this.currentHour);
        if (currentIdx >= 0 && currentIdx < this.hours.length - 1) {
          this.selectedTime.hour = this.hours[currentIdx + 1];
        } else {
          // already at last allowed hour, clamp to last hour
          this.selectedTime.hour = this.hours[this.hours.length - 1];
        }
      } else {
        // no hours array: just increment hour but clamp at 23
        this.selectedTime.hour = Math.min(this.currentHour + 1, 23);
      }
    } else {
      this.selectedTime.hour = this.currentHour;
    }
  }

  toggleActivity(activity: any) {
    const index = this.selectedActivities.findIndex(a => a.id === activity.id);

    if (index > -1) {
      // Activity is already selected, deselect it
      this.selectedActivities.splice(index, 1);
    } else {
      // Clear previous selection and select the new activity
      this.selectedActivities = [];
      this.selectedActivities.push(activity);
      setTimeout(() => {
        this.nextStep();
      }, 500);
    }
  }

  isActivitySelected(activity: any): boolean {
    return this.selectedActivities.some(a => a.id === activity.id);
  }

  nextStep() {
    if (this.currentStep < 4) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  reset() {
    this.currentStep = 1;
    this.selectedActivities = [];
    this.selectedTime = { hour: this.currentHour, minute: 0 };
    this.showMinutePicker = false;
    this.showHourPicker = false;
    this.scannedBadgeId = null;
    this.setTimeInput();
  }

  selectMinute(minute: number) {
    this.selectedTime.minute = minute;
    this.showMinutePicker = false;
  }

  selectHour(hour: number) {
    this.selectedTime.hour = hour;
    this.showHourPicker = false;
  }

  toggleMinutePicker() {
    this.showMinutePicker = !this.showMinutePicker;
    this.showHourPicker = false;
  }

  toggleHourPicker() {
    this.showHourPicker = !this.showHourPicker;
    this.showMinutePicker = false;
  }

  onBadgeScanned(badgeId: string) {
    this.scannedBadgeId = badgeId;
    console.log('Badge scanned:', badgeId);

    const date = new Date();

    date.setHours(this.selectedTime.hour);
    date.setMinutes(this.selectedTime.minute);

    // Handle the complete check-in process
    console.log('Check-in complete:', {
      activityId: this.selectedActivities[0].id,
      checkInTime: new Date(Date.now()).toISOString(),
      checkOutTime: date.toISOString(),
      registrationNumber: this.scannedBadgeId,
    });

    const payload = {
      activityId: this.selectedActivities[0].id!,
      checkInTime: new Date(Date.now()),
      checkOutTime: date,
      registrationNumber: this.scannedBadgeId!.split('reg=')[1],
    };

    this.checkinService.createCheckin(payload).subscribe(
      (result: HttpResult<Checkin>) => {
        if (result.success) {
          this.nextStep();
        } else {
          console.log(result.message);
          this.toastService.showToast(result.message || 'Check-in failed');
          this.reset();
        }
      },
      error => {
        console.log(error);

        if (error.status == 404) {
          alert('Member not found');
        }

        this.reset();
      },
    );
  }

  finishCheckIn() {
    // Reset or navigate as needed
    this.reset();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.time-picker')) {
      this.showHourPicker = false;
      this.showMinutePicker = false;
    }
  }
}
