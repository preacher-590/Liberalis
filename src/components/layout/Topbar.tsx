import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Plus, Menu, Sun, Moon } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationPanel from '../common/NotificationPanel';
import QuickActionMenu from './QuickActionMenu';

interface TopbarProps {
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
  onOpenModal: (type: 'client' | 'appointment' | 'invoice') => void;
}

/**
 * Topbar — Barre supérieure de navigation.
 *
 * Gère :
 * - Le titre de la page dynamique
 * - L'activation de la recherche (Feat 4)
 * - L'affichage des notifications et de son badge de non-lues (Feat 3)
 * - L'ouverture du menu mobile
 * - L'ouverture du menu d'actions rapides (Nouveau)
 */
export default function Topbar({ onOpenSidebar, onOpenSearch, onOpenModal }: TopbarProps) {
  const location = useLocation();
  const { unreadCount } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);
  
  const getTitle = () => {
    if (location.pathname.includes('/agenda')) return 'Agenda';
    if (location.pathname.includes('/clients')) return 'Clients';
    if (location.pathname.includes('/factures')) return 'Facturateur';
    if (location.pathname.includes('/finance')) return 'Finance';
    if (location.pathname.includes('/compte')) return 'Ma Configuration';
    return 'Dashboard';
  };

  const currentDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // Ferme les panneaux si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
      if (quickActionRef.current && !quickActionRef.current.contains(e.target as Node)) {
        setIsQuickActionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="h-20 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-gray-100 dark:border-dark-border sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Trigger */}
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-xl transition-colors"
        >
          <Menu className="text-gray-600 dark:text-gray-300" />
        </button>

        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{getTitle()}</h2>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{currentDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        {/* Simple Search Clicker (Feat 4) */}
        <div 
          onClick={onOpenSearch}
          className="relative hidden md:block group cursor-pointer"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-primary transition-colors" size={18} />
          <div className="pl-10 pr-12 py-2.5 bg-gray-100 dark:bg-dark-bg border border-transparent group-hover:bg-white dark:group-hover:bg-gray-950 group-hover:border-primary/20 rounded-2xl text-xs font-bold w-64 lg:w-80 text-gray-500 transition-all select-none">
            Recherche globale...
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] font-black border border-gray-300 dark:border-gray-600 px-1 rounded-md text-gray-400 capitalize">cmd</span>
            <span className="text-[10px] font-black border border-gray-300 dark:border-gray-600 px-1 rounded-md text-gray-400 uppercase">k</span>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
          title={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
          className="p-3 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-border rounded-2xl transition-all active:scale-95"
        >
          {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-gray-600" />}
        </button>

        {/* Notifications (Feat 3) */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => {
              setIsNotificationOpen(!isNotificationOpen);
              setIsQuickActionOpen(false);
            }}
            className={`relative p-3 rounded-2xl transition-all ${
              isNotificationOpen 
                ? 'bg-primary/10 text-primary' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 animate-in zoom-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          {isNotificationOpen && (
            <NotificationPanel onClose={() => setIsNotificationOpen(false)} />
          )}
        </div>

        {/* Action Button & Menu */}
        <div className="relative" ref={quickActionRef}>
          <button 
            onClick={() => {
              setIsQuickActionOpen(!isQuickActionOpen);
              setIsNotificationOpen(false);
            }}
            className="bg-primary hover:bg-primary-hover active:scale-[0.98] text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouveau</span>
          </button>

          {isQuickActionOpen && (
            <QuickActionMenu 
              onClose={() => setIsQuickActionOpen(false)} 
              onAction={onOpenModal} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

