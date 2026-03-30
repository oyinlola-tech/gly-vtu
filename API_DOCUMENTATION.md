# GLY VTU API Documentation

Complete API reference for the GLY VTU Nigerian Fintech Application.

## Base URL
```
https://api.glyvtu.ng
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+2348012345678",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "123456",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+2348012345678",
    "accountNumber": "8085472417",
    "kycLevel": 0,
    "hasPin": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Login
Authenticate user and get access token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "123456",
    "name": "John Doe",
    "email": "user@example.com",
    "accountNumber": "8085472417",
    "kycLevel": 2,
    "hasPin": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Verify Device (OTP)
Verify user device with OTP sent to phone/email.

**Endpoint:** `POST /api/auth/verify-device`

**Request Body:**
```json
{
  "code": "123456",
  "userId": "123456"
}
```

---

### Forgot Password
Request password reset OTP.

**Endpoint:** `POST /api/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

---

### Reset Password
Reset password with OTP.

**Endpoint:** `POST /api/auth/reset-password`

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

---

### Set Transaction PIN
Set 4-digit transaction PIN.

**Endpoint:** `POST /api/auth/set-pin`

**Request Body:**
```json
{
  "pin": "1234"
}
```

---

### Verify Transaction PIN
Verify PIN before sensitive operations.

**Endpoint:** `POST /api/auth/verify-pin`

**Request Body:**
```json
{
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PIN verified"
}
```

---

## 👤 User Endpoints

### Get User Profile
Get authenticated user's profile.

**Endpoint:** `GET /api/user/profile`

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "123456",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+2348085472417",
    "accountNumber": "8085472417",
    "kycLevel": 2,
    "hasPin": true,
    "bvn": "22144455667",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### Submit KYC
Submit KYC information for verification.

**Endpoint:** `PUT /api/user/kyc`

**Request Body (Level 1 - Basic):**
```json
{
  "level": 1,
  "dateOfBirth": "1990-01-15",
  "address": "123 Lagos Street, Victoria Island"
}
```

**Request Body (Level 2 - Full):**
```json
{
  "level": 2,
  "bvn": "22144455667",
  "nin": "12345678901",
  "dateOfBirth": "1990-01-15",
  "address": "123 Lagos Street, Victoria Island"
}
```

---

## 💰 Wallet Endpoints

### Get Wallet Balance
Get user's current wallet balance.

**Endpoint:** `GET /api/wallet/balance`

**Response:**
```json
{
  "success": true,
  "balance": 20000000.00,
  "currency": "NGN",
  "lastUpdated": "2024-03-29T10:30:00Z"
}
```

---

### Send Money
Transfer money to another account.

**Endpoint:** `POST /api/wallet/send`

**Request Body:**
```json
{
  "recipientType": "bank",
  "amount": 5000.00,
  "recipient": "2007895421",
  "bankCode": "UBA",
  "narration": "Payment for services",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "TXN1234567890",
    "reference": "NGS000000667911237829202",
    "amount": 5000.00,
    "recipient": "2007895421",
    "status": "successful",
    "timestamp": "2024-03-29T12:35:00Z"
  }
}
```

---

### Get Transactions
Get user transaction history with filters.

**Endpoint:** `GET /api/wallet/transactions`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by "credit" or "debit"
- `startDate` (string): Filter from date (ISO 8601)
- `endDate` (string): Filter to date (ISO 8601)

**Example:** `GET /api/wallet/transactions?page=1&limit=20&type=debit`

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": "1",
      "type": "credit",
      "amount": 5000.00,
      "description": "Money received from Umaru Abubakar",
      "recipient": "Umaru Abubakar",
      "status": "successful",
      "timestamp": "2024-03-29T09:33:00Z",
      "reference": "NGS000000667911237829202"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

### Get Transaction Details
Get details of a specific transaction.

**Endpoint:** `GET /api/wallet/transaction/:id`

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "1",
    "type": "debit",
    "amount": 2500.00,
    "description": "Transfer to Bank Account",
    "recipient": "NGOZI UCHE",
    "bank": "UNITED BANK OF AFRICA PLC",
    "accountNumber": "2007895421",
    "status": "successful",
    "timestamp": "2024-03-29T12:35:00Z",
    "reference": "NGS000000667911237829202",
    "narration": "Money for transport"
  }
}
```

---

## 💳 Bills Payment Endpoints

### Get Service Providers
Get list of providers for a service type.

**Endpoint:** `GET /api/bills/providers?type={type}`

**Parameters:**
- `type`: `airtime`, `data`, `tv`, or `electricity`

**Response:**
```json
{
  "success": true,
  "providers": [
    {
      "code": "MTN",
      "name": "MTN Nigeria",
      "logo": "https://..."
    },
    {
      "code": "GLO",
      "name": "Glo Mobile",
      "logo": "https://..."
    }
  ]
}
```

---

### Get Data Plans
Get available data plans for a network.

**Endpoint:** `GET /api/bills/data-plans?provider={provider}`

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "code": "1GB",
      "name": "1GB - 1 Day",
      "amount": 300
    },
    {
      "code": "5GB",
      "name": "5GB - 30 Days",
      "amount": 1500
    }
  ]
}
```

---

### Buy Airtime
Purchase airtime.

**Endpoint:** `POST /api/bills/airtime`

**Request Body:**
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "amount": 1000,
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "TXN1234567890",
    "reference": "NGS000000667911237829204",
    "network": "MTN",
    "phone": "08012345678",
    "amount": 1000,
    "status": "successful",
    "timestamp": "2024-03-29T15:20:00Z"
  }
}
```

---

### Buy Data
Purchase data bundle.

**Endpoint:** `POST /api/bills/data`

**Request Body:**
```json
{
  "network": "MTN",
  "phone": "08012345678",
  "plan": "5GB",
  "amount": 1500,
  "pin": "1234"
}
```

---

### Pay TV Subscription
Pay for TV subscription.

**Endpoint:** `POST /api/bills/tv`

**Request Body:**
```json
{
  "provider": "DSTV",
  "smartCardNumber": "1234567890",
  "package": "DSTV_PREMIUM",
  "amount": 21000,
  "pin": "1234"
}
```

---

### Pay Electricity
Pay electricity bill.

**Endpoint:** `POST /api/bills/electricity`

**Request Body:**
```json
{
  "provider": "EKEDC",
  "meterNumber": "12345678901",
  "meterType": "prepaid",
  "amount": 5000,
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "TXN1234567890",
    "reference": "NGS000000667911237829205",
    "token": "12345678901234567890",
    "provider": "EKEDC",
    "meterNumber": "12345678901",
    "amount": 5000,
    "status": "successful",
    "timestamp": "2024-03-29T16:00:00Z"
  }
}
```

---

### Verify Meter Number
Verify meter number before payment.

**Endpoint:** `POST /api/bills/verify-meter`

**Request Body:**
```json
{
  "provider": "EKEDC",
  "meterNumber": "12345678901",
  "meterType": "prepaid"
}
```

**Response:**
```json
{
  "success": true,
  "customer": {
    "name": "VICTOR JIMOH",
    "address": "123 Lagos Street, VI",
    "meterNumber": "12345678901"
  }
}
```

---

## 🏦 Banks Endpoints

### Get Banks List
Get list of all supported banks.

**Endpoint:** `GET /api/banks`

**Response:**
```json
{
  "success": true,
  "banks": [
    {
      "code": "UBA",
      "name": "United Bank of Africa",
      "logo": "https://..."
    },
    {
      "code": "GTB",
      "name": "GTBank",
      "logo": "https://..."
    }
  ]
}
```

---

### Resolve Account Number
Verify and get account name.

**Endpoint:** `POST /api/banks/resolve-account`

**Request Body:**
```json
{
  "accountNumber": "2007895421",
  "bankCode": "UBA"
}
```

**Response:**
```json
{
  "success": true,
  "accountName": "VICTOR JIMOH",
  "accountNumber": "2007895421",
  "bankCode": "UBA"
}
```

---

## 👥 Admin Endpoints

### Admin Login
Authenticate admin user.

**Endpoint:** `POST /api/admin/auth/login`

**Request Body:**
```json
{
  "email": "admin@glyvtu.ng",
  "password": "AdminPass123!"
}
```

---

### Get Finance Overview
Get platform financial overview.

**Endpoint:** `GET /api/admin/finance/overview`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBalance": 150000000,
    "totalUsers": 12450,
    "totalTransactions": 45678,
    "revenue": 5000000
  }
}
```

---

### Get All Users
Get list of all users with filters.

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `status` (string): "active", "suspended", "pending"
- `kycLevel` (number): 0, 1, or 2

---

### Get All Transactions
Get all platform transactions.

**Endpoint:** `GET /api/admin/transactions`

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `type` (string): "credit" or "debit"
- `status` (string): "successful", "failed", "pending"

---

### Approve KYC
Approve user KYC submission.

**Endpoint:** `PUT /api/admin/kyc/:userId/approve`

**Request Body:**
```json
{
  "level": 2,
  "approved": true
}
```

---

## 📊 Webhooks

### Monnify Webhook
Receive payment notifications from Monnify.

**Endpoint:** `POST /api/monnify/webhook`

**Request Body (from Monnify):**
```json
{
  "eventType": "SUCCESSFUL_TRANSACTION",
  "transactionReference": "MNFY|20|20240329123456|000001",
  "paymentReference": "1234567890",
  "amountPaid": "5000.00",
  "totalPayable": "5000.00",
  "settlementAmount": "4950.00",
  "paidOn": "2024-03-29T12:34:56.000Z",
  "paymentStatus": "PAID",
  "paymentDescription": "Wallet funding",
  "currency": "NGN",
  "paymentMethod": "CARD",
  "product": {
    "type": "RESERVED_ACCOUNT",
    "reference": "user-123456"
  },
  "accountDetails": {
    "accountName": "GLY VTU - John Doe",
    "accountNumber": "8085472417",
    "bankName": "Wema Bank",
    "bankCode": "035"
  },
  "customer": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid request parameters",
  "message": "Email is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

API requests are rate limited:
- **Authentication endpoints:** 5 requests per minute
- **Transaction endpoints:** 10 requests per minute
- **Other endpoints:** 60 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1640995200
```

---

## Testing

### Test Credentials

**User Account:**
- Email: `test@glyvtu.ng`
- Password: `Test123!`
- PIN: `1234`

**Admin Account:**
- Email: `admin@glyvtu.ng`
- Password: `Admin123!`

### Test Data
All test endpoints use mock data and do not perform real transactions.

---

## Support

For API support, contact:
- Email: support@glyvtu.ng
- Phone: +234 800 000 0000
- Documentation: https://docs.glyvtu.ng

---

**Last Updated:** March 29, 2024
**API Version:** 1.0.0
