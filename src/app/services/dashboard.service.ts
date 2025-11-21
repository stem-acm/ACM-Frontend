import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpResult } from '@/app/types/httpResult';
import { environment } from '@/environments/environment';
import { Statistics } from '@/app/interfaces/statistics';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private URL: string = environment.API_URL;

  getStatistic() {
    return this.http.get<HttpResult<Statistics>>(`${this.URL}/dashboard`);
  }
}
