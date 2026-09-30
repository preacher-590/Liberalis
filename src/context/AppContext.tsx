import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';
import { useTheme } from './ThemeContext';
import { offlineStorage } from '../services/offlineStorage';

// ─── Types des entités principales ────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  email: string;
  specialty: string;
  cabinet_name: string;
  avatar_url?: string;
  theme: string;
  invoice_prefix: string;
  phone: string;
  cabinet_address: string;
  email_reminders: boolean;
  email_delay: string;
  email_template: string;
  payment_conditions: string;
  currency: string;
  legal_mentions: string;
  consultation_rates: any;
  role?: 'pro' | 'admin' | string;
  allowed_menus?: string[];
  // Réglages d'affichage personnalisés pour les factures
  invoice_display_settings?: {
    show_name: boolean;
    show_specialty: boolean;
    show_cabinet_name: boolean;
    show_cabinet_address: boolean;
    show_email: boolean;
    show_phone: boolean;
  };
}

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  profession?: string;
  status: string;
  ref_number: string;
  notes?: string;
  address?: string;
  appointments_count?: number;
  invoices_sum_total?: number;
}

export interface Appointment {
  id: number;
  client: Client;
  client_id: number;
  type: string;
  starts_at: string;
  duration_minutes: number;
  amount: number;
  status: string;
  notes?: string;
}

export interface InvoiceLine {
  id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  client: Client;
  client_id: number;
  invoice_number: string;
  issued_at: string;
  due_at: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  notes?: string;
  payment_methods?: string[];
  lines?: InvoiceLine[];
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface RevenueDay {
  name: string;
  value: number;
}

export interface DashboardStats {
  rdv_today: number;
  revenue_month: number;
  active_clients: number;
  pending_invoices: number;
  pending_amount: number;
  revenus_7_jours: RevenueDay[];
}

// ─── Interface du contexte ────────────────────────────────────────────────────
interface AppContextType {
  // Feat 9 — Authentification
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => Promise<void>;

  // Feat 5 — Clients
  clients: Client[];
  clientsLoading: boolean;
  refreshClients: () => Promise<void>;

  // Feat 6 — Rendez-vous
  appointments: Appointment[];
  refreshAppointments: (week?: string) => Promise<void>;

  // Feat 2 — Factures
  invoices: Invoice[];
  refreshInvoices: () => Promise<void>;

  // Feat 3 — Notifications
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Feat 7 — Dashboard stats dynamiques
  dashboardStats: DashboardStats;
  refreshDashboard: () => Promise<void>;

  loading: boolean;
}

// ─── Initialisation du contexte ───────────────────────────────────────────────
const AppContext = createContext<AppContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────
/**
 * AppProvider — Feat 1 : Gestion d'état global
 *
 * Ce provider centralise toutes les données de l'application.
 * Il doit envelopper le Router dans main.tsx pour que toutes les pages
 * partagent le même état sans prop drilling.
 *
 * La session utilisateur est restaurée depuis localStorage au démarrage.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  // Restauration de la session depuis localStorage (Feat 9 — Persistance)
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const { setTheme } = useTheme();

  // Synchronise le thème utilisateur uniquement s'il est spécifié et valide
  useEffect(() => {
    if (user?.theme && (user.theme === 'light' || user.theme === 'dark' || user.theme === 'system')) {
      const storedTheme = localStorage.getItem('theme');
      // Si aucun thème n'est encore enregistré en local, on prend celui du compte utilisateur
      if (!storedTheme) {
        setTheme(user.theme as any);
      }
    }
  }, [user?.theme, setTheme]);

  // Initialisation instantanée depuis le cache local pour un affichage à 0ms et mode hors-ligne complet
  const [clients, setClients] = useState<Client[]>(() => offlineStorage.getCachedData<Client[]>('clients') || []);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>(() => offlineStorage.getCachedData<Appointment[]>('appointments') || []);
  const [invoices, setInvoices] = useState<Invoice[]>(() => offlineStorage.getCachedData<Invoice[]>('invoices') || []);
  const [notifications, setNotifications] = useState<Notification[]>(() => offlineStorage.getCachedData<Notification[]>('notifications') || []);
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const cached = offlineStorage.getCachedData<Notification[]>('notifications') || [];
    return cached.filter((n) => !n.is_read).length;
  });
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(() => offlineStorage.getCachedData<DashboardStats>('dashboardStats') || {
    rdv_today: 0,
    revenue_month: 0,
    active_clients: 0,
    pending_invoices: 0,
    pending_amount: 0,
    revenus_7_jours: [],
  });
  const [loading, setLoading] = useState(false);

  // Persiste le user dans localStorage à chaque changement
  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('auth_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('auth_user');
    }
  };

  // Hydratation asynchrone depuis IndexedDB chiffré (AES-GCM) au démarrage
  useEffect(() => {
    offlineStorage
      .hydrateFromEncryptedStorage()
      .then(() => {
        const cachedClients = offlineStorage.getCachedData<Client[]>('clients');
        if (cachedClients && cachedClients.length > 0) setClients(cachedClients);

        const cachedApts = offlineStorage.getCachedData<Appointment[]>('appointments');
        if (cachedApts && cachedApts.length > 0) setAppointments(cachedApts);

        const cachedInvoices = offlineStorage.getCachedData<Invoice[]>('invoices');
        if (cachedInvoices && cachedInvoices.length > 0) setInvoices(cachedInvoices);

        const cachedStats = offlineStorage.getCachedData<DashboardStats>('dashboardStats');
        if (cachedStats) setDashboardStats(cachedStats);
      })
      .catch((e) => console.warn('[AppProvider] Hydratation IndexedDB:', e));
  }, []);

  // Traitement automatique de la file de synchronisation dès que la connexion Internet revient
  useEffect(() => {
    const handleOnline = async () => {
      console.info('[AppProvider] Reconnexion Internet détectée. Déclenchement de la synchronisation...');
      try {
        const { processed } = await offlineStorage.processSyncQueue(api);
        if (processed > 0) {
          console.info(`[AppProvider] ${processed} opération(s) synchronisée(s). Rafraîchissement des données...`);
        }
      } catch (err) {
        console.error('[AppProvider] Erreur lors de la synchronisation automatique:', err);
      } finally {
        // Rafraîchit les entités depuis l'API pour récupérer les données consolidées
        refreshClients();
        refreshAppointments();
        refreshInvoices();
        refreshNotifications();
        refreshDashboard();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Charge toutes les données dès que l'utilisateur est connecté
  useEffect(() => {
    if (user) {
      refreshClients();
      refreshAppointments();
      refreshInvoices();
      refreshNotifications();
      refreshDashboard();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Méthodes de rafraîchissement ──────────────────────────────────────────

  /** Feat 5 — Charge la liste des clients depuis l'API */
  const refreshClients = async () => {
    setClientsLoading(true);
    try {
      const { data } = await api.get('/clients');
      setClients(data.data || data);
    } catch (err) {
      console.error('Erreur chargement clients:', err);
    } finally {
      setClientsLoading(false);
    }
  };

  /** Feat 6 — Charge les RDV (tous si aucune semaine, ou filtrés par semaine) */
  const refreshAppointments = async (week?: string) => {
    try {
      const params: Record<string, string> = {};
      if (week) params.week = week;
      else params.all = '1'; // Demande tous les RDV pour l'historique client
      const { data } = await api.get('/appointments', { params });
      setAppointments(Array.isArray(data) ? data : (data.data || []));
    } catch (err) {
      console.error('Erreur chargement RDV:', err);
    }
  };

  /** Feat 2 — Charge la liste complète des factures */
  const refreshInvoices = async () => {
    try {
      const { data } = await api.get('/invoices', { params: { per_page: 200 } });
      setInvoices(data.data || data);
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    }
  };


  /** Feat 3 — Charge les notifications et le compteur de non-lues */
  const refreshNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.data);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    }
  };

  /** Feat 3 — Marque une notification individuelle comme lue */
  const markNotificationRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur markNotificationRead:', err);
    }
  };

  /** Feat 3 — Marque toutes les notifications comme lues */
  const markAllNotificationsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Erreur markAllRead:', err);
    }
  };

  /** Feat 7 — Charge les stats du tableau de bord depuis l'API */
  const refreshDashboard = async () => {
    try {
      const { data } = await api.get('/dashboard/stats');
      setDashboardStats(data);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  /** Feat 9 — Déconnexion : révoque le token et vide l'état */
  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/logout');
    } catch {
      // Ignore les erreurs de déconnexion côté serveur
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Nettoie également le cache hors-ligne pour la confidentialité des données
      offlineStorage.clearAllCache();
      setUserState(null);
      setClients([]);
      setAppointments([]);
      setInvoices([]);
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        logout,
        clients,
        clientsLoading,
        refreshClients,
        appointments,
        refreshAppointments,
        invoices,
        refreshInvoices,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        dashboardStats,
        refreshDashboard,
        loading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─── Hook personnalisé ────────────────────────────────────────────────────────
/**
 * useApp — Accède au contexte global depuis n'importe quelle page.
 *
 * Usage :
 *   const { clients, refreshClients } = useApp();
 */
export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp() doit être utilisé à l\'intérieur d\'un <AppProvider>');
  }
  return ctx;
};

