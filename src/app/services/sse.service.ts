import { inject, Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '@/environments/environment';
import { Checkin } from '@/app/interfaces/checkin';
import { Activity } from '@/app/interfaces/activity';

interface SSEMessage {
  type: string;
  data?: Checkin | Activity;
}

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private eventSource: EventSource | null = null;
  private checkinSubject = new Subject<Checkin>();
  private activitySubject = new Subject<Activity>();
  private ngZone = inject(NgZone);

  /**
   * Connect to the SSE endpoint for real-time check-in updates
   */
  connectToCheckins(): Observable<Checkin> {
    if (this.eventSource) {
      console.log('[SSE] Reusing existing connection');
      return this.checkinSubject.asObservable();
    }

    const url = `${environment.API_URL}/sse/checkins`;
    console.log('[SSE] Connecting to:', url);

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.ngZone.run(() => {
        console.log('[SSE] Connection opened successfully');
      });
    };

    this.eventSource.onmessage = event => {
      this.ngZone.run(() => {
        console.log('[SSE] Message received:', event.data);
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('[SSE] Parsed message:', message);

          if (message.type === 'new-checkin' && message.data) {
            console.log('[SSE] New check-in event received:', message.data);
            this.checkinSubject.next(message.data as Checkin);
          } else if (message.type === 'connected') {
            console.log('[SSE] Initial connection confirmed');
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      });
    };

    this.eventSource.onerror = error => {
      this.ngZone.run(() => {
        console.error('[SSE] Connection error:', error);
        console.error('[SSE] EventSource readyState:', this.eventSource?.readyState);
        // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        this.disconnect();
      });
    };

    return this.checkinSubject.asObservable();
  }

  /**
   * Connect to the SSE endpoint for real-time activity updates
   */
  connectToActivities(): Observable<Activity> {
    if (this.eventSource) {
      console.log('[SSE] Reusing existing connection');
      return this.activitySubject.asObservable();
    }

    const url = `${environment.API_URL}/sse/activities`;
    console.log('[SSE] Connecting to:', url);

    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      this.ngZone.run(() => {
        console.log('[SSE] Connection opened successfully');
      });
    };

    this.eventSource.onmessage = event => {
      this.ngZone.run(() => {
        console.log('[SSE] Message received:', event.data);
        try {
          const message: SSEMessage = JSON.parse(event.data);
          console.log('[SSE] Parsed message:', message);

          if (message.type === 'new-activity' && message.data) {
            console.log('[SSE] New activity event received:', message.data);
            this.activitySubject.next(message.data as Activity);
          } else if (message.type === 'connected') {
            console.log('[SSE] Initial connection confirmed');
          }
        } catch (error) {
          console.error('[SSE] Error parsing message:', error);
        }
      });
    };

    this.eventSource.onerror = error => {
      this.ngZone.run(() => {
        console.error('[SSE] Connection error:', error);
        console.error('[SSE] EventSource readyState:', this.eventSource?.readyState);
        // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        this.disconnect();
      });
    };

    return this.activitySubject.asObservable();
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}
