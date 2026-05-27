# ACM Frontend

Angular 18 frontend application running with Docker for both development and production environments.

---

# Project Structure

```bash
.
├── Dockerfile
├── Dockerfile.dev
├── docker-compose.dev.yml
├── docker-compose.prod.yml
├── .dockerignore
├── package.json
├── angular.json
└── src/
```

---

# Environments

The project supports two separate Docker environments:

| Environment | Purpose           | Hot Reload |
| ----------- | ----------------- | ---------- |
| Development | Local development | Yes        |
| Production  | Deployment        | No         |

---

# Requirements

Install:

- Docker
- Docker Compose

Verify installation:

```bash
docker --version
docker compose version
```

---

# Development Environment

The development environment includes:

- Angular live reload
- mounted source code
- polling file watcher support
- automatic rebuilds on file changes

---

## Start Development Environment

On first launch, use the command below:

```bash
docker compose -f docker-compose.dev.yml up --build -d
```

Then, after:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Or:

```bash
npm run docker-dev:start
```

Application available at:

```text
http://localhost:4200
```

---

## Stop Development Environment

```bash
docker compose -f docker-compose.dev.yml stop
```

Or:

```bash
npm run docker-dev:stop
```

---

## Rebuild Development Container

After dependency changes:

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

# Production Environment

The production environment uses:

- optimized Angular build
- serve static server
- lightweight runtime image

---

## Start Production Environment

On first launch, use the command below:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Then, after:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Or:

```bash
npm run docker-prod:start
```

Application available at:

```text
http://localhost:4200
```

---

## Stop Production Environment

```bash
docker compose -f docker-compose.prod.yml stop
```

Or:

```bash
npm run docker-prod:stop
```

---

# Docker Files

---

## Dockerfile.dev

Used for development with hot reload support.

Features:

- Node.js environment
- Angular live reload
- polling enabled
- source mounted as volume

---

## Dockerfile

Used for production deployment.

Features:

- multi-stage build
- optimized Angular build

---

# Hot Reload

Hot reload is enabled using:

```bash
--poll=2000
```

and:

```yaml
CHOKIDAR_USEPOLLING=true
```

This ensures file watching works correctly inside Docker containers.

---

# Useful Docker Commands

---

## View Running Containers

```bash
docker ps
```

---

## View Logs

Development:

```bash
docker compose -f docker-compose.dev.yml logs -f
```

Production:

```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

## Remove Containers

Development:

```bash
docker compose -f docker-compose.dev.yml down
```

Production:

```bash
docker compose -f docker-compose.prod.yml down
```

---

# Angular Commands Inside Container

Open shell:

Development:

```bash
docker exec -it acm-frontend-dev sh
```

Production:

```bash
docker exec -it acm-frontend-prod sh
```

---

# Recommended Workflow

## Development

1. Start development container
2. Edit files locally
3. Angular reloads automatically

---

## Production

1. Build optimized image
2. Serve with serve
3. Deploy container

---

# Troubleshooting

---

## Hot Reload Not Working

Ensure:

- volumes are mounted correctly
- polling is enabled
- Angular serve command includes:

```bash
--poll=2000
```

---

## Port Already In Use

Change ports in compose files:

Development:

```yaml
ports:
  - '4201:4200'
```

Production:

```yaml
ports:
  - '4201:4200'
```

---

# Recommended .dockerignore

```text
node_modules
dist
.git
.angular
Dockerfile.dev
docker-compose.dev.yml
```

---

# Tech Stack

- Angular 18
- Docker
- Docker Compose
- Nginx
- Node.js 20 Alpine

---

# License

Private project.
