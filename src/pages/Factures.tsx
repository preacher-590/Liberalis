import { useState, useMemo, useEffect } from 'react';
import { FileText, Hourglass, AlertTriangle, Wallet, Printer, Download, Plus, Edit, Trash2, Lock, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import NewInvoiceModal from '../components/common/NewInvoiceModal';
import ConfirmModal from '../components/common/ConfirmModal';
import WhatsAppActionModal from '../components/common/WhatsAppActionModal';
import { generateInvoiceShareMessage, generatePaymentReceiptMessage } from '../services/whatsapp';
import api from '../services/api';

declare global {
  interface Window {
    html2pdf: any;
  }
}

/**
 * Page de Gestion des Factures (Factures.tsx) — Feat 2 & Feat 8
 *
 * Permet la création, le suivi des règlements, la prévisualisation A4 et l'export PDF.
 * Verrouille automatiquement les factures déjà réglées contre toute modification.
 *
 * Sections logiques :
 * 1. Cartes de synthèse des montants (Total encoissés, En attente, En retard)
 * 2. Liste / Table des factures avec recherche et filtres de statut
 * 3. Modale d'aperçu A4 conforme pour l'impression / export PDF
 * 4. Actions CRUD (`NewInvoiceModal`, marquage payé, suppression via `ConfirmModal`)
 */
export default function Factures() {
  // Récupération de l'utilisateur pour afficher ses paramètres de cabinet sur la facture
  const { user, invoices, dashboardStats, refreshDashboard, refreshInvoices } = useApp();
  
  // Fonctions de formatage dynamique de la devise basées sur les paramètres utilisateur
  const getCurrencySymbol = (currencyCode?: string) => {
    if (!currencyCode) return 'F';
    switch (currencyCode.toUpperCase()) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'CAD': return 'C$';
      case 'FCFA':
      default:
        return 'F';
    }
  };

  const getFullCurrency = (currencyCode?: string) => {
    return currencyCode || 'FCFA';
  };

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Toutes');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // États pour la modale de partage WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppData, setWhatsAppModalData] = useState<{
    recipientName: string;
    recipientPhone: string;
    message: string;
    title: string;
  }>({ recipientName: '', recipientPhone: '', message: '', title: '' });

  /**
   * Ouvre la modale interactive WhatsApp pré-remplie selon l'état de la facture :
   * - Facture payée : message de reçu / quittance de paiement
   * - Facture en attente / retard : message d'émission et de relance avec échéance
   */
  const handleOpenWhatsAppShare = (invoice: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!invoice || !invoice.client) return;

    const clientFullName = `${invoice.client.first_name} ${invoice.client.last_name}`.trim();
    const cabinet = user?.cabinet_name || 'Cabinet Libéralis';
    const totalAmount = parseFloat(invoice.total || '0');
    const isPaid = invoice.status?.toLowerCase().includes('pay');

    let msg = '';
    let title = '';

    if (isPaid) {
      const paymentDate = invoice.updated_at
        ? new Date(invoice.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      msg = generatePaymentReceiptMessage(
        clientFullName,
        invoice.invoice_number,
        totalAmount,
        paymentDate,
        'Mobile Money / Virement',
        cabinet
      );
      title = `Reçu de paiement ${invoice.invoice_number}`;
    } else {
      const dueDateStr = invoice.due_at
        ? new Date(invoice.due_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
        : 'À réception';
      msg = generateInvoiceShareMessage(
        clientFullName,
        invoice.invoice_number,
        totalAmount,
        dueDateStr,
        cabinet
      );
      title = `Partager la facture ${invoice.invoice_number}`;
    }

    setWhatsAppModalData({
      recipientName: clientFullName,
      recipientPhone: invoice.client.phone || '',
      message: msg,
      title,
    });
    setIsWhatsAppModalOpen(true);
  };

  // Sélection automatique de la première facture au chargement
  useEffect(() => {
    if (invoices.length > 0 && !selectedInvoice) {
      setSelectedInvoice(invoices[0]);
    }
  }, [invoices, selectedInvoice]);

  // Real computed KPIs from invoice data
  const overdueInvoices = useMemo(() => invoices.filter(inv =>
    inv.status?.toLowerCase() === 'en_retard' || inv.status?.toLowerCase() === 'en retard'
  ), [invoices]);
  const overdueAmount = useMemo(() => overdueInvoices.reduce((s, inv) => s + parseFloat(inv.total as any || '0'), 0), [overdueInvoices]);

  // Filtered invoice list
  const filteredInvoices = useMemo(() => {
    if (activeFilter === 'Toutes') return invoices;
    if (activeFilter === 'Payée') return invoices.filter(i => i.status?.toLowerCase().includes('pay'));
    if (activeFilter === 'Attente') return invoices.filter(i => i.status?.toLowerCase().includes('attente'));
    if (activeFilter === 'Retard') return invoices.filter(i => i.status?.toLowerCase().includes('retard'));
    return invoices;
  }, [invoices, activeFilter]);

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    await api.delete(`/invoices/${selectedInvoice.id}`);
    await refreshInvoices();
    await refreshDashboard();
    setSelectedInvoice(null);
  };

  const generateReport = () => {
    setIsGeneratingReport(true);
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const totalRevenue = invoices.filter(i => i.status?.toLowerCase().includes('pay')).reduce((s, i) => s + parseFloat(i.total as any || '0'), 0);
    const totalPending = invoices.filter(i => i.status?.toLowerCase().includes('attente')).reduce((s, i) => s + parseFloat(i.total as any || '0'), 0);
    const totalOverdue = overdueAmount;

    const html = `
      <html><head><meta charset="utf-8" />
      <style>
        body { font-family: 'Helvetica Neue', sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 28px; font-weight: 900; color: #0F6E56; letter-spacing: -1px; margin-bottom: 4px; }
        .sub { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 32px; }
        .kpis { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 32px; }
        .kpi { padding: 20px; border-radius: 16px; border: 1px solid #eee; }
        .kpi .label { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #aaa; margin-bottom: 8px; }
        .kpi .val { font-size: 24px; font-weight: 900; }
        .kpi .val.green { color: #0F6E56; } .kpi .val.amber { color: #D97706; } .kpi .val.red { color: #DC2626; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888; border-bottom: 2px solid #111; padding: 8px 4px; text-align: left; }
        td { font-size: 12px; font-weight: 600; padding: 12px 4px; border-bottom: 1px solid #f0f0f0; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
        .pay { background: #dcfce7; color: #166534; } .wait { background: #fef3c7; color: #92400e; } .late { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; font-size: 10px; color: #bbb; text-align: center; }
      </style></head><body>
      <h1>Libéralis — Rapport Financier</h1>
      <div class="sub">Généré le ${dateStr}</div>
      <div class="kpis">
        <div class="kpi"><div class="label">Revenus encaissés</div><div class="val green">${totalRevenue.toLocaleString('fr-FR')} FCFA</div></div>
        <div class="kpi"><div class="label">En attente</div><div class="val amber">${totalPending.toLocaleString('fr-FR')} FCFA</div></div>
        <div class="kpi"><div class="label">En retard</div><div class="val red">${totalOverdue.toLocaleString('fr-FR')} FCFA</div></div>
      </div>
      <table>
        <thead><tr><th>N° Facture</th><th>Client</th><th>Date</th><th>Échéance</th><th>Total</th><th>Statut</th></tr></thead>
        <tbody>
          ${invoices.map(inv => {
            const status = inv.status?.toLowerCase();
            const cls = status?.includes('pay') ? 'pay' : status?.includes('retard') ? 'late' : 'wait';
            const label = status?.includes('pay') ? 'Payée' : status?.includes('retard') ? 'En retard' : 'En attente';
            return `<tr>
              <td><strong>${inv.invoice_number}</strong></td>
              <td>${inv.client.first_name} ${inv.client.last_name}</td>
              <td>${new Date(inv.issued_at).toLocaleDateString('fr-FR')}</td>
              <td>${inv.due_at ? new Date(inv.due_at).toLocaleDateString('fr-FR') : '—'}</td>
              <td><strong>${parseFloat(inv.total as any).toLocaleString('fr-FR')} F</strong></td>
              <td><span class="badge ${cls}">${label}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="footer">Libéralis SaaS • Rapport confidentiel • ${now.toLocaleDateString('fr-FR')}</div>
      </body></html>`;

    const loadAndPrint = () => {
      window.html2pdf().from(html).set({
        margin: 10,
        filename: `Rapport_Liberalis_${now.toISOString().slice(0,10)}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      }).save().then(() => setIsGeneratingReport(false));
    };

    if (window.html2pdf) {
      loadAndPrint();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = loadAndPrint;
    document.body.appendChild(script);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'payée':
      case 'payee': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'en attente':
      case 'en_attente': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'en retard':
      case 'en_retard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-dark-surface dark:text-gray-400';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = () => {
    const element = document.getElementById('invoice-pdf-content');
    if (!element) return;

    const opt = {
      margin:       10,
      filename:     `Facture_${selectedInvoice.invoice_number}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      setIsExporting(false);
    });
  };

  const handleExportPDF = () => {
    if (!selectedInvoice) return;
    setIsExporting(true);
    
    if (window.html2pdf) {
      generatePDF();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      generatePDF();
    };
    document.body.appendChild(script);
  };


  return (
    <div className="space-y-8 pb-10 animate-in fade-in h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar pr-2">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-dark-surface p-6 rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm flex justify-between items-start transition-all hover:shadow-md hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">REVENUS DU MOIS</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {(dashboardStats.revenue_month || 0).toLocaleString('fr-FR')}
            </h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">FCFA</p>
            <div className="flex items-center gap-1 text-[10px] font-bold text-green-500 mt-4 uppercase tracking-widest">
              <span className="text-sm">↗</span> Encaissés
            </div>
          </div>
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-sm">
            <Wallet size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm flex justify-between items-start transition-all hover:shadow-md hover:-translate-y-1">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">EN ATTENTE</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
               {(dashboardStats.pending_amount || 0).toLocaleString('fr-FR')}
            </h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">FCFA</p>
            <p className="text-[10px] font-bold text-gray-500 mt-4 uppercase tracking-widest">{dashboardStats.pending_invoices || 0} factures en attente</p>
          </div>
          <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-500 shadow-sm">
            <Hourglass size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface p-6 rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm flex justify-between items-start transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rotate-45 translate-x-10 -translate-y-10 rounded-3xl pointer-events-none"></div>
          <div className="space-y-1 z-10">
            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">EN RETARD</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {overdueAmount.toLocaleString('fr-FR')} <span className="text-xs text-gray-500 uppercase">FCFA</span>
            </h3>
            <p className="text-[10px] font-black text-red-500 mt-4 uppercase tracking-widest">
              {overdueInvoices.length > 0 ? `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? 's' : ''} échue${overdueInvoices.length > 1 ? 's' : ''}` : 'Aucune facture échue'}
            </p>
          </div>
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-500 shadow-sm z-10">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Section: Billing Stream */}
        <div className="lg:col-span-4 xl:col-span-5 space-y-6 flex flex-col min-h-0">
          <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-gray-100 dark:border-dark-border flex flex-col xl:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Flux Factures</h2>
                <button 
                  onClick={() => { setInvoiceToEdit(null); setShowNewInvoiceModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer border border-primary/20"
                >
                  <Plus size={14} /> Nouvelle
                </button>
              </div>
              <div className="flex bg-gray-50 dark:bg-dark-bg p-1 rounded-xl w-full xl:w-auto">
                {['Toutes', 'Payée', 'Attente', 'Retard'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={clsx(
                      "flex-1 xl:flex-none px-3 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest",
                      activeFilter === tab
                        ? tab === 'Retard'
                          ? "bg-red-500 text-white shadow-sm"
                          : tab === 'Payée'
                          ? "bg-green-500 text-white shadow-sm"
                          : tab === 'Attente'
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              {filteredInvoices.length === 0 ? (
                 <div className="p-10 text-center text-sm font-bold text-gray-400">Aucune facture{activeFilter !== 'Toutes' ? ' dans cette catégorie' : ' enregistrée'}.</div>
              ) : (
                filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => setSelectedInvoice(invoice)}
                    className={clsx(
                      "relative p-5 bg-white dark:bg-dark-surface border rounded-[20px] cursor-pointer transition-all hover:shadow-lg group flex items-center gap-4",
                      selectedInvoice?.id === invoice.id 
                        ? "border-primary ring-1 ring-primary/30" 
                        : "border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-gray-600"
                    )}
                  >
                    <div className={clsx(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                      selectedInvoice?.id === invoice.id ? "bg-primary text-white" : "bg-gray-50 dark:bg-dark-bg text-gray-400 border border-gray-100 dark:border-gray-800 group-hover:text-primary"
                    )}>
                      <FileText size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-gray-900 dark:text-white text-sm truncate uppercase tracking-wider">{invoice.invoice_number}</p>
                        <p className="font-black text-gray-900 dark:text-white text-sm whitespace-nowrap">{(invoice.total || 0).toLocaleString('fr-FR')} <span className="text-[10px] text-gray-400">F</span></p>
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-gray-500 font-bold truncate pr-3">{invoice.client.first_name} {invoice.client.last_name}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleOpenWhatsAppShare(invoice, e)}
                            className="p-1.5 rounded-lg text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366]/10 transition-colors"
                            title="Partager cette facture sur WhatsApp"
                          >
                            <MessageSquare size={13} />
                          </button>
                          {invoice.status?.toLowerCase().includes('pay') && (
                            <Lock size={10} className="text-green-500" />
                          )}
                          <span className={clsx("text-[9px] px-2.5 py-1 rounded-md font-black tracking-widest uppercase", getStatusBadge(invoice.status))}>
                            {invoice.status?.includes('pay') ? 'Payée' : invoice.status?.includes('retard') ? 'En retard' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 text-center border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
              <button
                onClick={generateReport}
                disabled={isGeneratingReport || invoices.length === 0}
                className="text-[10px] uppercase tracking-widest font-black text-primary hover:text-primary-hover transition-colors disabled:opacity-40 flex items-center gap-2 mx-auto"
              >
                {isGeneratingReport ? (
                  <><div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" /> Génération...</>
                ) : (
                  <><Download size={13} /> Générer un rapport PDF</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: PDF Preview */}
        <div className="lg:col-span-8 xl:col-span-7 flex flex-col min-h-0 printable-area">
          {selectedInvoice ? (
            <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-xl overflow-hidden flex flex-col flex-1 relative print:shadow-none print:border-none print:rounded-none">
              <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gray-50/80 dark:bg-dark-bg/80 print:hidden">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">APERÇU ACTUEL</p>
                  <p className="font-black text-gray-900 dark:text-white">{selectedInvoice.invoice_number}</p>
                </div>
                <div className="flex items-center gap-3">
                  {selectedInvoice.status?.toLowerCase().includes('pay') ? (
                    // Facture payée — verrouillée, aucune modification possible
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                      <Lock size={14} className="text-green-600 dark:text-green-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-700 dark:text-green-400">Facture verrouillée</span>
                    </div>
                  ) : (
                    // Facture non payée — modifications autorisées
                    <>
                      <button 
                        onClick={() => { setInvoiceToEdit(selectedInvoice); setShowNewInvoiceModal(true); }}
                        className="flex items-center gap-2 p-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-bold shadow-sm transition-colors"
                        title="Modifier la facture"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => setIsDeleteModalOpen(true)}
                        className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 font-bold shadow-sm transition-colors"
                        title="Supprimer la facture"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                  {/* Bouton de partage WhatsApp de la facture sélectionnée */}
                  <button 
                    onClick={(e) => handleOpenWhatsAppShare(selectedInvoice, e)} 
                    className="flex items-center gap-2 px-3.5 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-all active:scale-[0.98]"
                    title="Partager cette facture par WhatsApp"
                  >
                    <MessageSquare size={16} />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 p-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary font-bold shadow-sm transition-colors">
                    <Printer size={18} />
                  </button>
                  <button 
                    onClick={handleExportPDF} 
                    disabled={isExporting}
                    className={clsx("flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-[0.98] transition-all", isExporting ? "bg-gray-400 shadow-none cursor-not-allowed" : "bg-primary shadow-primary/20 hover:bg-primary-hover")}
                  >
                    <Download size={16} />
                    <span>{isExporting ? 'EXPORT...' : 'PDF'}</span>
                  </button>
                </div>
              </div>

              <div id="invoice-pdf-content" className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#1a1c23] print:bg-white text-gray-900 dark:text-gray-100">
                <div className="min-h-full p-8 md:p-14 max-w-3xl mx-auto relative">
                  {/* Watermark for paid invoices */}
                  {selectedInvoice.status?.toLowerCase().includes('pay') && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-8 border-green-500/10 dark:border-green-400/5 rounded-3xl px-16 py-6 pointer-events-none z-0">
                      <p className="text-8xl font-black text-green-500/10 dark:text-green-400/5 tracking-widest uppercase">PAYÉE</p>
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8 mb-16">
                      <div>
                        {/* En-tête de facture dynamique basé sur les préférences d'affichage de l'utilisateur */}
                        {(user?.invoice_display_settings?.show_cabinet_name !== false) && (
                          <h1 className="text-3xl font-black italic text-primary dark:text-primary leading-none">
                            {user?.cabinet_name || "Libéralis"}
                          </h1>
                        )}
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-3 font-bold uppercase tracking-widest leading-relaxed">
                          {(user?.invoice_display_settings?.show_name !== false && user?.name) && (
                            <>
                              {user.name}
                              {(user?.invoice_display_settings?.show_specialty !== false && user.specialty) && ` • ${user.specialty}`}
                              <br />
                            </>
                          )}
                          {(user?.invoice_display_settings?.show_specialty !== false && user?.invoice_display_settings?.show_name === false && user?.specialty) && (
                            <>{user.specialty}<br /></>
                          )}
                          {(user?.invoice_display_settings?.show_cabinet_address !== false) && (
                            <>{user?.cabinet_address || "Plateau, Abidjan"}<br /></>
                          )}
                          {(user?.invoice_display_settings?.show_email !== false) && (
                            <>{user?.email || "contact@liberalis.ci"}<br /></>
                          )}
                          {(user?.invoice_display_settings?.show_phone !== false && user?.phone) && (
                            <>{user.phone}<br /></>
                          )}
                        </p>
                      </div>
                      <div className="text-left md:text-right">
                        <h2 className="text-4xl font-black text-gray-200 dark:text-gray-700 uppercase tracking-tighter mb-2 print:text-gray-300">FACTURE</h2>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">{selectedInvoice.invoice_number}</p>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          Émise le: {new Date(selectedInvoice.issued_at).toLocaleDateString('fr-FR')}
                        </p>
                        {selectedInvoice.due_at && (
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Échéance: {new Date(selectedInvoice.due_at).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16 p-8 bg-gray-50 dark:bg-dark-surface/50 rounded-[28px] border border-gray-100 dark:border-dark-border">
                      <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">FACTURÉ À</p>
                        <p className="font-black text-gray-900 dark:text-white text-lg leading-tight mb-2">
                          {selectedInvoice.client.first_name} {selectedInvoice.client.last_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                          {selectedInvoice.client.address || 'Adresse non renseignée'}<br />
                          {selectedInvoice.client.phone}<br />
                          {selectedInvoice.client.email}
                        </p>
                      </div>
                      <div>
                         <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">INFORMATIONS</p>
                         <div className="space-y-3">
                           <p className="text-[10px] font-bold flex justify-between border-b border-dashed border-gray-200 dark:border-dark-border pb-2">
                             <span className="text-gray-500 uppercase tracking-widest">Référence Client</span>
                             <span className="text-gray-900 dark:text-white uppercase tracking-wider">{selectedInvoice.client.ref_number || 'N/A'}</span>
                           </p>
                            <p className="text-[10px] font-bold flex justify-between border-b border-dashed border-gray-200 dark:border-dark-border pb-2">
                              <span className="text-gray-500 uppercase tracking-widest">Moyens de paiement acceptés</span>
                              {/* Moyens de paiement dynamiques issus de la facture */}
                              <span className="text-gray-900 dark:text-white tracking-wider">
                                {selectedInvoice.payment_methods && selectedInvoice.payment_methods.length > 0
                                  ? selectedInvoice.payment_methods.join(', ')
                                  : 'Virement, Wave'}
                              </span>
                            </p>
                         </div>
                      </div>
                    </div>

                    <div className="mb-12">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-900 dark:border-gray-100 text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest text-left">
                            <th className="pb-4 pl-2">Description</th>
                            <th className="pb-4 text-center">Qté</th>
                            <th className="pb-4 text-right">Prix Unitaire</th>
                            <th className="pb-4 text-right pr-2">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {selectedInvoice.lines?.map((line: any) => (
                            <tr key={line.id} className="text-sm font-bold text-gray-700 dark:text-gray-300 group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                              <td className="py-5 pl-2">{line.description}</td>
                              <td className="py-5 text-center bg-gray-50 dark:bg-dark-surface group-hover:bg-transparent transition-colors">{line.quantity}</td>
                               {/* Affichage dynamique de la devise configurée */}
                               <td className="py-5 text-right font-black">{parseFloat(line.unit_price).toLocaleString('fr-FR')} {getCurrencySymbol(user?.currency)}</td>
                               <td className="py-5 text-right font-black text-gray-900 dark:text-white pr-2">{parseFloat(line.total).toLocaleString('fr-FR')} {getCurrencySymbol(user?.currency)}</td>
                            </tr>
                          ))}
                          {(!selectedInvoice.lines || selectedInvoice.lines.length === 0) && (
                            <tr className="text-sm font-medium text-gray-500">
                              <td colSpan={4} className="py-6 text-center italic">Génération automatique des lignes de facturation via motif du RDV...</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-8 pb-12">
                       {/* Calculs financiers et symboles monétaires dynamiques */}
                       <div className="w-full md:w-80 space-y-4 bg-gray-50 dark:bg-dark-surface/50 p-6 rounded-[24px] border border-gray-100 dark:border-dark-border">
                         <div className="flex justify-between items-center text-xs font-black text-gray-500 uppercase tracking-widest">
                           <span>Sous-total:</span>
                           <span className="text-gray-900 dark:text-white">{(selectedInvoice.subtotal || selectedInvoice.total).toLocaleString('fr-FR')} {getCurrencySymbol(user?.currency)}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-black text-gray-500 uppercase tracking-widest">
                           <span>Remise:</span>
                           <span className="text-gray-900 dark:text-white">{(selectedInvoice.discount || 0).toLocaleString('fr-FR')} {getCurrencySymbol(user?.currency)}</span>
                         </div>
                         <div className="flex justify-between items-center text-xs font-black text-amber-600 uppercase tracking-widest">
                           <span>Déjà payé:</span>
                           <span className="text-amber-700">{(selectedInvoice.amount_paid || 0).toLocaleString('fr-FR')} {getCurrencySymbol(user?.currency)}</span>
                         </div>
                         <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-200 dark:border-dark-border">
                           <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">RESTE À PAYER</span>
                           <span className="text-3xl font-black text-primary tracking-tight">{(Math.max(0, (selectedInvoice.total || 0) - (selectedInvoice.amount_paid || 0))).toLocaleString('fr-FR')} <span className="text-xs text-primary uppercase">{getFullCurrency(user?.currency)}</span></span>
                         </div>
                       </div>
                    </div>

                    {selectedInvoice.notes && (
                      <div className="mb-10 p-5 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/10 rounded-r-2xl">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">NOTES</p>
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-500">{selectedInvoice.notes}</p>
                      </div>
                    )}

                    <div className="mt-20 pt-8 border-t border-gray-100 dark:border-gray-800 text-center">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Conditions de règlement</p>
                       {/* Mentions légales personnalisées dynamiques */}
                       <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium leading-relaxed max-w-xl mx-auto">
                         {user?.legal_mentions || "Veuillez effectuer le règlement par virement bancaire ou Mobile Money sous 30 jours à compter de la date d'émission. Des pénalités de retard de 10% pourront être appliquées après l'échéance. Merci de votre confiance."}
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="flex-1 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border flex flex-col items-center justify-center p-10 text-center shadow-xl shadow-gray-100/50 dark:shadow-none">
                <div className="w-24 h-24 bg-gray-50 dark:bg-dark-bg rounded-full flex items-center justify-center text-gray-300 dark:text-gray-700 mb-6">
                  <FileText size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Aperçu Facture</h3>
                <p className="text-sm text-gray-500 font-medium">Sélectionnez une facture dans la liste pour visualiser les détails et l'exporter en PDF.</p>
             </div>
          )}
        </div>
      </div>
      
      {showNewInvoiceModal && (
        <NewInvoiceModal 
          onClose={() => {
            setShowNewInvoiceModal(false);
            setInvoiceToEdit(null);
          }} 
          invoiceToEdit={invoiceToEdit}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteInvoice}
        title="Supprimer la facture ?"
        message={`Êtes-vous sûr de vouloir supprimer la facture ${selectedInvoice?.invoice_number} ? Cette action est irréversible.`}
        confirmText="Oui, supprimer"
      />

      {/* Modale interactive de partage WhatsApp de facture / reçu */}
      <WhatsAppActionModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        recipientName={whatsAppData.recipientName}
        recipientPhone={whatsAppData.recipientPhone}
        defaultMessage={whatsAppData.message}
        title={whatsAppData.title || "Partager la facture via WhatsApp"}
        subtitle="Personnalisez le message de transmission avant ouverture de WhatsApp."
      />
    </div>
  );
}

