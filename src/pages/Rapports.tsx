import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { Download, TrendingUp, Users, CreditCard, Percent } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

// ─── Séries agrégées retournées par GET /rapports/summary ─────────────────────
interface RapportSummary {
  revenus_mensuels: { month: string; revenue: number }[];
  consultations: { name: string; value: number }[];
  paiements: { name: string; value: number }[];
}

// Chargement paresseux (Lazy Loading) des composants graphiques
const RevenueLineChart = lazy(() => import('../components/reports/RevenueLineChart').then(m => ({ default: m.RevenueLineChart })));
const ConsultationPieChart = lazy(() => import('../components/reports/ConsultationPieChart').then(m => ({ default: m.ConsultationPieChart })));
const PaymentBarChart = lazy(() => import('../components/reports/PaymentBarChart').then(m => ({ default: m.PaymentBarChart })));
const TopClientsChart = lazy(() => import('../components/reports/TopClientsChart').then(m => ({ default: m.TopClientsChart })));

/**
 * Page de Rapports & Statistiques (Rapports.tsx)
 *
 * Analyse l'activité financière et médicale du praticien.
 * Utilise le lazy loading pour charger Recharts uniquement quand le composant est rendu.
 *
 * Sections logiques :
 * 1. KPIs d'analyse (CA cumulé, consultation moyenne, taux de recouvrement)
 * 2. Visualisations graphiques (Chiffre d'affaires mensuel, Répartition par prestation, Canaux de paiement, Top clients)
 * 3. Filtrage par période et bouton d'exportation de rapport
 */
const periods = ['Ce mois', '3 derniers mois', '6 mois', 'Année', 'Personnalisé'];

export default function Rapports() {
  const { invoices, dashboardStats, clients } = useApp();
  const [activePeriod, setActivePeriod] = useState('Année');
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState<RapportSummary | null>(null);

  // Charge les séries agrégées réelles (revenus 12 mois, consultations, paiements)
  useEffect(() => {
    api.get('/rapports/summary')
      .then(({ data }) => setSummary(data))
      .catch((err) => console.error('Erreur chargement rapports:', err));
  }, []);

  const filteredInvoices = useMemo(() => {
    const now = new Date();
    
    // Pré-calculs des dates de référence pour éviter les instanciations répétées
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(currentMonth - 3);
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(currentMonth - 6);

    return invoices.filter(inv => {
      const d = new Date(inv.issued_at || new Date());
      
      if (activePeriod === 'Ce mois') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } else if (activePeriod === '3 derniers mois') {
        return d >= threeMonthsAgo;
      } else if (activePeriod === '6 mois') {
        return d >= sixMonthsAgo;
      } else if (activePeriod === 'Année') {
        return d.getFullYear() === currentYear;
      }
      return true; // Personnalisé / fallback
    });
  }, [invoices, activePeriod]);

  // Dynamic Kpis based on filtered data
  const totalRevenue = filteredInvoices
    .filter(i => i.status.toLowerCase().includes('pay'))
    .reduce((sum, inv) => sum + Number(inv.total), 0);
    
  const pendingInvoicesList = filteredInvoices
    .filter(i => i.status.toLowerCase().includes('attente') || i.status.toLowerCase().includes('retard'));
    
  const pendingAmount = pendingInvoicesList.reduce((sum, inv) => sum + Number(inv.total), 0);
  
  const recoveryRate = filteredInvoices.length 
    ? `${Math.round((filteredInvoices.filter(i => i.status.toLowerCase().includes('pay')).length / filteredInvoices.length) * 100)}%` 
    : "0%";

  const kpis = [
    { label: `Chiffre d'affaires (${activePeriod})`, value: `${totalRevenue.toLocaleString('fr-FR')} FCFA`, change: "Total facturé payé", icon: TrendingUp, bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
    { label: "Clients Actifs", value: dashboardStats.active_clients || 0, change: "Dans la DB", icon: Users, bg: "bg-blue-100 dark:bg-blue-900/30", color: "text-blue-600 dark:text-blue-400" },
    { label: "Factures en attente", value: pendingInvoicesList.length, change: `${pendingAmount.toLocaleString('fr-FR')} FCFA`, icon: CreditCard, bg: "bg-amber-100 dark:bg-amber-900/30", color: "text-amber-600 dark:text-amber-400" },
    { label: "Taux de recouv.", value: recoveryRate, change: "Des factures émises", icon: Percent, bg: "bg-purple-100 dark:bg-purple-900/30", color: "text-purple-600 dark:text-purple-400" },
  ];

  // Dynamic Top Clients based on Invoices total amounts
  const topClients = useMemo(() => {
    const map = new Map<number, number>();
    filteredInvoices.forEach(inv => {
      const current = map.get(inv.client_id) || 0;
      map.set(inv.client_id, current + Number(inv.total));
    });

    const sorted = Array.from(map.entries())
      .map(([id, total]) => {
        const c = clients.find(cl => cl.id === id);
        return { name: c ? `${c.first_name} ${c.last_name}` : 'Client Inconnu', value: total };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return sorted;
  }, [filteredInvoices, clients]);

  // Revenus mensuels réels sur 12 mois glissants (encaissements)
  const revenueData = summary?.revenus_mensuels ?? [];

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { exportToPDF } = await import('../services/pdfExport');
      const dateStr = new Date().toISOString().slice(0, 10);
      const periodeSlug = activePeriod.toLowerCase().replace(/\s+/g, '-');
      await exportToPDF('rapport-export', `rapport-liberalis-${periodeSlug}-${dateStr}`);
    } catch (err) {
      console.error('Erreur export PDF:', err);
      alert("L'export PDF a échoué. Veuillez réessayer.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Rapports & Analyses</h1>
          <p className="text-gray-500 font-medium mt-1">Vue d'ensemble de votre activité professionnelle.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl p-1 shadow-sm">
            {periods.map(p => (
              <button key={p} onClick={() => setActivePeriod(p)} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${activePeriod === p ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all">
            <Download size={16} className={isExporting ? "animate-bounce" : ""} /> {isExporting ? 'Exportation...' : 'Exporter PDF'}
          </button>
        </div>
      </div>

      {/* Zone capturée par l'export PDF (KPIs + graphiques) */}
      <div id="rapport-export" className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-dark-surface rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm p-6 flex items-start justify-between hover:shadow-md hover:-translate-y-1 transition-all">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none pt-1">{kpi.value}</p>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 pt-2">{kpi.change}</p>
            </div>
            <div className={`w-12 h-12 ${kpi.bg} rounded-2xl flex items-center justify-center ${kpi.color}`}>
              <kpi.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <Suspense fallback={
        <div className="bg-gray-50 dark:bg-dark-surface/50 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 h-[340px] flex items-center justify-center animate-pulse">
          <span className="text-sm font-bold text-gray-400">Chargement des revenus...</span>
        </div>
      }>
        <RevenueLineChart revenueData={revenueData} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Suspense fallback={
          <div className="lg:col-span-5 bg-gray-50 dark:bg-dark-surface/50 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 h-[340px] flex items-center justify-center animate-pulse">
            <span className="text-sm font-bold text-gray-400">Chargement...</span>
          </div>
        }>
          <ConsultationPieChart data={summary?.consultations ?? []} />
        </Suspense>
        
        <Suspense fallback={
          <div className="lg:col-span-7 bg-gray-50 dark:bg-dark-surface/50 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 h-[340px] flex items-center justify-center animate-pulse">
            <span className="text-sm font-bold text-gray-400">Chargement...</span>
          </div>
        }>
          <PaymentBarChart data={summary?.paiements ?? []} />
        </Suspense>
      </div>

      <Suspense fallback={
        <div className="bg-gray-50 dark:bg-dark-surface/50 rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 h-[380px] flex items-center justify-center animate-pulse">
          <span className="text-sm font-bold text-gray-400">Chargement des clients...</span>
        </div>
      }>
        <TopClientsChart topClients={topClients} />
      </Suspense>
      </div>
    </div>
  );
}

