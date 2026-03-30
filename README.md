# GLY VTU

GLY VTU is a full-stack virtual top-up (VTU) platform with user and admin experiences, wallet operations, bills payment, virtual cards, notifications, and real-time updates. It ships with an Express API, static web portals, and a React/Vite front-end used during development.

## Ownership and License
This project is proprietary and not free to use. See `LICENSE.md` for the full terms.

## Author
Oluwayemi Oyinlola Michael  
Portfolio: https://oyinlola.site

## Key Features
- User onboarding, login, and security flows
- Wallet operations, transfers, and transaction history
- Bills and airtime utilities (VTpass integration)
- Virtual cards (Flutterwave integration)
- Admin dashboard for users, bills, transactions, finance, and audit
- Rate limiting, CSRF, CORS allowlist, and hardened headers
- Swagger API docs in non-disabled environments

## Tech Stack
- Backend: Node.js, Express, MySQL
- Frontend: React, Vite, Tailwind
- Integrations: VTpass, Flutterwave, SMTP

## Project Structure
- `server.js`: Express server, static hosting, and API wiring
- `backend/`: API routes, middleware, utilities, and database config
- `src/`: React/Vite app source
- `.env.example`: Environment variable template

## Getting Started
### Prerequisites
- Node.js 18+ (recommended)
- MySQL 8+

### Install
```
npm install
```

### Environment
1. Copy `.env.example` to `.env` and update values.
2. If you run the API separately, also review `backend/.env.example`.

### Run (Development)
In one terminal, start the API:
```
node server.js
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

## API Documentation
If `ENABLE_SWAGGER` is not set to `false`, Swagger UI is available at:
- `/api-docs`
- `/api-docs.json`

## Security
Please read `SECURITY.md` for reporting and hardening guidance.

## Contributing
This repository is proprietary. See `CONTRIBUTING.md` for contribution rules and access requirements.

## Changelog
See `CHANGELOG.md`.
