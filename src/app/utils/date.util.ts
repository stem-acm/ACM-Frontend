import { Injectable, inject, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DateUtil implements OnDestroy {
  private translateService = inject(TranslateService);
  private langChangeSubscription?: Subscription;

  constructor() {
    this.updateDayjsLocale();
    this.langChangeSubscription = this.translateService.onLangChange.subscribe(() => {
      this.updateDayjsLocale();
    });
  }

  ngOnDestroy() {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  private updateDayjsLocale() {
    const currentLang =
      this.translateService.currentLang || this.translateService.defaultLang || 'en';
    const localeMap: Record<string, string> = {
      en: 'en',
      fr: 'fr',
      mg: 'en',
    };
    const locale = localeMap[currentLang] || 'en';
    dayjs.locale(locale);
  }

  /**
   * Formats a date with full day name, date, and month name
   * Example: "Monday 01 January 2024"
   */
  formatDateFull(date?: Date | string | null): string {
    if (!date) return this.translateService.instant('table.noDate');
    this.updateDayjsLocale();
    return dayjs(date).format('dddd DD MMMM YYYY');
  }

  /**
   * Formats a date with full day name, date, month name, and age
   * Example: "Monday 01 January 2024 (25 yrs)"
   */
  formatDateWithAge(date?: Date | string | null): string {
    if (!date) return this.translateService.instant('table.noDate');
    this.updateDayjsLocale();
    const formatted = dayjs(date).format('dddd DD MMMM YYYY');
    const age = dayjs().diff(dayjs(date), 'year');
    return `${formatted} (${age} yrs)`;
  }

  /**
   * Formats a date in DD / MM / YYYY format
   * Example: "01 / 01 / 2024"
   */
  formatDateShort(date?: Date | string | null): string {
    if (!date) return this.translateService.instant('table.noDate');
    this.updateDayjsLocale();
    return dayjs(date).format('DD / MM / YYYY');
  }

  /**
   * Formats a date in YYYY-MM-DD format (ISO-like)
   * Example: "2024-01-01"
   */
  formatDateISO(date?: Date | string | null): string {
    if (!date) return this.translateService.instant('table.noDate');
    this.updateDayjsLocale();
    return dayjs(date).format('YYYY-MM-DD');
  }

  /**
   * Formats a date as relative time (e.g., "2 years 3 months")
   */
  formatDateRelative(date?: Date | string | null): string {
    if (!date) return this.translateService.instant('table.noDate');

    const start = dayjs(date);
    const now = dayjs();

    const years = now.diff(start, 'year');
    const months = now.diff(start.add(years, 'year'), 'month');
    const weeks = now.diff(start.add(years, 'year').add(months, 'month'), 'week');
    const days = now.diff(start.add(years, 'year').add(months, 'month').add(weeks, 'week'), 'day');
    const hours = now.diff(
      start.add(years, 'year').add(months, 'month').add(weeks, 'week').add(days, 'day'),
      'hour',
    );

    if (years > 0)
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? months + ' month' + (months > 1 ? 's' : '') : ''}`;
    if (months > 0)
      return `${months} month${months > 1 ? 's' : ''} ${weeks > 0 ? weeks + ' week' + (weeks > 1 ? 's' : '') : ''}`;
    if (weeks > 0)
      return `${weeks} week${weeks > 1 ? 's' : ''} ${days > 0 ? days + ' day' + (days > 1 ? 's' : '') : ''}`;
    if (days > 0)
      return `${days} day${days > 1 ? 's' : ''} ${hours > 0 ? hours + ' hour' + (hours > 1 ? 's' : '') : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
}
