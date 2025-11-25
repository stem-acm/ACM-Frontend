import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '@/environments/environment';
import { Checkin } from '@/app/interfaces/checkin';

interface SSEMessage {
  type: string;
  data?: Checkin;
}

@Injectable({
  providedIn: 'root',
})
export class SseService {
  private eventSource: EventSource | null = null;
  private checkinSubject = new Subject<Checkin>();

  /**
   * Connect to the SSE endpoint for real-time check-in updates
   */
  connectToCheckins(): Observable<Checkin> {
    if (this.eventSource) {
      return this.checkinSubject.asObservable();
    }

    const url = `${environment.API_URL}/sse/checkins`;
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);
        
        if (message.type === 'new-checkin' && message.data) {
          this.checkinSubject.next(message.data);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.disconnect();
    };

    return this.checkinSubject.asObservable();
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
