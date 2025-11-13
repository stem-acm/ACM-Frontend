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
    return this.http.get<HttpResult<Member[]>>(`${this.URL}/member`);
  }

  getMemberById(id: number) {
    return this.http.get<HttpResult<Member>>(`${this.URL}/member/${id}`);
  }

  getMemberByRegistrationNumber(registrationNumber: string) {
    return this.http.get<HttpResult<Member>>(`${this.URL}/member/reg/${registrationNumber}`);
  }

  addMember(member: Member) {
    return this.http.post<HttpResult<Member>>(`${this.URL}/member`, member);
  }

  updateMember(member: Member) {
    return this.http.put<HttpResult<Member>>(`${this.URL}/member`, member);
  }
}
