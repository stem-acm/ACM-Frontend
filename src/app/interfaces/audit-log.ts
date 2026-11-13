export const AUDIT_LOG_TYPES = [
  'user.created',
  'user.profile_updated',
  'user.password_changed',
  'user.role_changed',
  'user.activation_changed',
  'role_policy.created',
  'role_policy.permissions_changed',
  'role_policy.activation_changed',
  'member.created',
  'member.updated',
  'member.deleted',
  'activity.created',
  'activity.updated',
  'activity.deleted',
  'checkin.deleted',
  'checkin.cascade_deleted',
  'volunteer.created',
  'volunteer.updated',
  'volunteer.deleted',
  'volunteer.cascade_deleted',
  'book_loan.created',
  'book_loan.updated',
  'book_loan.returned',
] as const;
export type AuditLogType = (typeof AUDIT_LOG_TYPES)[number];

export const AUDIT_LOG_ENTITIES = [
  'members',
  'activities',
  'checkins',
  'volunteers',
  'book_loans',
  'users',
  'role_policies',
] as const;
export type AuditLogEntity = (typeof AUDIT_LOG_ENTITIES)[number];

export interface AuditFieldChange {
  before: unknown;
  after: unknown;
}

export interface AuditLog {
  id: number;
  createdAt: string;
  actorId: number;
  actorUsername: string;
  actorRole: string;
  type: AuditLogType;
  entity: AuditLogEntity;
  entityId: string;
  entityLabel: string;
  parentEntity: AuditLogEntity | null;
  parentId: string | null;
  parentLabel: string | null;
  /** For an update: `{ field: { before, after } }`. For an insert and a delete: the full row. */
  changes: Record<string, unknown>;
}

/** Query parameters of `GET /api/settings/logs`. */
export interface AuditLogQuery {
  offset: number;
  limit: number;
  search?: string;
  entity?: AuditLogEntity | '';
  type?: AuditLogType | '';
  actorId?: number | null;
  /** ISO 8601 date-time. */
  from?: string;
  /** ISO 8601 date-time, included. */
  to?: string;
}
