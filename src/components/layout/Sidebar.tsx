import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, FileText, Smartphone, BarChart2, Settings, LogOut, HeartPulse, X, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../../context/AppContext';

// Définition des modules applicatifs soumis à permissions
const ALL_DEFAULT_MENUS = ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'];

// Structure de navigation pour les professionnels libéraux (soumise aux allowed_menus)
const proNavItems = [
  {
    section: 'PRINCIPAL',
    items: [
      { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard },
      { name: 'Mon Agenda', path: '/agenda', icon: Calendar, moduleKey: 'agenda' },
      { name: 'Mes Clients', path: '/clients', icon: Users, moduleKey: 'clients' },
      { name: 'Facturation', path: '/factures', icon: FileText, moduleKey: 'factures' },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      { name: 'Mobile Money', path: '/finance/mobile-money', icon: Smartphone, moduleKey: 'mobile_money' },
      { name: 'Rapports PR', path: '/finance/rapports', icon: BarChart2, moduleKey: 'rapports' },
    ],
  },
  {
    section: 'COMPTE',
    items: [
      { name: 'Configuration', path: '/compte/parametres', icon: Settings },
    ],
  },
];

// Structure de navigation pour le Super Administrateur (supervision globale exclusive)
const adminNavItems = [
  {
    section: 'SUPERVISION',
    items: [
      { name: 'Dashboard Admin', path: '/admin', icon: ShieldCheck, end: true },
      { name: 'Gestion des comptes', path: '/admin/comptes', icon: Users },
      { name: 'Gestion des menus', path: '/admin/menus', icon: SlidersHorizontal },
    ],
  },
  {
    section: 'COMPTE',
    items: [
      { name: 'Configuration', path: '/compte/parametres', icon: Settings },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Sidebar — Menu de navigation latéral.
 *
 * Gère :
 * - Le découplage des menus : les administrateurs disposent d'un menu de supervision dédié.
 * - Le filtrage dynamique des menus pour les professionnels selon `user.allowed_menus`.
 * - L'affichage responsif et l'état actif des routes.
 * - Le profil et la déconnexion.
 */
export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useApp();

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const isAdmin = user?.role === 'admin';
  const allowedMenus = user?.allowed_menus && user.allowed_menus.length > 0
    ? user.allowed_menus
    : ALL_DEFAULT_MENUS;

  // Filtrage des menus selon le rôle et les autorisations accordées par le Super Admin
  const visibleNavGroups = isAdmin
    ? adminNavItems
    : proNavItems
        .map(group => ({
          ...group,
          items: group.items.filter(item => {
            if (!('moduleKey' in item) || !item.moduleKey) return true;
            return allowedMenus.includes(item.moduleKey);
          }),
        }))
        .filter(group => group.items.length > 0);

  return (
    <aside className={clsx(
      "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-dark-surface border-r border-gray-100 dark:border-dark-border flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Brand & Logo */}
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3 text-primary">
          <div className="bg-primary text-white p-2.5 rounded-2xl shadow-lg shadow-primary/20">
            <HeartPulse size={24} />
          </div>
          <div>
            <h1 className="font-black text-2xl leading-none tracking-tighter text-gray-900 dark:text-white">Libéralis</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">
              {isAdmin ? 'Super Admin' : 'SaaS Pro'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-2 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
      </div>

      {/* Navigation filtrée dynamiquement */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-8 custom-scrollbar">
        {visibleNavGroups.map((group, idx) => (
          <div key={idx}>
            <p className="px-4 mb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.section}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={'end' in item && item.end === true}
                  onClick={() => window.innerWidth < 1024 && onClose()}
                  className={({ isActive }) => clsx(
                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group",
                    isActive 
                      ? "bg-primary text-white shadow-xl shadow-primary/25" 
                      : "text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/5"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={20} className="transition-transform group-hover:scale-110 shrink-0" />
                      <span className="truncate">{item.name}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Profil utilisateur & Déconnexion */}
      <div className="p-6 border-t border-gray-100 dark:border-dark-border">
        <div className="bg-gray-50 dark:bg-dark-bg p-4 rounded-3xl border border-gray-100 dark:border-dark-border flex items-center gap-3 mb-6 shadow-sm overflow-hidden group">
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-dark-surface shadow-sm border border-gray-100 dark:border-dark-border flex items-center justify-center font-black text-primary shrink-0 transition-transform group-hover:rotate-12">
            {user?.avatar_url ? (
               <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
            ) : (
              getInitials(user?.name || 'User')
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">
                {user?.name || 'Chargement...'}
              </p>
              {isAdmin && (
                <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-gray-400 truncate uppercase mt-0.5">
              {isAdmin ? 'Superviseur Plateforme' : (user?.specialty || 'Professionnel')}
            </p>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors group"
        >
          <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
