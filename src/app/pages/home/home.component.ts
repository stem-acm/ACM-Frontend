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
    this.checkinSubscription = this.sseService.connectToCheckins().subscribe({
      next: (newCheckin: Checkin) => {
        console.log('Real-time check-in received:', newCheckin);
        
        if (this.statistics) {
          // Add new check-in to the beginning of the array
          this.statistics.checkins.unshift(newCheckin);
          // Sort to ensure proper ordering
          this.sortCheckins();
        }
      },
      error: (error) => {
        console.error('Error receiving real-time check-in:', error);
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
}
