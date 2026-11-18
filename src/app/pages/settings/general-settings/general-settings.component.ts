import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AppSettingsService } from '@/app/services/app-settings.service';
import { timeZoneNames, zoneOffsetLabel } from '@/app/utils/checkin-schedule.util';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';

interface TimeZoneOption {
  name: string;
  /** "Indian/Antananarivo (UTC+03:00)" */
  label: string;
}

/** The "General" tab of Settings: the time zone of the app. */
@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [FormsModule, TranslateModule, ZardButtonComponent, ZardCardComponent],
  templateUrl: './general-settings.component.html',
  styleUrls: ['../settings.component.css', './general-settings.component.css'],
})
export class GeneralSettingsComponent implements OnInit {
  private service = inject(AppSettingsService);

  /** Emits `true` when the form starts to differ from the stored settings, `false` when not. */
  @Output() dirtyChange = new EventEmitter<boolean>();

  state: 'loading' | 'ready' | 'error' = 'loading';
  /** The time zone chosen in the form. */
  timezone = '';
  private saved = '';
  private lastDirty = false;
  options: TimeZoneOption[] = [];
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  get dirty(): boolean {
    return this.state === 'ready' && this.timezone !== this.saved;
  }

  load(): void {
    this.state = 'loading';
    this.service.getTimezone().subscribe({
      next: result => this.reset(result.data.timezone),
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

  discard(): void {
    this.timezone = this.saved;
    this.error = '';
    this.changed();
  }

  save(): void {
    if (!this.dirty || this.saving) return;
    this.saving = true;
    this.error = '';
    this.service.saveTimezone(this.timezone).subscribe({
      next: result => {
        this.saving = false;
        this.reset(result.data.timezone);
        this.message = 'generalSettings.saved';
      },
      error: (err: { error?: { message?: string } }) => {
        this.saving = false;
        this.message = '';
        this.error = err.error?.message || 'Unable to save changes';
      },
    });
  }

  private reset(timezone: string): void {
    this.saved = timezone;
    this.timezone = timezone;
    // The offsets are computed once: the list has more than 400 time zones.
    const now = new Date();
    this.options = timeZoneNames(timezone).map(name => ({
      name,
      label: `${name} (${zoneOffsetLabel(name, now)})`,
    }));
    this.state = 'ready';
    this.changed();
  }
}
