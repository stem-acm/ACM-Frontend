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
});
