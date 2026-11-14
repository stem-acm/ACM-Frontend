import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '@/environments/environment';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends only the pagination when no filter is set', () => {
    service.getLogs({ offset: 0, limit: 25, search: ' ', entity: '', type: '' }).subscribe();

    const request = http.expectOne(req => req.url === `${environment.API_URL}/settings/logs`);
    expect(request.request.params.keys().sort()).toEqual(['limit', 'offset']);
    expect(request.request.params.get('limit')).toBe('25');
    request.flush({ success: true, data: [] });
  });

  it('sends every filter of the read route', () => {
    service
      .getLogs({
        offset: 25,
        limit: 25,
        search: ' Rabe ',
        entity: 'members',
        type: 'member.updated',
        actorId: 3,
        from: '2026-11-10T21:00:00.000Z',
        to: '2026-11-13T20:59:59.999Z',
      })
      .subscribe();

    const request = http.expectOne(req => req.url === `${environment.API_URL}/settings/logs`);
    const params = request.request.params;
    expect(params.get('offset')).toBe('25');
    expect(params.get('search')).toBe('Rabe');
    expect(params.get('entity')).toBe('members');
    expect(params.get('type')).toBe('member.updated');
    expect(params.get('actorId')).toBe('3');
    expect(params.get('from')).toBe('2026-11-10T21:00:00.000Z');
    expect(params.get('to')).toBe('2026-11-13T20:59:59.999Z');
    request.flush({ success: true, data: [] });
  });
  it('collects all filtered pages for global name sorting, independently of the displayed page', () => {
    let count = 0;
    service
      .getEveryLog({ offset: 25, limit: 25, search: 'Ada', entity: 'members' })
      .subscribe(result => {
        count = result.data.length;
      });
    const first = http.expectOne(req => req.url === `${environment.API_URL}/settings/logs`);
    expect(first.request.params.get('offset')).toBe('0');
    expect(first.request.params.get('limit')).toBe('100');
    expect(first.request.params.get('search')).toBe('Ada');
    first.flush({
      success: true,
      data: Array.from({ length: 100 }, (_, id) => ({ id })),
      pagination: { offset: 0, limit: 100, total: 101, hasMore: true },
    });
    expect(count).toBe(0);
    const last = http.expectOne(req => req.url === `${environment.API_URL}/settings/logs`);
    expect(last.request.params.get('offset')).toBe('100');
    expect(last.request.params.get('entity')).toBe('members');
    last.flush({
      success: true,
      data: [{ id: 100 }],
      pagination: { offset: 100, limit: 100, total: 101, hasMore: false },
    });
    expect(count).toBe(101);
  });
});
