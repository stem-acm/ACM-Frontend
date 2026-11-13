import { AuditLog, AuditLogQuery } from '@/app/interfaces/audit-log';
import { HttpResult } from '@/app/types/httpResult';
import { environment } from '@/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.API_URL}/settings/logs`;

  getLogs(query: AuditLogQuery) {
    let params = new HttpParams().set('offset', query.offset).set('limit', query.limit);
    if (query.search?.trim()) params = params.set('search', query.search.trim());
    if (query.entity) params = params.set('entity', query.entity);
    if (query.type) params = params.set('type', query.type);
    if (query.actorId) params = params.set('actorId', query.actorId);
    if (query.from) params = params.set('from', query.from);
    if (query.to) params = params.set('to', query.to);
    return this.http.get<HttpResult<AuditLog[]>>(this.url, { params });
  }
}
