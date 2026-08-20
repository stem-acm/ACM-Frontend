import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
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

  addVolunteer(volunteer: Volunteer) {
    return this.http.post<HttpResult<Volunteer>>(`${this.URL}/Volunteers`, volunteer);
  }
}
