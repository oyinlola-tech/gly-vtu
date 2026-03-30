# Troubleshooting

## API returns 403 for `/api/*` in browser
Direct browser access to `/api/*` is blocked. Use `/app/api/*` via the proxy layer.

## CORS blocked
Check `CORS_ORIGIN` in `.env` and ensure the requesting origin is listed.

## Swagger not available
Swagger can be disabled with `ENABLE_SWAGGER=false`. In production, missing swagger output will not be auto-generated.

## Database init failed
Verify database credentials and that MySQL is running. In development, the UI can still run without DB; in production the server exits.

## Vite proxy errors
Ensure the API server is running on the same port configured in the Vite proxy (default `3000`).
