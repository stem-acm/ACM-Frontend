import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AppSettingsService } from '@/app/services/app-settings.service';
import { timeZoneNames, zoneOffsetLabel } from '@/app/utils/checkin-schedule.util';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';

export interface TimeZoneOption {
  name: string;
  /** "UTC+03:00" */
  offset: string;
  /** Lowercase name with "_" and "/" as spaces, for the search. */
  search: string;
}

/** Most suggestions shown under the input. */
export const MAX_TIMEZONE_SUGGESTIONS = 8;

function searchKey(text: string): string {
  return text.toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ').trim();
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
  /** The text typed in the time zone input. */
  timezone = '';
  private saved = '';
  private lastDirty = false;
  /** Every valid time zone: the browser list, plus UTC and the stored value. */
  options: TimeZoneOption[] = [];
  private byName = new Map<string, TimeZoneOption>();
  /** Suggestions for the current text. */
  suggestions: TimeZoneOption[] = [];
  suggestionsOpen = false;
  /** Index of the suggestion chosen with the arrow keys, -1 when none. */
  activeIndex = -1;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.load();
  }

  /** The valid time zone that the text names (case does not matter), or `null`. */
  get match(): TimeZoneOption | null {
    return this.byName.get(this.timezone.trim().toLowerCase()) ?? null;
  }

  get invalid(): boolean {
    return this.state === 'ready' && this.match === null;
  }

  get dirty(): boolean {
    return this.state === 'ready' && this.timezone.trim() !== this.saved;
  }

  get activeId(): string | null {
    return this.activeIndex >= 0 ? `timezone-option-${this.activeIndex}` : null;
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

  /** Called on each keystroke in the input. */
  typed(): void {
    this.suggest();
    this.suggestionsOpen = true;
    this.changed();
  }

  /** Opens the suggestions for the current text. */
  openSuggestions(): void {
    this.suggest();
    this.suggestionsOpen = true;
  }

  closeSuggestions(): void {
    this.suggestionsOpen = false;
    this.activeIndex = -1;
  }

  /** On blur: closes the list and writes a valid name with its exact case. */
  blurred(): void {
    this.closeSuggestions();
    const match = this.match;
    if (match && match.name !== this.timezone) {
      this.timezone = match.name;
      this.changed();
    }
  }

  keydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.suggestionsOpen) this.openSuggestions();
      const count = this.suggestions.length;
      if (count === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex = (this.activeIndex + step + count) % count;
    } else if (event.key === 'Enter') {
      if (this.suggestionsOpen && this.activeIndex >= 0) {
        event.preventDefault();
        this.choose(this.suggestions[this.activeIndex]);
      }
    } else if (event.key === 'Escape') {
      this.closeSuggestions();
    }
  }

  choose(option: TimeZoneOption): void {
    this.timezone = option.name;
    this.closeSuggestions();
    this.changed();
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
    this.closeSuggestions();
    this.changed();
  }

  save(): void {
    const match = this.match;
    if (!this.dirty || this.saving || !match) return;
    this.saving = true;
    this.error = '';
    this.closeSuggestions();
    this.service.saveTimezone(match.name).subscribe({
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

  /** Names that contain every word typed, names that start with the text first. */
  private suggest(): void {
    this.activeIndex = -1;
    const query = searchKey(this.timezone);
    if (!query) {
      this.suggestions = this.options.slice(0, MAX_TIMEZONE_SUGGESTIONS);
      return;
    }
    const words = query.split(' ');
    const found = this.options.filter(option => words.every(word => option.search.includes(word)));
    const starts = found.filter(option => option.search.startsWith(query));
    const others = found.filter(option => !option.search.startsWith(query));
    this.suggestions = [...starts, ...others].slice(0, MAX_TIMEZONE_SUGGESTIONS);
  }

  private reset(timezone: string): void {
    this.saved = timezone;
    this.timezone = timezone;
    // The offsets are computed once: the list has more than 400 time zones.
    const now = new Date();
    this.options = timeZoneNames(timezone).map(name => ({
      name,
      offset: zoneOffsetLabel(name, now),
      search: searchKey(name),
    }));
    this.byName = new Map(this.options.map(option => [option.name.toLowerCase(), option]));
    this.suggestions = [];
    this.closeSuggestions();
    this.state = 'ready';
    this.changed();
  }
}
