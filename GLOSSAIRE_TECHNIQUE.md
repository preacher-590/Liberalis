# 📖 Glossaire & Lexique Simplifié de Libéralis

> **Objectif :** Démystifier tous les termes techniques utilisés dans l'architecture et le développement de **Libéralis**. Chaque notion est expliquée avec des mots simples, une analogie concrète de la vie courante et son cas d'usage réel pour un praticien (médecin, avocat, consultant).
>
> 🔄 *Ce document est vivant : il sera enrichi à chaque fois qu'un nouveau concept technique sera abordé.*

---

## 📑 Sommaire Thématique

1. [Connectivité & Expérience Hors-Ligne (Offline-First, PWA, Service Worker)](#1-connectivité--expérience-hors-ligne)
2. [Stockage & Mémoire Locale (LocalStorage, IndexedDB, Cache)](#2-stockage--mémoire-locale)
3. [Synchronisation & Conflits (Sync Queue, Mise à jour optimiste, OCC)](#3-synchronisation--conflits)
4. [Sécurité & Confidentialité (Chiffrement AES-GCM, PBKDF2, IV, IDOR)](#4-sécurité--confidentialité)
5. [Communications & Réseau (Deep Linking WhatsApp, Webhooks, E.164, Rate Limiting)](#5-communications--réseau)
6. [Expérience Utilisateur & Retours Visuels (Notification Toast, Validation Client/Serveur, Affordance)](#6-expérience-utilisateur--retours-visuels)
7. [Déploiement & Tests Mobiles (Contexte Sécurisé, Port Forwarding, Tunnel HTTPS)](#7-déploiement--tests-mobiles)

---

## 1. Connectivité & Expérience Hors-Ligne

### 🌐 Mode Offline-First (Priorité au Hors-Ligne)
* **C'est quoi ?** Une manière de concevoir l'application pour qu'elle fonctionne d'abord sur l'appareil de l'utilisateur, même sans connexion Internet, au lieu de dépendre en permanence d'un serveur distant.
* **L'analogie :** C'est comme un carnet de notes papier que vous avez toujours dans votre sacoche : vous pouvez l'ouvrir, lire vos rendez-vous et écrire dedans n'importe où, même dans un sous-sol sans réseau.
* **Cas d'usage Libéralis :** Un médecin se rend en consultation à domicile dans une zone mal couverte par la 4G. Il ouvre Libéralis sur sa tablette : l'application s'affiche instantanément avec le dossier de son patient, sans afficher de page d'erreur de chargement.

---

### 📲 PWA (Progressive Web App)
* **C'est quoi ?** Un site web qui a été enrichi pour se comporter exactement comme une application mobile native (qu'on installerait depuis le Play Store ou l'App Store). Elle peut s'installer sur l'écran d'accueil du smartphone ou du PC.
* **L'analogie :** C'est un caméléon : c'est un site internet dans le navigateur, mais dès que vous l'installez, il a sa propre icône, s'ouvre en plein écran sans barre d'adresse, et démarre sans connexion.
* **Cas d'usage Libéralis :** L'avocat installe Libéralis sur son ordinateur portable. Même dans la salle des pas perdus du tribunal sans Wi-Fi, il clique sur l'icône Libéralis sur son bureau et l'application s'ouvre en une fraction de seconde.

---

### ⚙️ Service Worker
* **C'est quoi ?** Un petit programme invisible qui tourne en tâche de fond dans le navigateur web, entre l'application et Internet. C'est le "gardien d'aiguillage" du réseau.
* **L'analogie :** C'est comme le secrétaire du cabinet qui se tient à l'entrée : quand le médecin demande un dossier, le secrétaire regarde s'il l'a déjà sous la main dans le tiroir du cabinet. Si oui, il le donne immédiatement. Si la poste est fermée (pas d'Internet), il utilise ce qu'il a déjà en stock.
* **Cas d'usage Libéralis :** Lorsque vous appuyez sur la touche `F5` (recharger la page) alors que le Wi-Fi est éteint, le Service Worker intercepte la demande et fournit directement les fichiers visuels stockés sur l'appareil. Résultat : pas de page d'erreur "Dinosaure" de Google Chrome.

---

### 🐚 App Shell (Coquille Applicative)
* **C'est quoi ?** L'ossature graphique de base de l'application : la barre du haut, le menu de gauche, les boutons, les logos et la mise en page, sans les données de vos clients.
* **L'analogie :** C'est le meuble classeur vide dans votre bureau. Même si aucun dossier n'est encore posé dedans, le meuble et les tiroirs sont déjà là, prêts à l'emploi.
* **Cas d'usage Libéralis :** Le Service Worker garde cette "coquille" en mémoire sur votre téléphone. Quand vous ouvrez Libéralis, l'interface graphique est visible en 0 seconde, puis les données de vos clients viennent se glisser dedans.

---

## 2. Stockage & Mémoire Locale

### 🗄️ LocalStorage vs IndexedDB

| Critère | LocalStorage | **IndexedDB** (Adopté dans Libéralis) |
|---|---|---|
| **Capacité** | Limitée à ~5 Mo (bloquant) | **Virtuellement illimitée** (Giga-octets) |
| **Fonctionnement** | Synchrone (bloque l'écran si lourd) | **Asynchrone** (tourne en coulisse sans bloquer l'écran) |
| **Données adaptées** | Petits réglages (thème sombre, token) | **Grosses collections** (1 000 factures, dossiers patients) |

* **L'analogie :** 
  * Le *LocalStorage*, c'est un petit pense-bête Post-it collé sur votre écran (vite plein, si on écrit trop dessus on ne voit plus rien).
  * L'*IndexedDB*, c'est une véritable armoire d'archives dans la pièce voisine, capable de contenir des milliers de classeurs sans encombrer votre bureau.
* **Cas d'usage Libéralis :** Au lieu de saturer le navigateur avec des années d'historique de consultations, Libéralis utilise IndexedDB pour stocker des milliers de fiches clients et d'historiques comptables sans jamais ralentir l'affichage.

---

### ⚡ Stratégies de Cache (Cache-First / Network-First / Stale-While-Revalidate)
* **C'est quoi ?** La règle de décision que suit l'application pour choisir où aller chercher une information (sur l'appareil ou sur Internet).
* **Les 3 variantes :**
  1. **Cache-First (Priorité au Local)** : On regarde d'abord sur l'appareil. S'il y est, on l'affiche tout de suite (idéal pour les icônes, les logos et les polices d'écriture qui ne changent jamais).
  2. **Network-First (Priorité au Réseau)** : On tente d'abord de joindre le serveur pour avoir la version la plus fraîche. Si le réseau est coupé, on se rabat sur la copie locale de secours.
  3. **Stale-While-Revalidate (Affiche tout de suite, mets à jour en silence)** : On affiche immédiatement la copie locale qu'on a sous la main, et en arrière-plan, l'application va discrètement chercher les nouveautés sur Internet pour actualiser l'écran.

---

## 3. Synchronisation & Conflits

### 📋 Sync Queue (File d'attente FIFO)
* **C'est quoi ?** Une liste d'attente qui enregistre dans l'ordre chronologique (*First In, First Out* - Premier entré, premier sorti) toutes les actions effectuées sans Internet.
* **L'analogie :** C'est une boîte aux lettres de départ : vous y déposez vos courriers au fur et à mesure de la journée. Dès que le facteur passe (le retour de la 4G), il prend les lettres dans l'ordre où vous les avez écrites pour les poster.
* **Cas d'usage Libéralis :** En visite hors-ligne, vous créez 2 patients et planifiez 1 rendez-vous. Libéralis place ces 3 actions dans la file d'attente. Dès que votre smartphone capte à nouveau le réseau, la file se vide automatiquement et envoie les 3 actions au serveur sans que vous n'ayez rien à faire.

---

### ⚡ Mise à jour Optimiste (Optimistic UI)
* **C'est quoi ?** Le fait de mettre à jour l'écran immédiatement comme si l'action avait déjà réussi sur le serveur, sans attendre la réponse du réseau.
* **L'analogie :** Quand vous allumez un interrupteur, vous vous attendez à ce que la lumière s'allume immédiatement, vous n'attendez pas un accusé de réception de la compagnie d'électricité.
* **Cas d'usage Libéralis :** Quand vous cliquez sur "Créer le client" en pleine brousse sans réseau, la modale se ferme tout de suite et le client s'affiche dans votre tableau. Libéralis fait le pari "optimiste" que l'opération sera validée par le serveur dès le retour de la connexion.

---

### ⚔️ Optimistic Concurrency Control (OCC) / Conflit de Concurrence (HTTP 409)
* **C'est quoi ?** Un système qui évite que deux personnes n'écrasent le travail de l'autre sans le savoir.
* **L'analogie :** Imaginez que le médecin modifie l'adresse d'un patient sur son carnet hors-ligne à 14h00. Mais à 14h15, sa secrétaire au cabinet a changé le numéro de téléphone du même patient sur l'ordinateur central. Quand le médecin reconnecte son appareil à 15h00, on ne doit pas écraser silencieusement la modification de la secrétaire !
* **Cas d'usage Libéralis :** Libéralis attache une étiquette d'horodatage (`X-Client-Updated-At`) à chaque modification. Si le serveur constate qu'une modification plus récente a déjà eu lieu, il renvoie un code d'alerte (`409 Conflict`) et la bannière prévient le praticien au lieu de détruire les données.

---

## 4. Sécurité & Confidentialité

### 🔐 Chiffrement au Repos (Encryption at Rest)
* **C'est quoi ?** Rendre les données illisibles tant qu'elles dorment dans la mémoire de l'ordinateur ou du téléphone.
* **L'analogie :** C'est ranger ses dossiers de consultation dans un coffre-fort fermé à clé avec combinaison, plutôt que de laisser des feuilles volantes avec le nom des patients étalées sur la table du salon.
* **Cas d'usage Libéralis :** Si un confrère ou un tiers emprunte l'ordinateur du médecin et ouvre les outils techniques du navigateur, il ne verra que des suites de caractères incompréhensibles (`dGhpcyBpcyBhbiBlbmNyeXB0ZWQ...`) et ne pourra pas lire les dossiers médicaux des patients.

---

### 🛡️ Web Crypto API, AES-GCM 256 bits, PBKDF2 et IV
* **Web Crypto API** : Le moteur de cryptographie professionnel directement intégré au cœur des navigateurs modernes, ultra-sécurisé et optimisé par la puce de l'appareil.
* **AES-GCM 256 bits** : Le standard mondial de chiffrement militaire. "256 bits" signifie qu'il existe tellement de combinaisons de clés possibles qu'il faudrait des milliards d'années à tous les supercalculateurs de la planète pour casser le code.
* **PBKDF2** : Une moulinette mathématique qui fait tourner la clé 100 000 fois de suite. Cela rend impossible pour un pirate de tester des millions de mots de passe par seconde.
* **IV (Vecteur d'Initialisation)** : Un ingrédient aléatoire unique ajouté à chaque enregistrement. Grâce à lui, si vous écrivez deux fois le même mot "Consultation", le résultat chiffré sera totalement différent les deux fois, empêchant les espions de deviner des répétitions.

---

### 🚪 Faille IDOR (Insecure Direct Object References) & Multi-Tenant
* **Multi-Tenant (Multi-locataires)** : Une architecture où des milliers de praticiens utilisent le même logiciel et le même serveur, mais avec une cloison étanche absolue entre leurs données.
* **IDOR (Référence Directe Non Sécurisée)** : Une faille de sécurité où un utilisateur mal intentionné changerait un chiffre dans l'adresse web (ex: passer de `appointments/12` à `appointments/13`) pour tenter de voir le dossier d'un confrère.
* **Protection Libéralis :** L'API vérifie systématiquement que chaque donnée demandée appartient obligatoirement au praticien connecté (`$request->user()->appointments()->findOrFail($id)`). Si l'ID appartient à un autre, le serveur renvoie une erreur 404 comme si le rendez-vous n'existait pas du tout.

---

## 5. Communications & Réseau

### 💬 Deep Linking WhatsApp (`wa.me`) vs WhatsApp Cloud API
* **WhatsApp Cloud API (Payant)** : Passerelle payante de Meta facturée à chaque message envoyé, demandant une validation d'entreprise complexe et une carte bancaire internationale.
* **Deep Linking universel `wa.me` (Zéro Coût)** : Un lien internet spécial qui ouvre directement l'application WhatsApp déjà installée sur votre téléphone ou votre ordinateur, avec le numéro du client et le texte de la facture déjà rédigés.
* **Cas d'usage Libéralis :** En un clic sur "Envoyer sur WhatsApp", Libéralis lance votre WhatsApp habituel avec le message : *"Bonjour Moussa, voici votre facture F-2026-001 de 25 000 FCFA..."*. Coût : **0 FCFA**.

---

### 📞 Format E.164 (Normalisation des Téléphones)
* **C'est quoi ?** La norme internationale standardisée pour écrire les numéros de téléphone de façon universelle dans le monde entier : `+[indicatif pays][numéro sans le 0 inicial]`.
* **Exemples :**
  * Côte d'Ivoire (10 chiffres) : `07 07 07 07 07` ➔ `+2250707070707`
  * Sénégal (9 chiffres) : `77 123 45 67` ➔ `+221771234567`
* **Cas d'usage Libéralis :** Quelle que soit la manière dont le praticien tape le numéro (avec espaces, tirets ou sans indicatif), Libéralis le nettoie et le convertit au format E.164 pour que les liens WhatsApp et SMS s'ouvrent sans jamais faire d'erreur de destinataire.

---

### 🔔 Webhook (Ex: Paiements Mobile Money Wave / Orange Money)
* **C'est quoi ?** Une sonnette numérique automatique entre deux serveurs informatiques.
* **L'analogie :** 
  * Méthode classique (Polling) : Vous allez voir toutes les 5 minutes à votre porte si le facteur est arrivé.
  * Méthode Webhook : Vous restez assis dans votre bureau. Quand le facteur arrive, il appuie sur la sonnette pour vous avertir instantanément.
* **Cas d'usage Libéralis :** Lorsqu'un patient règle une consultation avec son application Wave ou Orange Money, le serveur de Wave appelle immédiatement la "sonnette" de Libéralis (`POST /api/webhooks/wave`). En une demi-seconde, la facture passe en statut "Payée" et le praticien reçoit une notification sur son écran, sans rien avoir à vérifier manuellement.

---

### 🚦 Rate Limiting (Throttle)
* **C'est quoi ?** Un limiteur de vitesse imposé aux requêtes envoyées à l'API pour protéger le serveur contre les surcharges et les robots malveillants.
* **L'analogie :** Le tourniquet de sécurité dans le hall d'une banque qui ne laisse passer qu'une personne toutes les 3 secondes pour éviter les bousculades.
* **Cas d'usage Libéralis :** L'action d'envoi de rappel est limitée à 10 requêtes par minute (`throttle:10,1`). Si un script tente de bombarder le serveur de milliers de clics pour faire sauter le quota d'emails gratuits Brevo, le serveur bloque l'abus avec une erreur `429 Too Many Requests`.

---

### ✉️ SMTP (Brevo) & Tolérance aux pannes (Fault Tolerance)
* **SMTP** : Le protocole standard universel pour envoyer des e-mails sur Internet.
* **Tolérance aux pannes (Fault Tolerance)** : Une technique de programmation défensive (`try/catch`). Si un service secondaire (comme l'envoi d'e-mails) tombe en panne ou n'a pas de réseau, l'application ne s'arrête pas : elle consigne le problème dans son journal et continue d'exécuter la suite (comme l'ouverture du message WhatsApp).
* **Cas d'usage Libéralis :** Si les serveurs d'e-mails sont temporairement coupés à l'autre bout du monde, le médecin ne voit aucun écran rouge d'erreur technique 500 : Libéralis prépare immédiatement son lien WhatsApp pour qu'il puisse prévenir son patient en consultation sans aucun retard.

---

## 6. Expérience Utilisateur & Retours Visuels

### 🍞 Toast Notification (Bannière Flottante Éphémère)
* **C'est quoi ?** Un petit message visuel qui apparaît discrètement en haut ou dans un coin de l'écran pour confirmer une action (ou expliquer une erreur), puis s'estompe tout seul après quelques secondes sans bloquer l'écran.
* **L'analogie :** Le "Bip" sonore et la lumière verte d'un terminal de paiement par carte : dès que vous posez votre carte, le terminal bipe en vert pour confirmer immédiatement que le paiement est validé. Vous n'avez pas besoin de demander au caissier "Est-ce que ça a marché ?".
* **Cas d'usage Libéralis :** Quand vous cliquez sur "Sauvegarder" dans vos paramètres, une bannière vert émeraude apparaît en haut de l'écran en disant : *"Paramètres enregistrés avec succès !"*. Si votre connexion a coupé ou si un champ est mal rempli, elle s'affiche en rouge en expliquant précisément ce qui ne va pas (ex: *"L'adresse email est déjà prise"* ou *"Numéro de téléphone invalide"*).

---

### 🛡️ Validation Client vs Validation Serveur (Zod vs Laravel)
* **C'est quoi ?** Le double contrôle de sécurité des informations que vous tapez :
  1. **Validation Côté Client (dans le navigateur avec Zod)** : Vérifie instantanément le format avant même d'envoyer la demande sur Internet (ex: y a-t-il bien un `@` dans l'e-mail ? Le nom fait-il au moins 2 lettres ?).
  2. **Validation Côté Serveur (dans Laravel)** : Vérifie les règles métier profondes dans la base de données (ex: cette adresse email appartient-elle déjà à un autre médecin inscrit ?).
* **L'analogie :** 
  * La validation client, c'est l'agent d'accueil à l'entrée de la clinique qui vérifie si vous avez bien rempli toutes les cases de votre formulaire d'arrivée. S'il manque votre numéro de téléphone, il vous le rend tout de suite sans vous faire attendre en salle d'attente.
  * La validation serveur, c'est le médecin qui vérifie dans les archives médicales si votre numéro d'assurance est bien valide et actif.
* **Cas d'usage Libéralis :** Si vous effacez par mégarde votre numéro de téléphone et cliquez sur "Sauvegarder", Libéralis vous prévient immédiatement sur votre écran sans consommer votre forfait internet. Si vous saisissez un email déjà utilisé par un confrère, le serveur renvoie une erreur explicite que Libéralis traduit en français clair.

---

### 💡 Affordance & Feedback d'État (Bouton Interactif)
* **C'est quoi ?** La capacité visuelle d'un bouton à indiquer son état exact en temps réel (au repos, en cours de traitement, validé ou désactivé).
* **L'analogie :** Le bouton d'appel d'un ascenseur. Quand vous appuyez dessus, il s'allume immédiatement en orange : vous savez qu'il a compris votre demande et vous n'avez pas besoin d'appuyer 15 fois de suite nerveusement.
* **Cas d'usage Libéralis :** Dès que vous cliquez sur "Sauvegarder", le bouton affiche une petite roue qui tourne avec le texte *"Enregistrement en cours..."* et se verrouille pour éviter de cliquer deux fois. Dès que l'enregistrement est terminé, il passe en vert avec une coche : *"Paramètres enregistrés !"*.

---

## 7. Déploiement & Tests Mobiles

### 🔒 Contexte Sécurisé (Secure Context & Règle HTTPS)
* **C'est quoi ?** Une règle de sécurité stricte imposée par Google Chrome, Apple Safari et Firefox : les fonctionnalités avancées comme les Service Workers (le moteur hors-ligne PWA), la géolocalisation ou la caméra ne sont autorisées **que** sur une adresse sécurisée (`https://`) ou sur `localhost`.
* **L'analogie :** Une pièce d'identité avec puce sécurisée exigée à l'embarquement d'un avion. Même si vous avez votre billet (le code fonctionne), l'aéroport bloque l'accès si vous n'avez pas de document sécurisé certifié.
* **Cas d'usage Libéralis :** Si vous tapez l'adresse IP de votre PC (`http://192.168.1.64:5173`) directement dans Chrome sur votre smartphone, Chrome refuse d'activer le Service Worker parce qu'il n'y a pas de cadenas vert (HTTPS). Pour débloquer l'installation PWA sur mobile, on utilise soit la **redirection de port USB** (qui fait passer la connexion pour `localhost`), soit un **tunnel HTTPS**.

---

### 🔌 Port Forwarding USB (Redirection de Port)
* **C'est quoi ?** Une passerelle créée par un simple câble USB entre votre ordinateur et votre smartphone Android, permettant au téléphone d'accéder aux serveurs locaux de votre PC comme s'ils tournaient directement à l'intérieur du téléphone.
* **L'analogie :** Un cordon ombilical ou une passerelle directe entre deux pièces voisines : au lieu de faire le grand tour par la rue (le Wi-Fi ou Internet), le téléphone passe directement par le câble.
* **Cas d'usage Libéralis :** Vous branchez votre téléphone en USB et ouvrez `chrome://inspect` sur votre PC. En tapant `http://localhost:5173` sur le Chrome de votre téléphone, votre application s'ouvre, bénéficie du statut sécurisé `localhost`, et le bouton *"Installer Libéralis sur l'écran d'accueil"* s'affiche instantanément !

---

### 🚇 Tunnel HTTPS (Localtunnel / Cloudflare Tunnel)
* **C'est quoi ?** Un pont sécurisé temporaire créé sur Internet qui donne à votre serveur local (`localhost:5173`) une véritable adresse web publique en `https://...` accessible depuis n'importe quel smartphone (iPhone ou Android) sans aucun câble.
* **L'analogie :** Un numéro de téléphone temporaire ou un code d'accès provisoire que vous donnez à un livreur pour qu'il puisse ouvrir la porte de votre immeuble depuis l'extérieur.
* **Cas d'usage Libéralis :** Vous lancez la commande `npx localtunnel --port 5173` sur votre PC. Elle vous génère une URL comme `https://mon-cabinet.loca.lt`. Vous l'ouvrez sur votre iPhone ou le smartphone de vos collaborateurs pour tester la PWA en conditions réelles 4G/Wi-Fi.

---

### 🔄 Proxy Inverse de Développement (Vite Reverse Proxy)
* **C'est quoi ?** Un relais transparent configuré dans Vite qui prend les demandes d'API envoyées par l'application (`/api`) et les transmet automatiquement en coulisses au serveur backend (Laravel sur le port `8000`), sans que le navigateur mobile n'ait besoin de connaître l'adresse du serveur backend.
* **L'analogie :** Le concierge d'un hôtel : le client à l'accueil lui remet une enveloppe pour la direction. Le client n'a pas besoin de monter au 8ème étage ni de connaître le code de sécurité de la porte du directeur : le concierge s'en charge directement en interne.
* **Cas d'usage Libéralis :** Lorsque vous ouvrez Libéralis sur votre smartphone en Wi-Fi (`http://192.168.1.64:5173`), votre téléphone n'appelle que le port `5173`. Le proxy Vite relaie en direct vos requêtes de connexion vers Laravel (`localhost:8000`) : vous évitez ainsi les blocages de sécurité (CORS) et les erreurs d'adresses IP inaccessibles.



