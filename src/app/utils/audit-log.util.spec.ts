import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import {
  AUDIT_LOG_TYPES,
  AuditLog,
  AuditLogEntity,
  AuditLogType,
} from '@/app/interfaces/audit-log';
import { AuditLogText, VOLUNTEER_WITHOUT_MEMBER_LABEL } from './audit-log.util';

const CHECK_IN = '2026-11-10T06:30:00.000Z';

function row(
  type: AuditLogType,
  entity: AuditLogEntity,
  changes: Record<string, unknown>,
  extra: Partial<AuditLog> = {},
): AuditLog {
  return {
    id: 1,
    createdAt: '2026-11-13T07:42:00.000Z',
    actorId: 1,
    actorUsername: 'hery',
    actorRole: 'admin',
    type,
    entity,
    entityId: '7',
    entityLabel: 'label',
    parentEntity: null,
    parentId: null,
    parentLabel: null,
    changes,
    ...extra,
  };
}

const change = (before: unknown, after: unknown) => ({ before, after });

/** One log row for each of the 23 log types, with its expected English sentence. */
function cases(): [AuditLog, string][] {
  const checkIn = dayjs(CHECK_IN).format('DD / MM / YYYY, HH:mm');
  return [
    [row('user.created', 'users', { id: 7, role: 'intern' }), 'Account created with role Intern'],
    [
      row('user.profile_updated', 'users', {
        username: change('tiana', 'tiana2'),
        email: change('a@x.mg', 'b@x.mg'),
      }),
      'Changed: Username, Email',
    ],
    [row('user.password_changed', 'users', {}), 'Password changed'],
    [
      row('user.role_changed', 'users', { role: change('intern', 'volunteer') }),
      'Role: Intern to Volunteer',
    ],
    [
      row('user.activation_changed', 'users', { active: change(true, false) }),
      'Status: Active to Inactive',
    ],
    [
      row('role_policy.created', 'role_policies', { 'members.delete': change(false, true) }),
      'First save, 1 permission differs from the defaults',
    ],
    [
      row('role_policy.permissions_changed', 'role_policies', {
        'members.delete': change(true, false),
        'books.update': change(false, true),
        'checkins.delete': change(true, false),
      }),
      '3 permissions changed: 1 granted, 2 removed',
    ],
    [
      row('role_policy.activation_changed', 'role_policies', { active: change(true, false) }),
      'Role status: Active to Inactive',
    ],
    [row('member.created', 'members', { firstName: 'Kanto' }), 'New member'],
    [
      row('member.updated', 'members', {
        phoneNumber: change('034', '032'),
        occupation: change('student', 'employee'),
      }),
      '2 fields changed: Occupation, Phone Number',
    ],
    [row('member.deleted', 'members', { firstName: 'Tojo' }), 'Member removed'],
    [
      row('activity.created', 'activities', { startTime: '14:00:00', endTime: '16:00:00' }),
      'New activity, 14:00 to 16:00',
    ],
    [
      row('activity.updated', 'activities', { dayOfWeek: change('monday', 'friday') }),
      '1 field changed: Day of Week',
    ],
    [row('activity.deleted', 'activities', { name: 'Chess' }), 'Activity removed'],
    [
      row('checkin.deleted', 'checkins', { checkInTime: CHECK_IN }),
      `Check-in of ${checkIn} removed`,
    ],
    [
      row(
        'checkin.cascade_deleted',
        'checkins',
        { checkInTime: CHECK_IN },
        { parentEntity: 'activities', parentId: '4', parentLabel: 'English Club' },
      ),
      `Check-in of ${checkIn} removed with activity English Club`,
    ],
    [row('volunteer.created', 'volunteers', { id: 3 }), 'New volunteer'],
    [
      row('volunteer.updated', 'volunteers', {
        joinDate: change(null, '2026-01-01'),
        expirationDate: change(null, '2027-01-01'),
      }),
      '2 fields changed: Join date, Expiration Date',
    ],
    [row('volunteer.deleted', 'volunteers', { id: 3 }), 'Volunteer removed'],
    [
      row(
        'volunteer.cascade_deleted',
        'volunteers',
        { id: 3 },
        { parentEntity: 'members', parentId: '188', parentLabel: 'RANDRIA Tojo' },
      ),
      'Volunteer removed with member RANDRIA Tojo',
    ],
    [
      row('book_loan.created', 'book_loans', {
        borrowingDate: '2026-11-13',
        expectedReturnDate: '2026-11-27',
      }),
      'Lent on 13 / 11 / 2026, due 27 / 11 / 2026',
    ],
    [
      row('book_loan.updated', 'book_loans', { bookTitle: change('A', 'B') }),
      '1 field changed: Book title',
    ],
    [
      row('book_loan.returned', 'book_loans', {
        effectiveReturnDate: change(null, '2026-11-13'),
      }),
      'Returned on 13 / 11 / 2026',
    ],
  ];
}

async function loadTranslations(translate: TranslateService, lang: string): Promise<void> {
  const response = await fetch(`/assets/i18n/${lang}.json`);
  translate.setTranslation(lang, await response.json());
}

describe('AuditLogText', () => {
  let text: AuditLogText;
  let translate: TranslateService;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    translate = TestBed.inject(TranslateService);
    for (const lang of ['en', 'fr', 'mg']) await loadTranslations(translate, lang);
    translate.use('en');
    text = TestBed.inject(AuditLogText);
  });

  it('covers the 23 log types', () => {
    expect(cases().map(([log]) => log.type)).toEqual([...AUDIT_LOG_TYPES]);
  });

  for (const type of AUDIT_LOG_TYPES) {
    it(`writes the sentence of ${type}`, () => {
      const [log, expected] = cases().find(([item]) => item.type === type)!;
      expect(text.sentence(log)).toBe(expected);
    });
  }

  it('has a translated sentence and type name for each log type in fr and mg', () => {
    for (const lang of ['fr', 'mg']) {
      translate.use(lang);
      for (const [log] of cases()) {
        const sentence = text.sentence(log);
        expect(sentence).not.toContain('auditLog.');
        expect(sentence).not.toContain('{{');
        expect(translate.instant(`auditLog.types.${log.type}`)).not.toContain('auditLog.');
      }
    }
  });

  it('uses the plural form for French counts', () => {
    translate.use('fr');
    const [single] = cases().find(([log]) => log.type === 'activity.updated')!;
    const [several] = cases().find(([log]) => log.type === 'member.updated')!;
    expect(text.sentence(single)).toBe('1 champ modifié : Jour de la semaine');
    expect(text.sentence(several)).toBe('2 champs modifiés : Profession, Numéro de téléphone');
  });

  it('formats roles, statuses, permissions, days and dates', () => {
    expect(text.formatValue('users', 'role', 'volunteer')).toBe('Volunteer');
    expect(text.formatValue('role_policies', 'active', false)).toBe('Inactive');
    expect(text.fieldLabel('role_policies', 'checkins.view')).toBe(
      'Check-ins - History and live updates',
    );
    expect(text.formatValue('role_policies', 'members.delete', true)).toBe('Allowed');
    expect(text.formatValue('activities', 'dayOfWeek', 'wednesday')).toBe('Wednesday');
    expect(text.formatValue('members', 'joinDate', '2026-02-03')).toBe('03 / 02 / 2026');
    expect(text.formatValue('members', 'phoneNumber', null)).toBe('Empty');
    expect(text.fieldLabel('members', 'unknownColumn')).toBe('unknownColumn');
  });

  it('chooses the badge family and the detail of each log row', () => {
    expect(text.actionFamily('member.created')).toBe('create');
    expect(text.actionFamily('book_loan.returned')).toBe('update');
    expect(text.actionFamily('member.deleted')).toBe('delete');
    expect(text.actionFamily('checkin.cascade_deleted')).toBe('cascade');

    const [password] = cases().find(([log]) => log.type === 'user.password_changed')!;
    expect(text.detail(password)).toEqual({ mode: 'password' });

    const [updated] = cases().find(([log]) => log.type === 'member.updated')!;
    expect(text.detail(updated)).toEqual({
      mode: 'diff',
      rows: [
        { label: 'Occupation', before: 'student', after: 'employee' },
        { label: 'Phone Number', before: '034', after: '032' },
      ],
    });

    const [created] = cases().find(([log]) => log.type === 'role_policy.created')!;
    expect(text.detail(created).mode).toBe('diff');
    const [deleted] = cases().find(([log]) => log.type === 'member.deleted')!;
    expect(text.detail(deleted)).toEqual({
      mode: 'snapshot',
      rows: [{ label: 'First Name', value: 'Tojo' }],
    });
  });

  it('translates the fixed labels the server writes', () => {
    expect(
      text.recordLabel(row('role_policy.created', 'role_policies', {}, { entityLabel: 'intern' })),
    ).toBe('Intern');
    expect(
      text.recordLabel(
        row('volunteer.created', 'volunteers', {}, { entityLabel: VOLUNTEER_WITHOUT_MEMBER_LABEL }),
      ),
    ).toBe('Volunteer without member');
  });
});
