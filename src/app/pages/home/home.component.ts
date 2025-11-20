import { Component } from '@angular/core';
import { CardStatisticComponent } from '../../components/card-statistic/card-statistic.component';
import { DashboardService } from '../../services/dashboard.service';
import { HttpResult } from '../../types/httpResult';
import { Checkin } from '../../interfaces/checkin';
import { TableCheckinsComponent } from '../../components/table-checkins/table-checkins.component';
import { CardStatisticSkeletonComponent } from '../../components/card-statistic-skeleton/card-statistic-skeleton.component';
import { TableLoadingComponent } from '../../components/table-loading/table-loading.component';
import { Statistics } from '../../interfaces/statisctics';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CardStatisticComponent, TableCheckinsComponent, CardStatisticSkeletonComponent, TableLoadingComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  public statistics!: {
    checkins: Checkin[],
    members: number,
    activities: number,
  }
  constructor(private dashboard: DashboardService) {}

  ngOnInit() {
    this.getStatistic();
  }

  getStatistic() {
    this.dashboard.getStatistic()
      .subscribe((result: HttpResult<Statistics>) => {
        if(result.success) {
          this.statistics = result.data;
          console.log(result);
        }
      })
  }

}
