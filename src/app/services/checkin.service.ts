import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '@/app/types/httpResult';
import { Checkin } from '@/app/interfaces/checkin';

@Injectable({
  providedIn: 'root',
})
export class CheckinService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  createCheckin(memberData: Checkin) {
    return this.http.post<HttpResult<Checkin>>(`${this.URL}/checkins`, memberData);
  }
}
