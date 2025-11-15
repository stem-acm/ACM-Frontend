import { Component, EventEmitter, inject, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScannerComponent } from '../scanner/scanner.component';
import { ClockComponent } from "../clock/clock.component";
import { CheckinService } from '../../services/checkin.service';
import { HttpResult } from '../../types/httpResult';
import { ActivityService } from '../../services/activity.service';
import { Activity } from '../../interfaces/activity';
import { ToastService } from '../../services/toast.service';
import { NgxSpinnerModule } from 'ngx-spinner';

type ActivityToDsiplay = {
  id: number;
  name: string;
  icon: string;
};

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule, ScannerComponent, ClockComponent, NgxSpinnerModule],
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.css']
})
export class StepperComponent {

  @Output() emiterToast = new EventEmitter<string>();

  icon = "😄";

  loading: boolean = false;
  currentStep = 1;
  selectedActivities: ActivityToDsiplay[] = [];
  showMinutePicker = false;
  showHourPicker = false;
  scannedBadgeId: string | null = null;

  checkinService = inject(CheckinService);
  activityService = inject(ActivityService);
  private toastService = inject(ToastService);

  activitiesToDisplay = [
    { name: "Debate Club", icon: "🗣️"},
    { name: 'STEM', icon: '💡' },
    { name: 'Books', icon: '📖' },
    { name: 'Internet', icon: '🌐' },
    { name: 'Kids Activity', icon: '👧' },
    { name: 'Small Table Talk', icon: '💬' },
    { name: 'Conversation Class', icon: '💭' },

  ]; 

  activities: Activity[] = [];
  finalActivities: ActivityToDsiplay[] = [];

  selectedTime = { hour: 18, minute: 0};

  weekday = ["Monday", "Tuesday","Wednesday","Thursday","Friday", "Saturday"];
  normalWeekDay = ["Monday", "Tuesday","Wednesday","Thursday","Friday"]
  today = this.weekday[new Date().getDay()];

  dateToday = new Date();
  currentHour = new Date(Date.now()).getHours();
  currentTime = new Date(Date.now()).getMinutes();

  hours: number[] | undefined;
  minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  ngOnInit() {
    this.setTimeInput();
    this.getActivities()
  }

  getActivities() {
    this.loading = true;

    this.activityService.getAllActivity().subscribe((result: HttpResult) => {
      console.log({result})

      if (result.success) {
        this.activities = result.data;


     /*    this.finalActivities = this.activitiesToDisplay.flatMap(a => {
          let tmpAct = this.activities.filter(act => act.name == a.name);

          return tmpAct.map(actv => ({
            id: actv.id!,
            name: actv.name,
            icon: a.icon
          }))
        }); */

        this.loading = false;

      } else {
        alert(result.message)
      }
    })
  }

  setTimeInput() {
    if (this.normalWeekDay.includes(this.today)) {
      if (this.currentHour <= 12 && this.currentHour >= 6) {
        this.hours = Array.from({length: 12 - this.currentHour + 1 }, (_, index) => this.currentHour + index)
        this.selectedTime.hour = 12;
      } else if (this.currentHour <= 18 && this.currentHour >= 14) { 
        this.hours = Array.from({length: 18 - this.currentHour + 1 }, (_, index) => this.currentHour + index)
        this.selectedTime.hour = 18;
      }
    } else {
      if (this.currentHour <= 17 && this.currentHour >= 6) { 
        this.hours = Array.from({length: 17 - this.currentHour + 1 }, (_, index) => this.currentHour + index)
        this.selectedTime.hour = 17;
      }
    }

    this.selectedTime.minute = 0;
  }

 /*  toggleActivity(activity: any) {
    const index = this.selectedActivities.findIndex(a => a.id === activity.id);
    if (index > -1) {
      this.selectedActivities.splice(index, 1);
    } else if(this.selectedActivities.length !== 1)  { // change this line into else if multiple selection allowed
      this.selectedActivities.push(activity);
      this.nextStep();
    }
  } */

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
    this.selectedTime = { hour: this.currentHour, minute: 0};
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
      registrationNumber: this.scannedBadgeId
    });

    const payload =  {
      activityId: this.selectedActivities[0].id!,
      checkInTime: new Date(Date.now()),
      checkOutTime: date,
      //registrationNumber: this.scannedBadgeId!
      registrationNumber: this.scannedBadgeId!.split("reg=")[1]
    }

    this.checkinService.createCheckin(payload).subscribe((result: HttpResult) => {
      if (result.success) {
        this.nextStep();
      } else {
        console.log(result.message)
        this.toastService.showToast(result.message || 'Check-in failed');
        this.reset();
      }
    }, (error) => {
      console.log(error)

      if (error.status == 404) {
        alert("Member not found");
      }

       this.reset();
    });
  }

  finishCheckIn() {
  

    // Reset or navigate as needed
    this.reset()
  }
}