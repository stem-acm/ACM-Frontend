import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '../types/httpResult';
import { Checkin } from '../interfaces/checkin';

@Injectable({
  providedIn: 'root'
})
export class CheckinService {
  private URL: string = environment.API_URL;

  constructor(private http:HttpClient) { }

  createCheckin(memberData: Checkin) {
    return this.http.post<HttpResult<Checkin>>(`${this.URL}/checkins`, memberData);
  }
}
