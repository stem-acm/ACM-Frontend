import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { CheckinService } from './checkin.service';
import { Checkin } from '@/app/interfaces/checkin';
import { HttpResult } from '@/app/types/httpResult';
import { unitTestProviders } from '@/testing/unit-test-providers';
import { environment } from '@/environments/environment';

describe('CheckinService', () => {
  let service: CheckinService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: unitTestProviders });
    service = TestBed.inject(CheckinService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const rows = (offset: number, count: number): Checkin[] =>
    Array.from({ length: count }, (_, i) => ({
      id: offset + i + 1,
      registrationNumber: 1,
      signature: '',
      activityId: 1,
      checkInTime: new Date('2026-10-06T09:00:00+03:00'),
    }));

  it('returns the complete history only after every API page has loaded', () => {
    let received: HttpResult<Checkin[]> | undefined;
    service.getEveryCheckin().subscribe(result => (received = result));
    http.expectOne(`${environment.API_URL}/checkins?offset=0&limit=100`).flush({
      success: true,
      data: rows(0, 100),
      pagination: { offset: 0, limit: 100, total: 101, hasMore: true },
    });
    expect(received).toBeUndefined();
    http.expectOne(`${environment.API_URL}/checkins?offset=100&limit=100`).flush({
      success: true,
      data: rows(100, 1),
      pagination: { offset: 100, limit: 100, total: 101, hasMore: false },
    });
    expect(received?.data.length).toBe(101);
    expect(received?.data[100].id).toBe(101);
  });

  it('does not report partial history as successful when a later page fails', () => {
    let received: HttpResult<Checkin[]> | undefined;
    service.getEveryCheckin().subscribe(result => (received = result));
    http.expectOne(`${environment.API_URL}/checkins?offset=0&limit=100`).flush({
      success: true,
      data: rows(0, 100),
      pagination: { offset: 0, limit: 100, total: 101, hasMore: true },
    });
    http.expectOne(`${environment.API_URL}/checkins?offset=100&limit=100`).flush({
      success: false,
      data: [],
      message: 'Unavailable',
    });
    expect(received?.success).toBeFalse();
  });

  it('handles an empty history without requesting another page', () => {
    let received: Checkin[] | undefined;
    service.getEveryCheckin().subscribe(result => (received = result.data));
    http.expectOne(`${environment.API_URL}/checkins?offset=0&limit=100`).flush({
      success: true,
      data: [],
      pagination: { offset: 0, limit: 100, total: 0, hasMore: false },
    });
    expect(received).toEqual([]);
  });
});
