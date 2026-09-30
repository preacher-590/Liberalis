// Import des hooks React (React lui-même n'est plus requis dans le scope avec le nouveau JSX transform)
import { useState, useEffect, useMemo } from 'react';
import { X, MessageSquare, Copy, Check, ExternalLink, Phone, User, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { normalizeAfricanPhoneNumber, formatPhoneNumberDisplay, AFRICAN_COUNTRY_RULES, buildSafeWhatsAppUrl } from '../../services/whatsapp';

export interface WhatsAppActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  defaultMessage: string;
  title?: string;
  subtitle?: string;
  onSent?: () => void;
}

/**
 * Modale d'action WhatsApp interactive et contextualisée — Libéralis
 *
 * Fonctionnalités :
 * 1. Affichage du destinataire avec normalisation en temps réel du numéro pour l'Afrique francophone.
 * 2. Détection automatique du pays et affichage du drapeau associé (CI, SN, CM, BJ, etc.).
 * 3. Édition directe du texte avant envoi (adaptation libre selon les besoins du praticien).
 * 4. Bouton de copie rapide dans le presse-papier avec confirmation visuelle immédiate.
 * 5. Bouton principal d'ouverture de WhatsApp (wa.me) avec encodage URI sécurisé.
 * 6. Conforme aux standards UI Dark Mode et micro-interactions fluides.
 */
export default function WhatsAppActionModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  defaultMessage,
  title = 'Envoyer un message WhatsApp',
  subtitle = 'Vérifiez et personnalisez votre message avant l\'envoi direct via WhatsApp.',
  onSent,
}: WhatsAppActionModalProps) {
  const [phone, setPhone] = useState(recipientPhone || '');
  const [message, setMessage] = useState(defaultMessage || '');
  const [copied, setCopied] = useState(false);

  // Synchronisation lors de l'ouverture ou du changement de props
  useEffect(() => {
    if (isOpen) {
      setPhone(recipientPhone || '');
      setMessage(defaultMessage || '');
      setCopied(false);
    }
  }, [isOpen, recipientPhone, defaultMessage]);

  // Normalisation du numéro de téléphone avec détection de pays
  const normalizedPhone = useMemo(() => {
    return normalizeAfricanPhoneNumber(phone);
  }, [phone]);

  const detectedCountry = useMemo(() => {
    if (!normalizedPhone) return null;
    for (const country of Object.values(AFRICAN_COUNTRY_RULES)) {
      if (normalizedPhone.startsWith(country.code)) {
        return country;
      }
    }
    return null;
  }, [normalizedPhone]);

  // Copier le message dans le presse-papier
  const handleCopyMessage = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erreur lors de la copie presse-papier :', err);
    }
  };

  // Ouverture sécurisée de wa.me avec validation stricte de schéma et isolation de contexte
  const handleOpenWhatsApp = () => {
    if (!normalizedPhone) {
      alert('Veuillez renseigner un numéro de téléphone valide.');
      return;
    }

    // 1. Validation de sécurité : le numéro doit être strictement numérique (6 à 15 chiffres E.164)
    // Empêche toute tentative de passage de charge utile malveillante ou de caractères corrompus
    if (!/^\d{6,15}$/.test(normalizedPhone)) {
      alert('Le format du numéro de téléphone est invalide pour l\'expédition.');
      return;
    }

    // 2. Construction hermétique de l'URL wa.me via le service centralisé
    const whatsappUrl = buildSafeWhatsAppUrl(normalizedPhone, message);

    // 3. Contrôle d'intégrité de l'URL : interdiction absolue de tout schéma non HTTPS (ex: javascript:, data:)
    // et confinement au nom de domaine officiel 'wa.me'
    try {
      const parsedUrl = new URL(whatsappUrl);
      if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'wa.me') {
        console.error('Tentative d\'ouverture d\'une URL non autorisée ou compromise :', whatsappUrl);
        return;
      }
    } catch {
      console.error('Format d\'URL invalide :', whatsappUrl);
      return;
    }

    // 4. Ouverture sécurisée dans un nouvel onglet avec neutralisation explicite de window.opener
    // Préserve l'application contre les attaques de type reverse tabnabbing (rel="noopener noreferrer" programmatique)
    const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }

    if (onSent) {
      onSent();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-dark-surface rounded-[32px] border border-gray-100 dark:border-dark-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gray-50/50 dark:bg-dark-bg/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-black shadow-sm">
              <MessageSquare size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                {title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps de la modale */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Fiche destinataire & Numéro */}
          <div className="bg-gray-50 dark:bg-dark-bg/60 p-4 rounded-2xl border border-gray-100 dark:border-dark-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                <User size={14} className="text-primary" />
                <span>Destinataire :</span>
                <span className="text-gray-900 dark:text-white normal-case font-bold text-sm">
                  {recipientName || 'Client'}
                </span>
              </div>
              {detectedCountry && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-xs font-bold text-gray-700 dark:text-gray-300 shadow-xs">
                  <span>{detectedCountry.flag}</span>
                  <span className="text-[10px] uppercase font-black tracking-wider">{detectedCountry.name}</span>
                </span>
              )}
            </div>

            {/* Champ téléphone éditable avec normalisation automatique */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Phone size={16} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Numéro WhatsApp (ex: 0701020304 ou +225...)"
                className="w-full pl-10 pr-24 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  {normalizedPhone ? `+${normalizedPhone}` : 'Incomplet'}
                </span>
              </div>
            </div>

            {phone && normalizedPhone && (
              <p className="text-[11px] text-gray-500 font-medium">
                Format international : <strong className="text-[#128C7E] dark:text-[#25D366]">{formatPhoneNumberDisplay(phone)}</strong>
              </p>
            )}
          </div>

          {/* Éditeur de message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>Message à envoyer</span>
              </label>
              <span className="text-[10px] font-bold text-gray-400">
                {message.length} caractères
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rédigez votre message ici..."
                className="w-full p-4 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] transition-all resize-none custom-scrollbar leading-relaxed"
              />
            </div>

            {/* Astuce de formatage WhatsApp */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-400">
              <span>Conseil : utilisez <strong>*texte*</strong> pour le gras et <strong>_texte_</strong> pour l'italique.</span>
            </div>
          </div>
        </div>

        {/* Footer avec boutons d'actions */}
        <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50 flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyMessage}
            className={clsx(
              "w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all active:scale-[0.98]",
              copied
                ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800 text-green-700 dark:text-green-400"
                : "bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750"
            )}
          >
            {copied ? (
              <>
                <Check size={16} className="text-green-600 dark:text-green-400" />
                <span>Texte copié !</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copier le texte</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            disabled={!normalizedPhone}
            className="w-full sm:w-auto flex-[1.4] flex items-center justify-center gap-2.5 py-3.5 px-6 bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#25D366]/20 transition-all active:scale-[0.98]"
          >
            <ExternalLink size={16} />
            <span>Ouvrir WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
