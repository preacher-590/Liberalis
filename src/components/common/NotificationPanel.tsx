import { X, CheckCheck, Bell, CreditCard, Calendar, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * Panneau de notifications — Feat 3
 *
 * S'affiche en superposition lors du clic sur la cloche dans la Topbar.
 * Permet de visualiser les 12 dernières activités et de les marquer comme lues.
 */
export default function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { 
    notifications, 
    unreadCount, 
    markNotificationRead, 
    markAllNotificationsRead 
  } = useApp();

  // Mappe les icônes en fonction du type de notification
  const getIcon = (type: string) => {
    switch (type) {
      case 'new_appointment': return <Calendar size={18} className="text-blue-500" />;
      case 'invoice_overdue': return <Bell size={18} className="text-red-500" />;
      case 'payment_received': return <CreditCard size={18} className="text-green-500" />;
      case 'email_reminder': return <Mail size={18} className="text-amber-500" />;
      default: return <Bell size={18} className="text-gray-400" />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-dark-surface rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-900 dark:text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={markAllNotificationsRead}
            className="text-xs font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
          >
            <CheckCheck size={14} /> Tout lire
          </button>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-10 text-center">
            <Bell size={40} className="mx-auto text-gray-200 mb-4" />
            <p className="text-sm font-bold text-gray-400">Aucune notification pour le moment.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => !notif.is_read && markNotificationRead(notif.id)}
              className={`p-4 border-b border-gray-50 dark:border-gray-800 cursor-pointer transition-colors flex gap-4 ${
                !notif.is_read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-dark-bg shadow-sm border border-gray-100 dark:border-dark-border flex items-center justify-center shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold truncate ${notif.is_read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                    {notif.title}
                  </p>
                  {!notif.is_read && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {notif.body}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 font-medium">
                  {new Date(notif.created_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-dark-bg/50 border-t border-gray-100 dark:border-dark-border text-center">
        <button className="text-xs font-black text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
          Voir tout l'historique
        </button>
      </div>
    </div>
  );
}


