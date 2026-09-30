import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Plus, Smartphone, MoreVertical, Edit2,
  ToggleLeft, ToggleRight, Trash2, AlertTriangle, X,
} from 'lucide-react';
import MobileMoneyModal from './MobileMoneyModal';
import {
  useCompteMobileMoney,
  type CompteMobileMoney,
  type CompteFormData,
} from '../../hooks/useCompteMobileMoney';

// ─── Toast ─────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastIdCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return { toasts, push };
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold
            shadow-2xl backdrop-blur-sm pointer-events-none
            animate-in slide-in-from-top-4 fade-in duration-300
            ${t.type === 'success'
              ? 'bg-emerald-500/90 text-white'
              : 'bg-red-500/90 text-white'}
          `}
        >
          {t.type === 'success' ? (
            <span className="w-2 h-2 rounded-full bg-white/70 flex-shrink-0" />
          ) : (
            <AlertTriangle size={14} className="flex-shrink-0" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-gray-50 dark:bg-dark-surface rounded-2xl border border-gray-200 dark:border-dark-border p-5 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-700/80 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 dark:bg-gray-700/80 rounded-lg w-1/3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700/60 rounded-lg w-1/4" />
      </div>
      <div className="w-16 h-6 bg-gray-200 dark:bg-gray-700/60 rounded-full" />
    </div>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

interface DropdownProps {
  compte: CompteMobileMoney;
  onModifier: () => void;
  onToggle: () => void;
  onSupprimer: () => void;
}

function ActionDropdown({ compte, onModifier, onToggle, onSupprimer }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-xl
                   text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/60
                   transition-colors"
        aria-label="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-44
                        bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl
                        shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden
                        animate-in zoom-in-95 fade-in duration-150">
          <button
            onClick={() => { setOpen(false); onModifier(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3
                       text-sm font-bold text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
          >
            <Edit2 size={14} /> Modifier
          </button>
          <button
            onClick={() => { setOpen(false); onToggle(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3
                       text-sm font-bold text-gray-700 dark:text-gray-200
                       hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors"
          >
            {compte.est_actif
              ? <ToggleLeft size={14} />
              : <ToggleRight size={14} className="text-primary" />
            }
            {compte.est_actif ? 'Désactiver' : 'Activer'}
          </button>
          <div className="border-t border-gray-100 dark:border-dark-border" />
          <button
            onClick={() => { setOpen(false); onSupprimer(); }}
            className="flex items-center gap-2.5 w-full px-4 py-3
                       text-sm font-bold text-red-600 dark:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={14} /> Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Modal de confirmation de suppression ──────────────────────────────────────

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/60 backdrop-blur-sm
                 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-3xl
                      shadow-2xl shadow-black/10 dark:shadow-black/40 p-6 space-y-5
                      animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/40
                          flex items-center justify-center">
            <Trash2 size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50">
            <X size={16} />
          </button>
        </div>

        <div>
          <h3 className="text-base font-black text-gray-900 dark:text-white">Supprimer le compte</h3>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
            Voulez-vous vraiment supprimer le compte{' '}
            <span className="font-black text-gray-900 dark:text-white">{compte.operateur}</span> ({compte.numero}) ?
            Cette action est irréversible.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl text-sm font-black text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700
                       transition-all disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-2xl text-sm font-black text-white
                       bg-red-600 hover:bg-red-500 active:scale-[0.98]
                       transition-all shadow-lg shadow-red-500/30 dark:shadow-red-900/30
                       flex items-center justify-center gap-2
                       disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Supprimer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function MobileMoneySettings() {
  const {
    comptes,
    isLoading,
    isSubmitting,
    fetchComptes,
    creerCompte,
    modifierCompte,
    toggleActif,
    supprimerCompte,
  } = useCompteMobileMoney();

  const { toasts, push } = useToast();

  // États UI
  const [showModal, setShowModal]             = useState(false);
  const [compteEdite, setCompteEdite]         = useState<CompteMobileMoney | null>(null);
  const [compteASupprimer, setCompteASupprimer] = useState<CompteMobileMoney | null>(null);

  // Chargement au montage
  useEffect(() => {
    fetchComptes().then(({ success, message }) => {
      if (!success) push(message, 'error');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleOuvrir = () => { setCompteEdite(null); setShowModal(true); };
  const handleModifier = (c: CompteMobileMoney) => { setCompteEdite(c); setShowModal(true); };

  const handleSave = async (payload: CompteFormData) => {
    const result = compteEdite
      ? await modifierCompte(compteEdite.id, payload)
      : await creerCompte(payload);

    push(result.message, result.success ? 'success' : 'error');
    if (result.success) setShowModal(false);
  };

  const handleToggle = async (c: CompteMobileMoney) => {
    const result = await toggleActif(c.id);
    push(result.message, result.success ? 'success' : 'error');
  };

  const handleSupprimerConfirm = async () => {
    if (!compteASupprimer) return;
    const result = await supprimerCompte(compteASupprimer.id);
    push(result.message, result.success ? 'success' : 'error');
    if (result.success) setCompteASupprimer(null);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toasts */}
      <ToastStack toasts={toasts} />

      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">
              Comptes Mobile Money
            </h3>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              Comptes utilisés pour recevoir les paiements de vos clients.
            </p>
          </div>
          <button
            onClick={handleOuvrir}
            className="flex items-center gap-2 px-4 py-2.5
                       bg-primary hover:bg-primary/90 active:scale-95
                       text-white text-xs font-black rounded-xl
                       transition-all shadow-lg shadow-primary/20"
          >
            <Plus size={15} /> Ajouter un compte
          </button>
        </div>

        {/* Liste */}
        <div className="space-y-3">
          {/* Skeleton */}
          {isLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* État vide */}
          {!isLoading && comptes.length === 0 && (
            <div className="flex flex-col items-center justify-center
                            gap-4 py-14 text-center
                            bg-gray-50 dark:bg-dark-surface/50 border border-dashed border-gray-200 dark:border-dark-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border
                              flex items-center justify-center shadow-sm">
                <Smartphone size={24} className="text-gray-400 dark:text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-700 dark:text-gray-300">
                  Aucun compte Mobile Money configuré.
                </p>
                <p className="text-xs font-medium text-gray-500 mt-1">
                  Ajoutez votre premier compte.
                </p>
              </div>
              <button
                onClick={handleOuvrir}
                className="flex items-center gap-2 px-4 py-2.5
                           bg-primary/10 hover:bg-primary/20
                           text-primary text-xs font-black rounded-xl
                           transition-all border border-primary/20"
              >
                <Plus size={14} /> Ajouter un compte
              </button>
            </div>
          )}

          {/* Cards comptes */}
          {!isLoading && comptes.map((compte) => (
            <div
              key={compte.id}
              className="flex items-center gap-4 p-4 pr-3
                         bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-surface/80
                         border border-gray-100 dark:border-dark-border shadow-sm dark:shadow-none
                         rounded-2xl transition-colors group"
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center
                           text-xs font-black flex-shrink-0 shadow-inner"
                style={{
                  backgroundColor: `${compte.couleur_avatar}25`,
                  border: `1.5px solid ${compte.couleur_avatar}50`,
                  color: compte.couleur_avatar,
                }}
              >
                {compte.initiales}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 dark:text-white truncate">
                  {compte.operateur}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                  {compte.numero}
                </p>
              </div>

              {/* Badge statut */}
              <span
                className={`
                  flex-shrink-0 text-[9px] font-black uppercase tracking-widest
                  px-2.5 py-1 rounded-full
                  ${compte.est_actif
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}
                `}
              >
                {compte.est_actif ? 'ACTIF' : 'INACTIF'}
              </span>

              {/* Actions */}
              <ActionDropdown
                compte={compte}
                onModifier={() => handleModifier(compte)}
                onToggle={() => handleToggle(compte)}
                onSupprimer={() => setCompteASupprimer(compte)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Création / Modification */}
      {showModal && (
        <MobileMoneyModal
          compteExistant={compteEdite}
          isSubmitting={isSubmitting}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Modal Confirmation Suppression */}
      {compteASupprimer && (
        <ConfirmDeleteModal
          compte={compteASupprimer}
          isSubmitting={isSubmitting}
          onConfirm={handleSupprimerConfirm}
          onCancel={() => setCompteASupprimer(null)}
        />
      )}
    </>
  );
}


