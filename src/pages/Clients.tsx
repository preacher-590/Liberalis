import { useState, useMemo } from 'react';
import { Search, Plus, Download, Filter, X, Calendar, MessageSquare, User, Edit, FileText, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import NewClientModal from '../components/common/NewClientModal';
import ConfirmModal from '../components/common/ConfirmModal';
import WhatsAppActionModal from '../components/common/WhatsAppActionModal';
import api from '../services/api';

/**
 * Page de Gestion des Clients / Patients (Clients.tsx) — Feat 5
 *
 * Gère le dossier client complet : recherche multi-critères, création, édition,
 * et historique individuel des rendez-vous et factures.
 *
 * Sections logiques :
 * 1. Moteur de recherche textuelle, filtres par statut et tri
 * 2. Grille / Liste des clients avec compteurs d'activité
 * 3. Panneau tiroir latéral d'historique détaillé (Profil, RDV, Factures, Notes)
 * 4. Actions CRUD (création via NewClientModal, suppression via ConfirmModal)
 */
export default function Clients() {
  const { user, clients, appointments, invoices, refreshClients, refreshDashboard } = useApp();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Profil');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'recent' | 'old'>('asc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  // États de la modale interactive WhatsApp
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppData, setWhatsAppModalData] = useState<{
    recipientName: string;
    recipientPhone: string;
    message: string;
  }>({ recipientName: '', recipientPhone: '', message: '' });

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    await api.delete(`/clients/${selectedClient.id}`);
    await refreshClients();
    await refreshDashboard();
    setSelectedClient(null);
  };

  const getStatusStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIF': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'PROSPECT':
      case 'NOUVEAU': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'INACTIF': return 'bg-gray-100 text-gray-500 dark:bg-dark-surface dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-dark-surface dark:text-gray-300';
    }
  };

  const getInvoiceStatusStyle = (status: string) => {
    if (status?.toLowerCase().includes('pay')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status?.toLowerCase().includes('retard')) return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  };

  const filteredClients = useMemo(() => {
    let result = clients.filter(c => {
      const matchSearch = (`${c.first_name} ${c.last_name} ${c.phone} ${c.email || ''}`).toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'Tous' || c.status?.toUpperCase() === statusFilter.toUpperCase();
      return matchSearch && matchStatus;
    });

    return [...result].sort((a, b) => {
      if (sortOrder === 'asc') return (`${a.first_name} ${a.last_name}`).localeCompare(`${b.first_name} ${b.last_name}`);
      if (sortOrder === 'desc') return (`${b.first_name} ${b.last_name}`).localeCompare(`${a.first_name} ${a.last_name}`);
      if (sortOrder === 'recent') return b.id - a.id;
      if (sortOrder === 'old') return a.id - b.id;
      return 0;
    });
  }, [clients, searchQuery, statusFilter, sortOrder]);

  // RDVs and invoices for the selected client
  const clientAppointments = useMemo(() =>
    appointments.filter(a => a.client_id === selectedClient?.id)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
    [appointments, selectedClient]
  );
  const clientInvoices = useMemo(() =>
    invoices.filter(i => i.client_id === selectedClient?.id)
      .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()),
    [invoices, selectedClient]
  );

  const handleExportCSV = () => {
    const rows = [
      ['Prénom', 'Nom', 'Téléphone', 'Email', 'Profession', 'Statut', 'Adresse'],
      ...filteredClients.map(c => [
        c.first_name, c.last_name, c.phone, c.email || '', c.profession || '', c.status || '', c.address || ''
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_liberalis_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Ouvre la modale interactive d'action WhatsApp pour échanger avec le client.
   */
  const handleWhatsApp = (client: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (!client) return;

    const cabinet = user?.cabinet_name || 'Cabinet Libéralis';
    const practitioner = user?.name ? ` de ${user.name}` : '';
    const text = `Bonjour ${client.first_name},\n\nLe ${cabinet}${practitioner} vous contacte.\nComment pouvons-nous vous accompagner aujourd'hui ?\n\nBien cordialement.`;

    setWhatsAppModalData({
      recipientName: `${client.first_name} ${client.last_name}`.trim(),
      recipientPhone: client.phone || '',
      message: text,
    });
    setIsWhatsAppModalOpen(true);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] relative animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Répertoire des Clients</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl font-medium">
            Gérez votre portefeuille client avec l'élégance et la précision d'un cabinet de prestige.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-surface h-11 border border-gray-200 dark:border-dark-border rounded-[14px] text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-sm"
          >
            <Download size={18} />
            Exporter CSV
          </button>
          <button
            onClick={() => { setClientToEdit(null); setShowNewClientModal(true); }}
            className="flex items-center gap-2 px-6 py-2 bg-primary h-11 text-white rounded-[14px] text-sm font-bold hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={18} />
            Nouveau Client
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex bg-white dark:bg-dark-surface p-1 rounded-2xl border border-gray-100 dark:border-dark-border/50 shadow-sm">
          {['Tous', 'Actif', 'Nouveau', 'Inactif'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={clsx(
                "px-5 py-2 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                statusFilter === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl pl-10 pr-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={clsx(
                "flex items-center justify-center p-2.5 bg-white dark:bg-dark-surface border rounded-xl transition-all shadow-sm",
                isSortOpen ? "border-primary text-primary" : "border-gray-200 dark:border-dark-border text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Filter size={18} />
            </button>
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl shadow-xl z-[70] overflow-hidden p-1 animate-in slide-in-from-top-2">
                  {[
                    { id: 'recent', label: 'Plus récent', icon: Clock },
                    { id: 'asc', label: 'Nom A-Z', icon: User },
                    { id: 'desc', label: 'Nom Z-A', icon: User },
                    { id: 'old', label: 'Plus ancien', icon: Clock },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortOrder(opt.id as any); setIsSortOpen(false); }}
                      className={clsx(
                        "w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors rounded-xl",
                        sortOrder === opt.id ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-750"
                      )}
                    >
                      <opt.icon size={14} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex items-center gap-3 mb-4 text-[11px] font-bold text-gray-500">
        <span>{filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}</span>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 dark:bg-dark-surface rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <X size={10} /> Effacer
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar space-y-3 pb-8">
        <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-gray-50/50 dark:bg-dark-bg/50 backdrop-blur-md z-10">
          <div className="col-span-12 md:col-span-4">Nom &amp; Dossier</div>
          <div className="hidden md:block md:col-span-4">Contact</div>
          <div className="hidden md:block md:col-span-2">Statut</div>
          <div className="hidden md:block md:col-span-2 text-right">Actions</div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border p-12 text-center shadow-sm">
            <User size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Aucun client trouvé</h3>
            <p className="text-sm text-gray-500">Essayez de modifier votre recherche ou ajoutez un nouveau client.</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => { setSelectedClient(client); setActiveTab('Profil'); }}
              className={clsx(
                "grid grid-cols-12 items-center p-4 md:p-5 bg-white dark:bg-dark-surface border rounded-[24px] cursor-pointer transition-all hover:shadow-xl group",
                selectedClient?.id === client.id
                  ? "border-primary ring-1 ring-primary/50 dark:ring-primary/30"
                  : "border-gray-100 dark:border-dark-border/50 hover:border-gray-200 dark:hover:border-gray-600"
              )}
            >
              <div className="col-span-10 md:col-span-4 flex items-center gap-4">
                <div className={clsx(
                  "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-colors",
                  selectedClient?.id === client.id ? "bg-primary text-white" : "bg-primary/10 text-primary"
                )}>
                  {client.first_name?.[0]}{client.last_name?.[0]}
                </div>
                <div className="overflow-hidden">
                  <p className="font-black text-gray-900 dark:text-white text-base truncate">{client.first_name} {client.last_name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">REF: {client.ref_number || `CL-${client.id}`}</p>
                </div>
              </div>
              <div className="hidden md:block md:col-span-4 overflow-hidden">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{client.email || 'Non renseigné'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-500 font-black tracking-widest">{client.phone}</span>
                  {client.phone && (
                    <button
                      type="button"
                      onClick={(e) => handleWhatsApp(client, e)}
                      className="p-1 rounded-md text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366]/10 transition-colors inline-flex items-center"
                      title="Contacter sur WhatsApp"
                    >
                      <MessageSquare size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="hidden md:block md:col-span-2">
                <span className={clsx("text-[10px] px-3 py-1.5 rounded-xl font-black tracking-widest uppercase", getStatusStyle(client.status || 'PROSPECT'))}>
                  {client.status || 'PROSPECT'}
                </span>
              </div>
              <div className="col-span-2 md:col-span-2 text-right flex justify-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setClientToEdit(client); setShowNewClientModal(true); }}
                  className="p-2 text-gray-400 hover:text-primary rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Edit size={20} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Détails Client Slide-out Panel */}
      {selectedClient && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedClient(null)} />
          <div className="fixed right-0 top-0 h-screen w-full md:w-[600px] bg-white dark:bg-dark-surface z-50 shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 flex items-center justify-end">
              <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="px-8 pb-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-[32px] overflow-hidden mb-5 shadow-xl shadow-primary/20">
                <div className="w-full h-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white text-4xl font-black">
                  {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                </div>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{selectedClient.first_name} {selectedClient.last_name}</h2>
              <div className="flex items-center gap-3">
                <span className={clsx("text-[10px] px-3 py-1 rounded-lg font-black tracking-widest uppercase", getStatusStyle(selectedClient.status || 'PROSPECT'))}>
                  {selectedClient.status || 'PROSPECT'}
                </span>
                {selectedClient.profession && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedClient.profession}</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <button
                  onClick={() => handleWhatsApp(selectedClient)}
                  className="flex items-center justify-center gap-2 py-3.5 bg-[#25D366]/10 border border-[#25D366]/20 rounded-2xl text-[10px] font-black text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366]/20 transition-all uppercase tracking-widest"
                >
                  <MessageSquare size={16} /> WhatsApp
                </button>
                <button
                  onClick={() => {/* navigate to agenda + pre-fill */ setSelectedClient(null); }}
                  className="flex items-center justify-center gap-2 py-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-[10px] font-black text-primary hover:bg-primary/20 transition-all uppercase tracking-widest"
                >
                  <Calendar size={16} /> Prendre RDV
                </button>
              </div>
            </div>

            <div className="px-6 border-b border-gray-100 dark:border-dark-border/50">
              <div className="flex">
                {['Profil', 'RDV', 'Factures'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx(
                      "px-6 py-4 text-[10px] font-black transition-all relative uppercase tracking-widest",
                      activeTab === tab ? "text-primary" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(15,110,86,0.5)]"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
              {/* ── Profil Tab ─────────────────────────── */}
              {activeTab === 'Profil' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 dark:bg-dark-bg/50 rounded-[24px] p-6 border border-gray-100 dark:border-gray-800">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">COORDONNÉES</h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Téléphone</p>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-gray-900 dark:text-white">{selectedClient.phone}</p>
                          {selectedClient.phone && (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(selectedClient)}
                              className="px-2.5 py-1 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                              title="Contacter sur WhatsApp"
                            >
                              <MessageSquare size={12} />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>
                      {selectedClient.email && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 tracking-widests uppercase mb-1">Email</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{selectedClient.email}</p>
                        </div>
                      )}
                      {selectedClient.address && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Adresse</p>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{selectedClient.address}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 dark:bg-primary/10 rounded-[20px] p-5 border border-primary/10">
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">RDV Total</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">{clientAppointments.length}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/10 rounded-[20px] p-5 border border-green-100 dark:border-green-900/20">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">CA Total</p>
                      <p className="text-2xl font-black text-gray-900 dark:text-white">
                        {clientInvoices.reduce((s, i) => s + parseFloat(i.total as any || '0'), 0).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>

                  {selectedClient.notes && (
                    <div>
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">NOTES PROFESSIONNELLES</h3>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-bg/50 border border-gray-100 dark:border-gray-800 rounded-[20px] p-5 leading-relaxed">
                        {selectedClient.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ── RDV Tab ─────────────────────────────── */}
              {activeTab === 'RDV' && (
                <div className="space-y-3">
                  {clientAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm font-bold text-gray-400">Aucun rendez-vous enregistré</p>
                    </div>
                  ) : (
                    clientAppointments.map(apt => {
                      const d = new Date(apt.starts_at);
                      const isPast = d < new Date();
                      return (
                        <div key={apt.id} className="bg-gray-50 dark:bg-dark-bg/50 rounded-[20px] p-4 border border-gray-100 dark:border-gray-800 flex items-start gap-4">
                          <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", isPast ? "bg-gray-100 dark:bg-dark-surface text-gray-400" : "bg-primary/10 text-primary")}>
                            <Clock size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-gray-900 dark:text-white">{apt.type}</p>
                            <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                              {d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">{apt.duration_minutes} min · {(apt.amount || 0).toLocaleString('fr-FR')} FCFA</p>
                          </div>
                          <span className={clsx("text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-wider shrink-0",
                            apt.status?.toLowerCase().includes('confirm') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            apt.status?.toLowerCase().includes('annul') ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          )}>
                            {apt.status}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Factures Tab ─────────────────────────── */}
              {activeTab === 'Factures' && (
                <div className="space-y-3">
                  {clientInvoices.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm font-bold text-gray-400">Aucune facture émise</p>
                    </div>
                  ) : (
                    clientInvoices.map(inv => (
                      <div key={inv.id} className="bg-gray-50 dark:bg-dark-bg/50 rounded-[20px] p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">{inv.invoice_number}</p>
                          <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                            {new Date(inv.issued_at).toLocaleDateString('fr-FR')}
                            {inv.due_at && ` · Échéance: ${new Date(inv.due_at).toLocaleDateString('fr-FR')}`}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-sm text-gray-900 dark:text-white">{parseFloat(inv.total as any).toLocaleString('fr-FR')} F</p>
                          <span className={clsx("text-[9px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest mt-1 inline-block", getInvoiceStatusStyle(inv.status))}>
                            {inv.status?.includes('pay') ? 'Payée' : inv.status?.includes('retard') ? 'En retard' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-white dark:bg-dark-bg/50 flex items-center gap-4">
              <button
                onClick={() => { setClientToEdit(selectedClient); setShowNewClientModal(true); }}
                className="flex-1 py-4 bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-white rounded-[16px] text-[10px] font-black hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors uppercase tracking-widest"
              >
                Modifier Profil
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex-1 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-[16px] text-[10px] font-black hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors uppercase tracking-widest"
              >
                Archiver
              </button>
            </div>
          </div>
        </>
      )}

      {showNewClientModal && (
        <NewClientModal
          onClose={() => { setShowNewClientModal(false); setClientToEdit(null); }}
          clientToEdit={clientToEdit}
        />
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteClient}
        title="Archiver ce client ?"
        message={`Êtes-vous sûr de vouloir archiver le dossier de ${selectedClient?.first_name} ${selectedClient?.last_name} ? Cette action supprimera le client du répertoire actif.`}
        confirmText="Oui, archiver"
      />

      {/* Modale interactive WhatsApp pour la fiche client */}
      <WhatsAppActionModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        recipientName={whatsAppData.recipientName}
        recipientPhone={whatsAppData.recipientPhone}
        defaultMessage={whatsAppData.message}
        title="Contacter le client sur WhatsApp"
        subtitle="Envoyez un message direct et personnalisé à votre client."
      />
    </div>
  );
}

