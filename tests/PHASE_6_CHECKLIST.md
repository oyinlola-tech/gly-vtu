# Phase 6 Test & Validation Checklist

This checklist is designed to be run after `.env` is fully configured.

## 0) Prerequisites
1. Confirm `.env` secrets are filled:
   - `JWT_SECRET`, `JWT_ADMIN_SECRET`, `PII_ENCRYPTION_KEY`, `PII_HASH_SECRET`, `COOKIE_ENC_SECRET`
   - `DB_PASSWORD`
   - `FLW_SECRET_KEY`, `FLW_WEBHOOK_HASH`, `FLW_WEBHOOK_IPS`
   - `VTPASS_API_KEY`, `VTPASS_SECRET_KEY`, `VTPASS_WEBHOOK_SECRET`, `VTPASS_WEBHOOK_IPS`
2. Start DB and confirm connection.

## 1) Start server
```bash
npm install
npm run dev
```

## 2) Auth & session
1. Register new user (OTP flow).
2. Login and confirm cookies + CSRF token.
3. Refresh token (verify CSRF required).
4. Logout and ensure cookies cleared.

## 3) Wallet & transfers
1. Check balance:
```bash
curl -s http://localhost:3000/app/api/wallet/balance
```
2. Internal transfer:
```bash
curl -s -X POST http://localhost:3000/app/api/wallet/send \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"amount":1000,"pin":"123456","to":"user@example.com","channel":"internal"}'
```
3. Self-transfer blocked (expect 400).

## 4) Bills & VTpass
1. Quote:
```bash
curl -s -X POST http://localhost:3000/app/api/bills/quote \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -d '{"providerCode":"mtn","amount":1000}'
```
2. Pay (pending -> webhook success/failed).
3. Webhook failed should refund (verify wallet balance).

## 5) Flutterwave webhook
1. Test signature validation.
2. Duplicate event ID returns OK without double-credit.
3. Amount > `TOPUP_MAX_AMOUNT` rejected.

## 6) KYC
1. Submit L2 then L3.
2. Check limits:
```bash
curl -s http://localhost:3000/app/api/user/kyc/limits
```

## 7) Admin
1. Admin login requires TOTP.
2. Held topup approve/reject uses idempotency and locks.
3. Admin adjustment approve uses locking and idempotency.

## 8) Frontend sanity
1. Login/Register/Wallet/Dashboard/Transactions render.
2. OTP and PIN paste behavior works.
3. Mobile layout sanity check.

