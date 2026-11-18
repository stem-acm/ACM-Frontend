import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import { environment } from '@/environments/environment';

/** Marks a request that runs in the background: no spinner, no HTTP cache entry. */
export const BACKGROUND_REQUEST = new HttpContextToken<boolean>(() => false);

/** Files in `uploads` that the API serves without a token. */
const PUBLIC_FILES = new Set(['user.png']);

/**
 * The API gives uploaded member photos only to a request with a token. An `<img src>` sends
 * no `Authorization` header, so this service downloads the photo with `HttpClient` (the auth
 * interceptor adds the token) and gives back a blob URL that the `<img>` can show.
 */
@Injectable({
  providedIn: 'root',
})
export class MemberPhotoService {
  private http = inject(HttpClient);
  private cache = new Map<string, Observable<string>>();
  private objectUrls: string[] = [];
  readonly defaultUrl = `${environment.FILE_URL}/user.png`;

  /** Returns a URL for an `<img src>`: a blob URL for a protected file, else the URL itself. */
  load(url: string | null | undefined): Observable<string> {
    if (!url) return of(this.defaultUrl);
    if (!this.isProtected(url)) return of(url);

    let photo$ = this.cache.get(url);
    if (!photo$) {
      photo$ = this.http
        .get(url, {
          responseType: 'blob',
          context: new HttpContext().set(BACKGROUND_REQUEST, true),
        })
        .pipe(
          map(blob => {
            const objectUrl = URL.createObjectURL(blob);
            this.objectUrls.push(objectUrl);
            return objectUrl;
          }),
          catchError(() => {
            // Try again at the next request (for example after a new login).
            this.cache.delete(url);
            return of(this.defaultUrl);
          }),
          shareReplay(1),
        );
      this.cache.set(url, photo$);
    }
    return photo$;
  }

  /** Frees the downloaded photos (at logout, so the next user cannot see them). */
  clear(): void {
    this.objectUrls.forEach(objectUrl => URL.revokeObjectURL(objectUrl));
    this.objectUrls = [];
    this.cache.clear();
  }

  private isProtected(url: string): boolean {
    const prefix = `${environment.FILE_URL}/`;
    return url.startsWith(prefix) && !PUBLIC_FILES.has(url.slice(prefix.length));
  }
}
