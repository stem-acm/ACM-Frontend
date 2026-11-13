import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import { debounceTime, Subject, Subscription } from 'rxjs';
import {
  AUDIT_LOG_ENTITIES,
  AUDIT_LOG_TYPES,
  AuditLog,
  AuditLogEntity,
  AuditLogType,
} from '@/app/interfaces/audit-log';
import { AuditLogService } from '@/app/services/audit-log.service';
import { AuditActionFamily, AuditDetail, AuditLogText } from '@/app/utils/audit-log.util';
import { DateUtil } from '@/app/utils/date.util';
import { ZardButtonComponent } from '@/shared/components/button';

export interface AuditAccount {
  id: number;
  username: string;
  role: string;
}

interface AuditLogRow {
  log: AuditLog;
  date: string;
  actorRole: string;
  family: AuditActionFamily;
  record: string;
  kind: string;
  parentKind: string;
  sentence: string;
  detail: AuditDetail;
}

/** Entity of each log type: the part before the dot, as a table name. */
const TYPE_ENTITY: Record<string, AuditLogEntity> = {
  user: 'users',
  role_policy: 'role_policies',
  member: 'members',
  activity: 'activities',
  checkin: 'checkins',
  volunteer: 'volunteers',
  book_loan: 'book_loans',
};

export function entityOfType(type: AuditLogType): AuditLogEntity {
  return TYPE_ENTITY[type.split('.')[0]];
}

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, TranslateModule, ZardButtonComponent],
  templateUrl: './audit-log.component.html',
  styleUrls: ['../settings.component.css', './audit-log.component.css'],
})
export class AuditLogComponent implements OnInit {
  private service = inject(AuditLogService);
  private text = inject(AuditLogText);
  private dateUtil = inject(DateUtil);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);
  private searchChanges = new Subject<void>();
  private request?: Subscription;

  /** Accounts for the "Done by" filter. */
  @Input() accounts: AuditAccount[] = [];

  readonly pageSize = 25;
  readonly entities = AUDIT_LOG_ENTITIES;

  search = '';
  entity: AuditLogEntity | '' = '';
  type: AuditLogType | '' = '';
  actorId: number | null = null;
  from = '';
  to = '';

  state: 'loading' | 'ready' | 'error' = 'loading';
  logs: AuditLog[] = [];
  rows: AuditLogRow[] = [];
  total = 0;
  page = 0;
  expanded = new Set<number>();

  ngOnInit(): void {
    this.searchChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyFilters());
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => (this.rows = this.logs.map(log => this.toRow(log))));
    this.load();
  }

  /** Log types of the selected entity (all types without an entity filter). */
  get typeGroups(): { entity: AuditLogEntity; types: AuditLogType[] }[] {
    return AUDIT_LOG_ENTITIES.filter(entity => !this.entity || entity === this.entity).map(
      entity => ({ entity, types: AUDIT_LOG_TYPES.filter(type => entityOfType(type) === entity) }),
    );
  }

  get hasFilters(): boolean {
    return !!(
      this.search.trim() ||
      this.entity ||
      this.type ||
      this.actorId ||
      this.from ||
      this.to
    );
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get firstShown(): number {
    return this.total === 0 ? 0 : this.page * this.pageSize + 1;
  }

  get lastShown(): number {
    return Math.min(this.total, (this.page + 1) * this.pageSize);
  }

  get actorName(): string {
    return this.accounts.find(account => account.id === this.actorId)?.username ?? '';
  }

  get period(): string {
    const format = (day: string) => (day ? this.dateUtil.formatDateShort(day) : '…');
    return `${format(this.from)} - ${format(this.to)}`;
  }

  entityName(entity: AuditLogEntity): string {
    return this.text.entityName(entity);
  }

  roleName(role: string): string {
    return this.text.roleName(role);
  }

  searchChanged(): void {
    this.searchChanges.next();
  }

  entityChanged(): void {
    if (this.type && this.entity && entityOfType(this.type) !== this.entity) this.type = '';
    this.applyFilters();
  }

  applyFilters(): void {
    this.page = 0;
    this.load();
  }

  clear(filter: 'search' | 'entity' | 'type' | 'actorId' | 'period'): void {
    if (filter === 'search') this.search = '';
    if (filter === 'entity') this.entity = '';
    if (filter === 'type') this.type = '';
    if (filter === 'actorId') this.actorId = null;
    if (filter === 'period') {
      this.from = '';
      this.to = '';
    }
    this.applyFilters();
  }

  clearAll(): void {
    this.search = '';
    this.entity = '';
    this.type = '';
    this.actorId = null;
    this.from = '';
    this.to = '';
    this.applyFilters();
  }

  goTo(page: number): void {
    if (page < 0 || page >= this.pageCount) return;
    this.page = page;
    this.load();
  }

  toggle(id: number): void {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
  }

  load(): void {
    this.state = 'loading';
    this.request?.unsubscribe();
    this.request = this.service
      .getLogs({
        offset: this.page * this.pageSize,
        limit: this.pageSize,
        search: this.search,
        entity: this.entity,
        type: this.type,
        actorId: this.actorId,
        // The period is in the admin's time zone: send the bounds of the local days.
        from: this.from ? dayjs(this.from).startOf('day').toISOString() : undefined,
        to: this.to ? dayjs(this.to).endOf('day').toISOString() : undefined,
      })
      .subscribe({
        next: result => {
          this.logs = result.data;
          this.rows = result.data.map(log => this.toRow(log));
          this.total = result.pagination?.total ?? result.data.length;
          this.expanded.clear();
          this.state = 'ready';
        },
        error: () => (this.state = 'error'),
      });
  }

  private toRow(log: AuditLog): AuditLogRow {
    return {
      log,
      date: this.text.formatDate(log),
      actorRole: this.text.roleName(log.actorRole),
      family: this.text.actionFamily(log.type),
      record: this.text.recordLabel(log),
      kind: this.text.entityName(log.entity),
      parentKind: log.parentEntity ? this.text.parentKind(log.parentEntity) : '',
      sentence: this.text.sentence(log),
      detail: this.text.detail(log),
    };
  }
}
