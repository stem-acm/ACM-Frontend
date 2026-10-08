import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { User } from '../interfaces/user';
import { environment } from '@/environments/environment';

const testUser: User = {
  id: 1,
  username: 'tester',
  email: 'test@example.com',
  role: 'admin',
  active: true,
  createdAt: '',
  updatedAt: '',
  permissions: { 'dashboard.view': true },
};

describe('AuthService session', () => {
  let service: AuthService;
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem('token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    localStorage.removeItem('token');
  });

  it('stores the token and publishes the user together on login', () => {
    service.login({ username: 'tester', password: 'password' }).subscribe();
    http
      .expectOne(`${environment.API_URL}/auth/login`)
      .flush({ success: true, data: { user: testUser, token: 'token' } });
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.user).toEqual(testUser);
    service.logout();
    expect(service.user).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('clears a previous user when there is no token', () => {
    service.setUser(testUser);
    service.verifyToken().subscribe({ error: error => expect(error).toBeTruthy() });
    expect(service.user).toBeNull();
    http.expectNone(`${environment.API_URL}/auth/token`);
  });

  it('shares concurrent verification and clears rejected sessions', () => {
    service.saveToken('expired');
    service.setUser(testUser);
    service.verifyToken().subscribe({ error: error => expect(error).toBeTruthy() });
    service.verifyToken().subscribe({ error: error => expect(error).toBeTruthy() });
    http
      .expectOne(`${environment.API_URL}/auth/token`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.user).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('rejects unsuccessful verification responses', () => {
    service.saveToken('invalid');
    service.setUser(testUser);
    service.verifyToken().subscribe({ error: error => expect(error).toBeTruthy() });
    http.expectOne(`${environment.API_URL}/auth/token`).flush({ success: false, data: testUser });
    expect(service.user).toBeNull();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('does not restore a user when verification finishes after logout', () => {
    service.saveToken('token');
    service.verifyToken().subscribe({ error: error => expect(error).toBeTruthy() });
    service.logout();
    http.expectOne(`${environment.API_URL}/auth/token`).flush({ success: true, data: testUser });
    expect(service.user).toBeNull();
  });
});
