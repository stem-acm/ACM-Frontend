import { HttpInterceptorFn, HttpRequest, HttpResponse, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpCacheService } from './services/http-cache.service';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BACKGROUND_REQUEST } from './services/member-photo.service';

function shouldSkipCache(url: string): boolean {
  return url.includes('/auth/');
}

function pathPrefix(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url;
  }
}

function collectionPrefix(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/[^/]+$/, '');
    return u.origin + path;
  } catch {
    return url;
  }
}

export const cacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  if (req.context.get(BACKGROUND_REQUEST)) return next(req);

  const cache = inject(HttpCacheService);
  const url = req.urlWithParams;

  if (req.method === 'GET' && !shouldSkipCache(url)) {
    const cached = cache.get(url);
    if (cached) {
      return of(cached);
    }
    return next(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          cache.set(url, event);
        }
      }),
    );
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next(req).pipe(
      tap(event => {
        if (event instanceof HttpResponse && event.ok) {
          cache.invalidate(pathPrefix(url));
          cache.invalidate(collectionPrefix(url));
        }
      }),
    );
  }

  return next(req);
};
