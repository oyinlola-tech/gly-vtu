# GLY VTU

GLY VTU is a full-stack virtual top-up (VTU) platform with user and admin experiences, wallet operations, bills payment, virtual cards, notifications, and real-time updates. It ships with an Express API, static web portals, and a React/Vite front-end used during development.

## Ownership and License
This project is proprietary and not free to use. See `LICENSE.md` for the full terms.

## Confidentiality and Authorized Access
The Software is proprietary and confidential. You may not disclose, share, or make any part of the codebase available to third parties without prior written authorization from the owner. Use is permitted only to individuals or entities expressly granted access by the owner.

## Author
Oluwayemi Oyinlola Michael  
Portfolio: https://oyinlola.site

## Key Features
- User onboarding, login, and security flows
- Wallet operations, transfers, and transaction history
- Bills and airtime utilities (VTpass integration)
- Virtual cards powered exclusively by Flutterwave
- Admin dashboard for users, bills, transactions, finance, and audit
- Rate limiting, CSRF, CORS allowlist, and hardened headers
- Swagger API docs in non-disabled environments

## Tech Stack
- Backend: Node.js, Express, MySQL
- Frontend: React, Vite, Tailwind
- Integrations: VTpass (bills), Flutterwave (virtual cards, sole provider), SMTP (email)

## Project Structure
- `server.js`: Express server, static hosting, and API wiring
- `backend/`: API routes, middleware, utilities, and database config
- `src/`: React/Vite app source
- `.env.example`: Environment variable template

## Repository Structure
```
.
├── backend
│   ├── config
│   │   └── db.js
│   ├── docs
│   │   └── swagger.js
│   ├── middleware
│   │   ├── adminAuth.js
│   │   ├── auth.js
│   │   ├── csrf.js
│   │   ├── permissions.js
│   │   └── rateLimiters.js
│   ├── routes
│   │   ├── adminAudit.js
│   │   ├── adminAuth.js
│   │   ├── adminBills.js
│   │   ├── adminConversations.js
│   │   ├── adminFinance.js
│   │   ├── adminFlutterwave.js
│   │   ├── adminManagement.js
│   │   ├── adminNotifications.js
│   │   ├── adminTransactions.js
│   │   ├── adminUsers.js
│   │   ├── adminVtpass.js
│   │   ├── auth.js
│   │   ├── banks.js
│   │   ├── bills.js
│   │   ├── cards.js
│   │   ├── conversations.js
│   │   ├── flutterwaveWebhook.js
│   │   ├── notifications.js
│   │   ├── transactions.js
│   │   ├── user.js
│   │   ├── vtpassWebhook.js
│   │   └── wallet.js
│   ├── utils
│   │   ├── audit.js
│   │   ├── bankCache.js
│   │   ├── email.js
│   │   ├── flutterwave.js
│   │   ├── otp.js
│   │   ├── pin.js
│   │   ├── realtime.js
│   │   ├── secureCookie.js
│   │   ├── securityQuestionGuard.js
│   │   ├── securityQuestions.js
│   │   ├── tokens.js
│   │   ├── validation.js
│   │   └── vtpass.js
│   └── .env.example
├── src
│   ├── app
│   │   ├── components
│   │   ├── pages
│   │   └── App.tsx
│   ├── assets
│   │   ├── 61cbe5280662981bea16f7f38bf0c960e6771934.png
│   │   ├── 6ac3722cf4af4b2d03201b2697dbdca66445c093.png
│   │   ├── b9108132bf9f22632bdcaf3b29608d6849dfc9e6.png
│   │   └── c7c536e71288c27ccbb335d360d0c2412a2b1846.png
│   ├── contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── imports
│   │   ├── AddMoney1.tsx
│   │   ├── GetStarted25.tsx
│   │   ├── GetStarted28.tsx
│   │   ├── HomeScreen1.tsx
│   │   ├── HomeScreen2.tsx
│   │   ├── HomeScreen3.tsx
│   │   ├── SendMoney1.tsx
│   │   ├── SendMoney3.tsx
│   │   ├── SendMoneyENairaAccount10.tsx
│   │   ├── svg-5dxrdqcxaq.ts
│   │   ├── svg-64tho7mni2.ts
│   │   ├── svg-ahnohum2b2.ts
│   │   ├── svg-f7p5ewh85z.ts
│   │   ├── svg-ff7h4i2dm6.ts
│   │   ├── svg-i5mky3xghy.ts
│   │   ├── svg-mdqj20rpv.ts
│   │   ├── svg-ooamoaf0rm.ts
│   │   ├── svg-y7lrupy3pa.ts
│   │   ├── svg-z0fnpe5ym5.ts
│   │   └── Transactions4.tsx
│   ├── services
│   │   └── api.ts
│   ├── styles
│   │   ├── fonts.css
│   │   ├── index.css
│   │   ├── tailwind.css
│   │   └── theme.css
│   ├── types
│   │   └── bills.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env
├── .env.example
├── .gitignore
├── API.md
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── default_shadcn_theme.css
├── DEPLOYMENT.md
├── env.d.ts
├── ENVIRONMENT.md
├── GOVERNANCE.md
├── index.html
├── LICENSE.md
├── NOTICES.md
├── package.json
├── package-lock.json
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── README.md
├── ROADMAP.md
├── SECURITY.md
├── server.js
├── SUPPORT.md
├── TROUBLESHOOTING.md
└── vite.config.ts
```

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

## Flutterwave Emphasis
Flutterwave is the only supported virtual card provider in this project.

## Security
Please read `SECURITY.md` for reporting and hardening guidance.

## Contributing
This repository is proprietary. See `CONTRIBUTING.md` for contribution rules and access requirements.

## Changelog
See `CHANGELOG.md`.
