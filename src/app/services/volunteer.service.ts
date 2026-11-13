import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, reduce } from 'rxjs';
import { HttpResult } from '../types/httpResult';
import { Volunteer } from '../interfaces/volunteer';

@Injectable({
  providedIn: 'root',
})
export class VolunteerService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  getAllVolunteers(offset = 0, limit = 10, search = '') {
    return this.http.get<HttpResult<Volunteer[]>>(
      `${this.URL}/volunteers?offset=${offset}&limit=${limit}&search=${search}`,
    );
  }

  /** Every volunteer, read page by page: the API returns at most 100 rows per request. */
  getEveryVolunteer() {
    const limit = 100;
    return this.getAllVolunteers(0, limit).pipe(
      expand((result, index) =>
        result.success && result.pagination?.hasMore
          ? this.getAllVolunteers((index + 1) * limit, limit)
          : EMPTY,
      ),
      reduce((all, page) => ({
        ...page,
        success: all.success && page.success,
        data: [...all.data, ...(page.data ?? [])],
      })),
    );
  }

  getVolunteerById(id: number) {
    return this.http.get<HttpResult<Volunteer>>(`${this.URL}/volunteers/${id}`);
  }

  addVolunteer(volunteer: Volunteer) {
    return this.http.post<HttpResult<Volunteer>>(`${this.URL}/Volunteers`, volunteer);
  }
}
