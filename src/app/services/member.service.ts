import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpResult } from '@/app/types/httpResult';
import { Member } from '@/app/interfaces/member';

export interface QRCodeData {
  registrationNumber: number;
  signature: string;
}

@Injectable({
  providedIn: 'root',
})
export class MemberService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  getAllMembers(offset = 0, limit = 10, search = '', studyPlaces = '') {
    let url = `${this.URL}/members?offset=${offset}&limit=${limit}&search=${search}`;
    if (studyPlaces) {
      url += `&studyPlaces=${encodeURIComponent(studyPlaces)}`;
    }
    return this.http.get<HttpResult<Member[]>>(url);
  }

  getStudyPlaces() {
    return this.http.get<HttpResult<string[]>>(`${this.URL}/members/study-places`);
  }

  getMemberById(id: number) {
    return this.http.get<HttpResult<Member>>(`${this.URL}/members/${id}`);
  }

  getMemberByRegistrationNumber(registrationNumber: string) {
    return this.http.get<HttpResult<Member>>(
      `${this.URL}/members/registration/${registrationNumber}`,
    );
  }

  getQRCodeData(registrationNumber: number) {
    return this.http.get<HttpResult<QRCodeData>>(
      `${this.URL}/members/registration/${registrationNumber}/qr-code`,
    );
  }

  addMember(member: Member) {
    return this.http.post<HttpResult<Member>>(`${this.URL}/members`, member);
  }

  updateMember(member: Member) {
    return this.http.put<HttpResult<Member>>(
      `${this.URL}/members/${member.registrationNumber}`,
      member,
    );
  }

  deleteMember(registrationNumber: number) {
    return this.http.delete<HttpResult<null>>(`${this.URL}/members/${registrationNumber}`);
  }
}
