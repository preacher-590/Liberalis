import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api';
import ManageMenusModal, { SYSTEM_MODULES, DEFAULT_ALLOWED_MENUS, type AdminUserTarget } from '../components/admin/ManageMenusModal';

interface UserMenuRow {
  id: number;
  name: string;
  email: string;
  specialty?: string;
  cabinet_name?: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  allowed_menus?: string[];
  created_at: string;
}

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);

/**
 * Page Gestion des Menus & Droits d'Accès (AdminMenus.tsx)
 *
 * Page dédiée au paramétrage modulaire des fonctionnalités pour chaque professionnel libéral :
 * - Vue matricielle claire des 5 modules (Agenda, Clients, Facturation, Mobile Money, Rapports)
 * - Toggles switches directs par module et par professionnel
 * - Statistiques d'activation des modules à l'échelle de la plateforme
 * - Modale détaillée de configuration avec explications des droits
 */
export default function AdminMenus() {
  const [users, setUsers] = useState<UserMenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedUserForModal, setSelectedUserForModal] = useState<AdminUserTarget | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/users', {
        params: searchTerm ? { search: searchTerm, per_page: 100 } : { per_page: 100 },
      });
      setUsers(data.data || data);
    } catch (err: any) {
      setError(err.response?.status === 403
        ? "Accès réservé au Super Administrateur."
        : 'Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(search), 350);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  // Basculement d'un module directement depuis la matrice
  const handleToggleModule = async (user: UserMenuRow, moduleKey: string) => {
    if (user.role === 'admin') {
      showToast("Le compte Super Administrateur possède l'accès à tous les modules.", 'error');
      return;
    }

    const currentMenus = user.allowed_menus && user.allowed_menus.length > 0
      ? user.allowed_menus
      : DEFAULT_ALLOWED_MENUS;

    const isEnabled = currentMenus.includes(moduleKey);
    const newMenus = isEnabled
      ? currentMenus.filter(k => k !== moduleKey)
      : [...currentMenus, moduleKey];

    // Optimistic UI
    setUsers(prev =>
      prev.map(u => (u.id === user.id ? { ...u, allowed_menus: newMenus } : u))
    );

    const moduleLabel = SYSTEM_MODULES.find(m => m.key === moduleKey)?.label || moduleKey;

    try {
      const { data } = await api.patch(`/admin/users/${user.id}/menus`, {
        allowed_menus: newMenus,
      });

      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, allowed_menus: data.allowed_menus } : u))
      );

      showToast(
        isEnabled
          ? `Module « ${moduleLabel} » retiré pour ${user.name}.`
          : `Module « ${moduleLabel} » accordé pour ${user.name}.`
      );
    } catch (err: any) {
      // Rollback
      setUsers(prev =>
        prev.map(u => (u.id === user.id ? { ...u, allowed_menus: currentMenus } : u))
      );
      showToast("Erreur lors de la mise à jour des droits.", 'error');
    }
  };

  const handleModalSaved = (userId: number, newMenus: string[]) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, allowed_menus: newMenus } : u))
    );
    showToast("Permissions de menus mises à jour avec succès.");
  };

  // Calcul des statistiques d'adoption par module
  const proUsers = users.filter(u => u.role !== 'admin');
  const moduleStats = SYSTEM_MODULES.map(m => {
    const activeCount = proUsers.filter(u => {
      const allowed = u.allowed_menus && u.allowed_menus.length > 0
        ? u.allowed_menus
        : DEFAULT_ALLOWED_MENUS;
      return allowed.includes(m.key);
    }).length;

    const percentage = proUsers.length > 0 ? Math.round((activeCount / proUsers.length) * 100) : 0;

    return {
      ...m,
      activeCount,
      percentage,
    };
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in">
      {/* Toast Notification Flottant */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border animate-in slide-in-from-bottom-5">
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-red-500 shrink-0" />
          )}
          <span className="text-xs font-bold text-gray-900 dark:text-white">{toast.message}</span>
        </div>
      )}

      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <SlidersHorizontal size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  Gestion des Menus & Droits d'Accès
                </h1>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Feature Toggles
                </span>
              </div>
              <p className="text-gray-500 font-medium text-xs mt-1">
                Pilotez la disponibilité des 5 modules applicatifs pour chaque professionnel selon son abonnement ou profil.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchUsers(search)}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl text-xs font-black text-gray-600 dark:text-gray-300 hover:text-primary transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* Cartes d'adoption des modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {moduleStats.map(stat => (
          <div
            key={stat.key}
            className="bg-white dark:bg-dark-surface rounded-[24px] border border-gray-100 dark:border-dark-border p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center', stat.color)}>
                <stat.icon size={18} />
              </div>
              <span className="text-xs font-black text-primary">
                {stat.percentage}%
              </span>
            </div>
            <div className="mt-3">
              <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">
                {stat.label}
              </h4>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                {stat.activeCount} sur {proUsers.length} pro(s)
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tableau matriciel des permissions */}
      <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
        {/* Barre d'outils */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">
              Matrice des Droits d'Accès par Professionnel
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Activez ou désactivez un module en cliquant sur son interrupteur. Les changements sont effectifs immédiatement.
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher praticien, cabinet..."
              className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[950px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-dark-bg/30 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-6">Professionnel</th>
                {SYSTEM_MODULES.map(m => (
                  <th key={m.key} className="py-4 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <m.icon size={13} className="text-primary" />
                      <span>{m.label}</span>
                    </div>
                  </th>
                ))}
                <th className="py-4 px-6 text-right">Configuration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-xs font-bold text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-primary" />
                      Chargement de la matrice des menus...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-xs font-bold text-red-500">
                    {error}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-xs font-bold text-gray-400">
                    Aucun compte trouvé.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const isAdmin = u.role === 'admin';
                  const userMenus = u.allowed_menus && u.allowed_menus.length > 0
                    ? u.allowed_menus
                    : DEFAULT_ALLOWED_MENUS;

                  return (
                    <tr
                      key={u.id}
                      className={clsx(
                        'hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors',
                        !u.is_active && 'opacity-60 bg-red-50/10'
                      )}
                    >
                      {/* Praticien */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-sm">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(u.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-gray-900 dark:text-white truncate">
                                {u.name}
                              </span>
                              {isAdmin && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 truncate">{u.email}</p>
                            <p className="text-[10px] text-primary truncate">{u.cabinet_name || u.specialty || 'Cabinet'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Colonnes des 5 modules */}
                      {SYSTEM_MODULES.map(module => {
                        if (isAdmin) {
                          return (
                            <td key={module.key} className="py-4 px-3 text-center">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg">
                                Inclus
                              </span>
                            </td>
                          );
                        }

                        const isEnabled = userMenus.includes(module.key);

                        return (
                          <td key={module.key} className="py-4 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleModule(u, module.key)}
                              title={`Cliquer pour ${isEnabled ? 'désactiver' : 'activer'} ${module.label}`}
                              className={clsx(
                                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                                isEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                              )}
                            >
                              <span
                                className={clsx(
                                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                                  isEnabled ? 'translate-x-5' : 'translate-x-0'
                                )}
                              />
                            </button>
                          </td>
                        );
                      })}

                      {/* Action : bouton de gestion détaillée */}
                      <td className="py-4 px-6 text-right">
                        {isAdmin ? (
                          <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                            Accès total
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedUserForModal(u)}
                            className="flex items-center gap-1.5 ml-auto text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            <SlidersHorizontal size={12} />
                            <span>Configurer</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modale de configuration détaillée */}
      <ManageMenusModal
        user={selectedUserForModal}
        isOpen={!!selectedUserForModal}
        onClose={() => setSelectedUserForModal(null)}
        onSaved={handleModalSaved}
      />
    </div>
  );
}
