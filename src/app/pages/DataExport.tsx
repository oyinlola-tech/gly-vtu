import { useState } from 'react';
import { Download, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

export default function DataExport() {
  const [isRequesting, setIsRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const navigate = useNavigate();

  const handleExportRequest = async () => {
    setIsRequesting(true);
    try {
      const res = await fetch('/app/api/user/data-export', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        setRequested(true);
        toast.success('Data export will be emailed to you within 24 hours');
      } else {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || 'Failed to request data export');
      }
    } catch {
      toast.error('Failed to request data export');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-blue-700 mb-4"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="bg-white rounded-lg shadow p-8">
          <h1 className="text-3xl font-bold mb-4">Download Your Data</h1>
          <p className="text-gray-600 mb-8">
            Get a copy of your personal data in JSON format (GDPR compliant).
          </p>

          {requested ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center gap-4">
              <CheckCircle className="text-green-600" size={32} />
              <div>
                <h3 className="font-semibold text-green-900">Export Requested</h3>
                <p className="text-green-800 text-sm">
                  You'll receive your data via email within 24 hours.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Your data will include:</h3>
                <ul className="space-y-2 text-blue-800 text-sm">
                  <li>✓ Profile information</li>
                  <li>✓ Transaction history</li>
                  <li>✓ Wallet balance</li>
                  <li>✓ Cards registered</li>
                  <li>✓ KYC data</li>
                  <li>✓ Security events</li>
                </ul>
              </div>

              <button
                onClick={handleExportRequest}
                disabled={isRequesting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={20} />
                {isRequesting ? 'Requesting...' : 'Request Data Export'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
