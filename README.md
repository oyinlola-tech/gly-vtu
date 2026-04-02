# GLY VTU

GLY VTU is a full-stack virtual top-up (VTU) platform with user and admin experiences, wallet operations, bills payment, virtual cards, notifications, and real-time updates. It ships with an Express API and a React/Vite front-end used during development and build.

## Ownership and License
This project is proprietary and not free to use. See `LICENSE.md` for the full terms.

## Confidentiality and Authorized Access
The Software is proprietary and confidential. You may not disclose, share, or make any part of the codebase available to third parties without prior written authorization from the owner. Use is permitted only to individuals or entities expressly granted access by the owner.

## Author
Oluwayemi Oyinlola Michael  
Portfolio: https://oyinlola.site

## Key Features
- User onboarding, login, device verification, and security flows
- Wallet operations, transfers, and transaction history
- Bills and airtime utilities (VTpass integration)
- Virtual cards powered exclusively by Flutterwave
- KYC verification, limits, and admin review tooling
- Admin dashboards for users, bills, transactions, finance, anomalies, and audit
- Rate limiting, CSRF, CORS allowlist, hardened headers, and retention jobs
- Swagger API docs in non-disabled environments

## Tech Stack
- Backend: Node.js, Express, MySQL
- Frontend: React, Vite, Tailwind
- Integrations: VTpass (bills), Flutterwave (virtual cards), SMTP (email), optional AWS Secrets Manager

## Project Structure
- `server.js`: Express server, API wiring, and static hosting
- `backend/`: API routes, middleware, utilities, and database config
- `src/`: React/Vite app source
- `scripts/`: Operational utilities (health checks, etc.)
- `.env.example`: Environment variable template

## Repository Structure
```
.
|-- backend/
|   |-- config/db.js
|   |-- docs/swagger.js
|   |-- docs/swagger-output.json
|   |-- docs/migrations/
|   |-- middleware/
|   |-- routes/
|   |-- utils/
|   `-- .env.example
|-- public/
|-- scripts/kyc-health-check.js
|-- src/
|-- server.js
|-- .env.example
|-- package.json
|-- README.md
`-- SECURITY.md
```

## Getting Started
### Prerequisites
- Node.js 18+ (recommended)
- MySQL 8+
- Redis (optional, for rate limits and cache)

### Install
```
npm install
```

### Environment
1. Copy `.env.example` to `.env` and update values.
2. `backend/.env.example` contains the backend-only subset for reference.

### Run (Development)
In one terminal, start the API:
```
npm run dev:backend
```

In another terminal, start the Vite dev server:
```
npm run dev
```

The Vite dev server proxies `/app`, `/api`, and `/ws` to the API server.

### Build
```
npm run build
```

The Vite build outputs to `dist/`. For production, serve the build from your static host or copy bundles into the locations your deployment expects. The current Express server is configured to serve static files from `frontend/user` and `frontend/admin` if those directories are provided.

## API Documentation
If `ENABLE_SWAGGER` is not set to `false`, Swagger UI is available at:
- `/api-docs`
- `/api-docs.json`

## Flutterwave Emphasis
Flutterwave is the only supported virtual card provider in this project.

## Security
Please read `SECURITY.md` for reporting and hardening guidance.

## Contributing
This repository is proprietary. See `CONTRIBUTING.md` for contribution rules and access requirements.
