# GLY-VTU UI/UX Improvements & New Pages Implementation Guide

**Purpose:** Add security-focused pages and improve the overall user experience

---

## Overview

This guide outlines the new pages and UI components needed to complement the security audit improvements. These pages enhance user control over security, provide transparency on account activity, and implement best practices for fintech applications.

---

## Phase 1: Critical UI Pages (Week 1-2)

### 1. Security Dashboard Page
**Route:** `/dashboard/security`  
**Purpose:** Central hub for user security settings and alerts  
**Access:** Users > Settings > Security

#### Features:
- Display current active sessions with device info
- Login history with timestamps, IP addresses, device types
- Option to logout from specific devices
- Last login timestamp and location
- Account status indicators
- Quick access to 2FA setup

#### UI Structure:
```
┌─────────────────────────────────────────┐
│ Security Dashboard                      │
├─────────────────────────────────────────┤
│                                         │
│ ⚠️ ALERTS & NOTIFICATIONS              │
│ ├─ New login from device               │
│ ├─ Failed login attempts (3)           │
│ └─ Password change requested          │
│                                         │
│ ACTIVE SESSIONS                        │
│ ├─ Current Device (This Browser)       │
│ │  └─ Mac OS • Chrome • Last 5min     │
│ ├─ Mobile Device                        │
│ │  └─ iOS • Safari • Last 2 hours     │
│ │  [Logout from Device]                │
│ └─ Desktop                              │
│    └─ Windows • Firefox • Last 1 day   │
│    [Logout from Device]                │
│                                         │
│ ACCOUNT SECURITY                       │
│ ├─ Two-Factor Authentication: ✓ ON    │
│ ├─ Password Last Changed: 45 days ago │
│ │  [Change Password]                  │
│ └─ Security Questions: ✓ Configured   │
│    [Update]                            │
│                                         │
└─────────────────────────────────────────┘
```

#### Key Components:
```jsx
// src/pages/SecurityDashboard.tsx
import { useEffect, useState } from 'react';
import { api } from '../services/api';

export function SecurityDashboard() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      const [sessionsRes, alertsRes] = await Promise.all([
        api.get('/api/security/sessions'),
        api.get('/api/security/alerts')
      ]);
      setActiveSessions(sessionsRes.data.sessions);
      setAlerts(alertsRes.data.alerts);
    } catch (err) {
      console.error('Failed to load security data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutDevice = async (sessionId) => {
    await api.post(`/api/security/sessions/${sessionId}/logout`);
    loadSecurityData();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Security Dashboard</h1>
      
      {/* Alerts Section */}
      <SecurityAlertList alerts={alerts} />
      
      {/* Active Sessions */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Active Sessions</h2>
        {activeSessions.map(session => (
          <SessionCard
            key={session.id}
            session={session}
            isCurrent={session.isCurrentDevice}
            onLogout={() => handleLogoutDevice(session.id)}
          />
        ))}
      </div>

      {/* Account Security Settings */}
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Account Security</h2>
        <SecuritySettingsCard />
      </div>
    </div>
  );
}
```

---

### 2. Change Password Page
**Route:** `/settings/password`  
**Purpose:** Allow users to securely change their password  
**Access:** Settings > Password

#### Features:
- Current password verification
- New password with strength indicator
- Password confirmation field
- Show/hide password toggles
- Clear error messages
- Logout after password change for security

#### UI Structure:
```
┌──────────────────────────────────────┐
│ Change Password                      │
├──────────────────────────────────────┤
│                                      │
│ Current Password                     │
│ [●●●●●●●●]                           │
│                                      │
│ New Password                         │
│ [●●●●●●●●]                           │
│ ▓▓▓▓▓░░░ Good                        │
│ □ Contains uppercase letters         │
│ ☑ Contains numbers                   │
│ ☑ At least 8 characters              │
│                                      │
│ Confirm Password                     │
│ [●●●●●●●●]                           │
│                                      │
│ [Cancel]  [Change Password]          │
│                                      │
│ Note: You'll be logged out for       │
│ security purposes.                  │
│                                      │
└──────────────────────────────────────┘
```

#### Implementation:
```jsx
// src/pages/ChangePassword.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

export function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/user/change-password', {
        currentPassword,
        newPassword
      });

      // Success modal + logout
      showSuccessModal(() => {
        api.post('/api/auth/logout').finally(() => {
          navigate('/login');
        });
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Change Password</h1>

      {error && <AlertBox type="error" message={error} />}

      <div>
        <label className="block text-sm font-medium mb-2">Current Password</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
        <PasswordStrengthIndicator password={newPassword} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Confirm New Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Changing...' : 'Change Password'}
      </button>
    </form>
  );
}
```

---

### 3. Two-Factor Authentication Setup Page
**Route:** `/settings/2fa`  
**Purpose:** Set up and manage two-factor authentication  
**Access:** Settings > Security > 2FA

#### Features:
- Setup TOTP with authenticator app
- QR code generation
- Manual secret key display
- Backup codes generation and download
- Disable 2FA with verification

#### UI Structure:
```
┌──────────────────────────────────────┐
│ Two-Factor Authentication           │
├──────────────────────────────────────┤
│                                      │
│ ✓ 2FA is ENABLED                    │
│                                      │
│ 1. Authenticator App Setup          │
│    [Scan QR Code in authenticator]  │
│    ┌────────────────────┐           │
│    │                    │           │
│    │    (QR CODE)       │           │
│    │                    │           │
│    └────────────────────┘           │
│                                      │
│    Manual Entry:                    │
│    Secret: gxbo4u6i5dpc2ljs        │
│    [Copy]                            │
│                                      │
│ 2. Verify Setup                     │
│    Enter 6-digit code:              │
│    [123456]                          │
│    [Verify & Enable]                │
│                                      │
│ 3. Backup Codes                     │
│    Save these codes in a safe place │
│    Code 1: xxxx-xxxx-xxxx           │
│    Code 2: xxxx-xxxx-xxxx           │
│    [Download PDF] [Copy All]        │
│                                      │
│ [Disable 2FA]                       │
│                                      │
└──────────────────────────────────────┘
```

#### Implementation:
```jsx
// src/pages/TwoFactorAuthSetup.tsx
import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import { api } from '../services/api';

export function TwoFactorAuthSetup() {
  const [status, setStatus] = useState('loading'); // loading | disabled | setup | enabled
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1: Display QR, 2: Verify, 3: Backup codes

  useEffect(() => {
    loadTOTPStatus();
  }, []);

  const loadTOTPStatus = async () => {
    try {
      const res = await api.get('/api/user/totp/status');
      setStatus(res.data.enabled ? 'enabled' : 'disabled');
    } catch (err) {
      console.error('Failed to load 2FA status', err);
    }
  };

  const initiate2FA = async () => {
    try {
      const res = await api.post('/api/user/totp/setup');
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setStatus('setup');
      setStep(1);
    } catch (err) {
      console.error('Failed to setup 2FA', err);
    }
  };

  const verify2FA = async () => {
    try {
      const res = await api.post('/api/user/totp/verify', {
        code: verificationCode
      });
      setBackupCodes(res.data.backupCodes);
      setStep(3);
    } catch (err) {
      console.error('Verification failed', err);
    }
  };

  const disable2FA = async () => {
    if (window.confirm('Are you sure? You will lose 2FA protection.')) {
      try {
        await api.post('/api/user/totp/disable');
        setStatus('disabled');
      } catch (err) {
        console.error('Failed to disable 2FA', err);
      }
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>

      {status === 'enabled' && (
        <div className="bg-green-50 border border-green-200 rounded p-4">
          <h2 className="font-semibold text-green-800">✓ 2FA is Enabled</h2>
          <p className="text-sm text-green-700 mt-2">Your account is protected with two-factor authentication.</p>
          <button
            onClick={disable2FA}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Disable 2FA
          </button>
        </div>
      )}

      {status === 'disabled' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
          <h2 className="font-semibold text-yellow-800">⚠️ 2FA is Disabled</h2>
          <p className="text-sm text-yellow-700 mt-2">Enable two-factor authentication for better security.</p>
          <button
            onClick={initiate2FA}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Setup 2FA
          </button>
        </div>
      )}

      {status === 'setup' && (
        <div className="space-y-4">
          {step === 1 && (
            <>
              <div className="bg-white rounded p-4 border">
                <h3 className="font-semibold mb-2">1. Scan QR Code</h3>
                <p className="text-sm text-gray-600 mb-4">Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator):</p>
                <div className="flex justify-center">
                  <QRCode value={qrCode} size={200} />
                </div>
              </div>

              <div className="bg-white rounded p-4 border">
                <h3 className="font-semibold mb-2">Manual Entry (if QR doesn't work)</h3>
                <p className="text-sm text-gray-600 mb-2">Secret Key:</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-gray-100 p-2 text-sm rounded">{secret}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(secret)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next: Verify Code
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="bg-white rounded p-4 border">
                <h3 className="font-semibold mb-4">2. Verify Setup</h3>
                <label className="block text-sm font-medium mb-2">Enter 6-digit code from your authenticator app:</label>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-center text-2xl tracking-widest"
                  placeholder="000000"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  onClick={verify2FA}
                  className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Verify & Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-semibold text-green-800 mb-2">✓ 2FA Enabled!</h3>
                <p className="text-sm text-green-700">Save your backup codes in a safe place.</p>
              </div>

              <div className="bg-white rounded p-4 border">
                <h3 className="font-semibold mb-2">3. Backup Codes</h3>
                <p className="text-sm text-gray-600 mb-3">Save these codes somewhere safe. You can use them to log in if you lose access to your authenticator.</p>
                <div className="space-y-2 font-mono text-sm bg-gray-50 p-3 rounded">
                  {backupCodes.map((code, i) => (
                    <div key={i}>{code}</div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const text = backupCodes.join('\n');
                    const blob = new Blob([text], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'backup-codes.txt';
                    a.click();
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Download
                </button>
                <button
                  onClick={() => loadTOTPStatus()}
                  className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### 4. Transaction History Page with Filters
**Route:** `/transactions`  
**Purpose:** View detailed transaction history with advanced filtering  
**Access:** Wallet > Transactions or direct navigation

#### Features:
- Advanced date range filtering
- Amount range filtering
- Transaction type filtering (send, receive, bills, etc.)
- Status filtering (success, pending, failed)
- Search by reference or recipient
- Sort by date, amount, status
- Export to CSV/PDF
- Transaction detail modal
- Dispute/report button

#### Key Components:
```jsx
// src/pages/TransactionHistory.tsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';
import TransactionStatusBadge from '../components/TransactionStatusBadge';

export function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: null,
    dateTo: null,
    minAmount: '',
    maxAmount: '',
    type: 'all',
    status: 'all',
    search: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [filters]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/transactions', { params: filters });
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Date', 'Type', 'Amount', 'Status', 'Reference'],
      ...transactions.map(t => [
        new Date(t.createdAt).toLocaleDateString(),
        t.type,
        `₦${t.amount}`,
        t.status,
        t.reference
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow space-y-4">
        <h2 className="font-semibold text-lg">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Date From</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Date To</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Min Amount</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Max Amount</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="999999"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All Types</option>
              <option value="transfer">Transfer</option>
              <option value="bills">Bills</option>
              <option value="sent">Money Sent</option>
              <option value="received">Money Received</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">All Status</option>
              <option value="success">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Search Reference</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Transaction ID..."
            />
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No transactions found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Reference</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">{tx.type}</td>
                  <td className="px-6 py-4 text-sm font-semibold">₦{tx.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <TransactionStatusBadge status={tx.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tx.reference}</td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-blue-600 hover:underline text-sm">Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

---

## Phase 2: Additional Security Pages (Week 3-4)

### 5. KYC Verification Page
### 6. Card Management Page
### 7. Beneficiary Management
### 8. Account Closure Page
### 9. Security Alerts Feed

*(Implementations available in full document)*

---

## Design System Updates

### Color Palette for Security States
```css
/* Success/Secure */
--color-secure: #22c55e;
--color-secure-light: #dcfce7;

/* Warning/Risk */
--color-warning: #eab308;
--color-warning-light: #fef3c7;

/* Error/Critical */
--color-error: #ef4444;
--color-error-light: #fee2e2;

/* Pending/Neutral */
-- color-pending: #3b82f6;
--color-pending-light: #dbeafe;
```

### Icons to Add
- Lock icon (secure)
- Unlock icon (not secure)
- Shield icon (protection)
- Warning triangle (alert)
- Check mark (verified)
- X mark (failed)
- Clock icon (pending)
- Device icons (phone, laptop, tablet)
- Location pin (IP location)

---

## Component Library Recommendations

Install these packages for enhanced UI:

```bash
npm install recharts            # Data visualization
npm install react-hook-form     # Form handling
npm install react-hot-toast     # Notifications
npm install clsx                # Class name utilities
npm install date-fns            # Date formatting
npm install qrcode.react        # QR code generation
npm install react-icons         # Icon library
```

---

## Navigation Menu Updates

Add security-focused menu items:

```jsx
// Update main navigation
const securityMenu = [
  { label: 'Security Dashboard', path: '/dashboard/security', icon: 'shield' },
  { label: 'Change Password', path: '/settings/password', icon: 'lock' },
  { label: '2FA Setup', path: '/settings/2fa', icon: 'fingerprint' },
  { label: 'Auth Sessions', path: '/settings/sessions', icon: 'devices' },
  { label: 'Security Alerts', path: '/alerts', icon: 'bell' }
];
```

---

## Summary

These UI improvements provide users with:

1. **Transparency**: Full visibility into account activity
2. **Control**: Ability to manage devices, passwords, and security settings
3. **Confidence**: Clear security indicators and alerts
4. **Compliance**: Support for KYC and regulatory requirements
5. **Best Practices**: Implementation of fintech UX patterns

All components are built with security in mind, avoiding exposing sensitive data and implementing proper error handling and validation.
