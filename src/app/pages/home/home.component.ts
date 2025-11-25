import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CardStatisticComponent } from '@/app/components/card-statistic/card-statistic.component';
import { DashboardService } from '@/app/services/dashboard.service';
import { HttpResult } from '@/app/types/httpResult';
import { TableCheckinsComponent } from '@/app/components/table-checkins/table-checkins.component';
import { CardStatisticSkeletonComponent } from '@/app/components/card-statistic-skeleton/card-statistic-skeleton.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { Statistics } from '@/app/interfaces/statistics';
import { SseService } from '@/app/services/sse.service';
import { Subscription } from 'rxjs';
import { Checkin } from '@/app/interfaces/checkin';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CardStatisticComponent,
    TableCheckinsComponent,
    CardStatisticSkeletonComponent,
    TableLoadingComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  public statistics!: Statistics;
  private dashboard = inject(DashboardService);
  private sseService = inject(SseService);
  private checkinSubscription?: Subscription;

  ngOnInit() {
    this.getStatistic();
    this.subscribeToRealTimeCheckins();
  }

  ngOnDestroy() {
    // Clean up SSE connection and subscription
    if (this.checkinSubscription) {
      this.checkinSubscription.unsubscribe();
    }
    this.sseService.disconnect();
  }

  getStatistic() {
    this.dashboard.getStatistic().subscribe((result: HttpResult<Statistics>) => {
      if (result.success) {
        this.statistics = result.data;
        // Sort check-ins by checkInTime descending (newest first)
        this.sortCheckins();
        console.log(result);
      }
    });
  }

  subscribeToRealTimeCheckins() {
    console.log('[Home] Subscribing to real-time check-ins');
    this.checkinSubscription = this.sseService.connectToCheckins().subscribe({
      next: (newCheckin: Checkin) => {
        console.log('[Home] Real-time check-in received:', newCheckin);

        if (this.statistics) {
          // Add new check-in to the beginning of the array
          this.statistics.checkins.unshift(newCheckin);
          console.log('[Home] Added check-in to list, total:', this.statistics.checkins.length);
          // Sort to ensure proper ordering
          this.sortCheckins();
        }
      },
      error: error => {
        console.error('[Home] Error receiving real-time check-in:', error);
      },
    });
  }

  private sortCheckins() {
    if (this.statistics && this.statistics.checkins) {
      this.statistics.checkins.sort((a, b) => {
        const dateA = new Date(a.checkInTime).getTime();
        const dateB = new Date(b.checkInTime).getTime();
        return dateB - dateA; // Descending order (newest first)
      });
    }
  }

  /**
   * Get the count of members currently in the room
   * (check-ins without checkout time or with checkout time in the future)
   */
  get membersInRoom(): number {
    if (!this.statistics || !this.statistics.checkins) {
      return 0;
    }

    const now = new Date().getTime();
    return this.statistics.checkins.filter(checkin => {
      if (!checkin.checkOutTime) {
        return true; // No checkout time means still in the room
      }
      const checkOutTime = new Date(checkin.checkOutTime).getTime();
      return checkOutTime > now; // Checkout time in the future
    }).length;
  }
}
