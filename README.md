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
- Integrations: VTpass (bills), Flutterwave (virtual cards), SMTP (email)

## Quick Start (Fastest Path)
1. Install dependencies:
```
npm install
```
2. Create your environment file:
```
copy .env.example .env
```
3. Start everything (API + Frontend):
```
npm run dev
```

The Vite dev server proxies `/app`, `/api`, and `/ws` to the API server.

## Project Structure
- `server.js`: Express server, API wiring, and static hosting
- `backend/`: API routes, middleware, utilities, and database config
- `src/`: React/Vite app source
- `scripts/`: Operational utilities (health checks, setup, audit report generator)
- `reports/`: Generated PDF audit reports (created at runtime)
- `.env.example`: Environment variable template

## Docs Index
- `README.md`: Project overview and local dev workflow
- `SECURITY.md`: Security policy and reporting flow
- `SUPPORT.md`: Support scope and contact
- `CONTRIBUTING.md`: Contribution rules and checks
- `CODE_OF_CONDUCT.md`: Collaboration expectations
- `LICENSE.md`: Proprietary license terms

## Scripts (Easiest Ways To Run)
Development (frontend + backend):
```
npm run dev
```
Frontend only:
```
npm run dev:frontend
```
Backend only:
```
npm run dev:backend
```
Lint and typecheck:
```
npm run lint
npm run typecheck
```
Production build:
```
npm run build
```
Swagger API docs (generated in `backend/docs/swagger-output.json`):
```
npm run swagger
```
KYC integration health check:
```
npm run kyc:health
```
Generate audit report PDF:
```
node scripts/generate-audit-report.js
```
Include `node_modules` or `dist` in the audit scan:
```
node scripts/generate-audit-report.js --include-node-modules --include-dist
```

## Repository Structure
```
.
|-- .github
|   `-- workflows
|       |-- codeql.yml
|       |-- defender-for-devops.yml
|       `-- njsscan.yml
|-- backend
|   |-- config
|   |   `-- db.js
|   |-- docs
|   |   |-- migrations
|   |   |   |-- 2026-03-30_admin_totp.js
|   |   |   |-- 2026-04-01_account_lockout.js
|   |   |   |-- 2026-04-02_admin_disable.js
|   |   |   `-- 2026-04-01_pii_encryption.js
|   |   |-- swagger.js
|   |   `-- swagger-output.json
|   |-- middleware
|   |   |-- adminAuth.js
|   |   |-- auth.js
|   |   |-- csrf.js
|   |   |-- errorHandler.js
|   |   |-- permissions.js
|   |   |-- rateLimiters.js
|   |   `-- requestValidation.js
|   |-- routes
|   |   |-- adminAnomalies.js
|   |   |-- adminAudit.js
|   |   |-- adminAuth.js
|   |   |-- adminBills.js
|   |   |-- adminCompliance.js
|   |   |-- adminConversations.js
|   |   |-- adminFinance.js
|   |   |-- adminFlutterwave.js
|   |   |-- adminManagement.js
|   |   |-- adminNotifications.js
|   |   |-- adminSecurityEvents.js
|   |   |-- adminTransactions.js
|   |   |-- adminUsers.js
|   |   |-- adminVtpass.js
|   |   |-- auth.js
|   |   |-- banks.js
|   |   |-- bills.js
|   |   |-- cards.js
|   |   |-- conversations.js
|   |   |-- flutterwaveWebhook.js
|   |   |-- notifications.js
|   |   |-- transactions.js
|   |   |-- user.js
|   |   |-- vtpassWebhook.js
|   |   `-- wallet.js
|   |-- utils
|   |   |-- anomalies.js
|   |   |-- audit.js
|   |   |-- bankCache.js
|   |   |-- csv.js
|   |   |-- email.js
|   |   |-- encryption.js
|   |   |-- flutterwave.js
|   |   |-- idempotency.js
|   |   |-- kycLimits.js
|   |   |-- kycProvider.js
|   |   |-- kycVerification.js
|   |   |-- logger.js
|   |   |-- otp.js
|   |   |-- pin.js
|   |   |-- realtime.js
|   |   |-- reconciliation.js
|   |   |-- retention.js
|   |   |-- sanitize.js
|   |   |-- secretsManager.js
|   |   |-- secretValidator.js
|   |   |-- secureCookie.js
|   |   |-- securityEvents.js
|   |   |-- securityQuestionGuard.js
|   |   |-- securityQuestions.js
|   |   |-- tokenCleanup.js
|   |   |-- tokens.js
|   |   |-- totp.js
|   |   |-- transactionMetadata.js
|   |   |-- validation.js
|   |   `-- vtpass.js
|   `-- .env.example
|-- public
|   `-- assets
|       |-- favicon
|       |   `-- gly-vtu.svg
|       `-- logo
|           `-- gly-vtu.png
|-- scripts
|   |-- generate-audit-report.js
|   `-- kyc-health-check.js
|-- reports
|   `-- security-ux-audit-YYYY-MM-DD.pdf
|-- src
|   |-- app
|   |   |-- components
|   |   |   |-- figma
|   |   |   |   `-- ImageWithFallback.tsx
|   |   |   |-- layout
|   |   |   |   |-- PageShell.tsx
|   |   |   |   `-- SectionCard.tsx
|   |   |   |-- ui
|   |   |   |   |-- accordion.tsx
|   |   |   |   |-- alert.tsx
|   |   |   |   |-- alert-dialog.tsx
|   |   |   |   |-- aspect-ratio.tsx
|   |   |   |   |-- avatar.tsx
|   |   |   |   |-- badge.tsx
|   |   |   |   |-- breadcrumb.tsx
|   |   |   |   |-- button.tsx
|   |   |   |   |-- calendar.tsx
|   |   |   |   |-- card.tsx
|   |   |   |   |-- carousel.tsx
|   |   |   |   |-- chart.tsx
|   |   |   |   |-- checkbox.tsx
|   |   |   |   |-- collapsible.tsx
|   |   |   |   |-- command.tsx
|   |   |   |   |-- context-menu.tsx
|   |   |   |   |-- dialog.tsx
|   |   |   |   |-- drawer.tsx
|   |   |   |   |-- dropdown-menu.tsx
|   |   |   |   |-- form.tsx
|   |   |   |   |-- hover-card.tsx
|   |   |   |   |-- input.tsx
|   |   |   |   |-- input-otp.tsx
|   |   |   |   |-- label.tsx
|   |   |   |   |-- menubar.tsx
|   |   |   |   |-- navigation-menu.tsx
|   |   |   |   |-- pagination.tsx
|   |   |   |   |-- popover.tsx
|   |   |   |   |-- progress.tsx
|   |   |   |   |-- radio-group.tsx
|   |   |   |   |-- resizable.tsx
|   |   |   |   |-- scroll-area.tsx
|   |   |   |   |-- select.tsx
|   |   |   |   |-- separator.tsx
|   |   |   |   |-- sheet.tsx
|   |   |   |   |-- sidebar.tsx
|   |   |   |   |-- skeleton.tsx
|   |   |   |   |-- slider.tsx
|   |   |   |   |-- sonner.tsx
|   |   |   |   |-- switch.tsx
|   |   |   |   |-- table.tsx
|   |   |   |   |-- tabs.tsx
|   |   |   |   |-- textarea.tsx
|   |   |   |   |-- toggle.tsx
|   |   |   |   |-- toggle-group.tsx
|   |   |   |   |-- tooltip.tsx
|   |   |   |   |-- use-mobile.ts
|   |   |   |   `-- utils.ts
|   |   |   |-- ActivityTimeline.tsx
|   |   |   |-- BottomNav.tsx
|   |   |   |-- Breadcrumbs.tsx
|   |   |   |-- ConfirmDialog.tsx
|   |   |   |-- CurrencyInput.tsx
|   |   |   |-- DeviceFingerprint.tsx
|   |   |   |-- LoadingSpinner.tsx
|   |   |   |-- NotificationListener.tsx
|   |   |   |-- OTPInput.tsx
|   |   |   |-- PhoneInput.tsx
|   |   |   |-- PINInput.tsx
|   |   |   |-- SecurityAlertBanner.tsx
|   |   |   |-- SplashScreen.tsx
|   |   |   |-- SupportChat.tsx
|   |   |   `-- TransactionStatusCard.tsx
|   |   |-- pages
|   |   |   |-- admin
|   |   |   |   |-- AdminAuditLogs.tsx
|   |   |   |   |-- AdminDashboard.tsx
|   |   |   |   |-- AdminLogin.tsx
|   |   |   |   |-- AdminReview.tsx
|   |   |   |   |-- AdminTransactions.tsx
|   |   |   |   |-- AnomalyDetection.tsx
|   |   |   |   |-- ComplianceManagement.tsx
|   |   |   |   `-- SecurityEventsDashboard.tsx
|   |   |   |-- AccountClosure.tsx
|   |   |   |-- AccountClosureCancel.tsx
|   |   |   |-- AccountSettingsPage.tsx
|   |   |   |-- AddMoney.tsx
|   |   |   |-- Bills.tsx
|   |   |   |-- BiometricSetup.tsx
|   |   |   |-- BuyAirtime.tsx
|   |   |   |-- BuyData.tsx
|   |   |   |-- Cards.tsx
|   |   |   |-- ComingSoon.tsx
|   |   |   |-- CompliancePolicies.tsx
|   |   |   |-- Dashboard.tsx
|   |   |   |-- DataExport.tsx
|   |   |   |-- DeviceManagement.tsx
|   |   |   |-- Disputes.tsx
|   |   |   |-- Error400.tsx
|   |   |   |-- Error403.tsx
|   |   |   |-- Error404.tsx
|   |   |   |-- Error500.tsx
|   |   |   |-- ErrorPages.tsx
|   |   |   |-- ForgotPassword.tsx
|   |   |   |-- HelpCenter.tsx
|   |   |   |-- KYC.tsx
|   |   |   |-- KycStatusLimits.tsx
|   |   |   |-- Login.tsx
|   |   |   |-- Maintenance.tsx
|   |   |   |-- More.tsx
|   |   |   |-- Notifications.tsx
|   |   |   |-- Offline.tsx
|   |   |   |-- PasswordChangePage.tsx
|   |   |   |-- PayElectricity.tsx
|   |   |   |-- PayTV.tsx
|   |   |   |-- Profile.tsx
|   |   |   |-- Register.tsx
|   |   |   |-- ResetPassword.tsx
|   |   |   |-- Security.tsx
|   |   |   |-- SecurityActivityPage.tsx
|   |   |   |-- SecurityCenter.tsx
|   |   |   |-- SecurityDashboard.tsx
|   |   |   |-- SecurityTips.tsx
|   |   |   |-- SendMoney.tsx
|   |   |   |-- SendToBank.tsx
|   |   |   |-- SendToUser.tsx
|   |   |   |-- SessionManagement.tsx
|   |   |   |-- SetPIN.tsx
|   |   |   |-- TermsPrivacy.tsx
|   |   |   |-- TransactionDetails.tsx
|   |   |   |-- TransactionDetailsPage.tsx
|   |   |   |-- TransactionHistoryPage.tsx
|   |   |   |-- TransactionReceipt.tsx
|   |   |   |-- Transactions.tsx
|   |   |   |-- TransactionSuccess.tsx
|   |   |   |-- TwoFactorAuthPage.tsx
|   |   |   |-- TwoFactorSetup.tsx
|   |   |   |-- VerifyDevice.tsx
|   |   |   `-- WalletManagementPage.tsx
|   |   `-- App.tsx
|   |-- assets
|   |-- components
|   |   |-- PasswordStrengthIndicator.tsx
|   |   |-- SecurityAlert.tsx
|   |   `-- TransactionStatusBadge.tsx
|   |-- contexts
|   |   |-- AdminAuthContext.tsx
|   |   |-- AuthContext.tsx
|   |   `-- ThemeContext.tsx
|   |-- imports
|   |-- services
|   |   `-- api.ts
|   |-- styles
|   |   |-- fonts.css
|   |   |-- index.css
|   |   |-- tailwind.css
|   |   `-- theme.css
|   |-- types
|   |   |-- api.ts
|   |   `-- bills.ts
|   |-- main.tsx
|   `-- vite-env.d.ts
|-- .env
|-- .env.example
|-- .gitignore
|-- .githooks
|   `-- pre-commit
|-- CODE_OF_CONDUCT.md
|-- CONTRIBUTING.md
|-- default_shadcn_theme.css
|-- env.d.ts
|-- eslint.config.js
|-- index.html
|-- LICENSE.md
|-- package.json
|-- package-lock.json
|-- pnpm-workspace.yaml
|-- postcss.config.mjs
|-- README.md
|-- SECURITY.md
|-- server.js
|-- SUPPORT.md
`-- vite.config.ts
```
Generated from the repository on 2026-04-06. Excludes `node_modules/`, `dist/`, and `.git/`.

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
Single command (recommended):
```
npm run dev
```

If you prefer separate terminals:
```
npm run dev:backend
npm run dev:frontend
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

## Export Endpoints
User transactions export (CSV):
- `POST /api/transactions/export`

Admin transactions export (CSV):
- `POST /api/admin/transactions/export`

## Environment Variables (Reference)
| Variable | Required | Scope | Example | Purpose |
| --- | --- | --- | --- | --- |
| `NODE_ENV` | Yes | Backend | `production` | Runtime mode (affects security hardening). |
| `PORT` | Yes | Backend | `3000` | API server port. |
| `DB_HOST` | Yes | Backend | `localhost` | MySQL host. |
| `DB_PORT` | Yes | Backend | `3306` | MySQL port. |
| `DB_USER` | Yes | Backend | `root` | MySQL user. |
| `DB_PASSWORD` | Yes | Backend | `strong_password` | MySQL password. |
| `DB_NAME` | Yes | Backend | `gly_vtu` | MySQL database name. |
| `JWT_SECRET` | Yes | Backend | `...` | User JWT signing secret. |
| `JWT_ADMIN_SECRET` | Yes | Backend | `...` | Admin JWT signing secret. |
| `COOKIE_ENC_SECRET` | Yes | Backend | `...` | Cookie encryption secret. |
| `PII_ENCRYPTION_KEY` | Yes | Backend | `...` | PII encryption key. |
| `CORS_ORIGIN` | Yes (prod) | Backend | `https://app.example.com` | Allowed origins (comma-separated). |
| `TRUST_PROXY` | No | Backend | `1` | Trust proxy hops when behind a load balancer. |
| `REDIS_URL` | No (prod recommended) | Backend | `redis://...` | Rate limiting and caching. |
| `FLW_SECRET_KEY` | Yes | Backend | `...` | Flutterwave API secret. |
| `FLW_WEBHOOK_HASH` | Yes | Backend | `...` | Flutterwave webhook signature secret. |
| `FLW_WEBHOOK_IPS` | Yes (prod) | Backend | `x.x.x.x,y.y.y.y` | Flutterwave webhook allowlist. |
| `VTPASS_API_KEY` | Yes (bills) | Backend | `...` | VTpass API key. |
| `SMTP_HOST` | Yes | Backend | `smtp.mail.com` | Email provider host. |
| `SMTP_PORT` | Yes | Backend | `587` | Email provider port. |
| `SMTP_USER` | Yes | Backend | `noreply@...` | Email user. |
| `SMTP_PASS` | Yes | Backend | `...` | Email password. |
| `VITE_API_URL` | No | Frontend | `/app/api` | Frontend API base (Vite). |
| `VITE_ADMIN_API_URL` | No | Frontend | `/app/admin/api` | Frontend admin API base. |
| `ENABLE_SWAGGER` | No | Backend | `false` | Disable Swagger in production. |

## Operations / Monitoring
- **Log hygiene:** Logging redacts secrets and sensitive fields. Avoid adding raw payloads in logs.  
- **Audit trails:** All sensitive actions write to `audit_logs` and `security_events`.  
- **Retention jobs:** Scheduled pruning runs daily; configure retention windows in `.env`.  
- **Rate limits:** In production, use Redis for distributed rate limiting.  
- **Webhook monitoring:** Monitor `flutterwave_events` and `vtpass_events` for retries or anomalies.  
- **Reconciliation:** Admin can run `/api/admin/transactions/reconcile` to audit balances.  
- **Health checks:** Use `npm run kyc:health` to validate KYC provider connectivity.  

## Flutterwave Emphasis
Flutterwave is the only supported virtual card provider in this project.

## Security
Please read `SECURITY.md` for reporting and hardening guidance.

## Contributing
This repository is proprietary. See `CONTRIBUTING.md` for contribution rules and access requirements.
