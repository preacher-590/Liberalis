import { useState, useEffect, useRef } from 'react';
import { X, Smartphone } from 'lucide-react';
import type { CompteMobileMoney, CompteFormData } from '../../hooks/useCompteMobileMoney';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MobileMoneyModalProps {
  compteExistant?: CompteMobileMoney | null;
  isSubmitting: boolean;
  onSave: (payload: CompteFormData) => Promise<void>;
  onClose: () => void;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const OPERATEURS = [
  { label: 'Orange Money',     value: 'Orange Money',     couleur: '#F97316' },
  { label: 'Wave Pay',         value: 'Wave Pay',         couleur: '#3B82F6' },
  { label: 'MTN Mobile Money', value: 'MTN Mobile Money', couleur: '#EAB308' },
  { label: 'Free Money',       value: 'Free Money',       couleur: '#8B5CF6' },
  { label: 'Autre',            value: 'Autre',            couleur: '#6B7280' },
];

const NUMERO_REGEX = /^\+?[0-9\s]{8,15}$/;

// ─── Composant ─────────────────────────────────────────────────────────────────

export default function MobileMoneyModal({
  compteExistant,
  isSubmitting,
  onSave,
  onClose,
}: MobileMoneyModalProps) {
  const isEdit = !!compteExistant;

  const predefinedValues = OPERATEURS.map(o => o.value);
  const isPredefined = (val: string) => predefinedValues.includes(val) && val !== 'Autre';

  const [operateur, setOperateur] = useState(
    compteExistant ? (isPredefined(compteExistant.operateur) ? compteExistant.operateur : 'Autre') : 'Orange Money'
  );
  const [customOperateur, setCustomOperateur] = useState(
    compteExistant && !isPredefined(compteExistant.operateur) ? compteExistant.operateur : ''
  );
  const [numero, setNumero]           = useState(compteExistant?.numero ?? '');
  const [codeUssd, setCodeUssd]       = useState(compteExistant?.code_ussd ?? '');
  const [estActif, setEstActif]       = useState(compteExistant?.est_actif ?? true);
  const [numeroError, setNumeroError] = useState('');

  const backdropRef = useRef<HTMLDivElement>(null);

  // Fermeture via Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Couleur de l'opérateur sélectionné
  const couleurSelectionnee =
    OPERATEURS.find((o) => o.value === operateur)?.couleur ?? '#6B7280';

  // Validation du numéro
  const validateNumero = (val: string) => {
    if (!val.trim()) {
      setNumeroError('Le numéro est requis.');
      return false;
    }
    if (!NUMERO_REGEX.test(val)) {
      setNumeroError('Format invalide. Ex : +221 77 000 00 00');
      return false;
    }
    setNumeroError('');
    return true;
  };

  const isFormValid = !numeroError && numero.trim() !== '' && NUMERO_REGEX.test(numero);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNumero(numero)) return;
    
    const finalOperateur = operateur === 'Autre' ? customOperateur.trim() : operateur;
    if (!finalOperateur) {
      alert('Veuillez saisir le nom de l\'opérateur.');
      return;
    }

    await onSave({ 
      id: compteExistant?.id,
      operateur: finalOperateur, 
      numero: numero.trim(), 
      code_ussd: codeUssd.trim() || null, 
      est_actif: estActif 
    });
  };

  // Clic sur le backdrop (fond sombre)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/60 backdrop-blur-sm
                 animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-md
                    bg-white dark:bg-dark-surface rounded-3xl border border-gray-100 dark:border-dark-border
                    shadow-2xl shadow-black/10 dark:shadow-black/40
                    animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-modal-title"
      >
        {/* ── En-tête ── */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner"
              style={{ backgroundColor: `${couleurSelectionnee}25`, border: `1.5px solid ${couleurSelectionnee}40` }}
            >
              <Smartphone size={18} style={{ color: couleurSelectionnee }} />
            </div>
            <div>
              <h2
                id="mm-modal-title"
                className="text-base font-black text-gray-900 dark:text-white"
              >
                {isEdit ? 'Modifier le compte' : 'Ajouter un compte Mobile Money'}
              </h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Ce compte sera utilisé pour recevoir les paiements de vos clients.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Corps ── */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Champ 1 — Opérateur */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Opérateur
            </label>
            <div className="relative">
              {/* Pastille colorée */}
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex-shrink-0 pointer-events-none"
                style={{ backgroundColor: couleurSelectionnee }}
              />
              <select
                value={operateur}
                onChange={(e) => setOperateur(e.target.value)}
                className="w-full pl-9 pr-4 py-3.5
                           bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl
                           text-sm font-bold text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-primary/40
                           transition-shadow appearance-none cursor-pointer"
              >
                {OPERATEURS.map((op) => (
                  <option key={op.value} value={op.value} className="bg-white dark:bg-dark-surface text-gray-900 dark:text-white">
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Champ 1.5 — Nom de l'opérateur (si Autre) */}
          {operateur === 'Autre' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Nom de l'opérateur
              </label>
              <input
                type="text"
                value={customOperateur}
                onChange={(e) => setCustomOperateur(e.target.value)}
                placeholder="Ex: Moov Money, Flooz..."
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                required
              />
            </div>
          )}

          {/* Champ 2 — Numéro de téléphone */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Numéro de téléphone
            </label>
            <input
              type="tel"
              value={numero}
              onChange={(e) => {
                setNumero(e.target.value);
                if (numeroError) validateNumero(e.target.value);
              }}
              onBlur={() => validateNumero(numero)}
              placeholder="+221 77 000 00 00"
              className={`w-full px-4 py-3.5
                          bg-gray-50 dark:bg-dark-bg rounded-2xl
                          text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600
                          focus:outline-none focus:ring-2 transition-shadow
                          border ${numeroError
                            ? 'border-red-500 focus:ring-red-500/30'
                            : 'border-gray-200 dark:border-dark-border focus:ring-primary/40'
                          }`}
            />
            {numeroError && (
              <p className="text-xs font-bold text-red-500 dark:text-red-400 ml-1">{numeroError}</p>
            )}
          </div>

          {/* Champ 3 — Code USSD optionnel */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Code USSD <span className="text-gray-400 dark:text-gray-500 normal-case font-medium">(optionnel)</span>
            </label>
            <input
              type="text"
              value={codeUssd}
              onChange={(e) => setCodeUssd(e.target.value)}
              placeholder="Ex: *144*1*{montant}#"
              className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
            <p className="text-[10px] text-gray-500 ml-1">
              Utilisez <code className="text-primary font-black bg-primary/10 px-1 rounded">{'{montant}'}</code> comme variable — il sera remplacé par le montant lors du paiement.
            </p>
          </div>

          {/* Champ 4 — Toggle Statut */}
          <div className="flex items-center justify-between
                          bg-gray-50 dark:bg-dark-bg/60 border border-gray-200 dark:border-dark-border/60
                          rounded-2xl px-5 py-4">
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white">Compte actif</p>
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Ce compte sera visible par vos clients lors du paiement
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEstActif(!estActif)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0
                          ${estActif ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              role="switch"
              aria-checked={estActif}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md
                             transition-transform duration-300
                             ${estActif ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* ── Boutons ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black text-gray-700 dark:text-gray-300
                         bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700
                         transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white
                         bg-primary hover:bg-primary/90 active:scale-[0.98]
                         transition-all shadow-lg shadow-primary/20
                         flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


