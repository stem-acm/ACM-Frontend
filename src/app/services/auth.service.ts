import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { HttpResult } from '../types/httpResult';
import { User } from '../interfaces/user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private URL: string = environment.API_URL;

  constructor(private http: HttpClient) { }

  login(credentials: { username: string; password: string }) {
    return this.http.post<HttpResult<{ user: User; token: string }>>(`${this.URL}/auth/login`, credentials);
  }

  logout(): void {
    sessionStorage.removeItem('token');
  }

  saveToken(token: string): void {
    sessionStorage.setItem('token', token);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  verifyToken() {
    const token: any = this.getToken();
    return this.http.get<HttpResult<User>>(`${this.URL}/auth/token`, {
      params: {
        auth: token
      }
    });
  }
}
