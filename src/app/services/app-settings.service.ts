import { HttpResult } from '@/app/types/httpResult';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

/** `GET` and `PUT /api/settings/timezone`. */
export interface TimezoneSetting {
  timezone: string;
}

/** The global settings of the app (admin only). */
@Injectable({ providedIn: 'root' })
export class AppSettingsService {
  private readonly http = inject(HttpClient);
  private readonly timezoneUrl = `${environment.API_URL}/settings/timezone`;

  /**
   * The stored time zone of the app, or `null` before the first read. The tabs of Settings
   * share it: a save in General shows at once in Check-in.
   */
  readonly timezone = signal<string | null>(null);

  getTimezone() {
    return this.http
      .get<HttpResult<TimezoneSetting>>(this.timezoneUrl)
      .pipe(tap(result => this.timezone.set(result.data.timezone)));
  }

  saveTimezone(timezone: string) {
    return this.http
      .put<HttpResult<TimezoneSetting>>(this.timezoneUrl, { timezone })
      .pipe(tap(result => this.timezone.set(result.data.timezone)));
  }
}
