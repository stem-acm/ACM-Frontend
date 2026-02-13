import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  response: HttpResponse<unknown>;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class HttpCacheService {
  private cache = new Map<string, CacheEntry>();

  get(url: string): HttpResponse<unknown> | null {
    const entry = this.cache.get(url);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      this.cache.delete(url);
      return null;
    }
    return entry.response;
  }

  set(url: string, response: HttpResponse<unknown>): void {
    this.cache.set(url, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache entries whose URL starts with the given path (e.g. /api/members).
   * Call without args to clear the entire cache.
   */
  invalidate(pathPrefix?: string): void {
    if (!pathPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(pathPrefix)) {
        this.cache.delete(key);
      }
    }
  }
}
