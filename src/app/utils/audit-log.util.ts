import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs';
import {
  AuditFieldChange,
  AuditLog,
  AuditLogEntity,
  AuditLogType,
} from '@/app/interfaces/audit-log';
import { DateUtil } from '@/app/utils/date.util';

/** Translation key of each column, for each entity. A column that is not here shows its name. */
export const AUDIT_FIELD_KEYS: Record<AuditLogEntity, Record<string, string>> = {
  users: {
    id: 'forms.id',
    username: 'forms.username',
    email: 'forms.email',
    role: 'forms.role',
    active: 'access.status',
    createdAt: 'forms.createdAt',
    updatedAt: 'forms.updatedAt',
  },
  role_policies: {
    role: 'forms.role',
    active: 'access.status',
    updatedAt: 'forms.updatedAt',
  },
  members: {
    registrationNumber: 'forms.registrationNumber',
    title: 'forms.title',
    firstName: 'forms.firstName',
    lastName: 'forms.lastName',
    gender: 'forms.gender',
    birthDate: 'forms.birthday',
    birthPlace: 'forms.placeOfBirth',
    address: 'forms.address',
    occupation: 'forms.occupation',
    phoneNumber: 'forms.phoneNumber',
    studyOrWorkPlace: 'forms.placeOfWorkStudy',
    joinDate: 'forms.joinDate',
    profileImage: 'forms.profileImage',
    createdAt: 'forms.createdAt',
    updatedAt: 'forms.updatedAt',
  },
  activities: {
    id: 'forms.id',
    name: 'forms.activityName',
    description: 'forms.description',
    image: 'forms.image',
    emoji: 'forms.activityEmoji',
    isPeriodic: 'forms.periodic',
    dayOfWeek: 'forms.dayOfWeek',
    startTime: 'forms.startTime',
    endTime: 'forms.endTime',
    startDate: 'forms.startDate',
    endDate: 'forms.endDate',
    createdBy: 'forms.createdBy',
    createdAt: 'forms.createdAt',
    updatedAt: 'forms.updatedAt',
  },
  checkins: {
    id: 'forms.id',
    registrationNumber: 'forms.registrationNumber',
    activityId: 'forms.activityId',
    checkInTime: 'forms.checkInTime',
    checkOutTime: 'forms.checkOutTime',
    visitReason: 'forms.visitReason',
    createdAt: 'forms.createdAt',
    updatedAt: 'forms.updatedAt',
  },
  volunteers: {
    id: 'forms.id',
    registrationNumber: 'forms.registrationNumber',
    role: 'forms.role',
    joinDate: 'forms.joinDate',
    expirationDate: 'forms.expirationDate',
    createdBy: 'forms.createdBy',
    createdAt: 'forms.createdAt',
    updatedAt: 'forms.updatedAt',
  },
  book_loans: {
    id: 'forms.id',
    registrationNumber: 'forms.registrationNumber',
    bookTitle: 'forms.bookTitle',
    borrowingDate: 'forms.borrowingDate',
    expectedReturnDate: 'forms.expectedReturnDate',
    effectiveReturnDate: 'forms.effectiveReturnDate',
    createdBy: 'forms.createdBy',
    createdAt: 'forms.createdAt',
    updatedAt: 'forms.updatedAt',
  },
};

/** Group and action of each permission (`access.groups.*`, `access.actions.*`). */
export const PERMISSION_KEYS: Record<string, [group: string, action: string]> = {
  'profile.edit': ['profile', 'editOwnProfile'],
  'dashboard.view': ['dashboard', 'view'],
  'members.view': ['members', 'view'],
  'members.create': ['members', 'create'],
  'members.update': ['members', 'update'],
  'members.delete': ['members', 'delete'],
  'members.cards': ['members', 'cards'],
  'volunteers.view': ['volunteers', 'view'],
  'volunteers.create': ['volunteers', 'create'],
  'volunteers.update': ['volunteers', 'update'],
  'volunteers.delete': ['volunteers', 'delete'],
  'volunteers.certificate': ['volunteers', 'certificate'],
  'activities.view': ['activities', 'view'],
  'activities.create': ['activities', 'create'],
  'activities.update': ['activities', 'update'],
  'activities.delete': ['activities', 'delete'],
  'checkins.create': ['checkins', 'create'],
  'checkins.view': ['checkins', 'history'],
  'checkins.delete': ['checkins', 'delete'],
  'books.view': ['books', 'view'],
  'books.create': ['books', 'create'],
  'books.update': ['books', 'update'],
  'settings.manage': ['settings', 'manage'],
};

/** Label that the server writes for a volunteer row without a member. */
export const VOLUNTEER_WITHOUT_MEMBER_LABEL = 'Volunteer without member';

const DATE_FIELDS = new Set([
  'birthDate',
  'joinDate',
  'startDate',
  'endDate',
  'expirationDate',
  'borrowingDate',
  'expectedReturnDate',
  'effectiveReturnDate',
]);
const DATE_TIME_FIELDS = new Set(['createdAt', 'updatedAt', 'checkInTime', 'checkOutTime']);
const TIME_FIELDS = new Set(['startTime', 'endTime']);

export type AuditActionFamily = 'create' | 'update' | 'delete' | 'cascade';

export interface AuditDetailRow {
  label: string;
  before?: string | null;
  after?: string | null;
  value?: string | null;
}

export type AuditDetail =
  | { mode: 'diff'; rows: AuditDetailRow[] }
  | { mode: 'snapshot'; rows: AuditDetailRow[] }
  | { mode: 'password' };

function isChange(value: unknown): value is AuditFieldChange {
  return typeof value === 'object' && value !== null && 'before' in value && 'after' in value;
}

/** Writes the text of a log row in the language of the admin. */
@Injectable({ providedIn: 'root' })
export class AuditLogText {
  private translate = inject(TranslateService);
  private dateUtil = inject(DateUtil);

  private t(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  actionFamily(type: AuditLogType): AuditActionFamily {
    if (type.endsWith('.cascade_deleted')) return 'cascade';
    if (type.endsWith('.deleted')) return 'delete';
    if (type.endsWith('.created')) return 'create';
    return 'update';
  }

  /** Name of a column of an entity. */
  fieldLabel(entity: AuditLogEntity, field: string): string {
    if (entity === 'role_policies' && PERMISSION_KEYS[field]) {
      const [group, action] = PERMISSION_KEYS[field];
      return `${this.t(`access.groups.${group}`)} - ${this.t(`access.actions.${action}`)}`;
    }
    const key = AUDIT_FIELD_KEYS[entity]?.[field];
    return key ? this.t(key) : field;
  }

  /** A value of a column, as the screen shows it. */
  formatValue(entity: AuditLogEntity, field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return this.t('auditLog.empty');
    if (field === 'role' && (entity === 'users' || entity === 'role_policies')) {
      return this.t(`access.roles.${value}`);
    }
    if (field === 'active') return this.t(value ? 'access.active' : 'access.inactive');
    if (entity === 'role_policies' && PERMISSION_KEYS[field]) {
      return this.t(value ? 'auditLog.allowed' : 'auditLog.notAllowed');
    }
    if (field === 'dayOfWeek') return this.t(`days.${value}`);
    if (DATE_FIELDS.has(field)) return this.dateUtil.formatDateShort(String(value));
    if (DATE_TIME_FIELDS.has(field)) {
      return `${this.dateUtil.formatDateShort(String(value))}, ${dayjs(String(value)).format('HH:mm')}`;
    }
    if (TIME_FIELDS.has(field)) return String(value).slice(0, 5);
    if (typeof value === 'boolean') return this.t(value ? 'table.yes' : 'table.no');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /** Date and time of the log row. */
  formatDate(log: AuditLog): string {
    return this.formatValue(log.entity, 'createdAt', log.createdAt);
  }

  /** The record name, translated where the server stores a fixed value. */
  recordLabel(log: AuditLog): string {
    if (log.entity === 'role_policies') return this.t(`access.roles.${log.entityLabel}`);
    if (log.entity === 'volunteers' && log.entityLabel === VOLUNTEER_WITHOUT_MEMBER_LABEL) {
      return this.t('auditLog.volunteerWithoutMember');
    }
    return log.entityLabel;
  }

  entityName(entity: AuditLogEntity): string {
    return this.t(`auditLog.entities.${entity}`);
  }

  /** "member" or "activity", as a sentence writes the parent of a cascade log. */
  parentKind(entity: AuditLogEntity): string {
    return this.t(`auditLog.parentKinds.${entity}`);
  }

  roleName(role: string): string {
    return this.t(`access.roles.${role}`);
  }

  private fieldList(log: AuditLog): string {
    return this.orderedFields(log)
      .map(field => this.fieldLabel(log.entity, field))
      .join(', ');
  }

  private change(log: AuditLog, field: string): AuditFieldChange {
    const change = log.changes[field];
    return isChange(change) ? change : { before: null, after: change ?? null };
  }

  private plural(key: string, count: number, params: Record<string, unknown> = {}): string {
    return this.t(`${key}.${count === 1 ? 'one' : 'other'}`, { count, ...params });
  }

  /** The sentence of a log row ("Sentence for each log type" in issue #44). */
  sentence(log: AuditLog): string {
    const key = `auditLog.sentences.${log.type}`;
    const value = (field: string, raw: unknown) => this.formatValue(log.entity, field, raw);
    const transition = (field: string) => {
      const { before, after } = this.change(log, field);
      return { before: value(field, before), after: value(field, after) };
    };
    const count = Object.keys(log.changes).length;

    switch (log.type) {
      case 'user.created':
        return this.t(key, { role: value('role', log.changes['role']) });
      case 'user.profile_updated':
        return this.t(key, { fields: this.fieldList(log) });
      case 'user.role_changed':
        return this.t(key, transition('role'));
      case 'user.activation_changed':
      case 'role_policy.activation_changed':
        return this.t(key, transition('active'));
      case 'role_policy.created':
        return this.plural(key, count);
      case 'role_policy.permissions_changed': {
        const changes = Object.values(log.changes).filter(isChange);
        const granted = changes.filter(change => change.after === true).length;
        return this.plural(key, count, { granted, removed: changes.length - granted });
      }
      case 'member.updated':
      case 'activity.updated':
      case 'volunteer.updated':
      case 'book_loan.updated':
        return this.plural(key, count, { fields: this.fieldList(log) });
      case 'activity.created':
        return this.t(key, {
          startTime: value('startTime', log.changes['startTime']),
          endTime: value('endTime', log.changes['endTime']),
        });
      case 'checkin.deleted':
        return this.t(key, { checkInTime: value('checkInTime', log.changes['checkInTime']) });
      case 'checkin.cascade_deleted':
        return this.t(key, {
          checkInTime: value('checkInTime', log.changes['checkInTime']),
          parentKind: log.parentEntity ? this.parentKind(log.parentEntity) : '',
          parentLabel: log.parentLabel ?? '',
        });
      case 'volunteer.cascade_deleted':
        return this.t(key, { parentLabel: log.parentLabel ?? '' });
      case 'book_loan.created':
        return this.t(key, {
          borrowingDate: value('borrowingDate', log.changes['borrowingDate']),
          expectedReturnDate: value('expectedReturnDate', log.changes['expectedReturnDate']),
        });
      case 'book_loan.returned':
        return this.t(key, {
          effectiveReturnDate: value(
            'effectiveReturnDate',
            this.change(log, 'effectiveReturnDate').after,
          ),
        });
      default:
        // user.password_changed, member.created, member.deleted, activity.deleted,
        // volunteer.created, volunteer.deleted: no placeholder.
        return this.t(key);
    }
  }

  /** The content of the expanded row: a diff, a snapshot, or the password note. */
  detail(log: AuditLog): AuditDetail {
    if (log.type === 'user.password_changed') return { mode: 'password' };
    const fields = this.orderedFields(log);
    const family = this.actionFamily(log.type);
    if (log.type !== 'role_policy.created' && family !== 'update') {
      return {
        mode: 'snapshot',
        rows: fields.map(field => ({
          label: this.fieldLabel(log.entity, field),
          value: this.nullable(log.entity, field, log.changes[field]),
        })),
      };
    }
    return {
      mode: 'diff',
      rows: fields.map(field => {
        const { before, after } = this.change(log, field);
        return {
          label: this.fieldLabel(log.entity, field),
          before: this.nullable(log.entity, field, before),
          after: this.nullable(log.entity, field, after),
        };
      }),
    };
  }

  /** `null` stays `null`, so the screen can show the "Empty" style. */
  private nullable(entity: AuditLogEntity, field: string, value: unknown): string | null {
    return value === null || value === undefined || value === ''
      ? null
      : this.formatValue(entity, field, value);
  }

  /** The columns in form order, then the columns that the map does not know. */
  private orderedFields(log: AuditLog): string[] {
    const known = [
      ...Object.keys(AUDIT_FIELD_KEYS[log.entity] ?? {}),
      ...(log.entity === 'role_policies' ? Object.keys(PERMISSION_KEYS) : []),
    ];
    const fields = Object.keys(log.changes);
    return [
      ...known.filter(field => fields.includes(field)),
      ...fields.filter(field => !known.includes(field)),
    ];
  }
}
