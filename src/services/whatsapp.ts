/**
 * Service de partage et messagerie WhatsApp — Libéralis (Feat 12 & Zéro-Coût)
 *
 * Ce module gère :
 * 1. La normalisation intelligente des numéros de téléphone pour l'Afrique francophone
 *    (Côte d'Ivoire, Sénégal, Cameroun, Bénin, Togo, Mali, Burkina Faso, Gabon, Guinée, etc.).
 * 2. La génération de messages WhatsApp professionnels et chaleureux adaptés au contexte africain.
 * 3. La génération sécurisée d'URLs d'ouverture directe `https://wa.me/...`.
 *
 * Tous les contenus textuels sont rigoureusement encodés via encodeURIComponent
 * pour éviter les ruptures de chaîne ou les failles d'injection d'URL.
 */

/**
 * Interface pour les métadonnées de détection de pays téléphonique
 */
export interface AfricanCountryPhoneRule {
  code: string;        // Indicatif pays sans '+' (ex: "225")
  name: string;        // Nom du pays
  flag: string;        // Emoji drapeau
  localLength: number[]; // Longueurs nationales typiques hors indicatif
  prefixes?: string[]; // Préfixes locaux fréquents
}

/**
 * Registre des indicatifs et formats téléphoniques d'Afrique subsaharienne francophone
 */
export const AFRICAN_COUNTRY_RULES: Record<string, AfricanCountryPhoneRule> = {
  CI: {
    code: '225',
    name: "Côte d'Ivoire",
    flag: '🇨🇮',
    localLength: [10],
    prefixes: ['01', '05', '07', '21', '25', '27'], // Plan de numérotation ivoirien à 10 chiffres (2021)
  },
  SN: {
    code: '221',
    name: 'Sénégal',
    flag: '🇸🇳',
    localLength: [9],
    prefixes: ['70', '75', '76', '77', '78', '79', '33'], // Mobiles Sonatel, Free, Expresso
  },
  CM: {
    code: '237',
    name: 'Cameroun',
    flag: '🇨🇲',
    localLength: [9],
    prefixes: ['6', '2'], // 6xx pour le mobile (MTN, Orange, Nexttel), 2xx pour le fixe
  },
  BJ: {
    code: '229',
    name: 'Bénin',
    flag: '🇧🇯',
    localLength: [8, 10],
    prefixes: ['01', '90', '91', '94', '95', '96', '97', '61', '62', '66', '67', '69', '51', '52', '40'],
  },
  TG: {
    code: '228',
    name: 'Togo',
    flag: '🇹🇬',
    localLength: [8],
    prefixes: ['90', '91', '92', '93', '96', '97', '98', '99', '70', '71'], // Togocom & Moov
  },
  ML: {
    code: '223',
    name: 'Mali',
    flag: '🇲🇱',
    localLength: [8],
    prefixes: ['5', '6', '7', '8', '9', '2'], // Malitel & Orange Mali
  },
  BF: {
    code: '226',
    name: 'Burkina Faso',
    flag: '🇧🇫',
    localLength: [8],
    prefixes: ['5', '6', '7', '0'], // Orange, Moov, Telecel
  },
  GA: {
    code: '241',
    name: 'Gabon',
    flag: '🇬🇦',
    localLength: [8, 9],
    prefixes: ['06', '07', '6', '7'], // Airtel, Moov
  },
  GN: {
    code: '224',
    name: 'Guinée',
    flag: '🇬🇳',
    localLength: [9],
    prefixes: ['6'], // Orange GN, MTN, Cellcom
  },
  NE: {
    code: '227',
    name: 'Niger',
    flag: '🇳🇪',
    localLength: [8],
    prefixes: ['9', '8', '7'], // Airtel, Zamani, Moov
  },
  CD: {
    code: '243',
    name: 'RDC',
    flag: '🇨🇩',
    localLength: [9],
    prefixes: ['8', '9'], // Vodacom, Airtel, Orange
  },
  CG: {
    code: '242',
    name: 'Congo-Brazzaville',
    flag: '🇨🇬',
    localLength: [9],
    prefixes: ['04', '05', '06'], // MTN, Airtel
  },
};

/**
 * Normalise un numéro téléphonique pour l'API WhatsApp (wa.me)
 * en tenant compte des spécificités des réseaux de télécommunication africains.
 *
 * Logique appliquée :
 * 1. Nettoyage strict de tous les caractères non numériques (espaces, parenthèses, tirets, points, '+').
 * 2. Détection si le numéro possède déjà l'indicatif international (ex: 225, 221, 237...).
 * 3. Heuristique locale basée sur les préfixes et longueurs typiques de la région :
 *    - Côte d'Ivoire : 10 chiffres commençant par 01, 05 ou 07 -> 225 + numéro
 *    - Sénégal : 9 chiffres commençant par 70, 75, 76, 77, 78, 79 -> 221 + numéro
 *    - Cameroun : 9 chiffres commençant par 6 -> 237 + numéro
 *    - Bénin : 10 chiffres (commençant par 01) ou 8 chiffres -> 229 + numéro
 *    - Togo, Mali, Burkina Faso : 8 chiffres -> ajout de l'indicatif correspondant ou du pays par défaut
 * 4. Si aucune règle automatique ne correspond, applique l'indicatif du pays par défaut fourni (défaut: 225).
 *
 * @param phone Le numéro brut saisi par l'utilisateur
 * @param defaultCountryCode L'indicatif international par défaut (défaut '225' pour la Côte d'Ivoire)
 * @returns Le numéro normalisé sans '+' ni séparateurs, prêt pour wa.me
 */
export function normalizeAfricanPhoneNumber(phone: string, defaultCountryCode: string = '225'): string {
  // Validation préalable : retour immédiat si chaîne vide ou uniquement composée d'espaces
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';

  // Détection si l'utilisateur a explicitement saisi un indicatif international (+ ou 00)
  const hasExplicitPlus = trimmed.startsWith('+');
  const hasExplicit00 = trimmed.startsWith('00');
  const hadInternationalPrefix = hasExplicitPlus || hasExplicit00;

  // 1. Supprime tous les caractères non numériques
  let clean = trimmed.replace(/[^\d]/g, '');

  // Si commence par le préfixe international '00', le retirer pour obtenir l'indicatif pur
  if (hasExplicit00 && clean.startsWith('00')) {
    clean = clean.substring(2);
  }

  // Protection contre les numéros vides, trop courts (< 6 chiffres) ou sans chiffres exploitables
  if (!clean || clean.length < 6) {
    return '';
  }

  // 2. Vérifie si le numéro commence déjà par un indicatif pays africain répertorié
  for (const country of Object.values(AFRICAN_COUNTRY_RULES)) {
    if (clean.startsWith(country.code)) {
      // Vérifie si la longueur restante correspond aux standards du pays
      const rest = clean.substring(country.code.length);
      if (country.localLength.includes(rest.length)) {
        return clean;
      }
    }
  }

  // Si l'utilisateur a explicitement fourni un indicatif international (+ ou 00)
  // et que la longueur totale correspond au standard mondial E.164 (entre 8 et 15 chiffres)
  if (hadInternationalPrefix && clean.length >= 8 && clean.length <= 15) {
    return clean;
  }

  // Vérifie aussi si le numéro commence par un indicatif étranger usuel sans préfixe (France: 33, USA: 1, etc.)
  if ((clean.startsWith('33') && clean.length === 11) || (clean.startsWith('1') && clean.length === 11)) {
    return clean;
  }

  // 3. Détection heuristique des numéros locaux africains saisis sans indicatif

  // A) Côte d'Ivoire : 10 chiffres débutant par 01, 05, 07 (mobile) ou 21, 25, 27 (fixe)
  if (clean.length === 10 && /^(01|05|07|21|25|27)/.test(clean)) {
    return `225${clean}`;
  }

  // B) Sénégal : 9 chiffres débutant par 70, 75, 76, 77, 78, 79 ou 33
  if (clean.length === 9 && /^(70|75|76|77|78|79|33)/.test(clean)) {
    return `221${clean}`;
  }

  // C) Cameroun : 9 chiffres débutant par 6 (mobile) ou 2 (fixe)
  if (clean.length === 9 && /^[62]/.test(clean)) {
    return `237${clean}`;
  }

  // D) Gabon : 9 chiffres débutant par 06, 07 ou 8 chiffres débutant par 6, 7
  if (clean.length === 9 && /^(06|07)/.test(clean)) {
    return `241${clean.substring(1)}`;
  }
  if (clean.length === 8 && /^[67]/.test(clean)) {
    return `241${clean}`;
  }

  // E) Congo-Brazzaville : 9 chiffres débutant par 04, 05, 06
  if (clean.length === 9 && /^(04|05|06)/.test(clean)) {
    return `242${clean}`;
  }

  // F) Bénin : 10 chiffres (nouveau plan 2024 commençant par 01) ou 8 chiffres
  if (clean.length === 10 && clean.startsWith('01')) {
    return `229${clean}`;
  }
  if (clean.length === 8 && /^(90|91|94|95|96|97|61|62|66|67|69|51|52|40)/.test(clean)) {
    return `229${clean}`;
  }

  // G) Togo : 8 chiffres débutant par 90..93, 96..99, 70, 71
  if (clean.length === 8 && /^(9[0-36-9]|7[01])/.test(clean)) {
    return `228${clean}`;
  }

  // H) Mali : 8 chiffres débutant par 5, 6, 7, 8, 9, 2
  if (clean.length === 8 && /^[256789]/.test(clean) && defaultCountryCode === '223') {
    return `223${clean}`;
  }

  // I) Burkina Faso : 8 chiffres débutant par 5, 6, 7, 0
  if (clean.length === 8 && /^[0567]/.test(clean) && defaultCountryCode === '226') {
    return `226${clean}`;
  }

  // J) Fallback avec le pays par défaut : si le numéro a un zéro de tête, on le nettoie pour l'international
  // (Sauf en Côte d'Ivoire où le 0 initial fait partie intégrante du numéro à 10 chiffres : +225 07...)
  let formattedLocal = clean;
  if (defaultCountryCode !== '225' && formattedLocal.startsWith('0')) {
    formattedLocal = formattedLocal.substring(1);
  }

  // Si après tout cela, le numéro local résiduel est incomplet (< 8 chiffres), ne pas générer de faux numéro
  if (formattedLocal.length < 8) {
    return '';
  }

  return `${defaultCountryCode}${formattedLocal}`;
}

/**
 * Formate un numéro de téléphone pour un affichage lisible et aéré
 * Ex: "+225 07 12 34 56 78" ou "+221 77 123 45 67"
 */
export function formatPhoneNumberDisplay(phone: string): string {
  const normalized = normalizeAfricanPhoneNumber(phone);
  if (!normalized) return phone;

  // Côte d'Ivoire (225 + 10 chiffres)
  if (normalized.startsWith('225') && normalized.length === 13) {
    const num = normalized.substring(3);
    return `+225 ${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 6)} ${num.slice(6, 8)} ${num.slice(8, 10)}`;
  }

  // Sénégal (221 + 9 chiffres)
  if (normalized.startsWith('221') && normalized.length === 12) {
    const num = normalized.substring(3);
    return `+221 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
  }

  // Cameroun (237 + 9 chiffres)
  if (normalized.startsWith('237') && normalized.length === 12) {
    const num = normalized.substring(3);
    return `+237 ${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 9)}`;
  }

  // Format générique
  return `+${normalized}`;
}

// ========================================================================
// 1. RAPPEL DE RENDEZ-VOUS (Appointment Reminder)
// ========================================================================

/**
 * Génère le message de rappel d'un rendez-vous avec politesse et clarté.
 *
 * @param clientName - Prénom ou nom complet du client
 * @param date       - Date formatée du RDV (ex: "Jeudi 15 Mai 2026")
 * @param time       - Heure formatée du RDV (ex: "14h30")
 * @param location   - Nom du cabinet ou lieu de consultation
 * @param practitioner - (Optionnel) Nom du praticien ou professionnel
 * @returns Texte brut du message pré-rempli
 */
export function generateAppointmentReminderMessage(
  clientName: string,
  date: string,
  time: string,
  location: string,
  practitioner?: string
): string {
  const doctorIntro = practitioner ? ` avec *${practitioner}*` : '';
  const greeting = clientName ? `Bonjour *${clientName}*` : 'Bonjour';

  return (
    `${greeting},\n\n` +
    `Petit rappel pour votre rendez-vous${doctorIntro} prévu le *${date}* à *${time}*.\n` +
    `📍 Lieu : *${location}*\n\n` +
    `En cas d'empêchement, merci de nous prévenir au plus tôt afin de libérer ce créneau.\n\n` +
    `À très bientôt !\n` +
    `_Cabinet Libéralis_`
  );
}

/**
 * Construit une URL wa.me hermétiquement sécurisée contre toute injection de schéma malveillant
 * (ex: javascript:, data:, vbscript:) ou rupture de protocole (open redirect).
 *
 * Mesures de sécurité intégrées :
 * 1. Sanitization numérique absolue : le numéro de téléphone est filtré pour ne contenir STRICTEMENT
 *    que des chiffres (0-9). Tout caractère non-numérique, ponctuation ou code est éradiqué.
 * 2. Encodage contextuel strict : le paramètre 'text' est systématiquement encodé via encodeURIComponent.
 * 3. Ancrage de protocole rigide : l'URL est obligatoirement instanciée sous le schéma HTTPS absolu
 *    sur le domaine officiel 'https://wa.me/'.
 *
 * @param phone Numéro de téléphone brut ou normalisé
 * @param message Contenu textuel du message
 * @returns URL wa.me sécurisée et prête à l'emploi
 */
export function buildSafeWhatsAppUrl(phone: string, message: string = ''): string {
  const normalized = normalizeAfricanPhoneNumber(phone);
  // Élimination absolue de tout caractère non décimal résiduel (défense en profondeur)
  const sanitizedPhone = (normalized || '').replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(message || '');

  // Si le numéro assaini respecte les bornes internationales E.164 (6 à 15 chiffres)
  if (sanitizedPhone && sanitizedPhone.length >= 6 && sanitizedPhone.length <= 15) {
    return `https://wa.me/${sanitizedPhone}?text=${encodedText}`;
  }

  // Fallback si aucun numéro valide : ouvre WhatsApp avec le message prêt à être assigné à un contact
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Génère le lien wa.me complet et sécurisé pour le rappel de rendez-vous.
 * Reste 100% rétrocompatible avec la signature existante de l'application.
 */
export function generateAppointmentReminderLink(
  phone: string,
  date: string,
  time: string,
  location: string,
  clientName: string = '',
  practitioner?: string
): string {
  const message = generateAppointmentReminderMessage(clientName, date, time, location, practitioner);
  return buildSafeWhatsAppUrl(phone, message);
}

// ========================================================================
// 2. PARTAGE DE FACTURE (Invoice Share)
// ========================================================================

/**
 * Génère le message professionnel d'envoi / partage d'une facture.
 *
 * @param clientName    - Nom du client destinataire
 * @param invoiceNumber - Référence de la facture (ex: "F-2026-0089")
 * @param amount        - Montant total en FCFA (ou devise locale)
 * @param dueDate       - Date d'échéance formatée (ex: "30 Juin 2026")
 * @param cabinetName   - (Optionnel) Nom du cabinet émetteur
 * @returns Texte brut du message
 */
export function generateInvoiceShareMessage(
  clientName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  cabinetName: string = 'Cabinet Libéralis'
): string {
  const greeting = clientName ? `Bonjour *${clientName}*` : 'Bonjour';
  const amountStr = amount.toLocaleString('fr-FR');

  return (
    `${greeting},\n\n` +
    `Veuillez trouver ci-joint les détails de votre facture *${invoiceNumber}* émise par *${cabinetName}*.\n\n` +
    `💳 Montant total : *${amountStr} FCFA*\n` +
    `📅 Date d'échéance : *${dueDate}*\n\n` +
    `Le règlement peut être effectué par Mobile Money (Wave, Orange Money, MTN) ou virement bancaire.\n\n` +
    `C'est un honneur de vous accompagner. Merci de votre confiance.\n` +
    `Cordialement,\n` +
    `_${cabinetName}_`
  );
}

/**
 * Génère le lien wa.me sécurisé pour le partage d'une facture.
 */
export function generateInvoiceShareLink(
  phone: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  clientName: string = '',
  cabinetName: string = 'Cabinet Libéralis'
): string {
  const message = generateInvoiceShareMessage(clientName, invoiceNumber, amount, dueDate, cabinetName);
  return buildSafeWhatsAppUrl(phone, message);
}

/**
 * Alias de compatibilité pour le code existant appelant generateWhatsAppLink
 */
export function generateWhatsAppLink(
  phone: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  clientName: string = '',
  cabinetName: string = 'Cabinet Libéralis'
): string {
  return generateInvoiceShareLink(phone, invoiceNumber, amount, dueDate, clientName, cabinetName);
}

// ========================================================================
// 3. REÇU DE PAIEMENT (Payment Receipt)
// ========================================================================

/**
 * Génère le message d'accusé de réception et quittance de paiement.
 *
 * @param clientName     - Nom du client
 * @param invoiceNumber  - Numéro de la facture ou référence de quittance
 * @param amount         - Montant encaissé
 * @param paymentDate    - Date du versement (ex: "15 Mai 2026")
 * @param paymentMethod  - Mode de règlement (ex: "Wave", "Orange Money", "Espèces", "Virement")
 * @param cabinetName    - Nom du cabinet
 * @returns Texte brut du message
 */
export function generatePaymentReceiptMessage(
  clientName: string,
  invoiceNumber: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string = 'Mobile Money',
  cabinetName: string = 'Cabinet Libéralis'
): string {
  const greeting = clientName ? `Bonjour *${clientName}*` : 'Bonjour';
  const amountStr = amount.toLocaleString('fr-FR');

  return (
    `${greeting},\n\n` +
    `✅ *Confirmation de Paiement*\n\n` +
    `Nous vous confirmons la bonne réception de votre règlement concernant la facture *${invoiceNumber}*.\n\n` +
    `💰 Montant reçu : *${amountStr} FCFA*\n` +
    `📲 Mode de règlement : *${paymentMethod}*\n` +
    `📅 Date : *${paymentDate}*\n\n` +
    `Votre facture est désormais marquée comme *RÉGLÉE*. Merci pour votre ponctualité.\n\n` +
    `Bien cordialement,\n` +
    `_${cabinetName}_`
  );
}

/**
 * Génère le lien wa.me sécurisé pour l'envoi d'un reçu de paiement.
 */
export function generatePaymentReceiptLink(
  phone: string,
  invoiceNumber: string,
  amount: number,
  paymentDate: string,
  paymentMethod: string = 'Mobile Money',
  clientName: string = '',
  cabinetName: string = 'Cabinet Libéralis'
): string {
  const message = generatePaymentReceiptMessage(clientName, invoiceNumber, amount, paymentDate, paymentMethod, cabinetName);
  return buildSafeWhatsAppUrl(phone, message);
}
