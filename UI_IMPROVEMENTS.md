# 🎨 UI/UX IMPROVEMENTS & NEW PAGES FOR GLY-VTU

**Date**: March 30, 2026  
**Priority**: HIGH  
**Estimated Implementation**: 4-6 weeks  

---

## EXECUTIVE SUMMARY

Current application has functional UI but lacks several critical security-focused and user experience pages that are essential for a fintech application. This document outlines:
1. Missing security/compliance pages
2. Enhanced user experience improvements
3. New dashboard features
4. Better error handling and loading states
5. Mobile-first responsive design updates

---

## 1. CRITICAL MISSING PAGES (Must Implement)

### 1.1 Security Center (`/security-center`)

**Purpose**: Centralized security management for users

**Components**:
- Active sessions & devices list
- Login history
- Recent security events
- TOTP/2FA management
- Security questions management
- Activity log export

**Implementation** (`src/pages/SecurityCenter.tsx`):

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Shield,
  Lock,
  Smartphone,
  LogOut,
  Eye,
  EyeOff,
  Download,
  Clock,
  MapPin,
  Globe,
} from 'lucide-react';

interface Device {
  id: string;
  deviceName: string;
  deviceOs: string;
  ipAddress: string;
  lastActivity: string;
  isVerified: boolean;
  createdAt: string;
  isCurrent: boolean;
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  ipAddress: string;
  timestamp: string;
  location?: string;
}

export function SecurityCenter() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      const [devicesData, eventsData] = await Promise.all([
        api.get('/user/devices'),
        api.get('/user/security-events'),
      ]);
      setDevices(devicesData);
      setEvents(eventsData);
      setTotpEnabled(user?.totpEnabled || false);
    } catch (err) {
      console.error('Error loading security data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableDevice = async (deviceId: string) => {
    if (!confirm('Disable this device? You will need to log in again from this device.')) {
      return;
    }
    try {
      await api.post(`/user/devices/${deviceId}/disable`, {});
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to disable device'}`);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const response = await api.get('/auth/setup-totp');
      setBackupCodes(response.backupCodes);
      // Show modal with QR code and backup codes
    } catch (err) {
      alert('Error setting up 2FA');
    }
  };

  const handleDownloadSecurityLog = async () => {
    try {
      const response = await api.get('/user/security-events?export=csv');
      // Trigger download
      const blob = new Blob([response], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-log-${new Date().toISOString()}.csv`;
      a.click();
    } catch (err) {
      alert('Error downloading security log');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-600" />
          Security Center
        </h1>
        <p className="text-gray-600 mt-2">Manage your account security, devices, and login activity</p>
      </div>

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="devices">
            <Smartphone className="w-4 h-4 mr-2" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            2FA & PIN
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Clock className="w-4 h-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* DEVICES TAB */}
        <TabsContent value="devices" className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Globe className="w-4 h-4" />
            <AlertDescription>
              You have {devices.length} registered device(s). Disable any unrecognized devices immediately.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`border rounded-lg p-4 ${
                  device.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                      <h3 className="font-semibold">{device.deviceName}</h3>
                      {device.isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Current Device
                        </span>
                      )}
                      {!device.isVerified && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Unverified
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      <p>
                        <MapPin className="w-4 h-4 inline mr-1" />
                        {device.ipAddress}
                      </p>
                      <p>
                        <Clock className="w-4 h-4 inline mr-1" />
                        Last activity: {new Date(device.lastActivity).toLocaleDateString()}
                      </p>
                      <p>Added: {new Date(device.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisableDevice(device.id)}
                    disabled={device.isCurrent}
                  >
                    {device.isCurrent ? 'Current' : 'Disable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* 2FA & PIN TAB */}
        <TabsContent value="security" className="space-y-4">
          {/* Two-Factor Authentication */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              Two-Factor Authentication (2FA)
            </h3>

            {totpEnabled ? (
              <Alert className="bg-green-50 border-green-200 mb-4">
                <AlertDescription>✓ 2FA is enabled on your account</AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-orange-50 border-orange-200 mb-4">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  2FA is not enabled. Enable it to improve account security.
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-gray-600 mb-4">
              Two-Factor Authentication adds an extra layer of security by requiring a code from your phone when logging in.
            </p>

            <Button onClick={handleSetup2FA}>
              {totpEnabled ? 'Reconfigure 2FA' : 'Enable 2FA'}
            </Button>

            {totpEnabled && backupCodes.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded border">
                <button
                  className="text-sm text-blue-600 flex items-center gap-1"
                  onClick={() => setShowBackupCodes(!showBackupCodes)}
                >
                  {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showBackupCodes ? 'Hide' : 'Show'} Backup Codes
                </button>
                {showBackupCodes && (
                  <div className="mt-3 font-mono text-sm space-y-1">
                    {backupCodes.map((code, i) => (
                      <div key={i} className="text-gray-600">
                        {code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Transaction PIN */}
          <div className="border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Transaction PIN</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your PIN is required to verify all financial transactions. Must be exactly 6 digits.
            </p>
            <Button variant="outline">Change PIN</Button>
          </div>
        </TabsContent>

        {/* ACTIVITY LOG TAB */}
        <TabsContent value="activity" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button variant="outline" onClick={handleDownloadSecurityLog}>
              <Download className="w-4 h-4 mr-2" />
              Export Log
            </Button>
          </div>

          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`border rounded p-3 flex items-center gap-3 ${
                  event.severity === 'high'
                    ? 'bg-red-50 border-red-200'
                    : event.severity === 'medium'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-blue-50 border-blue-200'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 flex-shrink-0 ${
                    event.severity === 'high'
                      ? 'text-red-600'
                      : event.severity === 'medium'
                        ? 'text-yellow-600'
                        : 'text-blue-600'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.description}</p>
                  <p className="text-xs text-gray-600">
                    {new Date(event.timestamp).toLocaleString()} • {event.ipAddress}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SecurityCenter;
```

---

### 1.2 Device Management Page (`/settings/devices`)

**Purpose**: Detailed device management with verification workflow

**Key Features**:
- Device list with icons (mobile/desktop/tablet)
- Device status (verified/unverified)
- Last activity tracking
- IP geolocation
- One-click disable

**Implementation** (`src/pages/DeviceManagement.tsx`):

```typescript
import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

interface Device {
  id: string;
  deviceName: string;
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  ipAddress: string;
  lastActivity: string;
  isVerified: boolean;
  isCurrent: boolean;
  createdAt: string;
}

export function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-6 h-6" />;
      case 'tablet':
        return <Tablet className="w-6 h-6" />;
      default:
        return <Monitor className="w-6 h-6" />;
    }
  };

  const handleDisableDevice = async (deviceId: string) => {
    if (!confirm('Are you sure? You will need to log in again.')) return;
    try {
      await api.post(`/user/devices/${deviceId}/disable`, {});
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err) {
      alert('Error disabling device');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Active Devices</h1>
      <div className="grid gap-4">
        {devices.map((device) => (
          <div key={device.id} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="text-gray-400">{getDeviceIcon(device.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{device.deviceName}</h3>
                    {device.isCurrent && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        This device
                      </span>
                    )}
                    {!device.isVerified && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Unverified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {device.ipAddress}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Last active: {new Date(device.lastActivity).toRelativeTime()}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisableDevice(device.id)}
                disabled={device.isCurrent}
                className="text-red-600 hover:text-red-700"
              >
                {device.isCurrent ? 'Current' : 'Remove'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 1.3 Two-Factor Authentication Setup (`/auth/setup-2fa`)

**Purpose**: TOTP setup with QR code and backup codes

**Implementation** (`src/pages/TwoFactorSetup.tsx`):

```typescript
import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Copy, Download, Lock, CheckCircle } from 'lucide-react';
import { api } from '@/services/api';

export function TwoFactorSetup() {
  const [step, setStep] = useState<'info' | 'scan' | 'verify' | 'backup' | 'complete'>('info');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInitiate2FA = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/setup-totp');
      setSecret(response.secret);
      setQrCode(response.qrCode);
      setBackupCodes(response.backupCodes);
      setStep('scan');
    } catch {
      alert('Error initiating 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTotp = async () => {
    setLoading(true);
    try {
      await api.post('/auth/confirm-totp', {
        secret,
        totpToken: totpCode,
        backupCodes,
      });
      setStep('complete');
    } catch {
      alert('Invalid TOTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      {step === 'info' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold mb-2">Enable Two-Factor Authentication</h1>
            <p className="text-gray-600">
              Add an extra layer of security to protect your account.
            </p>
          </div>

          <div className="space-y-4">
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold mb-2">What is 2FA?</h3>
              <p className="text-sm text-gray-700">
                Two-Factor Authentication requires a time-based code from your phone in addition to your password.
                Even if someone has your password, they cannot log in without access to your phone.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Requirements:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  A smartphone with an authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  A secure place to store backup codes
                </li>
              </ul>
            </div>
          </div>

          <Button onClick={handleInitiate2FA} size="lg" disabled={loading}>
            {loading ? 'Starting...' : 'Start Setup'}
          </Button>
        </div>
      )}

      {step === 'scan' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Step 1: Scan QR Code</h2>
            <p className="text-gray-600">
              Open your authenticator app and scan this QR code.
            </p>
          </div>

          {qrCode && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 border rounded-lg">
                <QRCode value={qrCode} size={256} />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Can't scan? Enter this code manually:</p>
                <div className="font-mono text-sm bg-gray-100 p-2 rounded flex items-center justify-between">
                  {secret}
                  <Copy
                    className="w-4 h-4 cursor-pointer text-gray-600 hover:text-gray-900"
                    onClick={() => navigator.clipboard.writeText(secret)}
                  />
                </div>
              </div>
            </div>
          )}

          <Button onClick={() => setStep('verify')} size="lg">
            I've Scanned the Code
          </Button>
        </div>
      )}

      {step === 'verify' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Step 2: Verify Code</h2>
            <p className="text-gray-600">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Authentication Code</label>
            <Input
              type="text"
              maxLength="6"
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <Button
            onClick={handleVerifyTotp}
            size="lg"
            disabled={totpCode.length !== 6 || loading}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Button>
        </div>
      )}

      {step === 'backup' && (
        <div className="space-y-6">
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTitle>Save Your Backup Codes</AlertTitle>
            <AlertDescription>
              Store these codes in a safe place. You can use them to access your account if you lose your phone.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-2">
            {backupCodes.map((code, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{code}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleDownloadBackupCodes} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => setStep('complete')}
              className="flex-1"
            >
              I've Saved Codes
            </Button>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="space-y-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <div>
            <h2 className="text-2xl font-bold mb-2">2FA Enabled!</h2>
            <p className="text-gray-600">
              Your account is now protected with two-factor authentication.
            </p>
          </div>
          <Button onClick={() => (window.location.href = '/dashboard')} size="lg">
            Return to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### 1.4 Enhanced Transaction Details (`/transactions/:id`)

**Purpose**: Detailed transaction view with receipt download

**Implementation** (`src/pages/TransactionDetails.tsx`):

```typescript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Copy, MapPin, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee: number;
  total: number;
  status: string;
  reference: string;
  recipient?: {
    name: string;
    account?: string;
    bank?: string;
  };
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export function TransactionDetails() {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransaction = async () => {
      try {
        const data = await api.get(`/transactions/${id}`);
        setTransaction(data);
      } catch (err) {
        console.error('Error loading transaction:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [id]);

  if (loading) return <Loader className="w-8 h-8 animate-spin mx-auto mt-8" />;
  if (!transaction) return <div className="text-center mt-8">Transaction not found</div>;

  const maskAccountNumber = (num: string) => `****${num.slice(-4)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Transaction Details</h1>

      <div className="bg-white rounded-lg border p-6 space-y-6">
        {/* Status */}
        <div
          className={`flex items-center justify-between p-4 rounded-lg ${getStatusColor(
            transaction.status
          )}`}
        >
          <div className="flex items-center gap-2">
            {getStatusIcon(transaction.status)}
            <span className="font-semibold capitalize">{transaction.status}</span>
          </div>
          <span className="text-sm">
            {transaction.status === 'success' ? '✓ Confirmed' : 'Pending confirmation'}
          </span>
        </div>

        {/* Amount */}
        <div>
          <p className="text-gray-600 text-sm mb-2">Amount</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">₦{transaction.amount.toLocaleString()}</span>
            {transaction.fee > 0 && (
              <span className="text-gray-600">+ ₦{transaction.fee.toLocaleString()} fee</span>
            )}
          </div>
        </div>

        {/* Recipient */}
        {transaction.recipient && (
          <div className="border-t pt-6">
            <p className="text-gray-600 text-sm mb-2">Recipient</p>
            <div className="space-y-2">
              <p className="font-semibold">{transaction.recipient.name}</p>
              {transaction.recipient.account && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  Account: {maskAccountNumber(transaction.recipient.account)}
                  <Copy className="w-4 h-4 cursor-pointer" />
                </p>
              )}
              {transaction.recipient.bank && (
                <p className="text-sm text-gray-600">{transaction.recipient.bank}</p>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="border-t pt-6">
          <p className="text-gray-600 text-sm mb-2">Transaction Info</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Reference</p>
              <p className="font-mono text-sm">{transaction.reference}</p>
            </div>
            <div>
              <p className="text-gray-600">Type</p>
              <p className="capitalize">{transaction.type}</p>
            </div>
            <div>
              <p className="text-gray-600">Date</p>
              <p>{new Date(transaction.createdAt).toLocaleDateString()}</p>
            </div>
            {transaction.completedAt && (
              <div>
                <p className="text-gray-600">Completed</p>
                <p>{new Date(transaction.completedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-6 flex gap-2">
          <Button variant="outline" className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Receipt (PDF)
          </Button>
          <Button variant="outline" className="flex-1">
            Share
          </Button>
          {transaction.status === 'failed' && (
            <Button className="flex-1">
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

### 1.5 Device Verification Page (`/auth/verify-device`)

**Purpose**: Device verification via email token

**Implementation** (`src/pages/DeviceVerification.tsx`):

```typescript
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { api } from '@/services/api';

export function DeviceVerification() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        const token = searchParams.get('token');
        if (!token) {
          setStatus('error');
          setError('Invalid or missing verification token');
          return;
        }

        await api.post('/auth/verify-device', { token });
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className="max-w-md mx-auto p-4 text-center mt-12">
      {status === 'verifying' && (
        <>
          <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h1 className="text-2xl font-bold mb-2">Verifying Device</h1>
          <p className="text-gray-600">Please wait...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
          <h1 className="text-2xl font-bold mb-2">Device Verified</h1>
          <p className="text-gray-600 mb-6">Your device has been verified successfully.</p>
          <button
            onClick={() => (window.location.href = '/login')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Continue to Login
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
          <p className="text-gray-600 mb-2">{error}</p>
          <p className="text-sm text-gray-500 mb-6">
            The verification link may have expired. Try logging in again.
          </p>
          <button
            onClick={() => (window.location.href = '/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Return to Login
          </button>
        </>
      )}
    </div>
  );
}
```

---

## 2. ENHANCED PAGES (Improve Existing)

### 2.1 Enhanced Login Page

**Improvements**:
- Show recent devices used for login
- Display login history (last 5)
- Better error messages with recovery options
- Device/IP verification flow indicator

### 2.2 Enhanced Dashboard

**New Sections**:
- Security status card (2FA, PIN, Devices)
- Quick alerts (new device login, suspicious activity)
- Wallet balance with encryption indicator
- Recent transactions (5 latest)
- Wallet topup quick access

### 2.3 Enhanced Profile/Settings

**New Tabs**:
- Account Settings
- Privacy
- Security (link to Security Center)
- Notifications
- Analytics (if available)
- Data Export

---

## 3. UX IMPROVEMENTS ACROSS APP

### 3.1 Loading States

```typescript
// Create reusable skeleton loaders
export function TransactionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded"></div>
    </div>
  );
}

// Use in pages instead of spinners
const { data, loading } = fetchTransactions();
return (
  <div className="space-y-4">
    {loading ? <TransactionSkeleton /> : <TransactionList data={data} />}
  </div>
);
```

### 3.2 Enhanced Error Messages

```typescript
// Current (bad): "Error"
// Better:
const errorMessages = {
  'RATE_LIMIT_EXCEEDED': 'Too many requests. Try again in 15 minutes.',
  'PIN_LOCKED': 'PIN locked due to multiple failed attempts. Try again after 15 minutes.',
  'INSUFFICIENT_BALANCE': 'You don\'t have enough funds. Add money to your wallet.',
  'KYC_LIMIT_EXCEEDED': 'You\'ve exceeded your transaction limit. Level up your KYC to send more.',
  'DEVICE_VERIFICATION_REQUIRED': 'Please verify this device. Check your email for verification link.',
};
```

### 3.3 Better Form Validation

```typescript
// Real-time validation feedback
<Input
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
  onBlur={() => {
    const error = validateAmount(amount);
    if (error) setAmountError(error);
  }}
/>
{amountError && <p className="text-red-600 text-sm">{amountError}</p>}
```

### 3.4 Confirmation Modals for Sensitive Operations

```typescript
export function ConfirmTransferModal({ amount, recipient, onConfirm, onCancel }) {
  const [pin, setPin] = useState('');

  return (
    <Dialog>
      <DialogContent>
        <h2 className="text-xl font-bold mb-4">Confirm Transfer</h2>
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-600">Amount</p>
            <p className="text-2xl font-bold">₦{amount}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-gray-600">To</p>
            <p className="font-semibold">{recipient.name || recipient.account}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Enter your transaction PIN to confirm
        </p>
        <PINInput value={pin} onChange={setPin} maxLength={6} />
        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onConfirm(pin)}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 4. MOBILE RESPONSIVENESS IMPROVEMENTS

### 4.1 Mobile-First Layout

```typescript
// Use mobile-first Tailwind classes
<div className="flex flex-col md:flex-row gap-4">
  {/* Stacked on mobile, row on desktop */}
</div>

// Responsive text sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  {/* Smaller on mobile, larger on desktop */}
</h1>
```

### 4.2 Touch & Mobile Interactions

```typescript
// Larger touch targets for mobile
<button className="py-3 px-4 md:py-2 md:px-3">
  {/* Larger on mobile (touch-friendly) */}
</button>

// Swipe gestures for transactions
<Swiper
  onSwipeLeft={() => navigateNext()}
  onSwipeRight={() => navigatePrev()}
>
  {/* Recent transactions swipeable on mobile */}
</Swiper>
```

---

## 5. ACTIONABLE IMPLEMENTATION ROADMAP

**Week 1-2**: Security Center + Device Management  
**Week 2-3**: 2FA Setup + Device Verification  
**Week 3-4**: Enhanced Transaction Details + Dashboard  
**Week 4-5**: UX Improvements (Loading states, error messages, modals)  
**Week 5-6**: Mobile responsiveness polish + testing

---

**Estimated Total Effort**: 100-120 development hours  
**Priority**: HIGH - Essential for user trust and security  
**Next Step**: Begin with Security Center implementation

