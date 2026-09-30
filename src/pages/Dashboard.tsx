import { ArrowRight, MoreVertical, Smartphone } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import { useNavigate, Navigate } from 'react-router-dom';

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmé':
    case 'payée':
    case 'payee':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'en attente':
    case 'en_attente':
      return 'bg-[#FAEEDA] text-[#854F0B] dark:bg-amber-900/30 dark:text-amber-400';
    case 'en retard':
    case 'en_retard':
    case 'annulé':
      return 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-dark-surface dark:text-gray-300';
  }
};

/**
 * Page Dashboard Principal (Dashboard.tsx) — Feat 7
 *
 * Affiche une vue d'ensemble récapitulative de l'activité du professionnel :
 * KPIs financiers, graphiques de chiffre d'affaires 7 jours, prochains RDV et factures récentes.
 *
 * Sections logiques :
 * 1. Métriques et cartes d'indicateurs clés (KPIs)
 * 2. Graphique d'évolution du chiffre d'affaires sur 7 jours
 * 3. Planning et prochains rendez-vous de la journée
 * 4. État des factures récentes et accès rapide Mobile Money
 */
export default function Dashboard() {
  const { user, dashboardStats, appointments, clients, invoices } = useApp();
  const navigate = useNavigate();

  // Si l'utilisateur connecté est Super Admin, basculer immédiatement sur le Dashboard d'administration
  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Revenus encaissés sur 7 jours — calculés côté API depuis les paiements réels
  const revenueData = dashboardStats.revenus_7_jours ?? [];

  // Mapping des KPIs dynamiques (Feat 7)
  const kpis = [
    { title: "RDV DU JOUR", value: dashboardStats.rdv_today.toString(), change: "Aujourd'hui", icon: "📅", bg: "bg-primary/10 text-primary", positive: true },
    { title: "REVENUS MOIS", value: `${(dashboardStats.revenue_month || 0).toLocaleString('fr-FR')} F`, change: "Encaissé ce mois", icon: "💰", bg: "bg-green-100 text-green-600", positive: true },
    { title: "CLIENTS ACTIFS", value: dashboardStats.active_clients.toString(), change: "Dans votre base", icon: "👥", bg: "bg-blue-100 text-blue-600", positive: true },
    { title: "FACTURES EN ATTENTE", value: dashboardStats.pending_invoices.toString(), change: `${(dashboardStats.pending_amount || 0).toLocaleString('fr-FR')} FCFA à encaisser`, icon: "⏳", bg: "bg-orange-100 text-orange-600", positive: false }
  ];

  // Listes limitées aux éléments les plus récents
  const recentAppointments = [...appointments]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 5);

  const recentClients = [...clients]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-dark-surface rounded-[28px] border border-gray-100 dark:border-dark-border p-6 shadow-sm hover:shadow-xl transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm", kpi.bg)}>
                <span className="opacity-90">{kpi.icon}</span>
              </div>
              <span className={clsx("text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest text-center", 
                kpi.positive ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {kpi.change}
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{kpi.title}</p>
              <h3 className="text-3xl font-black text-gray-900 dark:text-white truncate">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rendez-vous du jour */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Prochains Rendez-vous</h3>
            <button onClick={() => navigate('/agenda')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary-hover flex items-center gap-1 transition-colors">
              Voir l'agenda <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex-1 p-2">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div className="col-span-2">Heure</div>
              <div className="col-span-4">Client</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-2">Statut</div>
            </div>
            {recentAppointments.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Aucun rendez-vous de prévu.</div>
            ) : (
              recentAppointments.map((apt) => {
                const date = new Date(apt.starts_at);
                const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={apt.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl group transition-all cursor-pointer">
                    <div className="col-span-2 font-black text-sm text-gray-900 dark:text-white">{timeStr}</div>
                    <div className="col-span-4 flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[10px] font-black shrink-0">
                        {apt.client.first_name[0]}{apt.client.last_name[0]}
                      </div>
                      <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{apt.client.first_name} {apt.client.last_name}</span>
                    </div>
                    <div className="col-span-3 text-xs font-bold text-gray-500 dark:text-gray-400 truncate">{apt.type}</div>
                    <div className="col-span-2 flex items-center">
                      <span className={clsx("text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full", getStatusBadge(apt.status))}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="col-span-1 text-right text-gray-300 dark:text-gray-600 transition-colors">
                      <MoreVertical size={16} className="ml-auto" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Clients Récents */}
        <div className="lg:col-span-5 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Clients récents</h3>
            <button onClick={() => navigate('/clients')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary-hover flex items-center gap-1">
              Base clients <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex-1 p-2">
            {recentClients.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Aucun client.</div>
            ) : (
              recentClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 flex items-center justify-center font-black text-sm">
                      {client.first_name[0]}{client.last_name[0]}
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900 dark:text-white">{client.first_name} {client.last_name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{client.phone}</p>
                    </div>
                  </div>
                  <div className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                    {client.status?.toUpperCase()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Factures récentes */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Factures récentes</h3>
            <button onClick={() => navigate('/factures')} className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-primary-hover flex items-center gap-1 transition-colors">
              Facturateur <ArrowRight size={14} />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-x-auto custom-scrollbar">
            {recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-gray-400">Aucune facture émise.</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="text-[10px] font-black tracking-widest text-gray-400 uppercase border-b border-gray-100 dark:border-dark-border">
                    <th className="pb-3 px-2">Référence</th>
                    <th className="pb-3 px-2">Client</th>
                    <th className="pb-3 px-2">Émise le</th>
                    <th className="pb-3 px-2">Total</th>
                    <th className="pb-3 px-2 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {recentInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group transition-colors">
                      <td className="py-4 px-2 text-xs font-black text-gray-900 dark:text-white">{invoice.invoice_number}</td>
                      <td className="py-4 px-2 text-sm text-gray-900 dark:text-white font-bold truncate">
                        {invoice.client.first_name} {invoice.client.last_name}
                      </td>
                      <td className="py-4 px-2 text-xs font-bold text-gray-500 dark:text-gray-400">
                        {new Date(invoice.issued_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-4 px-2 text-sm font-black text-gray-900 dark:text-white">
                        {invoice.total.toLocaleString('fr-FR')} <span className="text-[10px] text-gray-400">F</span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={clsx("text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full", getStatusBadge(invoice.status))}>
                          {invoice.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Côté Droit : Recettes & Mobile Money */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-6 flex flex-col justify-between h-48 sm:h-56">
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">Revenus des 7 derniers jours</h3>
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} width={80} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'black', color: '#0F6E56'}}
                    formatter={(value: number) => [`${value.toLocaleString('fr-FR')} FCFA`, 'Revenus']}
                  />
                  <Bar dataKey="value" fill="#0F6E56" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-6">
            <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4">Aperçu Mobile Money</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FF6600] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">Orange Money</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Actif</p>
                  </div>
                </div>
                <div className="text-right">
                   <ArrowRight size={16} className="text-orange-500" />
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#11B5FF] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900 dark:text-white">Wave</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Configuré</p>
                  </div>
                </div>
                <div className="text-right">
                   <ArrowRight size={16} className="text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

