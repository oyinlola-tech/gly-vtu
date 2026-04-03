import { Home, RefreshCw, HelpCircle } from 'lucide-react';

interface ErrorPageProps {
  code?: 400 | 401 | 403 | 404 | 500 | 502 | 503 | 429;
  title?: string;
  description?: string;
  showSupportButton?: boolean;
}

export function ErrorPage({ 
  code = 404, 
  title,
  description,
  showSupportButton = true 
}: ErrorPageProps) {

  const defaultErrors: Record<number, { title: string; description: string; icon: string; color: string }> = {
    400: {
      title: 'Bad Request',
      description: 'The request could not be understood by the server. Please check your input and try again.',
      icon: '⚠️',
      color: 'from-orange-500 to-orange-600',
    },
    401: {
      title: 'Authentication Required',
      description: 'You need to be logged in to access this page. Please log in with your credentials.',
      icon: '🔐',
      color: 'from-red-500 to-red-600',
    },
    403: {
      title: 'Access Denied',
      description: 'You do not have permission to access this resource. If you believe this is an error, contact support.',
      icon: '🛑',
      color: 'from-red-500 to-red-600',
    },
    404: {
      title: 'Page Not Found',
      description: 'The page you are looking for does not exist or has been moved. Please check the URL and try again.',
      icon: '🔍',
      color: 'from-blue-500 to-blue-600',
    },
    429: {
      title: 'Too Many Requests',
      description: 'You have made too many requests. Please wait a moment before trying again.',
      icon: '⏱️',
      color: 'from-yellow-500 to-yellow-600',
    },
    500: {
      title: 'Server Error',
      description: 'Something went wrong on our end. Our team has been notified and is working to fix it.',
      icon: '💥',
      color: 'from-red-600 to-red-700',
    },
    502: {
      title: 'Bad Gateway',
      description: 'The server is temporarily unavailable. Please try again in a few moments.',
      icon: '🌐',
      color: 'from-red-600 to-red-700',
    },
    503: {
      title: 'Service Unavailable',
      description: 'We are currently performing maintenance. Please check back shortly.',
      icon: '🔧',
      color: 'from-red-600 to-red-700',
    },
  };

  const error = defaultErrors[code] || defaultErrors[404];
  const displayTitle = title || error.title;
  const displayDescription = description || error.description;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${error.color} flex items-center justify-center px-4 py-12`}>
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-8 text-center">
          {/* Error Icon & Code */}
          <div className="text-6xl mb-4 animate-pulse">{error.icon}</div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">{code}</h1>

          {/* Error Title & Description */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{displayTitle}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">{displayDescription}</p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href="/"
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition font-semibold"
            >
              <Home size={20} />
              Go Home
            </a>

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition font-semibold"
            >
              <RefreshCw size={20} />
              Try Again
            </button>

            {showSupportButton && (
              <a
                href="/support"
                className="flex items-center justify-center gap-2 w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-semibold"
              >
                <HelpCircle size={20} />
                Contact Support
              </a>
            )}
          </div>

          {/* Additional Help */}
          {code === 401 && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Need an account?</strong> <a href="/signup" className="font-semibold hover:underline">Create one here</a>
              </p>
            </div>
          )}

          {code === 403 && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">
                If you believe this is a mistake, please contact our support team.
              </p>
            </div>
          )}

          {code >= 500 && (
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Status:</strong> Our team is working on this issue. Try again in a few moments.
              </p>
            </div>
          )}

          {code === 429 && (
            <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Please wait a few seconds before making another request.
              </p>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <p className="text-center text-gray-300 mt-6 text-sm">
          If the problem persists, contact support@gly-vtu.com
        </p>
      </div>
    </div>
  );
}

// Specific Error Page Components for easy routing
export function NotFoundPage() {
  return <ErrorPage code={404} />;
}

export function UnauthorizedPage() {
  return <ErrorPage code={401} />;
}

export function ForbiddenPage() {
  return <ErrorPage code={403} />;
}

export function ServerErrorPage() {
  return <ErrorPage code={500} />;
}

export function BadRequestPage() {
  return <ErrorPage code={400} />;
}

export function TooManyRequestsPage() {
  return <ErrorPage code={429} />;
}

export function ServiceUnavailablePage() {
  return <ErrorPage code={503} />;
}
