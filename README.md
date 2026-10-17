# ACM Frontend — VPS deployment

Angular 18 single-page application for managing members, attendance, activities, volunteers, book loans, badges, certificates, and role-based administration. It calls the separate ACM Express API and receives live updates through server-sent events (SSE).

This guide deploys a production static build on **Ubuntu Server 24.04 LTS with Nginx and HTTPS**. [Deploy the backend first](../ACM-Backend/README.md): the frontend requires its PostgreSQL database, migrated schema, initial administrator, and reachable HTTPS API. These instructions describe deployment; no VPS is modified by this README.

## 1. Understand the deployment

| Item | Example used below |
| --- | --- |
| Frontend URL | `https://acm.example.com` |
| Backend URL | `https://api.acm.example.com` |
| SSH/deployment user | `deploy` |
| Frontend source | `/srv/acm/ACM-Frontend` |
| Published builds | `/var/www/acm/releases/<release>` |
| Active build symlink | `/var/www/acm/current` |

Replace all domains, IP addresses, and repository placeholders with your values. Both apps can share a VPS, with separate Nginx virtual hosts. The frontend can also be on another VPS: it only needs HTTPS connectivity to the API, and its public origin must be in the backend's CORS allowlist.

The browser downloads static files, then calls the API directly. There is no frontend Node server or database needed at runtime. Node/npm are build tools only. Serve the app at the domain root (`/`) for this guide; a subdirectory deployment would also require configuring Angular's base URL and asset paths.

Before starting, have:

- A sudo-capable `deploy` account with SSH access and Git access to the frontend repository.
- A DNS A record for `acm.example.com` pointing to the frontend VPS. Publish an AAAA record only when IPv6 also works.
- Ports 80/443 open in the provider firewall and host firewall; SSH open on your actual SSH port.
- A working backend at `https://api.acm.example.com/health` and the initial administrator credentials from its guide.
- Enough memory to build Angular; approximately 4 GB RAM is a practical starting point when building alongside the backend.

## 2. Install server tools

If using the same VPS, skip packages already installed by the backend guide:

```bash
sudo apt update
sudo apt install -y git curl ca-certificates nginx rsync ufw snapd
sudo systemctl enable --now nginx
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Allow a custom SSH port before enabling UFW. Keep your current session open and test another SSH session before closing it.

Install the latest patched **Node.js 22.x** system-wide using the Node installation instructions in the [backend README](../ACM-Backend/README.md#3-install-nodejs-and-pnpm). You only need Node/npm for this frontend; pnpm is used by the backend. Check:

```bash
node --version
npm --version
```

Angular 18.2 supports Node 22 according to the [Angular version compatibility table](https://angular.dev/reference/versions). Use the project-local CLI installed by npm; a global Angular CLI is unnecessary.

## 3. Get the source and install dependencies

Run application/build commands as `deploy`:

```bash
sudo mkdir -p /srv/acm
sudo chown deploy:deploy /srv/acm
cd /srv/acm
git clone <FRONTEND_REPOSITORY_URL> ACM-Frontend
cd /srv/acm/ACM-Frontend
npm ci --legacy-peer-deps
```

Use the actual frontend repository URL; it is a separate Git checkout in this workspace. Use a deployment key for private repositories rather than embedding a token in the URL.

`npm ci` installs the committed lockfile reproducibly. `--legacy-peer-deps` matches the existing Dockerfile and accommodates the current mixed Angular library peer requirements. Keep development dependencies installed on the build machine: Angular's compiler and builder are required. Do not delete the lockfile or run `npm audit fix --force` as part of deployment.

## 4. Set the production API URLs before building

Edit **`src/environments/environment.ts`**:

```bash
cd /srv/acm/ACM-Frontend
nano src/environments/environment.ts
```

Replace its contents with the following, using your real backend domain:

```typescript
export const environment = {
  API_URL: 'https://api.acm.example.com/api',
  FILE_URL: 'https://api.acm.example.com/uploads',
  STATIC_WEB_URL: 'https://api.acm.example.com',
  SHOW_EXPERIMENTAL_FEATURES: false,
};
```

| Property | Purpose |
| --- | --- |
| `API_URL` | Base REST URL, including `/api`; services append `/auth`, `/members`, `/activities`, and other endpoints. SSE also uses this base. |
| `FILE_URL` | Base URL for uploaded member photos and related files; include `/uploads` without a trailing slash. |
| `STATIC_WEB_URL` | Existing base-origin setting; currently not referenced by application code, but keep it consistent with the API origin. |
| `SHOW_EXPERIMENTAL_FEATURES` | Application feature flag; use `false` unless you deliberately want experimental features. |

The active checked-in production configuration points to `http://localhost:5002`. In a visitor's browser, `localhost` means **their own computer**, so it must be replaced. A commented-out remote configuration in the file has no effect.

`angular.json` uses `environment.ts` for production and replaces it with `environment.development.ts` only for development. Editing the development file will not change the production build. Angular does not read backend `.env` files or container environment variables at runtime; these values are compiled into JavaScript. Never include database passwords, JWT secrets, or private credentials here. Every frontend setting is public.

On the backend, ensure its `.env` contains:

```dotenv
NODE_ENV=production
ALLOWED_ORIGINS=https://acm.example.com
```

Then, on the **backend VPS**:

```bash
sudo systemctl restart acm-backend
curl --fail https://api.acm.example.com/health
```

For multiple frontend origins, use a comma-separated backend allowlist. Origins include scheme and optional port, with no path/trailing slash. Use HTTPS for both frontend and API to prevent mixed-content blocks and to allow browser camera access for QR scanning.

### Import existing member and loan data

Imports run on the **backend VPS**, using its database credentials; the frontend has no spreadsheet-import deployment command. Before handing the app to users, follow the [backend deployment import steps](../ACM-Backend/README.md#import-existing-members-and-historical-book-loans-optional): upload the workbooks privately, validate/import members first, then validate/import historical loans.

See the detailed [member import format and behavior](../ACM-Backend/src/db/IMPORT_MEMBERS.md) and [loan import format and behavior](../ACM-Backend/src/db/IMPORT_BOOKS.md). Member photo references do not copy image files; transfer the corresponding images to the backend uploads directory too. Once imports finish and the API is running, verify members, photos, and returned/unreturned loans through the frontend.

## 5. Build production assets

```bash
cd /srv/acm/ACM-Frontend
npm run build -- --configuration production
test -f dist/acm-frontend/browser/index.html
```

The deployable directory is **`dist/acm-frontend/browser`**, not the parent `dist` directory. The build bundles scripts/styles and hashes output filenames. `angular.json` defaults to production, but the explicit flag makes deployment intent clear.

Stop if the build exits unsuccessfully. Current budgets enforce a 2 MB initial bundle limit and a 10 kB limit for individual component styles; fix unexpected growth rather than serving an incomplete build. Review warnings too. If the VPS runs out of memory, build on a machine/CI runner with more RAM, then transfer the resulting `browser/` contents to the release directory below. The frontend runtime itself does not need build-sized memory.

## 6. Publish a versioned release

Use a separate web root so Nginx never serves source, Git metadata, or build tooling:

```bash
sudo install -d -o deploy -g deploy -m 755 /var/www/acm /var/www/acm/releases
cd /srv/acm/ACM-Frontend
release_id="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "/var/www/acm/releases/$release_id"
rsync -a dist/acm-frontend/browser/ "/var/www/acm/releases/$release_id/"
find "/var/www/acm/releases/$release_id" -type d -exec chmod 755 {} +
find "/var/www/acm/releases/$release_id" -type f -exec chmod 644 {} +
ln -s "/var/www/acm/releases/$release_id" /var/www/acm/current.next
mv -Tf /var/www/acm/current.next /var/www/acm/current
readlink -f /var/www/acm/current
```

Keep `release_id` in the same shell until the commands finish. The temporary symlink must not already exist; if an earlier interrupted deployment left it behind, inspect it before proceeding. `current` should be a symlink, not an existing real directory. Nginx reads the symlink target; switching it publishes a complete build at once. Retain older release directories for rollback.

## 7. Configure Nginx and Angular route fallback

```bash
sudo nano /etc/nginx/sites-available/acm-frontend
```

Use this complete initial HTTP virtual host, replacing the domain:

```nginx
server {
    listen 80;
    server_name acm.example.com;
    root /var/www/acm/current;
    index index.html;

    # A fresh index selects the correct hashed bundles after deployment.
    location = /index.html {
        add_header Cache-Control "no-cache" always;
    }

    # Missing static files should return 404, not HTML pretending to be JS.
    location ~* \.(?:js|css|map|json|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|pdf)$ {
        try_files $uri =404;
        add_header Cache-Control "no-cache" always;
    }

    # Angular handles application routes in the browser.
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

The SPA fallback is essential: opening or refreshing a nested route should return `index.html`, allowing Angular to render the requested page. This guide conservatively revalidates static assets; you can later give only verified content-hashed files long immutable caching. Avoid long caching of unversioned translations/images.

```bash
sudo ln -s /etc/nginx/sites-available/acm-frontend /etc/nginx/sites-enabled/acm-frontend
sudo nginx -t
sudo systemctl reload nginx
curl -I http://acm.example.com/
```

If the symlink already exists, edit the existing configuration and skip creating it. If you get the Ubuntu welcome page, check DNS, the Host name, enabled sites, and the `server_name`. You may remove the default site's symlink after confirming it is unused by other applications. Do not remove other virtual hosts, including the backend API's configuration.

## 8. Issue an HTTPS certificate

With DNS resolving correctly and port 80 reachable:

```bash
# Skip installation if Certbot is already installed via snap.
sudo snap install --classic certbot
sudo /snap/bin/certbot --nginx -d acm.example.com
sudo nginx -t
sudo /snap/bin/certbot renew --dry-run
curl -I https://acm.example.com/
```

Enter your email and choose HTTP-to-HTTPS redirection if asked. Certbot updates this virtual host and schedules renewal. Check `systemctl list-timers --all | grep certbot`; retain port 80 for renewal and redirects. Request only names that resolve to this server. If the API is on the same VPS, its certificate and virtual host remain separate as described in the backend guide.

## 9. Verify the application from a browser

1. Open `https://acm.example.com` and log in with the administrator created in the backend guide. Check that API requests target `https://api.acm.example.com/api`, never localhost.
2. Navigate to members or activities, then refresh and open that URL in another tab. Both should work without an Nginx 404.
3. Create a test member/activity and reload the page to confirm persistence through the API/database.
4. Upload a member photo and verify it loads from the API's `/uploads/` URL.
5. Test check-in/QR scanning with a camera-capable device; grant camera permission over HTTPS.
6. Open another authenticated browser session and verify live activity/check-in updates. In Developer Tools → Network, the SSE request should stay open and receive events/heartbeats. A pending stream is normal.
7. Check the console/network panel for missing translations, assets, CORS errors, mixed content, or authorization failures. Verify pages appropriate to the assigned role.

Command-line checks supplement browser verification:

```bash
curl --fail -I https://acm.example.com/
curl --fail https://api.acm.example.com/health
sudo nginx -t
sudo systemctl status nginx --no-pager
```

The health endpoint only checks the backend HTTP process; successful login/data operations are needed to verify database access. SSE proxy settings belong on the **API Nginx host**, including `proxy_buffering off`, the long read timeout, and suppressed access logging for query-string tokens; use the configuration in the backend README.

## 10. Update and roll back

Before an update, record the existing release and source revision:

```bash
readlink -f /var/www/acm/current
cd /srv/acm/ACM-Frontend
git rev-parse HEAD
git status --short
```

Keep your production URL changes in a deliberate deployment configuration or committed environment configuration. A locally edited `environment.ts` can conflict with an incoming update; reconcile it carefully, without discarding your domain settings or unrelated work.

```bash
cd /srv/acm/ACM-Frontend
git pull --ff-only
npm ci --legacy-peer-deps
# Recheck src/environments/environment.ts before building.
npm run build -- --configuration production
```

Only after a successful build, repeat the versioned release commands from section 6 with a new timestamp. Re-run browser checks. Replacing static assets does not require restarting Node or Nginx; reload Nginx only when its configuration changes.

To roll back, list retained releases and switch to an actual previous release:

```bash
ls -1 /var/www/acm/releases
# Replace PREVIOUS_RELEASE with a known-good directory name.
test -f /var/www/acm/releases/PREVIOUS_RELEASE/index.html
ln -s /var/www/acm/releases/PREVIOUS_RELEASE /var/www/acm/current.next
mv -Tf /var/www/acm/current.next /var/www/acm/current
```

Run the switch only if the `test` succeeds. Refresh the browser and verify the old frontend remains compatible with the deployed backend. Existing tabs may still have old JavaScript loaded: ask users to refresh after an update if they encounter stale behavior. An old tab may request an old lazy bundle after the switch; reload to fetch the current index/build.

Back up the production environment configuration, Nginx configuration, and any release artifacts you need for rollback. User data and uploaded photos belong to the backend; follow its database/uploads backup procedure. Static releases are reproducible from the matching source, lockfile, and production settings.

## 11. Troubleshooting

| Symptom | What to inspect |
| --- | --- |
| Requests go to `localhost:5002` | Edit `environment.ts`, rebuild, publish the new output, and refresh. Runtime environment variables do not rewrite a built bundle. |
| Login fails with CORS errors | Backend `ALLOWED_ORIGINS` must match the exact frontend HTTPS origin; restart the API after editing. |
| Mixed content blocked | Replace all HTTP API/upload URLs with HTTPS and rebuild. |
| Deep-link refresh returns 404 | Ensure the Nginx `try_files ... /index.html` SPA fallback is active. |
| JS gets HTML / MIME type error | Wrong web root or missing assets; serve `dist/acm-frontend/browser` contents, and make missing static paths return 404. |
| Blank screen | Inspect browser console, failed JS requests, and whether index/bundles belong to the same release. |
| Photos missing | Check `FILE_URL`, backend upload persistence, file permissions, and actual API image URL. |
| QR camera unavailable | Use HTTPS, grant camera permission, and verify the device has a usable camera. |
| Live updates delayed | Check API-side SSE buffering/timeouts and token permissions; keep one API process. |
| npm dependency resolution error | Use the committed lockfile with `npm ci --legacy-peer-deps`, matching the Docker build. |
| Build killed / budget exceeded | Inspect memory or the reported size budget; do not publish failed output. |
| Nginx 403 | Confirm `/var/www/acm/current` points to a release containing index.html and that Nginx can traverse/read every directory/file. |

Useful server logs:

```bash
sudo tail -n 100 /var/log/nginx/error.log
sudo journalctl -u nginx -n 100 --no-pager
readlink -f /var/www/acm/current
```

## Existing scripts and Docker files

- `npm start` runs the Angular **development** server on port 4200; use it for local development, not this VPS deployment.
- `npm run build` generates the production static build by default.
- `npm run serve:prod` serves the built SPA on port 4200 using `serve`; this guide uses Nginx directly.
- `npm test` runs browser-based Karma tests and needs a compatible browser; building successfully does not replace end-to-end verification.
- The existing production Dockerfile builds Angular and then runs `serve` on port 4200. `docker-compose.prod.yml` publishes that port publicly. The root `docker-compose.yml` is commented out; plain `docker compose up` is not the production frontend command.

If you choose containers instead of the host-static deployment, build with `docker compose -f docker-compose.prod.yml up -d --build` **after editing production URLs**. Change the Compose port mapping to `127.0.0.1:4200:4200`, and use a separate Nginx frontend virtual host proxying to `http://127.0.0.1:4200` instead of the static-root configuration above. Retain the HTTPS/domain setup. Install Docker Engine/Compose first using the [official Ubuntu instructions](https://docs.docker.com/engine/install/ubuntu/). Docker-published ports can bypass UFW rules, so loopback binding matters. The existing image uses Node 20 and an unpinned global `serve`; review those choices before adopting it as your maintained production path. Do not run both frontend serving approaches for the same domain.

## References

- [Backend deployment and operations](../ACM-Backend/README.md)
- [Angular version compatibility](https://angular.dev/reference/versions)
- [Nginx reverse proxy documentation](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Certbot for Nginx](https://certbot.eff.org/instructions?os=snap&tab=standard&ws=nginx)
