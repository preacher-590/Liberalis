import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ShieldCheck, Users as UsersIcon, UserCheck, UserX, RefreshCw,
  SlidersHorizontal, Check, X, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ConfirmModal from '../components/common/ConfirmModal';
import ManageMenusModal, { SYSTEM_MODULES, DEFAULT_ALLOWED_MENUS, type AdminUserTarget } from '../components/admin/ManageMenusModal';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  specialty?: string;
  cabinet_name?: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  allowed_menus?: string[];
  created_at: string;
  clients_count: number;
  invoices_count: number;
  appointments_count: number;
  volume_encaisse?: number | null;
  volume_facture?: number | null;
}

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);

/**
 * Page Gestion des Comptes Utilisateurs (Admin.tsx)
 *
 * Permet au Super Administrateur de :
 * - Lister l'intégralité des praticiens avec recherche instantanée et filtres
 * - Visualiser les volumes d'activité (Clients, RDV, Factures, Volume Encaissé)
 * - Activer ou suspendre des comptes professionnels
 * - Piloter les accès aux menus via des badges rapides ET le bouton d'action dédié "Gérer les menus" (Modale complète)
 */
export default function Admin() {
  const navigate = useNavigate();
  const { user: currentUser } = useApp();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userToToggle, setUserToToggle] = useState<AdminUser | null>(null);
  const [selectedUserForMenus, setSelectedUserForMenus] = useState<AdminUserTarget | null>(null);
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
        ? "Accès réservé à l'administrateur."
        : 'Impossible de charger les comptes utilisateurs.');
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

  const handleToggle = async () => {
    if (!userToToggle) return;
    try {
      const { data } = await api.patch(`/admin/users/${userToToggle.id}/toggle-active`);
      setUsers(prev => prev.map(u => (u.id === data.id ? { ...u, is_active: data.is_active } : u)));
      showToast(data.message || (data.is_active ? 'Compte réactivé' : 'Compte suspendu'));
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erreur lors de la mise à jour.', 'error');
    } finally {
      setUserToToggle(null);
    }
  };

  const handleToggleMenuPermission = async (targetUser: AdminUser, moduleKey: string) => {
    if (targetUser.role === 'admin') {
      showToast("Le compte administrateur conserve l'accès à tous les modules.", 'error');
      return;
    }

    const currentMenus = targetUser.allowed_menus && targetUser.allowed_menus.length > 0
      ? targetUser.allowed_menus
      : DEFAULT_ALLOWED_MENUS;

    const hasMenu = currentMenus.includes(moduleKey);
    const newMenus = hasMenu
      ? currentMenus.filter(k => k !== moduleKey)
      : [...currentMenus, moduleKey];

    // Optimistic UI
    setUsers(prev =>
      prev.map(u => (u.id === targetUser.id ? { ...u, allowed_menus: newMenus } : u))
    );

    const moduleLabel = SYSTEM_MODULES.find(m => m.key === moduleKey)?.label || moduleKey;

    try {
      const { data } = await api.patch(`/admin/users/${targetUser.id}/menus`, {
        allowed_menus: newMenus,
      });

      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, allowed_menus: data.allowed_menus } : u))
      );

      showToast(
        hasMenu
          ? `Module « ${moduleLabel} » désactivé pour ${targetUser.name}.`
          : `Module « ${moduleLabel} » activé pour ${targetUser.name}.`
      );
    } catch (err: any) {
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, allowed_menus: currentMenus } : u))
      );
      showToast("Impossible d'enregistrer les permissions du menu.", 'error');
    }
  };

  const handleMenusSavedFromModal = (userId: number, newMenus: string[]) => {
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, allowed_menus: newMenus } : u))
    );
    showToast("Droits d'accès aux menus mis à jour avec succès.");
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter === 'active') return u.is_active;
    if (statusFilter === 'inactive') return !u.is_active;
    return true;
  });

  const actifs = users.filter(u => u.is_active).length;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in">
      {/* Toast Notification */}
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
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestion des Comptes</h1>
          </div>
          <p className="text-gray-500 font-medium text-xs mt-1">
            Supervision détaillée des praticiens, compteurs financiers et gestion des menus autorisés.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/menus')}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all"
          >
            <SlidersHorizontal size={14} /> Matrice des menus <ArrowRight size={14} />
          </button>
          <button
            onClick={() => fetchUsers(search)}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl text-xs font-black text-gray-500 hover:text-primary transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Comptes inscrits', value: users.length, icon: UsersIcon, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Comptes actifs', value: actifs, icon: UserCheck, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
          { label: 'Comptes suspendus', value: users.length - actifs, icon: UserX, bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-dark-surface rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm p-6 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{kpi.value}</p>
            </div>
            <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center', kpi.bg, kpi.color)}>
              <kpi.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Liste des comptes */}
      <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Répertoire des Comptes</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Utilisez les boutons d'action ou le bouton « Gérer les menus » pour configurer les modules d'un praticien.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center bg-gray-50 dark:bg-dark-bg p-1 rounded-2xl border border-gray-100 dark:border-dark-border text-xs font-black">
              <button
                onClick={() => setStatusFilter('all')}
                className={clsx('px-3 py-1.5 rounded-xl transition-all', statusFilter === 'all' ? 'bg-white dark:bg-dark-surface text-primary shadow-sm' : 'text-gray-400')}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={clsx('px-3 py-1.5 rounded-xl transition-all', statusFilter === 'active' ? 'bg-white dark:bg-dark-surface text-green-600 shadow-sm' : 'text-gray-400')}
              >
                Actifs
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={clsx('px-3 py-1.5 rounded-xl transition-all', statusFilter === 'inactive' ? 'bg-white dark:bg-dark-surface text-red-500 shadow-sm' : 'text-gray-400')}
              >
                Suspendus
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher nom, email, cabinet..."
                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-dark-bg/30 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-6">Professionnel & Contact</th>
                <th className="py-4 px-4">Cabinet & Spécialité</th>
                <th className="py-4 px-4 text-center">Activité</th>
                <th className="py-4 px-4 text-center">Volume Encaissé</th>
                <th className="py-4 px-4 text-center">Menus Autorisés (Modules)</th>
                <th className="py-4 px-4 text-center">Statut</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="py-10 px-6 text-center text-sm font-bold text-gray-400">Chargement des comptes...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="py-10 px-6 text-center text-sm font-bold text-red-500">{error}</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} className="py-10 px-6 text-center text-sm font-bold text-gray-400">Aucun compte trouvé.</td></tr>
              ) : (
                filteredUsers.map(u => {
                  const isAdmin = u.role === 'admin';
                  const userMenus = u.allowed_menus && u.allowed_menus.length > 0 ? u.allowed_menus : DEFAULT_ALLOWED_MENUS;

                  return (
                    <tr key={u.id} className={clsx('hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors', !u.is_active && 'opacity-60 bg-red-50/10')}>
                      {/* Praticien */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-sm">
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              : getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-sm text-gray-900 dark:text-white truncate">{u.name}</p>
                              {isAdmin && (
                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary">Admin</span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 truncate">{u.email}</p>
                            {u.phone && <p className="text-[10px] text-gray-400">{u.phone}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Cabinet */}
                      <td className="py-4 px-4 text-xs font-bold text-gray-600 dark:text-gray-300">
                        <p className="text-gray-900 dark:text-white font-black truncate">{u.cabinet_name || 'Cabinet individuel'}</p>
                        <p className="text-[11px] text-primary truncate">{u.specialty || '—'}</p>
                      </td>

                      {/* Activité */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 text-xs font-black">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" title="Clients">
                            {u.clients_count} cl.
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" title="Rendez-vous">
                            {u.appointments_count} rdv
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" title="Factures">
                            {u.invoices_count} fac.
                          </span>
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="py-4 px-4 text-center">
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {(Number(u.volume_encaisse) || 0).toLocaleString('fr-FR')} F
                        </span>
                      </td>

                      {/* Menus autorisés */}
                      <td className="py-4 px-4 text-center">
                        {isAdmin ? (
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accès total</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {SYSTEM_MODULES.map(mod => {
                              const isEnabled = userMenus.includes(mod.key);
                              return (
                                <button
                                  key={mod.key}
                                  onClick={() => handleToggleMenuPermission(u, mod.key)}
                                  title={`Cliquer pour ${isEnabled ? 'désactiver' : 'activer'} ${mod.label}`}
                                  className={clsx(
                                    'group flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black transition-all active:scale-95',
                                    isEnabled
                                      ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-600'
                                      : 'bg-gray-100 dark:bg-dark-bg text-gray-400 hover:bg-primary/10 hover:text-primary'
                                  )}
                                >
                                  <mod.icon size={11} />
                                  <span>{mod.label}</span>
                                  {isEnabled ? <Check size={10} className="text-primary" /> : <X size={10} className="text-gray-300 dark:text-gray-600" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Statut */}
                      <td className="py-4 px-4 text-center">
                        <span className={clsx(
                          'text-[9px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase',
                          u.is_active
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          {u.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>

                      {/* Actions dédiées */}
                      <td className="py-4 px-6 text-right">
                        {u.id === currentUser?.id ? (
                          <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">Vous</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* BOUTON EXPLICITE : GÉRER LES MENUS */}
                            <button
                              onClick={() => setSelectedUserForMenus(u)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                              title="Configurer les menus et droits de ce compte"
                            >
                              <SlidersHorizontal size={12} />
                              <span className="hidden sm:inline">Gérer les menus</span>
                            </button>

                            <button
                              onClick={() => setUserToToggle(u)}
                              className={clsx(
                                'text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all shadow-sm',
                                u.is_active
                                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                                  : 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40'
                              )}
                            >
                              {u.is_active ? 'Suspendre' : 'Réactiver'}
                            </button>
                          </div>
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

      {/* Modale Dédiée de Gestion des Menus */}
      <ManageMenusModal
        user={selectedUserForMenus}
        isOpen={!!selectedUserForMenus}
        onClose={() => setSelectedUserForMenus(null)}
        onSaved={handleMenusSavedFromModal}
      />

      {/* Modale de Confirmation de Suspension/Réactivation */}
      <ConfirmModal
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleToggle}
        isDestructive={userToToggle?.is_active ?? true}
        title={userToToggle?.is_active ? 'Suspendre ce compte' : 'Réactiver ce compte'}
        message={userToToggle?.is_active
          ? `${userToToggle?.name} ne pourra plus se connecter et ses sessions actives seront immédiatement coupées. Ses données restent intactes.`
          : `${userToToggle?.name} pourra de nouveau se connecter à son compte.`}
        confirmText={userToToggle?.is_active ? 'Suspendre' : 'Réactiver'}
      />
    </div>
  );
}
