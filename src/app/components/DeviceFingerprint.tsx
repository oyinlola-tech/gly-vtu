interface DeviceFingerprintProps {
  deviceId?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

const inferDeviceLabel = (ua: string | null | undefined) => {
  if (!ua) return 'Unknown device';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS/i.test(ua)) return 'macOS';
  return 'Unknown OS';
};

const inferBrowser = (ua: string | null | undefined) => {
  if (!ua) return 'Unknown browser';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  return 'Browser';
};

export default function DeviceFingerprint({ deviceId, userAgent, ipAddress }: DeviceFingerprintProps) {
  const shortId =
    deviceId && deviceId.length > 10
      ? `${deviceId.slice(0, 6)}...${deviceId.slice(-4)}`
      : deviceId || 'Unavailable';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Device Fingerprint
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-2">{shortId}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
          {inferDeviceLabel(userAgent)}
        </span>
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
          {inferBrowser(userAgent)}
        </span>
        {ipAddress && (
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
            IP {ipAddress}
          </span>
        )}
      </div>
    </div>
  );
}
