# Deployment Guide

## Summary
The Express server hosts the API and static user/admin portals. In production, run the API server and serve built frontend assets from the expected directories.

## Build and Serve
1. Install dependencies:
```
npm install
```

2. Build the frontend:
```
npm run build
```

3. Start the server:
```
node server.js
```

## Environment
Configure `.env` using `.env.example`. Ensure `JWT_SECRET`, `JWT_ADMIN_SECRET`, and database credentials are set to secure values in production.

## Reverse Proxy
If behind a reverse proxy (Nginx/Cloudflare), set:
- `TRUST_PROXY=1` (or appropriate hop count)

## Swagger
Disable Swagger in production by setting:
- `ENABLE_SWAGGER=false`

## Health/Dev Status
In non-production environments, `/dev-status` returns database readiness information.
