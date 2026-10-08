import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '@/app/types/httpResult';
import { User } from '@/app/interfaces/user';
import {
  BehaviorSubject,
  catchError,
  finalize,
  Observable,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);
  private userSubject = new BehaviorSubject<User | null>(null);
  private verification$?: Observable<HttpResult<User>>;
  readonly user$ = this.userSubject.asObservable();

  get user(): User | null {
    return this.userSubject.value;
  }
  can(feature: string): boolean {
    return !!this.user?.permissions?.[feature];
  }
  setUser(user: User | null): void {
    this.userSubject.next(user);
  }
  firstAllowedRoute(): string {
    const routes: [string, string][] = [
      ['dashboard.view', '/'],
      ['members.view', '/members'],
      ['volunteers.view', '/volunteer'],
      ['activities.view', '/activity'],
      ['checkins.view', '/checkin-history'],
      ['checkins.create', '/checkin'],
      ['settings.manage', '/setting'],
      ['profile.edit', '/my-profile'],
    ];
    return routes.find(([feature]) => this.can(feature))?.[1] ?? '/auth';
  }

  login(credentials: { username: string; password: string }) {
    return this.http
      .post<HttpResult<{ user: User; token: string }>>(`${this.URL}/auth/login`, credentials)
      .pipe(
        tap(result => {
          if (!result.success || !result.data?.token || !result.data.user) {
            throw new Error(result.message || 'Unauthorized');
          }
          this.saveToken(result.data.token);
          this.setUser(result.data.user);
        }),
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.setUser(null);
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken() && !!this.user;
  }

  verifyToken(): Observable<HttpResult<User>> {
    const token = this.getToken();
    if (!token) {
      this.setUser(null);
      return throwError(() => new Error('Unauthorized'));
    }
    if (this.verification$) return this.verification$;

    this.verification$ = this.http.get<HttpResult<User>>(`${this.URL}/auth/token`).pipe(
      tap(result => {
        // Ignore a response belonging to a session that has since ended or changed.
        if (this.getToken() !== token) throw new Error('Session changed');
        if (!result.success || !result.data) throw new Error(result.message || 'Unauthorized');
        this.setUser(result.data);
      }),
      catchError(error => {
        if (this.getToken() === token) this.logout();
        return throwError(() => error);
      }),
      finalize(() => {
        this.verification$ = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.verification$;
  }

  updateProfile(changes: {
    username?: string;
    email?: string;
    currentPassword: string;
    newPassword?: string;
  }) {
    return this.http
      .put<HttpResult<User>>(`${this.URL}/auth/profile`, changes)
      .pipe(tap(result => this.setUser(result.data)));
  }
}
