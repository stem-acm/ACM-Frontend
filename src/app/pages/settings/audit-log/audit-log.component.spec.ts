import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  AUDIT_LOG_ENTITIES,
  AUDIT_LOG_TYPES,
  AuditLog,
  AuditLogQuery,
  AuditLogType,
} from '@/app/interfaces/audit-log';
import { AuditLogService } from '@/app/services/audit-log.service';
import { HttpResult } from '@/app/types/httpResult';
import { AuditLogComponent, entityOfType } from './audit-log.component';

type Result = HttpResult<AuditLog[]>;

function log(id: number, type: AuditLogType, extra: Partial<AuditLog> = {}): AuditLog {
  return {
    id,
    createdAt: '2026-11-13T07:42:00.000Z',
    actorId: 1,
    actorUsername: 'hery',
    actorRole: 'admin',
    type,
    entity: entityOfType(type),
    entityId: String(id),
    entityLabel: `Record ${id}`,
    parentEntity: null,
    parentId: null,
    parentLabel: null,
    changes: {},
    ...extra,
  };
}

function result(data: AuditLog[], total = data.length): Result {
  return {
    success: true,
    message: 'Audit logs',
    data,
    pagination: { offset: 0, limit: 25, total, hasMore: false },
  };
}

const SAMPLE = [
  log(4, 'member.updated', { changes: { phoneNumber: { before: '034', after: '032' } } }),
  log(3, 'member.deleted'),
  log(2, 'checkin.cascade_deleted', {
    parentEntity: 'members',
    parentId: '3',
    parentLabel: 'RAKOTO Miora',
  }),
  log(1, 'member.created', { changes: { firstName: 'Miora' } }),
];

describe('AuditLogComponent', () => {
  let fixture: ComponentFixture<AuditLogComponent>;
  let component: AuditLogComponent;
  let queries: AuditLogQuery[];
  let respond: (query: AuditLogQuery) => Observable<Result>;

  const element = (): HTMLElement => fixture.nativeElement;
  const all = <T extends Element>(selector: string) =>
    Array.from(element().querySelectorAll<T>(selector));
  const lastQuery = () => queries[queries.length - 1];
  const paginationButtons = () => all<HTMLButtonElement>('.audit-pagination-controls button');

  beforeEach(async () => {
    queries = [];
    respond = () => of(result(SAMPLE));
    await TestBed.configureTestingModule({
      imports: [AuditLogComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: AuditLogService,
          useValue: {
            getLogs: (query: AuditLogQuery) => {
              queries.push(query);
              return respond(query);
            },
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AuditLogComponent);
    component = fixture.componentInstance;
  });

  it('knows the entity of each of the 23 log types', () => {
    expect(AUDIT_LOG_TYPES.length).toBe(23);
    for (const type of AUDIT_LOG_TYPES) {
      expect(AUDIT_LOG_ENTITIES).toContain(entityOfType(type));
    }
    expect(entityOfType('role_policy.permissions_changed')).toBe('role_policies');
    expect(entityOfType('book_loan.returned')).toBe('book_loans');
    expect(entityOfType('checkin.cascade_deleted')).toBe('checkins');
  });

  it('loads the first page of 25 without a filter, then shows one row for each log', () => {
    fixture.detectChanges();

    expect(queries.length).toBe(1);
    expect(queries[0].offset).toBe(0);
    expect(queries[0].limit).toBe(25);
    expect(queries[0].search).toBe('');
    expect(queries[0].entity).toBe('');
    expect(queries[0].type).toBe('');
    expect(queries[0].actorId).toBeNull();
    expect(queries[0].from).toBeUndefined();
    expect(queries[0].to).toBeUndefined();

    expect(component.state).toBe('ready');
    expect(component.total).toBe(4);
    expect(component.hasFilters).toBeFalse();
    expect(all('tr.audit-row').length).toBe(4);
  });

  it('gives each row the badge of its action family', () => {
    fixture.detectChanges();

    const badges = all('tr.audit-row .audit-badge').map(badge => badge.className);
    expect(badges).toEqual([
      'audit-badge audit-badge--update',
      'audit-badge audit-badge--delete',
      'audit-badge audit-badge--cascade',
      'audit-badge audit-badge--create',
    ]);
  });

  it('shows the actor, the record and its id in each row', () => {
    fixture.detectChanges();

    const first = all<HTMLElement>('tr.audit-row')[0];
    expect(first.textContent).toContain('hery');
    expect(first.textContent).toContain('Record 4');
    expect(first.textContent).toContain('#4');
  });

  it('shows the loading state until the answer arrives', () => {
    const pending = new Subject<Result>();
    respond = () => pending;
    fixture.detectChanges();

    expect(component.state).toBe('loading');
    expect(element().querySelector('.audit-spinner')).not.toBeNull();
    expect(all('tr.audit-row').length).toBe(0);

    pending.next(result(SAMPLE));
    fixture.detectChanges();

    expect(component.state).toBe('ready');
    expect(element().querySelector('.audit-spinner')).toBeNull();
    expect(all('tr.audit-row').length).toBe(4);
  });

  it('shows an error with a retry button, and the retry loads the list', () => {
    respond = () => throwError(() => new Error('offline'));
    fixture.detectChanges();

    expect(component.state).toBe('error');
    const alert = element().querySelector<HTMLElement>('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(all('tr.audit-row').length).toBe(0);

    respond = () => of(result(SAMPLE));
    alert?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(queries.length).toBe(2);
    expect(component.state).toBe('ready');
    expect(all('tr.audit-row').length).toBe(4);
  });

  it('says that nothing is recorded when the list is empty without a filter', () => {
    respond = () => of(result([]));
    fixture.detectChanges();

    const state = element().querySelector<HTMLElement>('.acm-list-state');
    expect(state?.textContent).toContain('auditLog.nothingYet');
    expect(state?.querySelector('button')).toBeNull();
    expect(element().querySelector('.audit-pagination')).toBeNull();
  });

  it('offers to clear the filters when they match no row', () => {
    respond = query => of(result(query.search ? [] : SAMPLE));
    fixture.detectChanges();
    component.search = 'nobody';
    component.applyFilters();
    fixture.detectChanges();

    const state = element().querySelector<HTMLElement>('.acm-list-state');
    expect(state?.textContent).toContain('ux.noMatches');

    state?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(component.search).toBe('');
    expect(component.hasFilters).toBeFalse();
    expect(all('tr.audit-row').length).toBe(4);
  });

  it('waits 300 ms after the last key before it searches', fakeAsync(() => {
    fixture.detectChanges();
    component.search = 'rak';
    component.searchChanged();
    tick(200);
    component.search = 'rakoto';
    component.searchChanged();
    tick(299);
    expect(queries.length).toBe(1);

    tick(1);
    expect(queries.length).toBe(2);
    expect(lastQuery().search).toBe('rakoto');
  }));

  it('sends each filter and goes back to the first page', () => {
    respond = () => of(result(SAMPLE, 60));
    fixture.detectChanges();
    component.goTo(1);
    expect(lastQuery().offset).toBe(25);

    component.entity = 'members';
    component.entityChanged();
    expect(component.page).toBe(0);
    expect(lastQuery().offset).toBe(0);
    expect(lastQuery().entity).toBe('members');

    component.type = 'member.updated';
    component.actorId = 7;
    component.applyFilters();
    expect(lastQuery().type).toBe('member.updated');
    expect(lastQuery().actorId).toBe(7);
    expect(component.hasFilters).toBeTrue();
  });

  it('sends the period as the bounds of the local days', () => {
    fixture.detectChanges();
    component.from = '2026-11-10';
    component.to = '2026-11-13';
    component.applyFilters();

    expect(lastQuery().from).toBe(dayjs('2026-11-10').startOf('day').toISOString());
    expect(lastQuery().to).toBe(dayjs('2026-11-13').endOf('day').toISOString());
    expect(component.period).toContain('10 / 11 / 2026');
    expect(component.period).toContain('13 / 11 / 2026');
  });

  it('writes an open period with a placeholder for the missing day', () => {
    fixture.detectChanges();
    component.from = '2026-11-10';
    component.applyFilters();

    expect(lastQuery().to).toBeUndefined();
    expect(component.period).toBe('10 / 11 / 2026 - …');
  });

  it('lists only the log types of the selected record type', () => {
    fixture.detectChanges();
    expect(component.typeGroups.map(group => group.entity)).toEqual([...AUDIT_LOG_ENTITIES]);
    expect(component.typeGroups.flatMap(group => group.types).length).toBe(23);

    component.entity = 'checkins';
    expect(component.typeGroups).toEqual([
      { entity: 'checkins', types: ['checkin.deleted', 'checkin.cascade_deleted'] },
    ]);
  });

  it('drops a selected type that does not belong to the new record type', () => {
    fixture.detectChanges();
    component.type = 'member.updated';
    component.entity = 'activities';
    component.entityChanged();
    expect(component.type).toBe('');
    expect(lastQuery().type).toBe('');

    component.type = 'activity.deleted';
    component.entityChanged();
    expect(component.type).toBe('activity.deleted');

    component.entity = '';
    component.entityChanged();
    expect(component.type).toBe('activity.deleted');
  });

  it('shows one chip for each active filter and removes one filter at a time', () => {
    component.accounts = [{ id: 7, username: 'fanja', role: 'intern' }];
    fixture.detectChanges();
    component.search = 'rakoto';
    component.entity = 'members';
    component.type = 'member.updated';
    component.actorId = 7;
    component.from = '2026-11-10';
    component.to = '2026-11-13';
    component.applyFilters();
    fixture.detectChanges();

    const chips = () => all('.audit-summary-bar button.acm-btn--secondary');
    expect(chips().length).toBe(5);
    expect(component.actorName).toBe('fanja');

    component.clear('period');
    expect(component.from).toBe('');
    expect(component.to).toBe('');
    expect(lastQuery().from).toBeUndefined();
    component.clear('actorId');
    expect(component.actorId).toBeNull();
    component.clear('type');
    expect(component.type).toBe('');
    component.clear('entity');
    expect(component.entity).toBe('');
    fixture.detectChanges();
    expect(chips().length).toBe(1);

    component.clear('search');
    fixture.detectChanges();
    expect(chips().length).toBe(0);
    expect(component.hasFilters).toBeFalse();
  });

  it('clears every filter at once and reloads the first page', () => {
    respond = () => of(result(SAMPLE, 60));
    fixture.detectChanges();
    component.search = 'rakoto';
    component.entity = 'members';
    component.type = 'member.updated';
    component.actorId = 7;
    component.from = '2026-11-10';
    component.to = '2026-11-13';
    component.applyFilters();
    component.goTo(1);
    const before = queries.length;

    component.clearAll();

    expect(queries.length).toBe(before + 1);
    expect(component.hasFilters).toBeFalse();
    expect(component.page).toBe(0);
    expect(lastQuery().offset).toBe(0);
    expect(lastQuery().search).toBe('');
    expect(lastQuery().entity).toBe('');
    expect(lastQuery().actorId).toBeNull();
  });

  it('lists the accounts in the "Done by" filter', () => {
    component.accounts = [
      { id: 1, username: 'hery', role: 'admin' },
      { id: 7, username: 'fanja', role: 'intern' },
    ];
    fixture.detectChanges();

    const options = all<HTMLOptionElement>('select[name="audit-actor"] option');
    expect(options.length).toBe(3);
    expect(options[1].textContent).toContain('hery');
    expect(options[2].textContent).toContain('fanja');
  });

  it('computes the page count and the shown range from the total', () => {
    respond = () => of(result(SAMPLE, 60));
    fixture.detectChanges();

    expect(component.pageCount).toBe(3);
    expect(component.firstShown).toBe(1);
    expect(component.lastShown).toBe(25);

    component.goTo(2);
    expect(lastQuery().offset).toBe(50);
    expect(component.firstShown).toBe(51);
    expect(component.lastShown).toBe(60);
  });

  it('shows one page and a range of 0 when there is no row', () => {
    respond = () => of(result([]));
    fixture.detectChanges();

    expect(component.pageCount).toBe(1);
    expect(component.firstShown).toBe(0);
    expect(component.lastShown).toBe(0);
  });

  it('uses the number of rows as the total when the answer has no pagination', () => {
    respond = () => of({ success: true, message: '', data: SAMPLE });
    fixture.detectChanges();

    expect(component.total).toBe(4);
  });

  it('ignores a page before the first one and after the last one', () => {
    respond = () => of(result(SAMPLE, 60));
    fixture.detectChanges();

    component.goTo(-1);
    component.goTo(3);

    expect(queries.length).toBe(1);
    expect(component.page).toBe(0);
  });

  it('disables Previous on the first page and Next on the last page', () => {
    respond = () => of(result(SAMPLE, 60));
    fixture.detectChanges();

    let [previous, next] = paginationButtons();
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();
    [previous, next] = paginationButtons();
    expect(component.page).toBe(1);
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeFalse();

    next.click();
    fixture.detectChanges();
    [previous, next] = paginationButtons();
    expect(component.page).toBe(2);
    expect(previous.disabled).toBeFalse();
    expect(next.disabled).toBeTrue();

    previous.click();
    expect(component.page).toBe(1);
    expect(lastQuery().offset).toBe(25);
  });

  it('disables both buttons when there is one page', () => {
    fixture.detectChanges();

    const [previous, next] = paginationButtons();
    expect(previous.disabled).toBeTrue();
    expect(next.disabled).toBeTrue();
  });

  it('opens the detail of a row on a click and closes it on a second click', () => {
    fixture.detectChanges();
    const row = () => all<HTMLElement>('tr.audit-row')[0];
    const toggle = () => row().querySelector<HTMLButtonElement>('.audit-toggle');
    expect(element().querySelector('.audit-detail-cell')).toBeNull();
    expect(toggle()?.getAttribute('aria-expanded')).toBe('false');

    row().click();
    fixture.detectChanges();
    const detail = element().querySelector<HTMLElement>('.audit-detail-cell');
    expect(detail?.textContent).toContain('member.updated');
    expect(detail?.querySelector('.audit-before')?.textContent).toContain('034');
    expect(detail?.querySelector('.audit-after')?.textContent).toContain('032');
    expect(toggle()?.getAttribute('aria-expanded')).toBe('true');
    expect(row().classList).toContain('is-open');

    // The button toggles once: its click does not also reach the row.
    toggle()?.click();
    fixture.detectChanges();
    expect(element().querySelector('.audit-detail-cell')).toBeNull();
    expect(component.expanded.size).toBe(0);
  });

  it('keeps several rows open and closes them when the list is loaded again', () => {
    fixture.detectChanges();
    component.toggle(4);
    component.toggle(1);
    fixture.detectChanges();
    expect(all('.audit-detail-cell').length).toBe(2);

    component.load();
    fixture.detectChanges();
    expect(component.expanded.size).toBe(0);
    expect(all('.audit-detail-cell').length).toBe(0);
  });

  it('names the parent in the detail of a cascade log', () => {
    fixture.detectChanges();
    component.toggle(2);
    fixture.detectChanges();

    const detail = element().querySelector<HTMLElement>('.audit-detail-cell');
    expect(detail?.textContent).toContain('checkin.cascade_deleted');
    expect(detail?.textContent).toContain('auditLog.detail.parentLine');
    expect(component.rows[2].parentKind).not.toBe('');
    expect(component.rows[0].parentKind).toBe('');
  });

  it('shows a sentence and no table in the detail of a password change', () => {
    respond = () => of(result([log(9, 'user.password_changed')]));
    fixture.detectChanges();
    component.toggle(9);
    fixture.detectChanges();

    const detail = element().querySelector<HTMLElement>('.audit-detail-cell');
    expect(detail?.textContent).toContain('auditLog.detail.passwordNote');
    expect(detail?.querySelector('table')).toBeNull();
  });

  it('ignores the answer of a request that a newer request replaced', () => {
    const first = new Subject<Result>();
    const second = new Subject<Result>();
    const answers = [first, second];
    respond = () => answers.shift() as Subject<Result>;
    fixture.detectChanges();
    component.search = 'rakoto';
    component.applyFilters();

    first.next(result(SAMPLE));
    expect(component.state).toBe('loading');
    expect(component.rows.length).toBe(0);

    second.next(result([SAMPLE[0]]));
    expect(component.state).toBe('ready');
    expect(component.rows.length).toBe(1);
  });

  it('writes the rows again in the new language without a new request', () => {
    fixture.detectChanges();
    expect(component.rows[3].sentence).toBe('auditLog.sentences.member.created');

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('fr', {
      auditLog: { sentences: { member: { created: 'Nouveau membre' } } },
    });
    translate.use('fr');

    expect(component.rows[3].sentence).toBe('Nouveau membre');
    expect(queries.length).toBe(1);
  });
});
