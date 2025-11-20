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

  getAllMembers() {
    return this.http.get<HttpResult<Member[]>>(`${this.URL}/members`);
  }

  getMemberById(id: number) {
    return this.http.get<HttpResult<Member>>(`${this.URL}/members/${id}`);
  }

  getMemberByRegistrationNumber(registrationNumber: string) {
    return this.http.get<HttpResult<Member>>(`${this.URL}/members/registration/${registrationNumber}`);
  }

  addMember(member: Member) {
    return this.http.post<HttpResult<Member>>(`${this.URL}/members`, member);
  }

  updateMember(member: Member) {
    return this.http.put<HttpResult<Member>>(`${this.URL}/members`, member);
  }
}
