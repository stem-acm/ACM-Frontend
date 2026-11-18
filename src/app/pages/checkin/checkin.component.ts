import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { StepperComponent } from '@/app/components/stepper/stepper.component';
import { CheckinSchedule, ScheduleSlot } from '@/app/interfaces/checkin-schedule';
import { CheckinScheduleService } from '@/app/services/checkin-schedule.service';
import {
  formatCountdown,
  HoursGroup,
  openingState,
  scheduleSummary,
} from '@/app/utils/checkin-schedule.util';

/** How often the kiosk reads the schedule again, so that a change in Settings reaches it. */
const SCHEDULE_REFRESH_MS = 60_000;

@Component({
  selector: 'app-checkin',
  standalone: true,
  imports: [StepperComponent, TranslateModule],
  templateUrl: './checkin.component.html',
  styleUrl: './checkin.component.css',
})
export class CheckinComponent implements OnInit, OnDestroy {
  private scheduleService = inject(CheckinScheduleService);
  private translate = inject(TranslateService);

  state: 'loading' | 'ready' | 'error' = 'loading';
  schedule?: CheckinSchedule;
  isOpen = false;
  /** The slot open now, for the leaving-time choices of the stepper. */
  currentSlot: ScheduleSlot | null = null;
  countdown = '';
  hasNextOpening = false;
  /** The opening hours of the closed screen, one group of days per entry. */
  hours: HoursGroup[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.loadSchedule();
    this.timer = setInterval(() => this.updateOpeningState(), 1000);
    this.refreshTimer = setInterval(() => this.loadSchedule(), SCHEDULE_REFRESH_MS);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  loadSchedule() {
    this.scheduleService.getForCheckin().subscribe({
      next: result => {
        this.schedule = result.data;
        this.hours = scheduleSummary(result.data);
        this.state = 'ready';
        this.updateOpeningState();
      },
      error: () => {
        // Keep the last schedule: a short network failure must not close the kiosk.
        if (!this.schedule) this.state = 'error';
      },
    });
  }

  /** "Monday–Friday: 08:00–12:00, 15:00–18:00" or "Saturday: 09:00–16:00". */
  groupLabel(group: HoursGroup): string {
    const from = this.translate.instant(`days.${group.from}`);
    const days =
      group.to === group.from ? from : `${from}–${this.translate.instant(`days.${group.to}`)}`;
    return `${days}: ${group.hours}`;
  }

  updateOpeningState(now = new Date()) {
    if (!this.schedule) return;
    // The schedule is in Mahajanga time, regardless of the device timezone.
    const state = openingState(this.schedule, now);
    this.isOpen = state.open;
    if (state.open) {
      // Keep the same object while the slot does not change: the stepper reacts to a change.
      if (
        this.currentSlot?.start !== state.slot.start ||
        this.currentSlot?.end !== state.slot.end
      ) {
        this.currentSlot = state.slot;
      }
      return;
    }
    this.currentSlot = null;
    this.hasNextOpening = state.secondsUntilOpening !== null;
    this.countdown =
      state.secondsUntilOpening === null ? '' : formatCountdown(state.secondsUntilOpening);
  }
}
