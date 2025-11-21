import { Component, inject, OnInit } from '@angular/core';
import { CardStatisticComponent } from '@/app/components/card-statistic/card-statistic.component';
import { DashboardService } from '../../services/dashboard.service';
import { HttpResult } from '@/app/types/httpResult';
import { TableCheckinsComponent } from '@/app/components/table-checkins/table-checkins.component';
import { CardStatisticSkeletonComponent } from '@/app/components/card-statistic-skeleton/card-statistic-skeleton.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { Statistics } from '@/app/interfaces/statistics';

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
export class HomeComponent implements OnInit {
  public statistics!: Statistics;
  private dashboard = inject(DashboardService);

  ngOnInit() {
    this.getStatistic();
  }

  getStatistic() {
    this.dashboard.getStatistic().subscribe((result: HttpResult<Statistics>) => {
      if (result.success) {
        this.statistics = result.data;
        console.log(result);
      }
    });
  }
}
