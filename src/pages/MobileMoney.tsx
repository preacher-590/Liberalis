import { useState, useEffect, useRef } from 'react';
import { Plus, QrCode, ArrowLeft, CheckCircle2, Unlink, Edit, Eye } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import clsx from 'clsx';
import { useApp } from '../context/AppContext';
import MobileMoneyModal from '../components/common/MobileMoneyModal';
import { useCompteMobileMoney, type CompteMobileMoney, type CompteFormData } from '../hooks/useCompteMobileMoney';

/**
 * Page Mobile Money & Encaissements (MobileMoney.tsx)
 *
 * Permet la configuration des moyens d'encaissement Mobile Money du professionnel.
 * Génère des liens de paiement dynamiques et des QR Codes scannables par les clients.
 *
 * Sections logiques :
 * 1. Modal interne de confirmation de suppression de compte
 * 2. Gestion des comptes opérateurs (Orange, Wave, MTN, Free) via le hook `useCompteMobileMoney`
 * 3. Génération dynamique des QR Codes et des instructions USSD
 */
interface ConfirmDeleteProps {
  compte: CompteMobileMoney;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDeleteModal({ compte, isSubmitting, onConfirm, onCancel }: ConfirmDeleteProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onCancel(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl shadow-black/40 p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-900/30 border border-red-800/40 flex items-center justify-center">
            <Unlink size={20} className="text-red-400" />
          </div>
          <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors p-1 rounded-xl hover:bg-gray-700/50">
            <span className="sr-only">Fermer</span>
            ✕
          </button>
        </div>
        <div>
          <h3 className="text-base font-black text-white">Détacher le compte</h3>
          <p className="text-sm font-medium text-gray-400 mt-1">
            Voulez-vous vraiment détacher le compte <span className="font-black text-white">{compte.operateur}</span> ({compte.numero}) ?
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isSubmitting} className="flex-1 py-3 rounded-2xl text-sm font-black text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all disabled:opacity-50">Annuler</button>
          <button onClick={onConfirm} disabled={isSubmitting} className="flex-1 py-3 rounded-2xl text-sm font-black text-white bg-red-600 hover:bg-red-500 transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? 'En cours...' : 'Détacher'}
          </button>
        </div>
      </div>
    </div>
  );
}
import api from '../services/api';

// ─── Encaissements réels (table payments côté API) ─────────────────────────────
interface Payment {
  id: number;
  paid_at: string;
  client?: { first_name: string; last_name: string } | null;
  reference?: string;
  method: string;
  amount: number;
  status: 'recu' | 'en_attente' | 'echoue' | string;
}

const statusLabel = (status: string) => {
  switch (status) {
    case 'recu': return 'Reçu';
    case 'en_attente': return 'En attente';
    case 'echoue': return 'Échoué';
    default: return status;
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'recu': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'en_attente': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'echoue': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-dark-surface dark:text-gray-400';
  }
};

const formatTxDate = (iso: string) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return `Auj. ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Hier ${time}`;
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${time}`;
};

/** Correspondance souple entre un moyen de paiement et le nom d'un opérateur */
const matchesOperator = (method: string, operator: string) => {
  const m = method.toLowerCase();
  const o = operator.toLowerCase();
  return m.includes(o) || o.includes(m) || o.split(' ').some(word => word.length > 3 && m.includes(word));
};

export default function MobileMoney() {
  const { clients } = useApp();
  const { comptes, isLoading, isSubmitting, creerCompte, modifierCompte, supprimerCompte, fetchComptes } = useCompteMobileMoney();

  const [showQR, setShowQR] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [compteEdite, setCompteEdite] = useState<CompteMobileMoney | null>(null);
  const [compteASupprimer, setCompteASupprimer] = useState<CompteMobileMoney | null>(null);
  const [filterOperator, setFilterOperator] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  // Formulaire de paiement
  const [montant, setMontant] = useState('');
  const [operateurChoisi, setOperateurChoisi] = useState<CompteMobileMoney | null>(null);
  const [motif, setMotif] = useState('');

  useEffect(() => {
    fetchComptes();
    // Charge les encaissements réels depuis l'API
    api.get('/payments', { params: { per_page: 20 } })
      .then(({ data }) => setTransactions(data.data || data))
      .catch((err) => console.error('Erreur chargement paiements:', err))
      .finally(() => setTxLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (payload: CompteFormData) => {
    const result = compteEdite 
      ? await modifierCompte(compteEdite.id, payload)
      : await creerCompte(payload);

    if (result.success) {
      setShowModal(false);
      fetchComptes(); 
    } else {
      alert(result.message);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!compteASupprimer) return;
    const result = await supprimerCompte(compteASupprimer.id);
    if (result.success) {
      setCompteASupprimer(null);
      fetchComptes();
    } else {
      alert(result.message);
    }
  };

  const handleOuvrirModal = () => {
    setCompteEdite(null);
    setShowModal(true);
  };

  const handleEdit = (c: CompteMobileMoney) => {
    setCompteEdite(c);
    setShowModal(true);
  };

  // Lorsque les comptes sont chargés, sélectionner le premier actif
  useEffect(() => {
    if (comptes.length > 0 && !operateurChoisi) {
      setOperateurChoisi(comptes.find(c => c.est_actif) ?? comptes[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comptes]);

  // Code USSD calculé dynamiquement
  const codeUssdFinal = operateurChoisi?.code_ussd
    ? operateurChoisi.code_ussd.replace('{montant}', montant || '0')
    : null;

  // URI encodée pour le lien cliquable (navigateur)
  const telUri = codeUssdFinal ? `tel:${codeUssdFinal}` : null;

  // Valeur du QR Code : on préfixe avec "tel:" pour qu'Android reconnaisse le schéma
  // et ouvre directement le composeur. Le "#" NE doit PAS être encodé dans le QR.
  const qrValue = codeUssdFinal ? `tel:${codeUssdFinal}` : null;

  const handleGenererPaiement = () => {
    if (!montant || Number(montant) <= 0) return;
    setShowQR(true);
  };

  const visibleTransactions = filterOperator
    ? transactions.filter(t => matchesOperator(t.method, filterOperator))
    : transactions;

  /** Statistiques par compte : nombre de transactions et total reçu ce mois */
  const statsParOperateur = (operateur: string) => {
    const now = new Date();
    const txOperateur = transactions.filter(t => matchesOperator(t.method, operateur));
    const recuMois = txOperateur
      .filter(t => {
        const d = new Date(t.paid_at);
        return t.status === 'recu' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { count: txOperateur.length, recuMois };
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Mobile Money</h1>
          <p className="text-gray-500 font-medium mt-1">Gérez vos comptes de paiement mobile et vos transactions.</p>
        </div>
        <button 
          onClick={handleOuvrirModal}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-black hover:bg-primary-hover active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={18} /> Ajouter un compte
        </button>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="text-gray-500 text-sm font-bold">Chargement des comptes...</div>
      ) : comptes.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-[28px] border dark:border-dark-border p-8 text-center shadow-sm">
          <p className="text-gray-500 font-bold mb-4">Aucun compte Mobile Money n'est synchronisé. Veuillez lier votre premier compte.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-xl text-sm font-black hover:bg-primary hover:text-white transition-all"
          >
            <Plus size={18} /> Ajouter un compte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {comptes.map((acc, i) => (
            <div key={acc.id || i} className="bg-white dark:bg-dark-surface rounded-[28px] border border-gray-100 dark:border-dark-border p-6 shadow-sm flex flex-col gap-5 hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden">
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-5 pointer-events-none"
                style={{ backgroundColor: acc.couleur_avatar }}
              />
              <div className="flex items-center justify-between z-10">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs text-white shadow-inner"
                  style={{ backgroundColor: acc.couleur_avatar }}
                >
                  {acc.initiales}
                </div>
                <span className={clsx(
                  "flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest",
                  acc.est_actif 
                    ? "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400" 
                    : "text-gray-500 bg-gray-100 dark:bg-dark-surface dark:text-gray-400"
                )}>
                  {acc.est_actif ? <><CheckCircle2 size={12} /> Actif</> : "Inactif"}
                </span>
              </div>
              <div className="z-10">
                <p className="font-black text-gray-900 dark:text-white text-base">{acc.operateur}</p>
                <p className="text-xs text-gray-500 font-bold mt-1">{acc.numero}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-dark-border/50 z-10">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Transactions</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{statsParOperateur(acc.operateur).count}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reçu / mois</p>
                  <p className="text-sm font-black text-primary">{statsParOperateur(acc.operateur).recuMois.toLocaleString('fr-FR')} F</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap pt-2 z-10">
                <button 
                  onClick={() => setFilterOperator(filterOperator === acc.operateur ? null : acc.operateur)}
                  className={clsx(
                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1",
                    filterOperator === acc.operateur ? "bg-primary text-white shadow-md" : "text-primary bg-primary/10 hover:bg-primary hover:text-white"
                  )}
                >
                  <Eye size={12} /> Voir
                </button>
                <button 
                  onClick={() => handleEdit(acc)}
                  className="py-2 px-3 text-[10px] font-black uppercase text-gray-500 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  <Edit size={12} />
                </button>
                <button 
                  onClick={() => setCompteASupprimer(acc)}
                  className="py-2 px-3 text-[10px] font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all"
                >
                  <Unlink size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Transactions Table */}
        <div className="lg:col-span-7 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-dark-border">
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Transactions récentes</h2>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-dark-bg/30 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6">Client</th>
                  <th className="py-4 px-6">Référence</th>
                  <th className="py-4 px-6">Opérateur</th>
                  <th className="py-4 px-6 text-right">Montant</th>
                  <th className="py-4 px-6 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {txLoading ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-sm font-bold text-gray-400">Chargement des transactions...</td>
                  </tr>
                ) : visibleTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-sm font-bold text-gray-400">
                      Aucune transaction pour le moment. Les paiements apparaîtront ici dès qu'une facture sera marquée payée.
                    </td>
                  </tr>
                ) : (
                  visibleTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/80 transition-colors group">
                      <td className="py-4 px-6 text-xs font-bold text-gray-500 whitespace-nowrap">{formatTxDate(tx.paid_at)}</td>
                      <td className="py-4 px-6 text-sm font-black text-gray-900 dark:text-white">
                        {tx.client ? `${tx.client.first_name} ${tx.client.last_name}` : '—'}
                      </td>
                      <td className="py-4 px-6 text-[10px] font-bold text-gray-500 font-mono tracking-wider">{tx.reference || '—'}</td>
                      <td className="py-4 px-6 text-xs font-bold text-gray-600 dark:text-gray-300">{tx.method}</td>
                      <td className="py-4 px-6 text-sm font-black text-gray-900 dark:text-white text-right">{Number(tx.amount).toLocaleString('fr-FR')} F</td>
                      <td className="py-4 px-6 text-center">
                        <span className={clsx("text-[9px] px-2.5 py-1 rounded-md font-black tracking-widest uppercase", statusBadge(tx.status))}>
                          {statusLabel(tx.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Request Generator */}
        <div className="lg:col-span-5 bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 flex flex-col">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Demande de paiement</h2>
              <p className="text-xs font-bold text-gray-500">Générez un code ou numéro à communiquer</p>
            </div>
          </div>

          {showQR ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 animate-in slide-in-from-right-8 duration-300">
              {/* QR Code cliquable - redirige vers le composeur téléphonique */}
              {telUri ? (
                <a
                  href={telUri}
                  title="Cliquez ou scannez pour lancer la composition"
                  className="w-48 h-48 bg-white dark:bg-white rounded-3xl flex flex-col items-center justify-center border-4 border-primary/20 shadow-xl shadow-primary/5 hover:border-primary/50 hover:scale-105 transition-all group p-6"
                >
                  <QRCodeSVG 
                    value={qrValue || ''} 
                    size={140}
                    level="H"
                    includeMargin={false}
                    className="text-gray-900"
                  />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-3 group-hover:text-primary transition-colors">Toucher pour composer</span>
                </a>
              ) : (
                <div className="w-48 h-48 bg-white dark:bg-dark-bg rounded-3xl flex flex-col items-center justify-center border-4 border-primary/20 shadow-xl shadow-primary/5">
                  <QrCode size={80} className="text-primary" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">QR Code indisponible</span>
                </div>
              )}
              <div>
                <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {Number(montant).toLocaleString('fr-FR')} <span className="text-base text-gray-500">FCFA</span>
                </p>
                {codeUssdFinal ? (
                  <p className="text-sm font-bold text-gray-500 mt-2">
                    Numéro à composer : 
                    {telUri ? (
                      <a href={telUri} className="text-primary font-black bg-primary/10 px-2 py-1 rounded-md ml-1 tracking-wider hover:bg-primary hover:text-white transition-colors">{codeUssdFinal}</a>
                    ) : (
                      <span className="text-primary font-black bg-primary/10 px-2 py-1 rounded-md ml-1 tracking-wider">{codeUssdFinal}</span>
                    )}
                  </p>
                ) : (
                  <p className="text-sm font-bold text-amber-500 mt-2 bg-amber-50 dark:bg-amber-900/10 px-3 py-2 rounded-xl">
                    Ajoutez un code USSD dans les paramètres du compte pour afficher le numéro à composer.
                  </p>
                )}
                {operateurChoisi && (
                  <p className="text-xs font-bold text-gray-400 mt-1">{operateurChoisi.operateur} • {operateurChoisi.numero}</p>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-black bg-gray-50 dark:bg-dark-bg px-4 py-2 rounded-xl uppercase tracking-widest">Valable 15 minutes</p>
              <button onClick={() => setShowQR(false)} className="flex items-center gap-2 text-xs uppercase tracking-widest font-black text-gray-400 hover:text-primary transition-colors mt-2">
                <ArrowLeft size={14} /> Nouvelle demande
              </button>
            </div>
          ) : (
            <div className="space-y-6 flex-1 animate-in fade-in duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Client</label>
                <select className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-shadow">
                  {clients.slice(0, 5).map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                  <option>Client externe (non enregistré)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Montant (FCFA)</label>
                <input
                  type="number"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Ex: 75000"
                  className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">
                  Opérateur — <span className="text-gray-400 font-medium">vos comptes actifs</span>
                </label>
                {comptes.filter(c => c.est_actif).length === 0 ? (
                  <p className="text-xs text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/10 px-4 py-3 rounded-2xl">
                    Aucun compte actif. Liez un compte Mobile Money pour générer un paiement.
                  </p>
                ) : (
                  <div className={`grid gap-3 ${comptes.filter(c => c.est_actif).length <= 3 ? 'grid-cols-' + comptes.filter(c => c.est_actif).length : 'grid-cols-3'}`}>
                    {comptes.filter(c => c.est_actif).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setOperateurChoisi(c)}
                        className={clsx(
                          'py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2',
                          operateurChoisi?.id === c.id
                            ? 'border-primary text-white shadow-md shadow-primary/20'
                            : 'bg-white dark:bg-dark-surface border-gray-100 dark:border-dark-border text-gray-500 hover:border-primary/40'
                        )}
                        style={operateurChoisi?.id === c.id ? { backgroundColor: c.couleur_avatar } : {}}
                      >
                        {c.initiales}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Motif / Référence</label>
                <input
                  type="text"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                  placeholder="Consultation juridique..."
                  className="w-full bg-gray-50 dark:bg-dark-bg border-none rounded-2xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                />
              </div>
              <div className="pt-2">
                <button
                  onClick={handleGenererPaiement}
                  disabled={!montant || Number(montant) <= 0 || !operateurChoisi}
                  className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-hover active:scale-[0.98] transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <QrCode size={18} /> Générer le paiement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <MobileMoneyModal
          compteExistant={compteEdite}
          isSubmitting={isSubmitting}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {compteASupprimer && (
        <ConfirmDeleteModal
          compte={compteASupprimer}
          isSubmitting={isSubmitting}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setCompteASupprimer(null)}
        />
      )}
    </div>
  );
}

