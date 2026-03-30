# Architecture

## Confidentiality and Authorized Access
The Software is proprietary and confidential. You may not disclose, share, or make any part of the codebase available to third parties without prior written authorization from the owner. Use is permitted only to individuals or entities expressly granted access by the owner.

## Overview
GLY VTU is a full-stack VTU platform with a Node.js/Express backend and a React/Vite frontend. The backend serves APIs, static user/admin portals, and WebSocket connectivity.

## High-Level Components
- **API Server** (`server.js`): Express app with security middleware, rate limiting, and route mounting.
- **Backend Modules** (`backend/`):
  - `config/`: Database and environment configuration.
  - `middleware/`: Auth, CSRF, and rate limiting middleware.
  - `routes/`: REST endpoints for auth, users, wallet, bills, cards, admin, and webhooks.
  - `utils/`: helpers like bank cache, realtime wiring, and security utilities.
- **Frontend** (`src/`): Vite-powered React app, proxied to `/app/*` routes during development.

## Security Layers
The backend includes:
- Helmet for hardened headers
- CSRF protection
- CORS allowlist
- Global and endpoint-specific rate limits
- Direct browser access blocked for `/api/*` (public surface is `/app/*`)

## Integrations
Configured in `.env` and used in routes/utilities:
- VTpass (bills and utilities)
- Flutterwave (virtual cards)
- SMTP (emails)

## Deployment Model
In production, the Express server serves static user/admin portals and exposes `/app/*` proxy routes for browser-facing API access.
