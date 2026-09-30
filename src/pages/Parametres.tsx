import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, FileText, Bell, Smartphone, Shield, Globe, Upload, CheckCircle2, Trash2, Loader2, Plus, EyeOff, Eye, Sun, Moon, Laptop, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { useOfflineMode } from '../hooks/useOfflineMode';
import MobileMoneySettings from '../components/common/MobileMoneySettings';

/**
 * Page de Paramètres du Cabinet (Parametres.tsx)
 *
 * Centralise la configuration du profil praticien, la personnalisation des factures,
 * les préférences de rappels emails, le thème d'affichage et la sécurité.
 *
 * Sections logiques :
 * 1. Profil du praticien & Coordonnées du cabinet (avec upload photo)
 * 2. Paramètres de facturation (préfixe, devises, grille tarifaire, mentions légales)
 * 3. Configuration des rappels emails automatiques aux clients
 * 4. Préférences d'affichage (Thème clair / sombre / système)
 * 5. Sécurité et modification de mot de passe
 * 6. Gestion de la connectivité et mode hors-ligne
 */
const profileSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Adresse e-mail invalide"),
  cabinet_name: z.string().optional(),
  cabinet_address: z.string().optional(),
  invoice_prefix: z.string().min(1, "Le préfixe est requis"),
  email_reminders: z.boolean(),
  email_delay: z.string(),
  email_template: z.string().optional(),
  theme: z.string().optional(),
  payment_conditions: z.string().optional(),
  currency: z.string(),
  legal_mentions: z.string().optional(),
  consultation_rates: z.array(z.object({
    type: z.string().min(1, "Libellé du tarif requis"),
    val: z.string().min(1, "Montant du tarif requis")
  })),
  // Préférences d'affichage personnalisées sur les factures (JSON)
  invoice_display_settings: z.object({
    show_name: z.boolean().optional(),
    show_specialty: z.boolean().optional(),
    show_cabinet_name: z.boolean().optional(),
    show_cabinet_address: z.boolean().optional(),
    show_email: z.boolean().optional(),
    show_phone: z.boolean().optional(),
  }).optional()
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  current_password: z.string().min(1, "Le mot de passe actuel est requis"),
  password: z.string().min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères"),
  password_confirmation: z.string()
}).refine((data) => data.password === data.password_confirmation, {
  message: "Les mots de passe ne correspondent pas",
  path: ["password_confirmation"]
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

// Composants utilitaires
const tabs = [
  { id: 'profil', label: 'Profil professionnel', icon: UserIcon },
  { id: 'facturation', label: 'Facturation', icon: FileText },
  { id: 'notifications', label: 'Notifications & E-mails', icon: Bell },
  { id: 'mobilemoney', label: 'Mobile Money', icon: Smartphone },
  { id: 'securite', label: 'Sécurité', icon: Shield },
  { id: 'application', label: 'Application', icon: Globe },
];

const Toggle = ({ value, onChange }: { value: boolean, onChange: () => void }) => (
  <button type="button" onClick={onChange} className={clsx("w-12 h-6 rounded-full transition-colors relative flex items-center px-1", value ? "bg-primary" : "bg-gray-300 dark:bg-dark-border")}>
    <div className={clsx("w-4 h-4 bg-white rounded-full shadow transition-all", value ? "translate-x-6" : "translate-x-0")} />
  </button>
);

const Field = ({ label, error, children }: { label: string, error?: string, children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{label}</label>
    {children}
    {error && <p className="text-xs text-red-500 font-bold mt-1">{error}</p>}
  </div>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <input ref={ref} {...props} className="w-full bg-gray-100 dark:bg-dark-bg border-none rounded-xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none" />
));
Input.displayName = 'Input';

const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => (
  <textarea ref={ref} {...props} className="w-full bg-gray-100 dark:bg-dark-bg border-none rounded-xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none resize-none" />
));
TextArea.displayName = 'TextArea';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, ref) => (
  <select ref={ref} {...props} className="w-full bg-gray-100 dark:bg-dark-bg border-none rounded-xl p-4 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none" />
));
Select.displayName = 'Select';

const getInitials = (name: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  return parts.map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

function ThemeSelector({ theme, onThemeChange }: { theme: 'light' | 'dark' | 'system', onThemeChange: (t: 'light' | 'dark' | 'system') => void }) {
  const options = [
    { value: "light" as const, label: "Clair", icon: <Sun size={18} /> },
    { value: "dark" as const, label: "Sombre", icon: <Moon size={18} /> },
    { value: "system" as const, label: "Système", icon: <Laptop size={18} /> },
  ];

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Thème d'affichage</p>
      <div className="flex gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onThemeChange(opt.value)}
            className={clsx(
              "flex flex-col items-center gap-2 px-5 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer",
              theme === opt.value
                ? "border-primary bg-primary/10 text-primary font-black shadow-sm"
                : "border-gray-200 dark:border-dark-border text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <span className={theme === opt.value ? "text-primary" : "text-gray-500 dark:text-gray-400"}>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OfflineModeToggle() {
  const { isOfflineEnabled, toggleOfflineMode, isOnline } = useOfflineMode();

  return (
    <div className="flex flex-col gap-3">
      <div className={clsx("flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full w-fit", isOnline ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400")}>
        <span className={clsx("w-2 h-2 rounded-full", isOnline ? "bg-green-500" : "bg-amber-500")} />
        {isOnline ? "Connecté" : "Hors ligne"}
      </div>
      <div className="flex items-start justify-between gap-6 p-4 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Mode hors-ligne</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">Vos données sont sauvegardées localement et synchronisées dès que la connexion est rétablie.</p>
        </div>
        <button type="button" onClick={toggleOfflineMode} role="switch" aria-checked={isOfflineEnabled} className={clsx("relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2", isOfflineEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-600")}>
          <span className={clsx("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200", isOfflineEnabled ? "translate-x-5" : "translate-x-0")} />
        </button>
      </div>
      {isOfflineEnabled && (
        <p className="text-xs text-primary flex items-center gap-1.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Mode hors-ligne activé — vos données seront synchronisées automatiquement.
        </p>
      )}
    </div>
  );
}

const currencies = [
  { value: 'FCFA', label: 'FCFA (Franc CFA)' },
  { value: 'EUR', label: 'EUR (Euro)' },
  { value: 'USD', label: 'USD (Dollar)' },
  { value: 'CAD', label: 'CAD (Dollar Canadien)' }
];

const payment_conditions = [
  { value: '30_jours', label: '30 jours' },
  { value: '15_jours', label: '15 jours' },
  { value: '45_jours', label: '45 jours' },
  { value: 'immediate', label: 'Immédiat' },
];

export default function Parametres() {
  const { user, setUser } = useApp();
  const { theme: currentTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profil');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  // État de notification Toast globale (Succès ou Échec avec diagnostic précis)
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    details?: string[];
  } | null>(null);

  // Minuteur de disparition automatique du Toast (4s pour le succès, 7s pour les erreurs)
  useEffect(() => {
    if (!toast) return;
    const timeoutDuration = toast.type === 'success' ? 4000 : 7000;
    const timer = setTimeout(() => {
      setToast(null);
    }, timeoutDuration);
    return () => clearTimeout(timer);
  }, [toast]);

  const [twoFA, setTwoFA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Upload de la photo de profil
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // permet de re-sélectionner le même fichier après lecture

    setAvatarError('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('Veuillez sélectionner une image (JPG, PNG ou WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('L\'image ne doit pas dépasser 2 Mo.');
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data); // met à jour l'avatar partout (topbar, sidebar...)
    } catch (err: any) {
      setAvatarError(err.response?.data?.message || 'Échec de l\'envoi de la photo. Réessayez.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarError('');
    setAvatarUploading(true);
    try {
      const { data } = await api.delete('/profile/avatar');
      setUser(data);
    } catch {
      setAvatarError('Impossible de supprimer la photo. Réessayez.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // Configuration React Hook Form (Profil Global)
  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '', specialty: '', phone: '', email: '', cabinet_name: '', cabinet_address: '',
      invoice_prefix: 'F-', email_reminders: true, email_delay: '24h', email_template: '', theme: currentTheme || 'system',
      payment_conditions: '', currency: 'FCFA', legal_mentions: '',
      consultation_rates: [],
      // Toggles d'affichage activés par défaut
      invoice_display_settings: {
        show_name: true,
        show_specialty: true,
        show_cabinet_name: true,
        show_cabinet_address: true,
        show_email: true,
        show_phone: true,
      }
    }
  });

  const { fields: rateFields, append: appendRate, remove: removeRate } = useFieldArray({
    control,
    name: "consultation_rates"
  });

  // Configuration React Hook Form (Mot de passe)
  const { register: registerPwd, handleSubmit: handlePwdSubmit, reset: resetPwd, formState: { errors: pwdErrors, isSubmitting: isSubmittingPwd } } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema)
  });

  // Valeurs observées pour l'UI dynamique
  const watchedEmailReminders = watch('email_reminders');
  const watchedCurrency = watch('currency');

  // Synchronisation des données utilisateur avec les champs du formulaire React Hook Form
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        specialty: user.specialty || '',
        phone: user.phone || '',
        email: user.email || '',
        cabinet_name: user.cabinet_name || '',
        cabinet_address: user.cabinet_address || '',
        invoice_prefix: user.invoice_prefix || 'F-',
        email_reminders: user.email_reminders !== undefined ? !!user.email_reminders : true,
        email_delay: user.email_delay || '24h',
        email_template: user.email_template || "Bonjour {nom_client},\n\nNous vous rappelons votre rendez-vous avec {nom_docteur} le {date_rdv} à {heure_rdv}.\n\nMerci de nous contacter si vous souhaitez annuler ou reporter.\n\nCordialement.",
        theme: user.theme || currentTheme || 'system',
        payment_conditions: user.payment_conditions || '',
        currency: user.currency || 'FCFA',
        legal_mentions: user.legal_mentions || "Veuillez effectuer le règlement par virement bancaire sous 30 jours à compter de la date d'émission.",
        consultation_rates: Array.isArray(user.consultation_rates) && user.consultation_rates.length > 0
          ? user.consultation_rates
          : [
              { type: 'Première visite', val: '50000' },
              { type: 'Consultation standard', val: '35000' },
              { type: 'Suivi', val: '25000' },
              { type: 'Urgence', val: '100000' }
            ],
        // Restauration des réglages d'affichage ou configuration complète par défaut
        invoice_display_settings: user.invoice_display_settings || {
          show_name: true,
          show_specialty: true,
          show_cabinet_name: true,
          show_cabinet_address: true,
          show_email: true,
          show_phone: true,
        }
      });
    }
  }, [user, reset, currentTheme]);

  /**
   * Analyse et extrait un message d'erreur clair et détaillé à partir de la réponse API ou réseau.
   * Prend en charge les erreurs de validation Laravel 422, le mode hors ligne et les erreurs serveur.
   */
  const extractErrorDetails = (err: any): { message: string; details?: string[] } => {
    // Vérification de la connectivité réseau
    if (!navigator.onLine) {
      return {
        message: "Vous êtes actuellement hors ligne. Une connexion Internet active est nécessaire pour mettre à jour vos paramètres.",
      };
    }

    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;

      // Erreurs de validation Laravel (422 Unprocessable Entity)
      if (status === 422 && data?.errors && typeof data.errors === 'object') {
        const details: string[] = [];
        const fieldLabels: Record<string, string> = {
          name: 'Nom complet',
          email: 'Adresse email',
          phone: 'Numéro de téléphone',
          specialty: 'Spécialité',
          cabinet_name: 'Nom du cabinet',
          cabinet_address: 'Adresse du cabinet',
          invoice_prefix: 'Préfixe de facture',
          currency: 'Devise',
          payment_conditions: 'Conditions de paiement',
          legal_mentions: 'Mentions légales',
          email_delay: 'Délai de rappel email',
          email_template: 'Modèle email',
          current_password: 'Mot de passe actuel',
          password: 'Nouveau mot de passe',
          password_confirmation: 'Confirmation du mot de passe',
        };

        Object.entries(data.errors).forEach(([field, msgs]) => {
          const label = fieldLabels[field] || field;
          if (Array.isArray(msgs)) {
            msgs.forEach((m) => details.push(`${label} : ${m}`));
          } else if (typeof msgs === 'string') {
            details.push(`${label} : ${msgs}`);
          }
        });

        return {
          message: data.message || "Certaines données transmises ne respectent pas les critères exigés :",
          details: details.length > 0 ? details : undefined,
        };
      }

      // Problème d'authentification ou permissions
      if (status === 401 || status === 403) {
        return {
          message: "Votre session a expiré ou vous ne disposez pas des droits suffisants. Veuillez vous reconnecter.",
        };
      }

      // Incident serveur (500, 502, 503)
      if (status >= 500) {
        return {
          message: `Le serveur a rencontré une indisponibilité temporaire (Erreur ${status}). Vos données n'ont pas pu être enregistrées.`,
        };
      }

      // Message explicite retourné par l'API
      if (data?.message) {
        return { message: data.message };
      }
    }

    // Erreur réseau ou JavaScript standard
    return {
      message: err.message || "Une erreur imprévue est survenue lors de la communication avec le serveur.",
    };
  };

  /**
   * Gestionnaire d'erreur de validation locale (Zod / React Hook Form)
   * Parcourt dynamiquement l'intégralité des champs en erreur et affiche un diagnostic précis.
   */
  const onInvalidProfile = (fieldErrors: any) => {
    const details: string[] = [];
    const fieldLabels: Record<string, string> = {
      name: 'Nom complet',
      email: 'Adresse email',
      phone: 'Numéro de téléphone',
      specialty: 'Spécialité / Profession',
      cabinet_name: 'Nom du cabinet',
      cabinet_address: 'Adresse du cabinet',
      invoice_prefix: 'Préfixe de facture',
      currency: 'Devise',
      payment_conditions: 'Conditions de paiement',
      legal_mentions: 'Mentions légales',
      email_delay: 'Délai de rappel email',
      email_template: 'Modèle email de rappel',
      theme: 'Thème d’affichage',
      consultation_rates: 'Tarifs de consultation',
      invoice_display_settings: 'Options d’affichage sur la facture',
    };

    // Analyse récursive et exhaustive des erreurs de validation Zod
    Object.entries(fieldErrors).forEach(([key, val]: [string, any]) => {
      const label = fieldLabels[key] || key;
      if (val?.message) {
        details.push(`${label} : ${val.message}`);
      } else if (Array.isArray(val)) {
        val.forEach((item: any, idx: number) => {
          if (item?.type?.message) details.push(`${label} #${idx + 1} (Libellé) : ${item.type.message}`);
          if (item?.val?.message) details.push(`${label} #${idx + 1} (Montant) : ${item.val.message}`);
        });
      } else if (key === 'consultation_rates') {
        details.push("Veuillez vérifier les libellés et montants de votre grille tarifaire.");
      } else if (val && typeof val === 'object') {
        Object.entries(val).forEach(([subKey, subVal]: [string, any]) => {
          if (subVal?.message) {
            details.push(`${label} (${subKey}) : ${subVal.message}`);
          }
        });
      } else {
        details.push(`${label} : Information manquante ou invalide.`);
      }
    });

    const summaryMsg = details.length > 0
      ? `Veuillez corriger le(s) ${details.length} champ(s) invalide(s) :`
      : "Veuillez renseigner tous les champs obligatoires avant d'enregistrer.";

    setError("Veuillez vérifier les champs du formulaire signalés en rouge.");
    setToast({
      type: 'error',
      title: "Champs requis incomplets ou invalides",
      message: summaryMsg,
      details: details.length > 0 ? details : undefined,
    });
  };

  /**
   * Soumission du profil et des préférences globales (Facturation, Emails, Thème)
   */
  const onSubmitProfile = async (data: ProfileFormValues) => {
    setError('');
    setSaveSuccess(false);
    setToast(null);

    try {
      // Fusion sécurisée du thème actif avec le reste des données validées
      const payload = {
        ...data,
        theme: currentTheme || data.theme || 'system',
      };

      const { data: responseData } = await api.patch('/profile', payload);
      setUser(responseData); 
      setSaveSuccess(true);

      // Notification de succès explicite
      setToast({
        type: 'success',
        title: "Modifications enregistrées avec succès !",
        message: "Vos paramètres de profil, de facturation et de notifications ont été mis à jour.",
      });

      // Réinitialise l'état d'animation du bouton après 3 secondes
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveSuccess(false);
      const parsed = extractErrorDetails(err);
      setError(parsed.message);

      // Notification d'échec explicite avec le détail précis de la cause
      setToast({
        type: 'error',
        title: "Échec de l'enregistrement",
        message: parsed.message,
        details: parsed.details,
      });
    }
  };

  /**
   * Gestionnaire d'erreur de validation locale pour le changement de mot de passe
   */
  const onInvalidPassword = (fieldErrors: any) => {
    const details: string[] = [];
    if (fieldErrors.current_password?.message) details.push(fieldErrors.current_password.message);
    if (fieldErrors.password?.message) details.push(fieldErrors.password.message);
    if (fieldErrors.password_confirmation?.message) details.push(fieldErrors.password_confirmation.message);

    setToast({
      type: 'error',
      title: "Erreur de mot de passe",
      message: "Veuillez corriger les erreurs de saisie pour continuer :",
      details: details.length > 0 ? details : undefined,
    });
  };

  /**
   * Soumission du formulaire de mise à jour du mot de passe
   */
  const onSubmitPassword = async (data: PasswordFormValues) => {
    setError('');
    setSaveSuccess(false);
    setToast(null);

    try {
      await api.post('/change-password', data);
      setSaveSuccess(true);
      resetPwd();

      // Notification de succès pour le mot de passe
      setToast({
        type: 'success',
        title: "Mot de passe mis à jour avec succès !",
        message: "Votre nouveau mot de passe a été activé pour vos prochaines connexions.",
      });

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveSuccess(false);
      const parsed = extractErrorDetails(err);
      setError(parsed.message);

      // Notification d'échec pour le mot de passe
      setToast({
        type: 'error',
        title: "Échec du changement de mot de passe",
        message: parsed.message,
        details: parsed.details,
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action est irréversible.")) {
      try {
        await api.delete('/profile');
        localStorage.removeItem('liberalis-spa-token');
        window.location.href = '/login';
      } catch (err: any) {
        setError(err.response?.data?.message || "Erreur lors de la suppression du compte.");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 animate-in fade-in zoom-in-95 duration-300 relative">
      {/* Toast Notification Flottant (Succès / Échec) — Visibilité garantie quel que soit le défilement et l'onglet */}
      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-6 right-4 sm:right-8 z-50 max-w-md w-[calc(100vw-32px)] sm:w-[420px] animate-in slide-in-from-top-4 fade-in duration-300"
        >
          <div
            className={clsx(
              "p-4 sm:p-5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-start gap-4 transition-all",
              toast.type === 'success'
                ? "bg-emerald-600/95 dark:bg-emerald-700/95 border-emerald-400/40 text-white shadow-emerald-950/30"
                : "bg-red-600/95 dark:bg-red-700/95 border-red-400/40 text-white shadow-red-950/30"
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5 backdrop-blur-sm shadow-inner">
              {toast.type === 'success' ? (
                <CheckCircle2 size={22} className="text-white" />
              ) : (
                <AlertCircle size={22} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black tracking-tight leading-tight">{toast.title}</h4>
              <p className="text-xs font-semibold mt-1 opacity-95 leading-relaxed">{toast.message}</p>
              {toast.details && toast.details.length > 0 && (
                <ul className="mt-2.5 space-y-1 bg-black/15 dark:bg-black/25 p-3 rounded-xl text-xs font-medium border border-white/10 list-disc list-inside max-h-48 overflow-y-auto">
                  {toast.details.map((detail, idx) => (
                    <li key={idx} className="leading-snug">{detail}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0"
              aria-label="Fermer la notification"
            >
              <X size={18} />
            </button>
          </div>
        </aside>
      )}

      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Paramètres</h1>
        <p className="text-gray-500 font-medium mt-1">Gérez votre profil et vos préférences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-white dark:bg-dark-surface rounded-[28px] border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden py-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-4 px-6 py-4 text-sm font-black transition-all border-l-4 text-left",
                  activeTab === tab.id
                    ? "text-primary border-primary bg-primary/5"
                    : "text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold animate-in shake flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setError('')} 
                className="text-red-500/70 hover:text-red-600 p-1 rounded-lg transition-colors"
                aria-label="Fermer l'alerte"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {activeTab === 'profil' && (
            <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 space-y-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Profil professionnel</h2>
              <div className="flex items-center gap-6">
                {/* Input fichier invisible, déclenché par les deux boutons */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center font-black text-primary text-2xl overflow-hidden shadow-lg">
                    {avatarUploading
                      ? <Loader2 size={28} className="animate-spin" />
                      : user?.avatar_url
                        ? <img src={user.avatar_url} alt="Photo de profil" className="w-full h-full object-cover" />
                        : getInitials(user?.name || 'User')}
                  </div>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                    className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    <Upload size={14} />
                  </button>
                </div>
                <div>
                  <p className="font-black text-gray-900 dark:text-white text-lg">{user?.name || 'Prénom Nom'}</p>
                  <p className="text-sm font-bold text-gray-500">{user?.specialty || 'Spécialité'}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="text-xs font-black text-primary hover:text-primary-hover disabled:opacity-50"
                    >
                      {avatarUploading ? 'Envoi en cours...' : 'Changer la photo'}
                    </button>
                    {user?.avatar_url && !avatarUploading && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        className="text-xs font-black text-red-500 hover:text-red-600"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                  {avatarError && <p className="mt-1 text-xs font-bold text-red-500">{avatarError}</p>}
                  <p className="mt-1 text-[10px] font-bold text-gray-400">JPG, PNG ou WebP — 2 Mo max</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Nom complet" error={errors.name?.message}><Input type="text" {...register("name")} /></Field>
                <Field label="Spécialité / Profession" error={errors.specialty?.message}><Input type="text" {...register("specialty")} /></Field>
                {/* Ajout du champ d'édition pour le nom du cabinet de l'utilisateur */}
                <Field label="Nom du cabinet" error={errors.cabinet_name?.message}><Input type="text" placeholder="Ex: Cabinet Libéralis" {...register("cabinet_name")} /></Field>
                <Field label="Téléphone professionnel" error={errors.phone?.message}><Input type="text" {...register("phone")} /></Field>
                <Field label="Email professionnel" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
                <Field label="Numéro d'ordre (optionnel)"><Input type="text" placeholder="Ex: ONAVO-2024-1234" /></Field>
              </div>
              <Field label="Cabinet / Adresse" error={errors.cabinet_address?.message}>
                <TextArea rows={3} {...register("cabinet_address")} />
              </Field>
            </div>
          )}

          {activeTab === 'facturation' && (
            <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 space-y-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Paramètres de facturation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Préfixe numéro de facture" error={errors.invoice_prefix?.message}><Input type="text" {...register("invoice_prefix")} /></Field>
                <Field label="Devise" error={errors.currency?.message}>
                  <Select {...register("currency")}>
                    {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                </Field>
                <Field label="Conditions de paiement par défaut" error={errors.payment_conditions?.message}>
                  <Select {...register("payment_conditions")}>
                    {payment_conditions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Mentions légales personnalisées" error={errors.legal_mentions?.message}>
                <TextArea rows={4} {...register("legal_mentions")} />
              </Field>

              {/* Section interactive de basculement des préférences d'affichage */}
              <div className="border-t border-gray-100 dark:border-dark-border pt-6">
                <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest text-[11px]">Informations à afficher sur la facture</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Nom complet</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Afficher votre nom complet</p>
                    </div>
                    <Toggle 
                      value={watch('invoice_display_settings.show_name') ?? true} 
                      onChange={() => setValue('invoice_display_settings.show_name', !(watch('invoice_display_settings.show_name') ?? true), { shouldDirty: true })} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Spécialité</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Afficher votre spécialité ou titre</p>
                    </div>
                    <Toggle 
                      value={watch('invoice_display_settings.show_specialty') ?? true} 
                      onChange={() => setValue('invoice_display_settings.show_specialty', !(watch('invoice_display_settings.show_specialty') ?? true), { shouldDirty: true })} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Nom du cabinet</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Afficher le nom de votre cabinet</p>
                    </div>
                    <Toggle 
                      value={watch('invoice_display_settings.show_cabinet_name') ?? true} 
                      onChange={() => setValue('invoice_display_settings.show_cabinet_name', !(watch('invoice_display_settings.show_cabinet_name') ?? true), { shouldDirty: true })} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Adresse du cabinet</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Afficher l'adresse physique</p>
                    </div>
                    <Toggle 
                      value={watch('invoice_display_settings.show_cabinet_address') ?? true} 
                      onChange={() => setValue('invoice_display_settings.show_cabinet_address', !(watch('invoice_display_settings.show_cabinet_address') ?? true), { shouldDirty: true })} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Email</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Afficher votre email professionnel</p>
                    </div>
                    <Toggle 
                      value={watch('invoice_display_settings.show_email') ?? true} 
                      onChange={() => setValue('invoice_display_settings.show_email', !(watch('invoice_display_settings.show_email') ?? true), { shouldDirty: true })} 
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                    <div>
                      <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Téléphone</p>
                      <p className="text-[10px] font-bold text-gray-500 mt-0.5">Afficher votre téléphone professionnel</p>
                    </div>
                    <Toggle 
                      value={watch('invoice_display_settings.show_phone') ?? true} 
                      onChange={() => setValue('invoice_display_settings.show_phone', !(watch('invoice_display_settings.show_phone') ?? true), { shouldDirty: true })} 
                    />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 uppercase tracking-widest text-[11px]">Tarifs par type de consultation</h3>
                <div className="space-y-3">
                  {rateFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                      <div className="flex-1">
                        <Input type="text" placeholder="Type de consultation" {...register(`consultation_rates.${index}.type` as const)} />
                        {errors.consultation_rates?.[index]?.type && <p className="text-xs text-red-500 mt-1">{errors.consultation_rates[index]?.type?.message}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32">
                           <Input type="number" {...register(`consultation_rates.${index}.val` as const)} />
                        </div>
                        <span className="text-sm font-bold text-gray-500">{watchedCurrency}</span>
                        <button type="button" onClick={() => removeRate(index)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => appendRate({ type: '', val: '' })} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-hover px-4 py-2 rounded-xl hover:bg-primary/5 transition-colors">
                    <Plus size={16} /> Ajouter un tarif
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 space-y-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Notifications & E-mails</h2>
              <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl">
                <div>
                  <p className="font-black text-gray-900 dark:text-white">Activer les rappels par e-mail</p>
                  <p className="text-xs font-bold text-gray-500 mt-1">Envoi automatique par e-mail avant chaque rendez-vous</p>
                </div>
                <Toggle value={watchedEmailReminders} onChange={() => setValue('email_reminders', !watchedEmailReminders)} />
              </div>
              {watchedEmailReminders && (
                <>
                  <Field label="Délai de rappel (E-mail)" error={errors.email_delay?.message}>
                    <Select {...register("email_delay")}>
                      <option value="1h">1 heure avant</option>
                      <option value="2h">2 heures avant</option>
                      <option value="24h">24 heures (1 jour) avant</option>
                      <option value="48h">48 heures (2 jours) avant</option>
                      <option value="72h">72 heures (3 jours) avant</option>
                      <option value="both">Double rappel (24h et 2h avant)</option>
                    </Select>
                  </Field>
                  <Field label="Message de rappel e-mail personnalisable" error={errors.email_template?.message}>
                    <TextArea rows={6} className="font-mono" {...register("email_template")} />
                  </Field>
                  <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Aperçu E-mail</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white whitespace-pre-wrap">Bonjour Amadou Diallo,{"\n\n"}Nous vous rappelons votre rendez-vous avec {user?.name || 'Docteur'} le 11/04/2026 à 09:00.{"\n\n"}Merci de nous contacter si vous souhaitez annuler ou reporter.{"\n\n"}Cordialement.</p>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'mobilemoney' && (
            <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8">
              <MobileMoneySettings />
            </div>
          )}

          {activeTab === 'securite' && (
            <form onSubmit={handlePwdSubmit(onSubmitPassword, onInvalidPassword)} className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 space-y-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Sécurité</h2>
              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest text-[11px]">Changer le mot de passe</h3>
                <Field label="Mot de passe actuel" error={pwdErrors.current_password?.message}>
                  <div className="relative flex items-center">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-12" {...registerPwd("current_password")} />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button> 
                  </div>
                </Field>

                <Field label="Nouveau mot de passe" error={pwdErrors.password?.message}>
                  <div className="relative flex items-center">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-12" {...registerPwd("password")} />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button> 
                  </div>
                </Field>

                <Field label="Confirmer le nouveau mot de passe" error={pwdErrors.password_confirmation?.message}>
                  <div className="relative flex items-center">
                    <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-12" {...registerPwd("password_confirmation")} />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button> 
                  </div>
                </Field> 
                <button 
                  type="submit"
                  disabled={isSubmittingPwd}
                  className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmittingPwd ? <Loader2 size={16} className="animate-spin" /> : "Mettre à jour le mot de passe"}
                </button>
              </div>
              <div className="flex items-center justify-between p-5 bg-gray-50 dark:bg-dark-bg/50 rounded-2xl mt-8">
                <div>
                  <p className="font-black text-gray-900 dark:text-white">Authentification à 2 facteurs</p>
                  <p className="text-xs font-bold text-gray-500 mt-1">Ajoute une couche de sécurité supplémentaire</p>
                </div>
                <Toggle value={twoFA} onChange={() => setTwoFA(!twoFA)} />
              </div>
            </form>
          )}

          {activeTab === 'application' && (
            <div className="bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-sm p-8 space-y-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Application</h2>
              
              <div>
                <ThemeSelector 
                  theme={currentTheme} 
                  onThemeChange={setTheme} 
                />
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-dark-border">
                <OfflineModeToggle />
              </div>

              <div className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-[24px] p-6 space-y-4 max-w-lg mt-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <p className="font-black text-red-600 dark:text-red-400">Zone de danger</p>
                    <p className="text-xs font-bold text-red-400">Ces actions sont irréversibles</p>
                  </div>
                </div>
                <button type="button" onClick={handleDeleteAccount} className="w-full py-3 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-colors">
                  Supprimer mon compte définitivement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Bar */}
      {(activeTab !== 'securite' && activeTab !== 'mobilemoney') && (
        <div className="fixed bottom-8 left-1/2 -translate-x-[calc(50%-132px)] lg:-translate-x-1/2 flex items-center gap-4 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md p-3 rounded-2xl border border-gray-200 dark:border-dark-border shadow-2xl z-40 transition-all">
          {saveSuccess ? (
            <div className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-bottom-2 shadow-lg shadow-emerald-600/30">
              <CheckCircle2 size={16} /> Paramètres enregistrés !
            </div>
          ) : (
            <>
              <button 
                type="button" 
                onClick={() => {
                  reset();
                  setError('');
                  setToast(null);
                }} 
                className="px-8 py-3.5 bg-gray-100 dark:bg-dark-bg text-gray-600 dark:text-gray-300 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-950 transition-colors"
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={handleSubmit(onSubmitProfile, onInvalidProfile)}
                disabled={isSubmitting}
                className={clsx(
                  "px-8 py-3.5 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 min-w-[180px]", 
                  isSubmitting 
                    ? "bg-primary/70 cursor-not-allowed opacity-90" 
                    : "bg-primary hover:bg-primary-hover shadow-lg shadow-primary/20 active:scale-[0.98]"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Sauvegarder
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

