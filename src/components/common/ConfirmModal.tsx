import { X, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

/**
 * Modale de confirmation réutilisable (ConfirmModal)
 *
 * Affiche une boîte de dialogue d'avertissement ou de confirmation
 * avant les actions destructives (suppression de client, facture, RDV).
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isDestructive = true
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-dark-surface rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
              isDestructive ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400" : "bg-primary/10 text-primary"
            )}>
              <AlertTriangle size={24} />
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">{title}</h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            {message}
          </p>

          <div className="flex gap-3">
             <button 
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-inter"
            >
              {cancelText}
            </button>
            <button 
              onClick={handleConfirm}
              disabled={loading}
              className={clsx(
                "flex-[1.5] py-3.5 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50",
                isDestructive ? "bg-red-500 hover:bg-red-600 shadow-red-500/20" : "bg-primary hover:bg-primary-hover shadow-primary/20"
              )}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


