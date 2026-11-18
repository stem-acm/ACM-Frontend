import { CheckinSchedule } from '@/app/interfaces/checkin-schedule';
import { BACKGROUND_REQUEST } from '@/app/services/member-photo.service';
import { HttpResult } from '@/app/types/httpResult';
import { environment } from '@/environments/environment';
import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CheckinScheduleService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/settings/checkin-schedule`;
  private readonly kioskUrl = `${environment.API_URL}/checkins/schedule`;

  /** The schedule for the Settings page (admin only). */
  get() {
    return this.http.get<HttpResult<CheckinSchedule>>(this.url);
  }

  /** Replaces the whole schedule (admin only). */
  save(schedule: CheckinSchedule) {
    return this.http.put<HttpResult<CheckinSchedule>>(this.url, schedule);
  }

  /**
   * The schedule for the check-in kiosk. The kiosk reads it again every minute: the request
   * skips the HTTP cache and the spinner.
   */
  getForCheckin() {
    return this.http.get<HttpResult<CheckinSchedule>>(this.kioskUrl, {
      context: new HttpContext().set(BACKGROUND_REQUEST, true),
    });
  }
}
