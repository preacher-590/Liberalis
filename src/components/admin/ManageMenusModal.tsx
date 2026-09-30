import { useState, useEffect, memo } from 'react';
import {
  X, Calendar, Users, FileText, Smartphone, BarChart2,
  CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../services/api';

export interface AdminUserTarget {
  id: number;
  name: string;
  email: string;
  role: string;
  specialty?: string;
  cabinet_name?: string;
  allowed_menus?: string[];
}

export const SYSTEM_MODULES = [
  {
    key: 'agenda',
    label: 'Mon Agenda',
    description: 'Gestion des consultations, planning journalier/hebdomadaire, rappels automatiques.',
    icon: Calendar,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30',
  },
  {
    key: 'clients',
    label: 'Mes Clients',
    description: 'Répertoire des patients/clients, fiches dossiers individuelles, historique complet.',
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
  },
  {
    key: 'factures',
    label: 'Facturation',
    description: 'Émission de factures professionnelles, devis, acomptes, remises et suivi du recouvrement.',
    icon: FileText,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30',
  },
  {
    key: 'mobile_money',
    label: 'Mobile Money',
    description: 'Paiements directs Orange Money, Wave, MTN, codes USSD et validation des règlements.',
    icon: Smartphone,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30',
  },
  {
    key: 'rapports',
    label: 'Rapports PR',
    description: 'Statistiques financières avancées, analyse du chiffre d’affaires et exports PDF.',
    icon: BarChart2,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
  },
] as const;

export const DEFAULT_ALLOWED_MENUS = ['agenda', 'clients', 'factures', 'mobile_money', 'rapports'];

interface ManageMenusModalProps {
  user: AdminUserTarget | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (userId: number, newMenus: string[]) => void;
}

/**
 * Modale de Gestion des Menus et Droits d'Accès pour un Professionnel
 *
 * Permet au Super Admin d'activer ou désactiver individuellement chaque menu de l'application.
 */
function ManageMenusModal({
  user,
  isOpen,
  onClose,
  onSaved,
}: ManageMenusModalProps) {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const menus = user.allowed_menus && user.allowed_menus.length > 0
        ? user.allowed_menus
        : DEFAULT_ALLOWED_MENUS;
      setSelectedMenus(menus);
      setError('');
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isAdminUser = user.role === 'admin';

  const toggleModule = (moduleKey: string) => {
    if (isAdminUser) return;
    setSelectedMenus(prev =>
      prev.includes(moduleKey)
        ? prev.filter(k => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  const handleSelectAll = () => {
    if (isAdminUser) return;
    setSelectedMenus([...DEFAULT_ALLOWED_MENUS]);
  };

  const handleDeselectAll = () => {
    if (isAdminUser) return;
    setSelectedMenus([]);
  };

  const handleSave = async () => {
    if (isAdminUser) {
      onClose();
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/admin/users/${user.id}/menus`, {
        allowed_menus: selectedMenus,
      });
      onSaved(user.id, data.allowed_menus);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour des menus.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                Gestion des Menus & Droits d'Accès
              </h3>
              <p className="text-xs font-semibold text-gray-500 mt-0.5">
                Professionnel : <span className="text-primary font-black">{user.name}</span> ({user.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto custom-scrollbar">
          {isAdminUser ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-3">
              <AlertTriangle size={20} className="shrink-0" />
              <span>
                Cet utilisateur a le rôle <strong>Super Administrateur</strong>. Il dispose par définition d'un accès intégral et sans restriction à l'ensemble des modules.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-bg p-3 rounded-2xl border border-gray-100 dark:border-dark-border">
                <span className="text-xs font-bold text-gray-500">
                  {selectedMenus.length} sur {SYSTEM_MODULES.length} menu(s) autorisé(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-black text-primary hover:underline px-2 py-1"
                  >
                    Tout activer
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-black text-gray-400 hover:text-red-500 px-2 py-1"
                  >
                    Tout désactiver
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-bold">
                  {error}
                </div>
              )}

              {/* Liste des modules avec toggles switch */}
              <div className="space-y-3">
                {SYSTEM_MODULES.map(module => {
                  const isEnabled = selectedMenus.includes(module.key);

                  return (
                    <div
                      key={module.key}
                      onClick={() => toggleModule(module.key)}
                      className={clsx(
                        'flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none',
                        isEnabled
                          ? 'border-primary/30 bg-primary/[0.02] dark:bg-primary/[0.04]'
                          : 'border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface opacity-70 hover:opacity-100'
                      )}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 pr-4">
                        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', module.color)}>
                          <module.icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white">
                              {module.label}
                            </h4>
                            <span className={clsx(
                              'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                              isEnabled
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-dark-bg'
                            )}>
                              {isEnabled ? 'Activé' : 'Désactivé'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                            {module.description}
                          </p>
                        </div>
                      </div>

                      {/* Switch interactif */}
                      <div className="shrink-0 flex items-center">
                        <button
                          type="button"
                          className={clsx(
                            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                            isEnabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                          )}
                          aria-pressed={isEnabled}
                        >
                          <span
                            className={clsx(
                              'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-dark-border flex items-center justify-end gap-3 bg-gray-50/50 dark:bg-dark-bg/20">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
          >
            Fermer
          </button>
          {!isAdminUser && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white text-xs font-black shadow-lg shadow-primary/25 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {saving ? 'Enregistrement...' : 'Enregistrer les autorisations'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ManageMenusModal);
