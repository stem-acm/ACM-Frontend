import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '@/app/types/httpResult';
import { Activity } from '@/app/interfaces/activity';

@Injectable({
  providedIn: 'root',
})
export class ActivityService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  // Get all activities
  getAllActivity(
    offset = 0,
    limit = 10,
    search = '',
    sortBy: 'createdAt' | 'name' = 'createdAt',
    order: 'asc' | 'desc' = 'desc',
  ) {
    return this.http.get<HttpResult<Activity[]>>(
      `${this.URL}/activities?offset=${offset}&limit=${limit}&search=${encodeURIComponent(search)}&sortBy=${sortBy}&order=${order}`,
    );
  }

  getActivityById(id: number) {
    return this.http.get<HttpResult<Activity>>(`${this.URL}/activities/${id}`);
  }

  addActivity(activity: Activity) {
    return this.http.post<HttpResult<Activity>>(`${this.URL}/activities`, activity);
  }

  updateActivity(activity: Activity) {
    // An activity read from an API that still has the image column carries `image: null`,
    // and that API rejects null on update. The client never sends the field.
    const { image: _image, ...body } = activity as Activity & { image?: unknown };
    return this.http.put<HttpResult<Activity>>(`${this.URL}/activities/${activity.id}`, body);
  }

  deleteActivity(id: number) {
    return this.http.delete<HttpResult<null>>(`${this.URL}/activities/${id}`);
  }
}
