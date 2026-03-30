# API Overview

This is a high-level overview of available routes. For full request/response schemas, use Swagger (`/api-docs`) when enabled.

## Public API Prefixes
Two public surfaces are exposed:
- `/api/*` for server-to-server access
- `/app/*` for browser-facing access via the proxy layer

The same routes exist under both prefixes (for example, `/api/auth` and `/app/api/auth`).

## Core Routes
- Auth: `/api/auth`
- Users: `/api/user`
- Wallet: `/api/wallet`
- Bills: `/api/bills`
- Transactions: `/api/transactions`
- Banks: `/api/banks`
- Cards: `/api/cards`
- Notifications: `/api/notifications`
- Conversations: `/api/conversations`

## Admin Routes
- Admin Auth: `/api/admin/auth`
- Admin Users: `/api/admin/users`
- Admin Bills: `/api/admin/bills`
- Admin Transactions: `/api/admin/transactions`
- Admin Management: `/api/admin/manage`
- Admin Audit: `/api/admin/audit`
- Admin Finance: `/api/admin/finance`
- Admin Notifications: `/api/admin/notifications`
- Admin Conversations: `/api/admin/conversations`
- Admin VTpass: `/api/admin/vtpass`
- Admin Flutterwave: `/api/admin/flutterwave`

## Webhooks
- Flutterwave: `/api/flutterwave/webhook`
- VTpass: `/api/vtpass/webhook`

## Swagger
If enabled, Swagger is available at:
- `/api-docs`
- `/api-docs.json`
