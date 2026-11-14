import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '@/app/types/httpResult';
import { Checkin } from '@/app/interfaces/checkin';
import { EMPTY, expand, reduce } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  createCheckin(memberData: Checkin) {
    return this.http.post<HttpResult<Checkin>>(`${this.URL}/checkins`, memberData);
  }

  getAllCheckin(offset = 0, limit = 100) {
    return this.http.get<HttpResult<Checkin[]>>(
      `${this.URL}/checkins?offset=${offset}&limit=${limit}`,
    );
  }

  /** Read every API page so combined history filters and totals include all records. */
  getEveryCheckin() {
    const limit = 100;
    return this.getAllCheckin(0, limit).pipe(
      expand((result, index) =>
        result.success && result.pagination?.hasMore
          ? this.getAllCheckin((index + 1) * limit, limit)
          : EMPTY,
      ),
      reduce((all, page) => ({
        ...page,
        success: all.success && page.success,
        data: [...all.data, ...(page.data ?? [])],
      })),
    );
  }
}
