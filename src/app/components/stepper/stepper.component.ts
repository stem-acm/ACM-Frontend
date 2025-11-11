import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScannerComponent } from '../scanner/scanner.component';
import { ClockComponent } from "../clock/clock.component";

interface Activity {
  id: number;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [CommonModule, ScannerComponent, ClockComponent],
  templateUrl: './stepper.component.html',
  styleUrls: ['./stepper.component.css']
})
export class StepperComponent {
  currentStep = 1;
  selectedActivities: Activity[] = [];
  showMinutePicker = false;
  showHourPicker = false;
  scannedBadgeId: string | null = null;

  activities: Activity[] = [
    { id: 1, name: 'STEM', icon: '💡' },
    { id: 2, name: 'BOOKS', icon: '📖' },
    { id: 3, name: 'INTERNET', icon: '🌐' },
    { id: 4, name: 'Kids Activity', icon: '👧' },
    { id: 5, name: 'Small Table Talk', icon: '💬' },
    { id: 6, name: 'Conversation Class', icon: '💭' },

  ];

  selectedTime = { hour: 8, minute: 0};

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
  }

  toggleActivity(activity: Activity) {
    const index = this.selectedActivities.findIndex(a => a.id === activity.id);
    if (index > -1) {
      this.selectedActivities.splice(index, 1);
    } else if(this.selectedActivities.length !== 1)  { // change this line into else if multiple selection allowed
      this.selectedActivities.push(activity);
    }
  }

  isActivitySelected(activity: Activity): boolean {
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
    // Automatically move to confirmation after scan
    setTimeout(() => {
      this.nextStep();
    }, 1000);
  }

  finishCheckIn() {
    const date = new Date();

    date.setHours(this.selectedTime.hour);
    date.setMinutes(this.selectedTime.minute);

    // Handle the complete check-in process
    console.log('Check-in complete:', {
      activityId: this.selectedActivities[0].id,
      checkinTime: new Date(Date.now()).toISOString(),
      checkoutTime: date.toISOString(),
      registrationNumber: this.scannedBadgeId
    });

    const payload =  {
      activityId: this.selectedActivities[0].id,
      checkinTime: new Date(Date.now()).toISOString(),
      checkoutTime: date.toISOString(),
      registrationNumber: this.scannedBadgeId
    }

    // Reset or navigate as needed
    this.reset()
  }
}