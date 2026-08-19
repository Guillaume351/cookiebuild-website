# Cookie Build website and mobile API

Production Nuxt application for [Cookie Build](https://www.cookie-build.com): public server pages,
Minecraft Java/Bedrock status, player statistics, changelog content, companion-app APIs, and the
authenticated administration console.

## Local setup

Requirements: Node.js 22+, npm, and PostgreSQL for database-backed routes.

```bash
npm ci
cp .env.example .env
npm run dev
```

The development server is available at `http://localhost:3000`. Never commit `.env` or production
credentials. Public pages and build validation can run without a live production database; routes
that read player or mobile data require the documented environment variables.

## Quality gates

Run the same checks expected before a production release:

```bash
npm test
npm run typecheck
npm run build
npm audit --omit=dev
```

Player-visible releases require an immutable JSON note under `content/changelog/`. Validate the
selected file before deployment:

```bash
npm run changelog:publish -- content/changelog/<release>.json
```

Without `--publish`, the command always validates without writing. Publication requires explicit
`--publish` plus database configuration and is idempotent for an identical immutable slug.

## Important paths

- `pages/`, `components/`: public and administrative UI
- `server/api/`: public, mobile, and admin API routes
- `server/services/`: business and integration logic
- `drizzle/`: reviewed PostgreSQL migrations
- `content/changelog/`: versioned player-facing release notes
- `test/`: Vitest contract, security, and integration coverage
- `docs/`: deployment and administration documentation
- `operator/`, `monitor/`, `update-monitor/`: isolated operational services

Production deployment and rollback follow the Cookie Build operations runbook. Do not publish a
website commit directly without the release preflight, a verified changelog slug, and live HTTP/API
checks.
