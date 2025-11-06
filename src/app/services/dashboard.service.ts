import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { HttpResult } from '../types/httpResult';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private URL: string = environment.URL;

  constructor(private http: HttpClient) { }

  getStatistic() {
    return this.http.get<HttpResult>(`${this.URL}/dashboard`);
  }
}
