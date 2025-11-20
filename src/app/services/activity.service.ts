import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '../types/httpResult';
import { Activity } from '../interfaces/activity';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private URL: string = environment.API_URL;

  constructor(private http: HttpClient) { }

  // Get all activities
  getAllActivity() {
    return this.http.get<HttpResult<Activity[]>>(`${this.URL}/activities`);
  }

  getActivityById(id: number) {
    return this.http.get<HttpResult<Activity>>(`${this.URL}/activities/${id}`);
  }

  addActivity(activity: Activity) {
    return this.http.post<HttpResult<Activity>>(`${this.URL}/activities`, activity);
  }

  updateActivity(activity: Activity) {
    return this.http.put<HttpResult<Activity>>(`${this.URL}/activities/${activity.id}`, activity);
  }

}
