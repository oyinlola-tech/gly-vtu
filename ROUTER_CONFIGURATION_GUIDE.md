# Router Configuration Guide

This guide shows how to integrate the new pages created during the security audit UI phase. Add these imports and routes to your main `App.tsx` or router configuration file.

**Imports**

```tsx
import { SecurityDashboard } from './app/pages/SecurityDashboard';
import { PasswordChangePage } from './app/pages/PasswordChangePage';
import { AccountSettingsPage } from './app/pages/AccountSettingsPage';
import { DeviceManagement } from './app/pages/DeviceManagement';
import { TransactionDetailsPage } from './app/pages/TransactionDetailsPage';
import { TransactionHistoryPage } from './app/pages/TransactionHistoryPage';
import { TwoFactorAuthPage } from './app/pages/TwoFactorAuthPage';
import { SecurityActivityPage } from './app/pages/SecurityActivityPage';
import { WalletManagementPage } from './app/pages/WalletManagementPage';
import {
  ErrorPage,
  NotFoundPage,
  UnauthorizedPage,
  ForbiddenPage,
  ServerErrorPage,
  TooManyRequestsPage,
  ServiceUnavailablePage,
} from './app/pages/ErrorPages';
```

**Route Configuration (React Router v6 Example)**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... existing routes ... */}

        {/* Security Pages */}
        <Route path="/security" element={<SecurityDashboard />} />
        <Route path="/security/dashboard" element={<SecurityDashboard />} />
        <Route path="/security/password" element={<PasswordChangePage />} />
        <Route path="/security/devices" element={<DeviceManagement />} />
        <Route path="/security/two-factor" element={<TwoFactorAuthPage />} />
        <Route path="/security/activity" element={<SecurityActivityPage />} />

        {/* Account Pages */}
        <Route path="/account" element={<AccountSettingsPage />} />
        <Route path="/account/settings" element={<AccountSettingsPage />} />

        {/* Transaction Pages */}
        <Route path="/transactions" element={<TransactionHistoryPage />} />
        <Route path="/transactions/history" element={<TransactionHistoryPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailsPage />} />

        {/* Wallet Pages */}
        <Route path="/wallet" element={<WalletManagementPage />} />

        {/* Error Pages */}
        <Route path="/error/401" element={<UnauthorizedPage />} />
        <Route path="/error/403" element={<ForbiddenPage />} />
        <Route path="/error/404" element={<NotFoundPage />} />
        <Route path="/error/500" element={<ServerErrorPage />} />
        <Route path="/error/429" element={<TooManyRequestsPage />} />
        <Route path="/error/503" element={<ServiceUnavailablePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Navigation Menu Updates**

```ts
// Security
{
  label: 'Security',
  icon: Shield,
  items: [
    { label: 'Dashboard', path: '/security', icon: Shield },
    { label: 'Password', path: '/security/password', icon: Lock },
    { label: 'Two-Factor Auth', path: '/security/two-factor', icon: Smartphone },
    { label: 'Devices', path: '/security/devices', icon: Monitor },
    { label: 'Activity Log', path: '/security/activity', icon: Eye },
  ]
}

// Account
{
  label: 'Account',
  icon: User,
  items: [
    { label: 'Settings', path: '/account/settings', icon: Settings },
    { label: 'Profile', path: '/account/settings', icon: User },
  ]
}

// Wallet
{
  label: 'Wallet',
  icon: Wallet,
  items: [
    { label: 'Balance', path: '/wallet', icon: Wallet },
    { label: 'Transactions', path: '/transactions', icon: History },
  ]
}
```

**Protected Route Wrapper**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

interface ProtectedRouteProps {
  element: React.ReactNode;
  requiresTwoFactor?: boolean;
  requiredRole?: 'admin' | 'user';
}

export function ProtectedRoute({
  element,
  requiresTwoFactor = false,
  requiredRole = 'user',
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiresTwoFactor && !user?.twoFactorEnabled) {
    return <Navigate to="/security/two-factor" replace />;
  }

  if (requiredRole === 'admin' && user?.role !== 'admin') {
    return <ForbiddenPage />;
  }

  return element;
}

// Usage
// <Route path="/security" element={<ProtectedRoute element={<SecurityDashboard />} />} />
```

**API Methods Required (`src/services/api.ts`)**

User API:
1. `getProfile()` - Get user profile information
1. `updateProfile(data)` - Update user profile
1. `getWalletInfo()` - Get wallet balance and account details
1. `getTopupOptions()` - Get available topup methods
1. `initiateTopup(providerId, amount)` - Start topup process
1. `getTransactions()` - Get transaction history
1. `getSecurityStatus()` - Get security status overview
1. `getSecurityEvents()` - Get security event log
1. `getSessions()` - Get active device sessions
1. `revokeSession(sessionId)` - Revoke a device session
1. `renameSession(sessionId, name)` - Rename a device

Auth API:
1. `changePassword()` - Change user password
1. `getProfile()` - Get user profile
1. `initiateTwoFactor()` - Start 2FA setup (returns secret + QR code)
1. `verifyTwoFactor(code, secret)` - Verify 2FA code (returns backup codes)
1. `enable2FA(secret, code)` - Enable 2FA permanently
1. `disable2FA()` - Disable 2FA

**Styling Notes**

Key Tailwind utilities used in new pages:
1. `bg-gradient-to-br`, `from-blue-50`, `to-indigo-50`
1. `rounded-lg`, `shadow-lg`
1. `text-base`, `text-lg`, `text-2xl`, `text-3xl`
1. `px-4`, `py-6`, `sm:px-6`, `lg:px-8`
1. `border-2`, `border-gray-300`
1. `flex`, `grid`, `grid-cols-1`, `sm:grid-cols-2`
1. `hover:`, `transition`, `disabled:`

**Icon Requirements (`lucide-react`)**

```bash
npm install lucide-react
```

Common icons:
1. `Shield`, `Lock`, `Eye`, `Smartphone`
1. `AlertCircle`, `AlertTriangle`, `CheckCircle`
1. `Wallet`, `Plus`, `Send`, `TrendingUp`, `Download`
1. `Filter`, `Search`, `Calendar`, `Copy`, `RefreshCw`
1. `Monitor`, `MapPin`, `HelpCircle`, `Home`, `LogOut`

**Environment Variables**

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=GLY-VTU
VITE_ENABLE_2FA=true
VITE_SECURITY_LEVEL=high
```

**Testing Example**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordChangePage } from './PasswordChangePage';

describe('PasswordChangePage', () => {
  it('should display password strength meter', () => {
    render(<PasswordChangePage />);
    expect(screen.getByText(/password strength/i)).toBeInTheDocument();
  });

  it('should validate password requirements', () => {
    render(<PasswordChangePage />);
    const input = screen.getByPlaceholderText(/new password/i);
    fireEvent.change(input, { target: { value: 'test' } });
    expect(screen.getByText(/at least 8 characters/i)).toHaveClass('text-red-600');
  });
});
```

**Deployment Checklist**

1. All pages are imported in `App.tsx` or your router file
1. Routes are configured correctly
1. API methods exist and are properly implemented
1. Environment variables are set in production
1. Tailwind CSS is built and minified
1. `lucide-react` icons are installed
1. Protected routes wrap sensitive pages
1. Error pages are configured for all status codes
1. Navigation menu is updated with new pages
1. API calls have proper error handling
1. Loading states work correctly
1. Mobile responsiveness is tested
1. Security headers are configured on backend
1. HTTPS is enforced
1. Rate limiting is active on backend
1. CSRF protection is enabled
1. Two-factor authentication is properly configured
1. All backend security fixes from the audit are deployed

Status: Ready
