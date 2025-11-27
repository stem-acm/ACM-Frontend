import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpResult } from '@/app/types/httpResult';
import { Member } from '@/app/interfaces/member';

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  getAllMembers(offset = 0, limit = 10, search = '') {
    return this.http.get<HttpResult<Member[]>>(
      `${this.URL}/members?offset=${offset}&limit=${limit}&search=${search}`,
    );
  }

  getMemberById(id: number) {
    return this.http.get<HttpResult<Member>>(`${this.URL}/members/${id}`);
  }

  getMemberByRegistrationNumber(registrationNumber: string) {
    return this.http.get<HttpResult<Member>>(
      `${this.URL}/members/registration/${registrationNumber}`,
    );
  }

  addMember(member: Member) {
    return this.http.post<HttpResult<Member>>(`${this.URL}/members`, member);
  }

  updateMember(member: Member) {
    return this.http.put<HttpResult<Member>>(`${this.URL}/members/${member.id}`, member);
  }
}
