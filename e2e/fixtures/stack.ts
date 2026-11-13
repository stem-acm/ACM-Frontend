import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { API_URL, BASE_URL } from './env';

const COMPOSE_FILE = join(__dirname, '..', 'docker-compose.e2e.yml');
const PROJECT = 'acm-e2e';

/** Checkout of the backend whose code the throwaway API runs. */
const BACKEND_DIR = resolve(
  process.env['E2E_BACKEND_DIR'] ?? join(__dirname, '..', '..', '..', 'ACM-Backend'),
);

/** E2E_SKIP_STACK=1: the API of E2E_API_URL is provided from outside (already started and seeded). */
export const stackIsExternal = process.env['E2E_SKIP_STACK'] === '1';
/** E2E_KEEP_STACK=1: leave the throwaway stack up after the run, to look at its data. */
export const keepStack = process.env['E2E_KEEP_STACK'] === '1';

function compose(args: string[], quiet = false): void {
  execFileSync('docker', ['compose', '-p', PROJECT, '-f', COMPOSE_FILE, ...args], {
    stdio: quiet ? 'ignore' : 'inherit',
    env: {
      ...process.env,
      E2E_BACKEND_DIR: BACKEND_DIR,
      E2E_API_PORT: new URL(API_URL).port || '80',
      E2E_ALLOWED_ORIGIN: new URL(BASE_URL).origin,
    },
  });
}

/** Starts an empty database and an API on it, then loads the seed data. */
export function startStack(): void {
  // Remove what an interrupted run may have left.
  compose(['down', '--volumes', '--remove-orphans'], true);
  // --wait returns when the database and the API (migrations applied) are healthy.
  compose(['up', '--detach', '--build', '--wait', '--quiet-pull']);
  // Static images the app expects in the uploads folder (default avatar, certificate images).
  const uploads = join(BACKEND_DIR, 'uploads');
  for (const name of readdirSync(uploads)) {
    if (statSync(join(uploads, name)).isFile()) {
      compose(['cp', join(uploads, name), `backend:/app/uploads/${name}`], true);
    }
  }
  compose(['exec', '-T', 'backend', 'pnpm', 'seed'], true);
}

/** Removes the containers; the database and the uploads disappear with them. */
export function stopStack(): void {
  compose(['down', '--volumes', '--remove-orphans'], true);
}
