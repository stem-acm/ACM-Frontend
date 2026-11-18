import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { AppSettingsService } from './app-settings.service';

const URL = `${environment.API_URL}/settings/timezone`;

describe('AppSettingsService', () => {
  let service: AppSettingsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppSettingsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads the time zone and shares it', () => {
    expect(service.timezone()).toBeNull();
    let data: unknown;
    service.getTimezone().subscribe(result => (data = result.data));
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('GET');
    request.flush({
      success: true,
      message: 'Time zone',
      data: { timezone: 'Indian/Antananarivo' },
    });
    expect(data).toEqual({ timezone: 'Indian/Antananarivo' });
    expect(service.timezone()).toBe('Indian/Antananarivo');
  });

  it('saves the time zone in one PUT and shares the stored value', () => {
    service.saveTimezone('UTC').subscribe();
    const request = http.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ timezone: 'UTC' });
    request.flush({ success: true, message: 'Time zone updated', data: { timezone: 'UTC' } });
    expect(service.timezone()).toBe('UTC');
  });

  it('keeps the shared value when the save fails', () => {
    service.timezone.set('Indian/Antananarivo');
    service.saveTimezone('UTC').subscribe({ error: () => undefined });
    http
      .expectOne(URL)
      .flush(
        { success: false, message: 'Unknown time zone.' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(service.timezone()).toBe('Indian/Antananarivo');
  });
});
