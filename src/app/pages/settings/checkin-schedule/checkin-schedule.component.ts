import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  CHECKIN_DAYS,
  CheckinDay,
  CheckinSchedule,
  DaySchedule,
} from '@/app/interfaces/checkin-schedule';
import { CheckinScheduleService } from '@/app/services/checkin-schedule.service';
import { dayError, DayError, normalizeSchedule } from '@/app/utils/checkin-schedule.util';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';

/** The slot that opening a day without slots adds. */
const FIRST_SLOT = { start: '08:00', end: '12:00' };

/** The "Check-in" tab of Settings: the open days and the check-in slots of each day. */
@Component({
  selector: 'app-checkin-schedule',
  standalone: true,
  imports: [FormsModule, TranslateModule, ZardButtonComponent, ZardCardComponent],
  templateUrl: './checkin-schedule.component.html',
  styleUrls: ['../settings.component.css', './checkin-schedule.component.css'],
})
export class CheckinScheduleComponent implements OnInit {
  private service = inject(CheckinScheduleService);

  /** Emits `true` when the form starts to differ from the stored schedule, `false` when not. */
  @Output() dirtyChange = new EventEmitter<boolean>();

  readonly days = CHECKIN_DAYS;
  state: 'loading' | 'ready' | 'error' = 'loading';
  /**
   * The form. A closed day keeps its slots here until the save, so that opening it again
   * gives them back.
   */
  schedule: CheckinSchedule | null = null;
  private saved = '';
  private lastDirty = false;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  get dirty(): boolean {
    return !!this.schedule && JSON.stringify(normalizeSchedule(this.schedule)) !== this.saved;
  }

  get valid(): boolean {
    return !!this.schedule && this.days.every(day => this.errorOf(day) === null);
  }

  errorOf(day: CheckinDay): DayError | null {
    return this.schedule ? dayError(this.schedule[day]) : null;
  }

  load(): void {
    this.state = 'loading';
    this.service.get().subscribe({
      next: result => this.reset(result.data),
      error: () => {
        this.state = 'error';
      },
    });
  }

  /** Called by each change of the form. */
  changed(): void {
    this.message = '';
    const dirty = this.dirty;
    if (dirty !== this.lastDirty) {
      this.lastDirty = dirty;
      this.dirtyChange.emit(dirty);
    }
  }

  toggle(day: DaySchedule): void {
    if (day.open && day.slots.length === 0) day.slots.push({ ...FIRST_SLOT });
    this.changed();
  }

  addSlot(day: DaySchedule): void {
    day.slots.push({ start: '', end: '' });
    this.changed();
  }

  removeSlot(day: DaySchedule, index: number): void {
    day.slots.splice(index, 1);
    this.changed();
  }

  discard(): void {
    this.schedule = JSON.parse(this.saved) as CheckinSchedule;
    this.error = '';
    this.changed();
  }

  save(): void {
    if (!this.schedule || !this.valid || !this.dirty || this.saving) return;
    this.saving = true;
    this.error = '';
    this.service.save(normalizeSchedule(this.schedule)).subscribe({
      next: result => {
        this.saving = false;
        this.reset(result.data);
        this.message = 'checkinSchedule.saved';
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving = false;
        this.message = '';
        this.error = err.error?.message || 'Unable to save changes';
      },
    });
  }

  private reset(schedule: CheckinSchedule): void {
    const normalized = normalizeSchedule(schedule);
    this.saved = JSON.stringify(normalized);
    this.schedule = JSON.parse(this.saved) as CheckinSchedule;
    this.state = 'ready';
    this.changed();
  }
}
