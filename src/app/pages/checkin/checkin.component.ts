import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperComponent } from '@/app/components/stepper/stepper.component';

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [CommonModule, StepperComponent],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.css',
})
export class CheckinComponent implements OnInit, OnDestroy {
  isOpen = false;
  countdown = '';
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.updateOpeningState();
    this.timer = setInterval(() => this.updateOpeningState(), 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  updateOpeningState(now = new Date()) {
    // Evaluate the schedule in Mahajanga, regardless of the device timezone.
    const local = new Date(now.toLocaleString('en-US', { timeZone: 'Indian/Antananarivo' }));
    const day = local.getDay();
    const hour = local.getHours() + local.getMinutes() / 60 + local.getSeconds() / 3600;
    this.isOpen =
      day >= 2 && day <= 5
        ? (hour >= 8 && hour < 12) || (hour >= 15 && hour < 18)
        : day === 6 && hour >= 9 && hour < 16;
    if (this.isOpen) return;

    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date(local);
      candidate.setDate(local.getDate() + offset);
      const candidateDay = candidate.getDay();
      const openings =
        candidateDay >= 2 && candidateDay <= 5 ? [8, 15] : candidateDay === 6 ? [9] : [];
      for (const opening of openings) {
        candidate.setHours(opening, 0, 0, 0);
        if (candidate <= local) continue;
        const remaining = Math.ceil((candidate.getTime() - local.getTime()) / 1000);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;
        this.countdown = [hours, minutes, seconds]
          .map(value => String(value).padStart(2, '0'))
          .join(':');
        return;
      }
    }
  }
}
