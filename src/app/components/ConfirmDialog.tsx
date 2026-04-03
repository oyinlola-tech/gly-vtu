import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-700 dark:text-gray-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
