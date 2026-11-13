import { existsSync } from 'node:fs';
import { join } from 'node:path';

const envFile = join(__dirname, '..', '..', '.env.e2e');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Copy .env.e2e.example to .env.e2e and fill it in.`);
  }
  return value;
}

export const BASE_URL = (process.env['E2E_BASE_URL'] ?? 'http://localhost:4200').replace(/\/$/, '');
export const API_URL = (process.env['E2E_API_URL'] ?? 'http://localhost:5002/api').replace(
  /\/$/,
  '',
);

export const ADMIN = {
  get username(): string {
    return required('E2E_ADMIN_USERNAME');
  },
  get password(): string {
    return required('E2E_ADMIN_PASSWORD');
  },
};

/** Browser state of the admin session, written by the setup project. */
export const ADMIN_STORAGE_STATE = 'playwright/.auth/admin.json';
/** Generated intern and volunteer accounts, written by the setup project (git-ignored). */
export const ACCOUNTS_FILE = 'playwright/.auth/accounts.json';

/** localStorage key read by LanguageService. */
export const LANGUAGE_STORAGE_KEY = 'acm-language';
/** localStorage key that holds the JWT. */
export const TOKEN_STORAGE_KEY = 'token';
