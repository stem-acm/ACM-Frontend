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
  public pageInput = 1;

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
    this.currentPage = Math.max(1, Math.min(page, this.totalPages));
    this.pageInput = this.currentPage;
    this.updateDisplayedCheckins();
  }

  goToPage() {
    const page = Number(this.pageInput);
    if (!Number.isInteger(page) || page < 1) {
      this.pageInput = 1;
    } else if (page > this.totalPages) {
      this.pageInput = this.totalPages;
    }
    this.changePage(this.pageInput);
  }

  private updateDisplayedCheckins() {
    const filtered = this.filterCheckins(this.searchWord, this.startDate, this.endDate);
    this.totalCheckins = filtered.length;

    if (this.totalCheckins > 0 && this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.displayedCheckins = filtered.slice(start, end);
    this.pageInput = this.currentPage;
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

      const lower = name.toLowerCase();
      return (
        checkin.registrationNumber.toString().toLowerCase().includes(lower) ||
        checkin.Member?.firstName?.toLowerCase().includes(lower) ||
        checkin.Member?.lastName?.toLowerCase().includes(lower) ||
        checkin.Activity?.name?.toLowerCase().includes(lower) ||
        checkin.visitReason?.toLowerCase().includes(lower)
      );
    });
  }
}
