import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CheckinSchedule } from '@/app/interfaces/checkin-schedule';
import { environment } from '@/environments/environment';
import { CheckinScheduleService } from './checkin-schedule.service';
import { BACKGROUND_REQUEST } from './member-photo.service';

const SCHEDULE = {
  monday: { open: false, slots: [] },
} as unknown as CheckinSchedule;

describe('CheckinScheduleService', () => {
  let service: CheckinScheduleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CheckinScheduleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the schedule of the Settings page', () => {
    let data: CheckinSchedule | undefined;
    service.get().subscribe(result => (data = result.data));
    const request = http.expectOne(`${environment.API_URL}/settings/checkin-schedule`);
    expect(request.request.method).toBe('GET');
    request.flush({ success: true, message: 'Check-in schedule', data: SCHEDULE });
    expect(data).toEqual(SCHEDULE);
  });

  it('saves the whole schedule in one PUT', () => {
    service.save(SCHEDULE).subscribe();
    const request = http.expectOne(`${environment.API_URL}/settings/checkin-schedule`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(SCHEDULE);
    request.flush({ success: true, message: 'Check-in schedule updated', data: SCHEDULE });
  });

  it('reads the time zone and the kiosk schedule in the background, without the HTTP cache', () => {
    let data: unknown;
    service.getForCheckin().subscribe(result => (data = result.data));
    const request = http.expectOne(`${environment.API_URL}/checkins/schedule`);
    expect(request.request.method).toBe('GET');
    expect(request.request.context.get(BACKGROUND_REQUEST)).toBeTrue();
    const kiosk = { timezone: 'Indian/Antananarivo', schedule: SCHEDULE };
    request.flush({ success: true, message: 'Check-in schedule', data: kiosk });
    expect(data).toEqual(kiosk);
  });
});
