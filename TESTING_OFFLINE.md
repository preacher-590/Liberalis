# Protocole de Test : Mode Hors-Ligne & En-Ligne (Libéralis PWA)

Ce document décrit la procédure pas-à-pas pour tester et vérifier le bon fonctionnement du moteur **Offline-First**, de la mise en cache locale, de la file d'attente de synchronisation et du Service Worker PWA de **Libéralis**.

---

## 🎯 Fonctionnalités à Valider

1. **Bannière Globale de Connectivité** : Détection temps réel de la perte et du rétablissement de connexion.
2. **Consultation Hors-Ligne (Read Offline)** : Accès instantané aux fiches clients, rendez-vous, factures et statistiques sans Internet.
3. **Créations / Modifications Hors-Ligne (Write Offline)** : Capacité de créer un client, planifier un RDV ou émettre une facture hors-ligne sans message d'erreur bloquant.
4. **File d'Attente de Synchronisation (Sync Queue)** : Empilement ordonné des opérations locales et comptage dynamique.
5. **Reconnexion & Synchronisation Automatique** : Rejeu séquentiel des requêtes vers l'API Laravel dès le retour du réseau.
6. **Rechargement F5 sans Réseau (PWA Service Worker)** : Disponibilité complète de l'application même lors d'un rafraîchissement à froid.

---

## 🛠️ Étape 0 : Démarrage de l'Environnement

Dans deux terminaux distincts :

```bash
# Terminal 1 : Backend API Laravel
cd liberalis-api
php artisan serve
# Accessible sur http://localhost:8000
```

```bash
# Terminal 2 : Frontend React / Vite
npm run dev
# Accessible sur http://localhost:5173
```

Connectez-vous à votre compte praticien sur `http://localhost:5173` pour initialiser le cache local avec vos données réelles.

---

## 🧪 Scénario 1 : Simulation de Coupure Réseau & Bannière

1. Ouvrez l'application dans Google Chrome ou Microsoft Edge (`http://localhost:5173`).
2. Ouvrez les **Outils de développement** (`F12` ou `Ctrl + Shift + I`).
3. Allez dans l'onglet **Réseau (Network)**.
4. Dans le sélecteur d'étranglement réseau (actuellement à *"No throttling"* ou *"Aucun bridage"*), sélectionnez **"Offline"** (ou **"Hors-ligne"**).
5. **Résultat attendu :**
   - La bannière ambre `ConnectivityBanner` apparaît instantanément en haut de l'écran :
     > ⚠️ *Mode Hors-ligne : Connexion Internet interrompue. Vos consultations et modifications restent accessibles en local.*

---

## 🧪 Scénario 2 : Consultation Hors-Ligne (Read Offline)

*En conservant le mode "Offline" activé dans l'inspecteur :*

1. Cliquez sur **Clients** dans la barre latérale :
   - La liste de vos clients s'affiche instantanément depuis le cache local (aucun spinner infini).
2. Cliquez sur **Agenda** :
   - Vos créneaux de consultations et rendez-vous planifiés apparaissent normalement.
3. Cliquez sur **Factures** :
   - Vos factures, montants et statuts sont immédiatement consultables.
4. **Résultat attendu :**
   - Toutes les pages de consultation fonctionnent à 100% de manière fluide et transparente.

---

## 🧪 Scénario 3 : Création Hors-Ligne & File de Synchronisation (Write Offline)

*Toujours en mode "Offline" dans l'inspecteur :*

1. Allez sur la page **Clients** et cliquez sur **"+ Nouveau Client"**.
2. Remplissez le formulaire :
   - Prénom : `Moussa`
   - Nom : `Traoré`
   - Téléphone : `0707070707`
   - Profession : `Entrepreneur`
3. Cliquez sur **"Enregistrer"** :
   - La modale se ferme sans aucune erreur.
   - Le nouveau client apparaît immédiatement en tête de votre liste avec son statut actif.
4. Regardez la bannière ambre en haut de l'écran :
   - Le badge **"1 en attente"** s'est incrémenté.
5. Allez sur l'onglet **Application** (ou *Stockage*) de DevTools ➔ **Local Storage** ➔ `http://localhost:5173` :
   - Inspectez la clé `liberalis_offline_sync_queue` : vous y voyez la requête `POST /clients` avec le payload complet en attente d'envoi.

---

## 🧪 Scénario 4 : Reconnexion et Synchronisation Automatique vers Laravel

1. Retournez dans l'onglet **Réseau (Network)** de DevTools.
2. Basculez à nouveau le sélecteur de *"Offline"* vers **"No throttling"** (Rétablissement de la connexion).
3. **Résultat attendu :**
   - L'événement `window.ononline` est capté immédiatement.
   - Le moteur de synchronisation rejoue la création du client vers `http://localhost:8000/api/clients`.
   - Vous pouvez observer la requête HTTP `POST /api/clients` passer au vert (Status `201 Created`) dans l'onglet Réseau.
   - Le badge *"1 en attente"* disparaît et un message de confirmation vert s'affiche brièvement :
     > ✅ *1 opération(s) synchronisée(s) avec succès.*
   - La file `liberalis_offline_sync_queue` dans le LocalStorage redevient vide (`[]`).
   - Le client est désormais définitivement persisté dans la base de données backend SQLite/MySQL.

---

## 🧪 Scénario 5 : Rechargement F5 sans Réseau (Service Worker PWA)

1. Remettez le réseau sur **"Offline"** dans l'onglet Network.
2. Appuyez sur **F5** (ou `Ctrl + R`) pour recharger entièrement la page.
3. **Résultat attendu :**
   - **Aucune page d'erreur Chrome "Pas de connexion Internet" (Dino)** !
   - Le Service Worker (`public/sw.js`) intercepte la navigation, sert l'App Shell (`index.html` + bundles JS/CSS) depuis son cache `liberalis-shell-v1`.
   - L'application redémarre instantanément et se réhydrate avec les données locales du praticien.

---

## 🧪 Scénario 6 : Mode Hors-Ligne Forcé dans les Paramètres

1. Remettez le réseau à la normale (**Online**).
2. Rendez-vous dans **Ma Configuration ➔ Paramètres**.
3. Activez l'interrupteur **"Mode hors-ligne"**.
4. **Résultat attendu :**
   - L'interrupteur passe au vert et la bannière ambre s'affiche :
     > ⚠️ *Mode hors-ligne forcé : Vos modifications sont enregistrées localement.*
   - Même si Internet fonctionne, l'application bloque les appels sortants et stocke toutes les opérations dans la file locale pour un usage déconnecté volontaire.
   - Désactivez l'interrupteur pour reprendre le fonctionnement en ligne normal.

---

## 📋 Tableau de Synthèse des Tests

| N° | Test | Action | Résultat Attendu | Statut |
|:--:|---|---|---|:---:|
| **1** | Détection Réseau | Network ➔ Offline | Affichage immédiat de la ConnectivityBanner | Validé |
| **2** | Read Offline | Navigation Agenda / Clients / Factures | Affichage fluide sans rechargement ni blocage | Validé |
| **3** | Write Offline | Création d'un client / RDV hors-ligne | Ajout optimiste dans la liste + Incrément compteur | Validé |
| **4** | Sync Queue | Inspection Local Storage | Stockage structuré dans `liberalis_offline_sync_queue` | Validé |
| **5** | Auto-Sync | Network ➔ Online | Envoi automatique vers Laravel + Vidage de la file | Validé |
| **6** | PWA Shell | F5 en mode Offline | Lancement instantané de l'application via `sw.js` | Validé |
| **7** | Toggle Manuel | Paramètres ➔ Mode hors-ligne | Forçage local avec persistance | Validé |
