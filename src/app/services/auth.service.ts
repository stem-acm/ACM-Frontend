import { inject, Injectable } from '@angular/core';
import { environment } from '@/environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '@/app/types/httpResult';
import { User } from '@/app/interfaces/user';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private URL: string = environment.API_URL;
  private http = inject(HttpClient);

  login(credentials: { username: string; password: string }) {
    return this.http.post<HttpResult<{ user: User; token: string }>>(
      `${this.URL}/auth/login`,
      credentials,
    );
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  verifyToken() {
    const token: string | null = this.getToken();
    if (!token) {
      return throwError(() => new Error('Unauthorized'));
    }

    return this.http.get<HttpResult<User>>(`${this.URL}/auth/token`, {
      params: {
        auth: token,
      },
    });
  }
}
