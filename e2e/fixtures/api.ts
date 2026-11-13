import { APIRequestContext, expect, request } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { ADMIN_STORAGE_STATE, API_URL, BASE_URL, TOKEN_STORAGE_KEY } from './env';

export type Role = 'admin' | 'intern' | 'volunteer';

export interface TestAccount {
  id: number;
  username: string;
  email: string;
  password: string;
  role: Role;
}

export interface RolePolicy {
  role: Role;
  active: boolean;
  permissions: Record<string, boolean>;
}

interface ApiResult<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Pagination {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface Page<T> {
  data: T[];
  pagination: Pagination;
}

export type Occupation = 'student' | 'unemployed' | 'employee' | 'entrepreneur';

export interface MemberInput {
  firstName: string;
  lastName: string | null;
  title: 'Miss' | 'Mr' | 'Mrs' | null;
  gender: 'male' | 'female' | null;
  birthDate: string | null;
  birthPlace: string | null;
  address: string | null;
  occupation: Occupation | null;
  phoneNumber: string | null;
  studyOrWorkPlace: string | null;
  joinDate: string | null;
}

export interface Member extends MemberInput {
  registrationNumber: number;
  profileImage: string | null;
}

export interface Activity {
  id: number;
  name: string;
  emoji?: string | null;
}

export interface Checkin {
  id: number;
  registrationNumber: number;
  activityId: number;
  checkInTime: string;
  checkOutTime: string | null;
  Member?: Member | null;
  Activity?: Activity | null;
}

/** A unique, alphanumeric suffix for test data names. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
}

/**
 * A client address unique to the caller (format 10.x.y.z). The API trusts one
 * proxy hop, so a request that carries it as X-Forwarded-For counts against
 * its own rate-limit bucket.
 */
export function uniqueClientIp(): string {
  const [a, b, c] = randomBytes(3);
  return `10.${a}.${b}.${c}`;
}

/** A password that satisfies the register rules: 8+ characters, a letter and a digit. */
export function generatePassword(): string {
  return `Pw${randomBytes(12).toString('hex')}9`;
}

/** Reads the admin JWT from the storage state saved by the setup project. */
export function readAdminToken(): string {
  if (!existsSync(ADMIN_STORAGE_STATE)) {
    throw new Error(`${ADMIN_STORAGE_STATE} not found. Run the setup project first.`);
  }
  const state = JSON.parse(readFileSync(ADMIN_STORAGE_STATE, 'utf8')) as {
    origins: { origin: string; localStorage: { name: string; value: string }[] }[];
  };
  const origin = state.origins.find(o => o.origin === new URL(BASE_URL).origin);
  const token = origin?.localStorage.find(item => item.name === TOKEN_STORAGE_KEY)?.value;
  if (!token) {
    throw new Error(`No admin token in ${ADMIN_STORAGE_STATE}.`);
  }
  return token;
}

/** Creates and changes test data through the API with an admin token. */
export class ApiHelper {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(
    token: string = readAdminToken(),
    clientIp: string = uniqueClientIp(),
  ): Promise<ApiHelper> {
    const ctx = await request.newContext({
      baseURL: `${API_URL.replace(/\/$/, '')}/`,
      extraHTTPHeaders: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': clientIp },
    });
    return new ApiHelper(ctx);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.ctx.get(path);
    expect(
      response.ok(),
      `GET ${path} → ${response.status()} ${await response.text()}`,
    ).toBeTruthy();
    return ((await response.json()) as ApiResult<T>).data;
  }

  /** GET of a paginated list: the rows and the pagination block. */
  async getPage<T>(path: string): Promise<Page<T>> {
    const response = await this.ctx.get(path);
    expect(
      response.ok(),
      `GET ${path} → ${response.status()} ${await response.text()}`,
    ).toBeTruthy();
    const body = (await response.json()) as ApiResult<T[]> & { pagination: Pagination };
    return { data: body.data, pagination: body.pagination };
  }

  /** HTTP status of a GET, without asserting on it. */
  async status(path: string): Promise<number> {
    return (await this.ctx.get(path)).status();
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await this.ctx.post(path, { data });
    expect(
      response.ok(),
      `POST ${path} → ${response.status()} ${await response.text()}`,
    ).toBeTruthy();
    return ((await response.json()) as ApiResult<T>).data;
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const response = await this.ctx.put(path, { data });
    expect(
      response.ok(),
      `PUT ${path} → ${response.status()} ${await response.text()}`,
    ).toBeTruthy();
    return ((await response.json()) as ApiResult<T>).data;
  }

  async delete(path: string): Promise<void> {
    const response = await this.ctx.delete(path);
    expect(
      response.ok(),
      `DELETE ${path} → ${response.status()} ${await response.text()}`,
    ).toBeTruthy();
  }

  /** Creates a member with complete, unique field values (JSON, no photo). */
  async createMember(overrides: Partial<MemberInput> = {}): Promise<Member> {
    const suffix = uniqueSuffix();
    return this.post<Member>('members', {
      firstName: 'E2e',
      lastName: `Member${suffix}`,
      title: 'Mr',
      gender: 'male',
      birthDate: '2001-02-03',
      birthPlace: 'Mahajanga',
      address: `${suffix} Test street`,
      occupation: 'student',
      phoneNumber: '0341234567',
      studyOrWorkPlace: `E2e place ${suffix}`,
      joinDate: '2024-05-06',
      ...overrides,
    });
  }

  /** Deletes a test member (its check-ins and volunteer records go with it). Never a seeded one. */
  async deleteMember(registrationNumber: number): Promise<void> {
    await this.delete(`members/${registrationNumber}`);
  }

  /** Deletes a test member if it still exists (cleanup after a test that may have deleted it). */
  async deleteMemberIfExists(registrationNumber: number): Promise<void> {
    if ((await this.status(`members/${registrationNumber}`)) === 200) {
      await this.deleteMember(registrationNumber);
    }
  }

  async getMember(registrationNumber: number): Promise<Member> {
    return this.get<Member>(`members/${registrationNumber}`);
  }

  /** Creates a check-in with the member's signed QR payload. */
  async createCheckin(
    registrationNumber: number,
    activityId: number,
    checkInTime: Date,
    checkOutTime?: Date,
  ): Promise<Checkin> {
    const qr = await this.get<{ registrationNumber: number; signature: string }>(
      `members/registration/${registrationNumber}/qr-code`,
    );
    return this.post<Checkin>('checkins', {
      registrationNumber: qr.registrationNumber,
      signature: qr.signature,
      activityId,
      checkInTime: checkInTime.toISOString(),
      ...(checkOutTime ? { checkOutTime: checkOutTime.toISOString() } : {}),
    });
  }

  /** Creates a staff account through POST /api/auth/register with a generated password. */
  async createUser(role: Role, prefix = 'e2e'): Promise<TestAccount> {
    const suffix = uniqueSuffix();
    const username = `${prefix}${role}${suffix}`;
    const email = `${username}@e2e.test`;
    const password = generatePassword();
    const created = await this.post<{ id: number }>('auth/register', {
      username,
      email,
      password,
      role,
    });
    return { id: created.id, username, email, password, role };
  }

  /** PUT /api/settings/users/:id. Never call it on the seeded admin. */
  async updateUser(id: number, changes: { role: Role; active: boolean }) {
    return this.put(`settings/users/${id}`, changes);
  }

  async getRolePolicies(): Promise<RolePolicy[]> {
    return this.get<RolePolicy[]>('settings/roles');
  }

  async getRolePolicy(role: Role): Promise<RolePolicy> {
    const policy = (await this.getRolePolicies()).find(p => p.role === role);
    if (!policy) throw new Error(`No policy for role ${role}`);
    return policy;
  }

  async saveRolePolicy(
    role: Role,
    policy: { active: boolean; permissions: Record<string, boolean> },
  ) {
    return this.put<RolePolicy>(`settings/roles/${role}`, policy);
  }
}
