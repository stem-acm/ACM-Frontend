import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { VolunteerService } from './volunteer.service';
import { Volunteer } from '../interfaces/volunteer';

describe('VolunteerService', () => {
  let service: VolunteerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(VolunteerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('reads every page of volunteers beyond the API limit of 100', () => {
    const http = TestBed.inject(HttpTestingController);
    let received: Volunteer[] = [];
    service.getEveryVolunteer().subscribe(result => (received = result.data));

    const rows = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({ id: from + i }) as Volunteer);
    http
      .expectOne(request => request.url.includes('offset=0&limit=100'))
      .flush({
        success: true,
        data: rows(1, 100),
        pagination: { offset: 0, limit: 100, total: 101, hasMore: true },
      });
    http
      .expectOne(request => request.url.includes('offset=100&limit=100'))
      .flush({
        success: true,
        data: rows(101, 1),
        pagination: { offset: 100, limit: 100, total: 101, hasMore: false },
      });
    http.verify();

    expect(received.length).toBe(101);
    expect(received[100].id).toBe(101);
  });
});
