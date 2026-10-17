import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '@/environments/environment';
import { Member } from '@/app/interfaces/member';

import { MemberService } from './member.service';

describe('MemberService', () => {
  let service: MemberService;
  let http: HttpTestingController;

  const member: Member = {
    registrationNumber: 12,
    firstName: 'Ada',
    lastName: 'Lovelace',
    title: 'Miss',
    gender: 'female',
    birthDate: '1990-01-01',
    birthPlace: '',
    address: '',
    occupation: 'student',
    phoneNumber: '',
    studyOrWorkPlace: '',
    joinDate: '2026-01-01',
    profileImage: 'members/current.png',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MemberService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('creates a member as multipart data with an optional photo', () => {
    const photo = new File(['photo'], 'member.jpg', { type: 'image/jpeg' });
    service.addMember(member, photo).subscribe();

    const request = http.expectOne(`${environment.API_URL}/members`);
    expect(request.request.body instanceof FormData).toBeTrue();
    const body = request.request.body as FormData;
    expect(body.get('firstName')).toBe('Ada');
    expect(body.get('profileImage')).toBeNull();
    expect(body.get('photo')).toEqual(photo);
    expect(request.request.headers.has('Content-Type')).toBeFalse();
    request.flush({ success: true, data: member });
  });

  it('preserves the current photo unless removal is explicitly requested', () => {
    service.updateMember(member).subscribe();
    let request = http.expectOne(`${environment.API_URL}/members/12`);
    expect((request.request.body as FormData).get('photo')).toBeNull();
    expect((request.request.body as FormData).get('removeProfileImage')).toBeNull();
    request.flush({ success: true, data: member });

    service.updateMember(member, null, true).subscribe();
    request = http.expectOne(`${environment.API_URL}/members/12`);
    expect((request.request.body as FormData).get('removeProfileImage')).toBe('true');
    request.flush({ success: true, data: { ...member, profileImage: null } });
  });
});
