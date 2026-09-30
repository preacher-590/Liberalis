import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Users as UsersIcon, UserCheck, UserPlus,
  CalendarCheck, FileText, Banknote, MailCheck, RefreshCw, FolderOpen,
  Search, Check, X, Smartphone, BarChart2, Calendar, Users,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import clsx from 'clsx';
import api from '../services/api';
import ConfirmModal from '../components/common/ConfirmModal';

/**
 * Définition des modules fonctionnels soumis au contrôle d'accès du Super Admin
 */
const SYSTEM_MODULES = [
  { key: 'agenda', label: 'Agenda', icon: Calendar, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' },
  { key: 'clients', label: 'Clients', icon: Users, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
  { key: 'factures', label: 'Facturation', icon: FileText, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
  { key: 'mobile_money', label: 'Mobile Money', icon: Smartphone, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' },
  { key: 'rapports', label: 'Rapports', icon: BarChart2, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30' },
] as const;

const DEFAULT_ALLOWED_MENUS = ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'];

interface PlatformStats {
  users_total: number;
  users_active: number;
  users_new_month: number;
  clients_total: number;
  appointments_total: number;
  invoices_total: number;
  volume_encaisse: number;
  rappels_envoyes: number;
  inscriptions_mensuelles: { month: string; value: number }[];
  specialites: { name: string; value: number }[];
}

interface SupervisedUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  specialty?: string;
  cabinet_name?: string;
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

const PIE_COLORS = ['#0F6E56', '#1D9E75', '#EF9F27', '#E24B4A', '#185FA5', '#6B7280'];

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().substring(0, 2);

/**
 * Dashboard Super Administrateur (AdminDashboard.tsx)
 *
 * Vue de supervision globale de la plateforme Libéralis :
 * 1. KPIs et tableaux de statistiques macro (Inscriptions, Répartition par spécialité, Activité plateforme)
 * 2. Grand tableau de supervision de TOUS les comptes utilisateurs avec compteurs détaillés
 * 3. Contrôle granulaire en temps réel des accès aux menus pour chaque compte professionnel
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<SupervisedUser[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [userToToggle, setUserToToggle] = useState<SupervisedUser | null>(null);

  // Système de notifications toast interne
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Chargement des statistiques globales de la plateforme
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.response?.status === 403
        ? "Accès réservé au Super Administrateur."
        : 'Impossible de charger les statistiques de la plateforme.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Chargement de la liste de tous les comptes avec leurs métriques d'activité
  const fetchUsers = useCallback(async (searchTerm = '') => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: searchTerm ? { search: searchTerm, per_page: 100 } : { per_page: 100 },
      });
      setUsers(data.data || data);
    } catch (err: any) {
      console.error("Erreur lors de la récupération des utilisateurs:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [fetchStats, fetchUsers]);

  // Debounce sur la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  // Basculement de l'activation/désactivation d'un compte
  const handleToggleActive = async () => {
    if (!userToToggle) return;
    try {
      const { data } = await api.patch(`/admin/users/${userToToggle.id}/toggle-active`);
      setUsers(prev => prev.map(u => (u.id === data.id ? { ...u, is_active: data.is_active } : u)));
      showToast(data.message || (data.is_active ? 'Compte réactivé' : 'Compte suspendu'));
      fetchStats();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Erreur lors du changement de statut.', 'error');
    } finally {
      setUserToToggle(null);
    }
  };

  // Basculement d'accès à un menu pour un professionnel spécifique
  const handleToggleMenuPermission = async (targetUser: SupervisedUser, moduleKey: string) => {
    if (targetUser.role === 'admin') {
      showToast("Le compte Super Administrateur possède l'accès complet à tous les modules.", 'error');
      return;
    }

    const currentMenus = targetUser.allowed_menus && targetUser.allowed_menus.length > 0
      ? targetUser.allowed_menus
      : DEFAULT_ALLOWED_MENUS;

    const hasMenu = currentMenus.includes(moduleKey);
    const newMenus = hasMenu
      ? currentMenus.filter(k => k !== moduleKey)
      : [...currentMenus, moduleKey];

    // Mise à jour optimiste de l'UI
    setUsers(prev =>
      prev.map(u => (u.id === targetUser.id ? { ...u, allowed_menus: newMenus } : u))
    );

    const moduleLabel = SYSTEM_MODULES.find(m => m.key === moduleKey)?.label || moduleKey;

    try {
      const { data } = await api.patch(`/admin/users/${targetUser.id}/menus`, {
        allowed_menus: newMenus,
      });

      // Synchronisation avec les données serveur
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, allowed_menus: data.allowed_menus } : u))
      );

      showToast(
        hasMenu
          ? `Accès au module « ${moduleLabel} » révoqué pour ${targetUser.name}.`
          : `Accès au module « ${moduleLabel} » accordé pour ${targetUser.name}.`
      );
    } catch (err: any) {
      // Rollback en cas d'erreur
      setUsers(prev =>
        prev.map(u => (u.id === targetUser.id ? { ...u, allowed_menus: currentMenus } : u))
      );
      showToast("Erreur lors de l'enregistrement des droits du menu.", 'error');
    }
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(u => {
    if (statusFilter === 'active') return u.is_active;
    if (statusFilter === 'inactive') return !u.is_active;
    return true;
  });

  const totalSpecialites = (stats?.specialites ?? []).reduce((s, d) => s + Number(d.value), 0);

  if (error) {
    return (
      <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-12 text-center">
        <p className="text-sm font-black text-red-500">{error}</p>
      </div>
    );
  }

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

      {/* En-tête Principal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Supervision Plateforme</h1>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Super Admin
                </span>
              </div>
              <p className="text-gray-500 font-medium text-xs mt-1">
                Contrôle centralisé des comptes, statistiques globales et gestion granulaire des modules professionnels.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStats();
              fetchUsers(search);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl text-xs font-black text-gray-600 dark:text-gray-300 hover:text-primary transition-all shadow-sm"
          >
            <RefreshCw size={14} className={loadingStats || loadingUsers ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      {/* SECTION 1 : TABLEAUX DE STATISTIQUES GLOBALES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" /> Métriques & Statistiques Globales
          </h2>
        </div>

        {/* KPIs Principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Professionnels inscrits', value: stats?.users_total ?? 0, sub: 'Sur la plateforme', icon: UsersIcon, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Comptes actifs', value: stats?.users_active ?? 0, sub: `${(stats?.users_total ?? 0) - (stats?.users_active ?? 0)} compte(s) suspendu(s)`, icon: UserCheck, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
            { label: 'Nouveaux ce mois', value: stats?.users_new_month ?? 0, sub: 'Inscriptions récentes', icon: UserPlus, bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Volume total encaissé', value: `${(stats?.volume_encaisse ?? 0).toLocaleString('fr-FR')} F`, sub: 'Via règlements Libéralis', icon: Banknote, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-dark-surface rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm p-6 flex items-start justify-between hover:shadow-md transition-all">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{kpi.label}</p>
                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none pt-1 truncate">{kpi.value}</p>
                <p className="text-[10px] font-bold text-gray-400 pt-2">{kpi.sub}</p>
              </div>
              <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', kpi.bg, kpi.color)}>
                <kpi.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Activités globales de la plateforme */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { label: 'Dossiers clients totaux', value: stats?.clients_total ?? 0, icon: FolderOpen, color: 'text-blue-500' },
            { label: 'Rendez-vous programmés', value: stats?.appointments_total ?? 0, icon: CalendarCheck, color: 'text-indigo-500' },
            { label: 'Factures émises', value: stats?.invoices_total ?? 0, icon: FileText, color: 'text-emerald-500' },
            { label: 'Rappels e-mail distribués', value: stats?.rappels_envoyes ?? 0, icon: MailCheck, color: 'text-amber-500' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-dark-surface rounded-[24px] border border-gray-100 dark:border-dark-border shadow-sm p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-dark-bg flex items-center justify-center shrink-0 shadow-inner">
                <item.icon size={18} className={item.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{item.value}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1 truncate">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Visualisations Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Inscriptions mensuelles */}
          <div className="lg:col-span-7 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-7">
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-6">Inscriptions (12 derniers mois)</h3>
            <div className="h-56">
              {loadingStats ? (
                <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400 animate-pulse">Chargement du graphique...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.inscriptions_mensuelles ?? []} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => [`${val} compte(s)`, 'Inscriptions']}
                    />
                    <Bar dataKey="value" fill="#0F6E56" radius={[6, 6, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Répartition par Spécialité */}
          <div className="lg:col-span-5 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-7 flex flex-col">
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-6">Répartition par Spécialité</h3>
            {totalSpecialites === 0 ? (
              <div className="flex-1 flex items-center justify-center min-h-40">
                <p className="text-xs font-bold text-gray-400">Aucune donnée disponible.</p>
              </div>
            ) : (
              <div className="flex items-center gap-6 flex-1">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats?.specialites ?? []} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {(stats?.specialites ?? []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 flex-1 min-w-0">
                  {(stats?.specialites ?? []).slice(0, 5).map((sp, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate">{sp.name}</span>
                      </div>
                      <span className="text-xs font-black text-gray-900 dark:text-white shrink-0">{sp.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2 : GRAND TABLEAU DE SUPERVISION DES COMPTES & CONTRÔLE DES ACCÈS AUX MENUS */}
      <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
        {/* Barre d'outils du tableau */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Tableau de Supervision des Comptes</h2>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300">
                {filteredUsers.length} compte(s)
              </span>
            </div>
            <p className="text-xs font-medium text-gray-400 mt-1">
              Gérez les informations, les volumes d'activité et cliquez sur les badges de modules pour accorder ou révoquer les accès.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Filtre de statut */}
            <div className="flex items-center bg-gray-50 dark:bg-dark-bg p-1 rounded-2xl border border-gray-100 dark:border-dark-border text-xs font-black">
              <button
                onClick={() => setStatusFilter('all')}
                className={clsx(
                  'px-3 py-1.5 rounded-xl transition-all',
                  statusFilter === 'all' ? 'bg-white dark:bg-dark-surface text-primary shadow-sm' : 'text-gray-400 hover:text-gray-700'
                )}
              >
                Tous
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={clsx(
                  'px-3 py-1.5 rounded-xl transition-all',
                  statusFilter === 'active' ? 'bg-white dark:bg-dark-surface text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-700'
                )}
              >
                Actifs
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={clsx(
                  'px-3 py-1.5 rounded-xl transition-all',
                  statusFilter === 'inactive' ? 'bg-white dark:bg-dark-surface text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-700'
                )}
              >
                Suspendus
              </button>
            </div>

            {/* Champ de recherche */}
            <div className="relative w-full sm:w-72">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filtrer nom, email, cabinet..."
                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl py-2.5 pl-11 pr-4 text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1050px]">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-dark-bg/40 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="py-4 px-6">Professionnel & Contact</th>
                <th className="py-4 px-4">Cabinet & Spécialité</th>
                <th className="py-4 px-4 text-center">Activité (Clients / RDV / Factures)</th>
                <th className="py-4 px-4 text-center">Volume Encaissé</th>
                <th className="py-4 px-4 text-center">Contrôle des Accès aux Menus (Modules)</th>
                <th className="py-4 px-4 text-center">Statut</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {loadingUsers ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-xs font-bold text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-primary" />
                      Chargement des comptes supervisés...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-xs font-bold text-gray-400">
                    Aucun compte utilisateur ne correspond à votre filtre.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => {
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
                      {/* Praticien & Contact */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-sm">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(u.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-gray-900 dark:text-white truncate">{u.name}</span>
                              {isAdmin && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 truncate">{u.email}</p>
                            {u.phone && <p className="text-[10px] font-semibold text-gray-400">{u.phone}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Cabinet & Spécialité */}
                      <td className="py-4 px-4">
                        <p className="text-xs font-black text-gray-800 dark:text-gray-200 truncate">
                          {u.cabinet_name || 'Cabinet individuel'}
                        </p>
                        <p className="text-[11px] font-bold text-primary truncate mt-0.5">
                          {u.specialty || 'Non renseignée'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </td>

                      {/* Compteurs d'activité */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-dark-bg p-1.5 rounded-2xl border border-gray-100 dark:border-dark-border text-xs font-black">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" title="Dossiers Clients">
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

                      {/* Volume financier */}
                      <td className="py-4 px-4 text-center">
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {((Number(u.volume_encaisse) || 0)).toLocaleString('fr-FR')} F
                        </span>
                        <p className="text-[10px] font-semibold text-gray-400">Total encaissé</p>
                      </td>

                      {/* Gestion des Menus / Modules */}
                      <td className="py-4 px-4">
                        {isAdmin ? (
                          <div className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-gray-100 dark:bg-dark-bg text-gray-500">
                              Accès Complet (Super Admin)
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {SYSTEM_MODULES.map(mod => {
                              const isEnabled = userMenus.includes(mod.key);
                              return (
                                <button
                                  key={mod.key}
                                  onClick={() => handleToggleMenuPermission(u, mod.key)}
                                  title={`Cliquer pour ${isEnabled ? 'désactiver' : 'activer'} le module ${mod.label}`}
                                  className={clsx(
                                    'group flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black tracking-tight transition-all active:scale-95',
                                    isEnabled
                                      ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                      : 'bg-gray-100 dark:bg-dark-bg text-gray-400 border border-transparent hover:bg-primary/10 hover:text-primary'
                                  )}
                                >
                                  <mod.icon size={11} />
                                  <span>{mod.label}</span>
                                  {isEnabled ? (
                                    <Check size={10} className="ml-0.5 group-hover:hidden text-primary" />
                                  ) : (
                                    <X size={10} className="ml-0.5 text-gray-300 dark:text-gray-600" />
                                  )}
                                  {isEnabled && <X size={10} className="ml-0.5 hidden group-hover:inline text-red-500" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* Statut du compte */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={clsx(
                            'text-[9px] px-2.5 py-1 rounded-full font-black tracking-widest uppercase inline-block',
                            u.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {u.is_active ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        {isAdmin ? (
                          <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">
                            Protégé
                          </span>
                        ) : (
                          <button
                            onClick={() => setUserToToggle(u)}
                            className={clsx(
                              'text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all shadow-sm',
                              u.is_active
                                ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                                : 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40'
                            )}
                          >
                            {u.is_active ? 'Suspendre' : 'Réactiver'}
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

      {/* Modale de confirmation pour activation/suspension de compte */}
      <ConfirmModal
        isOpen={!!userToToggle}
        onClose={() => setUserToToggle(null)}
        onConfirm={handleToggleActive}
        isDestructive={userToToggle?.is_active ?? true}
        title={userToToggle?.is_active ? 'Suspendre ce compte professionnel' : 'Réactiver ce compte'}
        message={
          userToToggle?.is_active
            ? `Le praticien ${userToToggle?.name} ne pourra plus se connecter et ses sessions seront instantanément révoquées. Ses données restent conservées.`
            : `Le praticien ${userToToggle?.name} pourra de nouveau se connecter et accéder à ses modules autorisés.`
        }
        confirmText={userToToggle?.is_active ? 'Suspendre le compte' : 'Réactiver le compte'}
      />
    </div>
  );
}
