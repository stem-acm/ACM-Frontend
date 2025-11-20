import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpResult } from '../types/httpResult';
import { environment } from '../../environments/environment';
import { Statistics } from '../interfaces/statistics';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private URL: string = environment.API_URL;

  constructor(private http: HttpClient) { }

  getStatistic() {
    return this.http.get<HttpResult<Statistics>>(`${this.URL}/dashboard`);
  }
}
