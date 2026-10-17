import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { BookLoanService } from './book-loan.service';

describe('BookLoanService', () => {
  let service: BookLoanService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BookLoanService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the all status by default', () => {
    service.getAll(0, 25).subscribe();

    const request = http.expectOne(
      req => req.url === `${environment.API_URL}/book-loans` && req.params.get('status') === 'all',
    );
    expect(request.request.params.get('offset')).toBe('0');
    expect(request.request.params.get('limit')).toBe('25');
    request.flush({ success: true, data: [] });
  });

  it('combines text search and status in one request', () => {
    service.getAll(25, 25, 'Ada', 'overdue').subscribe();

    const request = http.expectOne(req => req.url === `${environment.API_URL}/book-loans`);
    expect(request.request.params.get('offset')).toBe('25');
    expect(request.request.params.get('search')).toBe('Ada');
    expect(request.request.params.get('status')).toBe('overdue');
    request.flush({ success: true, data: [] });
  });
});
