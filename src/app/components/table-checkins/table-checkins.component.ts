import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { Checkin } from '@/app/interfaces/checkin';
import { environment } from '@/environments/environment';
import dayjs from 'dayjs';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-table-checkins',
  standalone: true,
  imports: [RouterModule, TranslateModule],
  templateUrl: './table-checkins.component.html',
  styleUrl: './table-checkins.component.css',
})
export class TableCheckinsComponent implements OnInit, OnDestroy {
  private URL: string = environment.FILE_URL;
  @Input() checkins!: Checkin[];
  private updateInterval?: number;
  public currentTime = new Date().getTime();
  private UPDATE_INTERVAL_TIME = 1 * 1000; // 1 seconds
  private translateService = inject(TranslateService);

  ngOnInit() {
    // Update current time every 60 seconds to refresh the green dot indicators
    this.updateInterval = window.setInterval(() => {
      this.currentTime = new Date().getTime();
    }, this.UPDATE_INTERVAL_TIME);
  }

  ngOnDestroy() {
    // Clean up the interval when component is destroyed
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  getfileUrl(fileName: string | undefined) {
    return `${this.URL}/${fileName && fileName != '' ? fileName : 'user.png'}`;
  }

  formatTime(date?: Date | string): string {
    if (!date) return this.translateService.instant('table.noTime');
    return dayjs(date).format('h:mm A');
  }

  /**
   * Check if a member is currently in the room
   * (no checkout time or checkout time in the future)
   */
  isInRoom(checkin: Checkin): boolean {
    if (!checkin.checkOutTime) {
      return true; // No checkout time means still in the room
    }
    const checkOutTime = new Date(checkin.checkOutTime).getTime();
    return checkOutTime >= this.currentTime; // Use currentTime which updates every UPDATE_INTERVAL_TIME
  }
}
