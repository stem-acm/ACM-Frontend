import { CardStatisticSkeletonComponent } from '@/app/components/card-statistic-skeleton/card-statistic-skeleton.component';
import { TableCheckinsComponent } from '@/app/components/table-checkins/table-checkins.component';
import { TableLoadingComponent } from '@/app/components/table-loading/table-loading.component';
import { Checkin } from '@/app/interfaces/checkin';
import { CheckinService } from '@/app/services/checkin.service';
import { HttpResult } from '@/app/types/httpResult';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Subject } from 'rxjs/internal/Subject';

@Component({
  selector: 'app-checkin-history',
  standalone: true,
  imports: [
    TableCheckinsComponent,
    CardStatisticSkeletonComponent,
    TableLoadingComponent,
    TranslateModule,
    FormsModule,
  ],
  templateUrl: './checkin-history.component.html',
  styleUrl: './checkin-history.component.css',
})
export class CheckinHistoryComponent implements OnInit {
  protected Math = Math;
  private checkinService = inject(CheckinService);
  private allCheckins: Checkin[] = [];
  public displayedCheckins: Checkin[] = [];
  public searchWord = '';
  public startDate = '';
  public endDate = '';
  private searchSubject = new Subject<string>();

  public currentPage = 1;
  public pageSize = 10;
  public totalCheckins = 0;
  public isLoading = true;

  ngOnInit() {
    this.getCheckins();
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe(value => {
      this.searchWord = value;
      this.currentPage = 1;
      this.updateDisplayedCheckins();
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCheckins / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  getCheckins() {
    this.checkinService.getAllCheckin().subscribe((result: HttpResult<Checkin[]>) => {
      this.allCheckins = result.data || [];
      this.currentPage = 1;
      this.updateDisplayedCheckins();
      this.isLoading = false;
    });
  }

  search(keyWord: string) {
    this.searchSubject.next(keyWord);
  }

  onDateRangeChange() {
    this.currentPage = 1;
    this.updateDisplayedCheckins();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.updateDisplayedCheckins();
  }

  private updateDisplayedCheckins() {
    const filtered = this.filterCheckins(this.searchWord, this.startDate, this.endDate);
    this.totalCheckins = filtered.length;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayedCheckins = filtered.slice(start, end);
  }

  private filterCheckins(name: string, startDate: string, endDate: string): Checkin[] {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return this.allCheckins.filter(checkin => {
      const checkInTime = new Date(checkin.checkInTime);

      if (start && checkInTime < start) {
        return false;
      }

      if (end) {
        const endOfDay = new Date(end);
        endOfDay.setHours(23, 59, 59, 999);
        if (checkInTime > endOfDay) {
          return false;
        }
      }

      if (!name) {
        return true;
      }

      return checkin.registrationNumber.toLowerCase().includes(name.toLowerCase());
    });
  }
}
