import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpResult } from '../types/httpResult';
import { Member } from '../interfaces/member';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  private URL: string = environment.URL;

  constructor(private http: HttpClient) { }

  // Get all members
  getAllMembers() {
    return this.http.get<HttpResult>(`${this.URL}/members`);
  }

  getMemberById(id: number) {
    return this.http.get<HttpResult>(`${this.URL}/members/${id}`);
  }

  getMemberByRegistrationNumber(registrationNumber: string) {
    return this.http.get<HttpResult>(`${this.URL}/members/registration/${registrationNumber}`);
  }

  addMember(member: Member) {
    return this.http.post<HttpResult>(`${this.URL}/members`, member);
  }

  updateMember(member: Member) {
    return this.http.put<HttpResult>(`${this.URL}/members`, member);
  }
}
