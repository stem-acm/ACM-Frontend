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

/** A unique, alphanumeric suffix for test data names. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
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

  static async create(token: string = readAdminToken()): Promise<ApiHelper> {
    const ctx = await request.newContext({
      baseURL: `${API_URL.replace(/\/$/, '')}/`,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    return new ApiHelper(ctx);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.ctx.get(path);
    expect(response.ok(), `GET ${path} → ${response.status()}`).toBeTruthy();
    return ((await response.json()) as ApiResult<T>).data;
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await this.ctx.post(path, { data });
    expect(response.ok(), `POST ${path} → ${response.status()}`).toBeTruthy();
    return ((await response.json()) as ApiResult<T>).data;
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const response = await this.ctx.put(path, { data });
    expect(response.ok(), `PUT ${path} → ${response.status()}`).toBeTruthy();
    return ((await response.json()) as ApiResult<T>).data;
  }

  async delete(path: string): Promise<void> {
    const response = await this.ctx.delete(path);
    expect(response.ok(), `DELETE ${path} → ${response.status()}`).toBeTruthy();
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
