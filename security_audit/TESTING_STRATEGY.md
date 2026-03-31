# Testing Strategy & CI/CD Automation

**Last Updated**: March 31, 2026  
**Framework**: Jest (Backend), Vitest (Frontend)  
**CI/CD Pipeline**: GitHub Actions (recommended) or GitLab CI

---

## Overview

This document outlines the comprehensive testing strategy for the GLY-VTU fintech application, covering unit tests, integration tests, end-to-end tests, and security testing. The goal is to maintain code quality, prevent regressions, and ensure security controls remain effective.

**Testing Goals**:
- ✅ 80%+ code coverage on backend routes and utils
- ✅ 70%+ code coverage on frontend components and hooks
- ✅ All payment flows covered by integration tests
- ✅ Critical security paths covered by security tests
- ✅ Zero production regressions via pre-deployment testing

---

## 1. Unit Testing

### Backend Unit Tests (Jest)

**Test Structure**:
```
backend/
  __tests__/
    utils/
      encryption.test.js
      tokens.test.js
      pin.test.js
      anomalies.test.js
      logger.test.js
    middleware/
      auth.test.js
      csrf.test.js
      permissions.test.js
      requestValidation.test.js
```

**Critical Files Requiring Tests**:

#### 1.1 Encryption Utils (`backend/utils/encryption.test.js`)
```javascript
describe('Encryption Utilities', () => {
  // Test PII encryption/decryption round-trip
  test('encryptPII and decryptPII round-trip', () => {
    const plaintext = 'john@example.com';
    const userId = 'user123';
    const encrypted = encryptPII(plaintext, userId);
    const decrypted = decryptPII(encrypted, userId);
    expect(decrypted).toBe(plaintext);
  });

  // Test that different keys fail decryption
  test('decryption fails with wrong user ID', () => {
    const encrypted = encryptPII('secret@data', 'user1');
    expect(() => decryptPII(encrypted, 'user2')).toThrow();
  });

  // Test JSON encryption
  test('encryptJson handles complex objects', () => {
    const obj = { flutterwave_customer_id: 12345, verified: true };
    const encrypted = encryptJson(obj, 'user123');
    const decrypted = JSON.parse(decryptPII(encrypted, 'user123'));
    expect(decrypted).toEqual(obj);
  });

  // Test hash functions
  test('hashEmail produces consistent hash', () => {
    const email = 'test@example.com';
    const hash1 = hashEmail(email);
    const hash2 = hashEmail(email);
    expect(hash1).toBe(hash2);
  });
});
```

#### 1.2 Token Utils (`backend/utils/tokens.test.js`)
```javascript
describe('Token Management', () => {
  // Test JWT signing and verification
  test('signAccessToken creates valid JWT', () => {
    const payload = { sub: 'user123', type: 'user' };
    const token = signAccessToken(payload, JWT_SECRET);
    expect(token).toBeDefined();
    expect(token.split('.')).toHaveLength(3); // JWT = 3 parts
  });

  // Test refresh token rotation
  test('rotateRefreshToken creates new token in family', async () => {
    const oldToken = await issueRefreshToken({ userId: 'user123' });
    const newToken = await rotateRefreshToken(oldToken.raw, { userId: 'user123' });
    expect(newToken.familyId).toBe(oldToken.familyId);
    expect(newToken.raw).not.toBe(oldToken.raw); // Different token
  });

  // Test token revocation
  test('revokeRefreshToken marks token revoked', async () => {
    const token = await issueRefreshToken({ userId: 'user123' });
    await revokeRefreshToken(token.raw);
    const rotated = await rotateRefreshToken(token.raw, { userId: 'user123' });
    expect(rotated).toBeNull(); // Revoked tokens can't be rotated
  });
});
```

#### 1.3 PIN Verification (`backend/utils/pin.test.js`)
```javascript
describe('PIN Management', () => {
  // Test PIN validation rules
  test('PIN accepts only 6 digits', () => {
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('12345')).toBe(false); // Too short
    expect(isValidPin('1234567')).toBe(false); // Too long
    expect(isValidPin('ABC123')).toBe(false); // Non-digits
  });

  // Test PIN complexity rules
  test('PIN rejects sequential patterns', () => {
    expect(isValidPin('123456')).toBe(false); // Sequential
    expect(isValidPin('654321')).toBe(false); // Reverse sequential
  });

  // Test PIN lockout after failed attempts
  test('verifyTransactionPin locks after 5 failures', async () => {
    const userId = 'user123';
    for (let i = 0; i < 4; i++) {
      await expect(verifyTransactionPin(userId, '000000')).rejects.toThrow();
    }
    // 5th attempt should trigger lockout
    await expect(verifyTransactionPin(userId, '000000')).rejects.toThrow(/locked/i);
  });
});
```

#### 1.4 Anomaly Detection (`backend/utils/anomalies.test.js`)
```javascript
describe('Anomaly Detection', () => {
  // Test withdrawal amount threshold
  test('detects withdrawal > 500K NGN', async () => {
    const anomaly = await checkWithdrawalAnomaly({
      userId: 'user123',
      amount: 600000,
    });
    expect(anomaly.isAnomaly).toBe(true);
  });

  // Test withdrawal frequency threshold
  test('detects 3+ withdrawals in 60 mins', async () => {
    // Insert 3 transactions in last 60 minutes
    const anomaly = await checkWithdrawalAnomaly({
      userId: 'user123',
      amount: 100000,
      checkFrequency: true,
    });
    expect(anomaly.isAnomaly).toBe(true);
  });

  // Test device count threshold
  test('detects 5+ active devices', async () => {
    const anomaly = await checkDeviceCountAnomaly({
      userId: 'user123',
      newDeviceId: 'device6',
    });
    expect(anomaly.isAnomaly).toBe(true);
  });
});
```

### Frontend Unit Tests (Vitest)

**Test Structure**:
```
src/
  __tests__/
    components/
      PasswordStrengthIndicator.test.tsx
      SecurityAlert.test.tsx
    contexts/
      AuthContext.test.tsx
    hooks/
      useAuth.test.ts
    utils/
      passwordValidation.test.ts
```

**Example Test**:
```typescript
import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  test('shows weak for short passwords', () => {
    render(<PasswordStrengthIndicator password="123" />);
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  test('shows strong for complex passwords', () => {
    render(<PasswordStrengthIndicator password="MyP@ssw0rd123!" />);
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });
});
```

---

## 2. Integration Tests

### Backend Integration Tests

**Test Structure**:
```
backend/
  __tests__/
    integration/
      auth.integration.test.js
      wallet.integration.test.js
      bills.integration.test.js
      webhooks.integration.test.js
```

#### 2.1 Auth Flow (`auth.integration.test.js`)
```javascript
describe('Authentication Flow', () => {
  let agent; // Supertest agent for maintaining session

  beforeAll(async () => {
    agent = request(app); // Express app instance
  });

  test('register → login → access protected route', async () => {
    // Register
    const registerRes = await agent
      .post('/api/auth/register')
      .send({
        fullName: 'John Doe',
        email: 'john@test.com',
        phone: '2347012345678',
        password: 'SecurePassword123',
        dateOfBirth: '1990-01-01',
        agreedToTerms: true,
      });
    expect(registerRes.status).toBe(201);

    // Get CSRF token
    const csrfRes = await agent.get('/api/auth/csrf');
    const csrfToken = csrfRes.body.csrfToken;

    // Login
    const loginRes = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'john@test.com',
        password: 'SecurePassword123',
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();

    // Access protected route
    const protectedRes = await agent
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);
    expect(protectedRes.status).toBe(200);
    expect(protectedRes.body.email).toBe('john@test.com');
  });

  test('login with invalid credentials fails', async () => {
    const loginRes = await agent
      .post('/api/auth/login')
      .send({
        email: 'nonexistent@test.com',
        password: 'WrongPassword',
      });
    expect(loginRes.status).toBe(401);
  });
});
```

#### 2.2 Wallet Flow (`wallet.integration.test.js`)
```javascript
describe('Wallet Operations', () => {
  let userId, userToken, CSRF Token;

  beforeAll(async () => {
    // Register user and extract token
    [userId, userToken, csrfToken] = await setupTestUser();
  });

  test('check balance → send money → verify deduction', async () => {
    const agent = request(app);

    // Check initial balance
    const balanceRes = await agent
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${userToken}`);
    const initialBalance = balanceRes.body.balance;

    // Send money (requires PIN)
    const sendRes = await agent
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        to: 'recipient@test.com',
        amount: 10000,
        pin: '123456', // Assume PIN is set
      });
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.transactionId).toBeDefined();

    // Verify balance deducted
    const newBalanceRes = await agent
      .get('/api/wallet/balance')
      .set('Authorization', `Bearer ${userToken}`);
    expect(newBalanceRes.body.balance).toBe(initialBalance - 10000);
  });

  test('idempotent request prevents double charge', async () => {
    const agent = request(app);
    const idempotencyKey = crypto.randomUUID();

    const res1 = await agent
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        to: 'recipient@test.com',
        amount: 5000,
        pin: '123456',
      });
    expect(res1.status).toBe(200);
    const txId1 = res1.body.transactionId;

    // Retry with same idempotency key
    const res2 = await agent
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfToken)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({
        to: 'recipient@test.com',
        amount: 5000,
        pin: '123456',
      });
    expect(res2.status).toBe(200);
    expect(res2.body.transactionId).toBe(txId1); // Same transaction ID
  });
});
```

#### 2.3 Webhook Integration Test (`webhooks.integration.test.js`)
```javascript
describe('Webhook Processing', () => {
  test('Flutterwave webhook validates signature', async () => {
    const payload = {
      event: 'charge.completed',
      data: {
        id: 123,
        amount: 50000,
        currency: 'NGN',
        tx_ref: 'GLY-user123',
      },
    };

    const signature = generateFlutterwaveSignature(payload, FLW_SECRET_KEY);

    const res = await request(app)
      .post('/api/flutterwave/webhook')
      .set('verificationhash', signature)
      .send(payload);

    expect(res.status).toBe(200);
  });

  test('webhook with invalid signature is rejected', async () => {
    const payload = { /* ... */ };
    const invalidSignature = 'INVALID_SIGNATURE';

    const res = await request(app)
      .post('/api/flutterwave/webhook')
      .set('verificationhash', invalidSignature)
      .send(payload);

    expect(res.status).toBe(403);
  });
});
```

---

## 3. Security Testing

### 3.1 Authentication Security Tests

```javascript
describe('Security: Authentication', () => {
  test('expired token is rejected', async () => {
    // Create token that expires immediately
    const expiredToken = jwt.sign(
      { sub: 'user123', type: 'user' },
      JWT_SECRET,
      { expiresIn: '0s' }
    );

    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/expired|unauthorized/i);
  });

  test('token with wrong secret is rejected', async () => {
    const wrongToken = jwt.sign(
      { sub: 'user123', type: 'user' },
      'WRONG_SECRET',
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${wrongToken}`);

    expect(res.status).toBe(401);
  });

  test('token with wrong type is rejected', async () => {
    const adminToken = jwt.sign(
      { sub: 'admin123', type: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/user/profile')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});
```

### 3.2 CSRF Protection Tests

```javascript
describe('Security: CSRF Protection', () => {
  test('POST without CSRF token is rejected', async () => {
    const res = await request(app)
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        to: 'recipient@test.com',
        amount: 5000,
        pin: '123456',
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/csrf/i);
  });

  test('CSRF token mismatch is rejected', async () => {
    const agent = request(app);
    const csrfRes = await agent.get('/api/auth/csrf');
    const csrfToken = csrfRes.body.csrfToken;

    const res = await agent
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', 'WRONG_TOKEN')
      .send({
        to: 'recipient@test.com',
        amount: 5000,
        pin: '123456',
      });

    expect(res.status).toBe(403);
  });
});
```

### 3.3 Input Validation Security Tests

```javascript
describe('Security: Input Validation', () => {
  test('SQL injection attempt in email is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: "' OR '1'='1",
        password: 'anything',
      });

    expect(res.status).toBe(400); // Validation error
  });

  test('amount exceeding limit is rejected', async () => {
    const agent = request(app);
    const csrfRes = await agent.get('/api/auth/csrf');

    const res = await agent
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .set('X-CSRF-Token', csrfRes.body.csrfToken)
      .send({
        to: 'recipient@test.com',
        amount: 100_000_000, // Way over limit
        pin: '123456',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount|limit/i);
  });

  test('invalid PIN format is rejected', async () => {
    const res = await request(app)
      .post('/api/wallet/send')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        to: 'recipient@test.com',
        amount: 5000,
        pin: 'ABCDEF', // Non-digits
      });

    expect(res.status).toBe(400);
  });
});
```

---

## 4. End-to-End (E2E) Tests

**Framework**: Cypress or Playwright

**Critical User Journeys**:

### 4.1 Complete Registration & Login Flow
```javascript
// cypress/e2e/auth.cy.js
describe('User Registration & Login', () => {
  it('should register, verify email, and login', () => {
    cy.visit('http://localhost:3000/register');
    
    cy.get('input[name="fullName"]').type('John Doe');
    cy.get('input[name="email"]').type('john@example.com');
    cy.get('input[name="phone"]').type('2347012345678');
    cy.get('input[name="password"]').type('SecurePassword123!');
    cy.get('input[name="dateOfBirth"]').type('1990-01-01');
    cy.get('input[name="agreedToTerms"]').check();

    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/verify-device');

    // Verify email, set PIN, login, etc.
  });
});
```

### 4.2 Wallet Transaction Flow
```javascript
describe('Wallet Transaction', () => {
  it('should send money successfully', () => {
    cy.login('john@example.com', 'SecurePassword123!');
    cy.visit('http://localhost:3000/dashboard');
    
    cy.get('[data-testid="send-money"]').click();
    cy.get('input[name="recipient"]').type('jane@example.com');
    cy.get('input[name="amount"]').type('5000');
    cy.get('input[name="pin"]').type('123456');

    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/transaction-success');
  });
});
```

---

## 5. CI/CD Pipeline Configuration

### GitHub Actions Workflow (`.github/workflows/test-and-deploy.yml`)

```yaml
name: Test & Deploy

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: gly_vtu_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      # Backend tests
      - name: Run backend unit tests
        run: npm run test:backend
        env:
          NODE_ENV: test
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          DATABASE_URL: mysql://root:root@localhost/gly_vtu_test

      - name: Run backend integration tests
        run: npm run test:integration

      # Frontend tests
      - name: Run frontend unit tests
        run: npm run test:frontend

      # Security tests
      - name: Run security tests
        run: npm run test:security

      # Code coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
          token: ${{ secrets.CODECOV_TOKEN }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          # Deploy script here (Docker push, K8s deploy, etc.)
          ./scripts/deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### NPM Scripts (`package.json`)

```json
{
  "scripts": {
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "jest backend/__tests__/",
    "test:integration": "jest backend/__tests__/integration/ --testTimeout=10000",
    "test:security": "jest backend/__tests__/security/",
    "test:frontend": "vitest src/__tests__/",
    "test:e2e": "cypress run",
    "test:coverage": "jest --coverage",
    "lint": "eslint backend src",
    "type-check": "tsc --noEmit"
  }
}
```

---

## 6. Test Coverage Targets

| Area | Target | Current |
|------|--------|---------|
| Backend Routes | 80% | To be measured |
| Backend Utils | 85% | To be measured |
| Backend Middleware | 85% | To be measured |
| Frontend Components | 70% | To be measured |
| Frontend Hooks | 75% | To be measured |
| Overall | 80% | To be measured |

---

## 7. Security Testing Checklist

- [ ] SQL injection attempts blocked
- [ ] XSS payloads sanitized
- [ ] CSRF tokens validated
- [ ] Expired JWT tokens rejected
- [ ] Rate limiting enforced
- [ ] PIN lockout works after 5 failures
- [ ] Idempotency prevents duplicate charges
- [ ] Webhook signatures verified
- [ ] Webhook IP whitelist enforced
- [ ] Anomalies trigger security events
- [ ] Logs don't contain PII or secrets
- [ ] Admin permissions enforced correctly

---

## 8. Pre-Deployment Testing Procedure

1. **Run full test suite**: `npm test`
2. **Verify code coverage**: `npm run test:coverage` (>80%)
3. **Run security tests**: `npm run test:security`
4. **Run E2E tests**: `npm run test:e2e`
5. **Manual smoke tests** on staging:
   - Register new user
   - Login
   - Complete fund transfer
   - Verify wallet balance
   - Check audit logs
6. **Load testing** (optional, for critical deployments)
   - 100 concurrent users for 5 minutes
   - Monitor database, API response times
7. **Security scanning** (OWASP ZAP or similar)
   - Authenticated scan of all endpoints
   - Verify no sensitive data in responses

---

## 9. Maintenance

- **Weekly**: Run security scanning on staging
- **Monthly**: Review test coverage, add tests for new features
- **Quarterly**: Load test critical payment flows
- **Annually**: Full penetration test by external security firm