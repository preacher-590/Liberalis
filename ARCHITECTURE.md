# Architecture Technique - Libéralis

Ce document décrit l'architecture globale de la plateforme **Libéralis**, une solution SaaS de gestion d'activité pour professionnels libéraux (avocats, médecins, consultants, psychologues, etc.).

---

## 1. Vue d'Ensemble & Stack Technique

Le projet repose sur une architecture découplée **Single Page Application (SPA) + API RESTful** :

```
┌────────────────────────────────────────────────────────┐
│              Frontend React / Vite (SPA)               │
│   TypeScript · TailwindCSS · Recharts · Lucide Icons   │
└───────────────────────────┬────────────────────────────┘
                            │  HTTPS / API REST (JSON)
                            │  Authorization: Bearer {token}
┌───────────────────────────▼────────────────────────────┐
│               Backend Laravel 11 API                   │
│      Sanctum Auth · Eloquent ORM · SQLite/MySQL        │
└────────────────────────────────────────────────────────┘
```

- **Frontend** (à la racine) : SPA React (Vite, TypeScript, React Router v6, Tailwind CSS).
- **Backend API** (dans `liberalis-api/`) : Framework Laravel 11 (PHP 8.2+), authentification API via **Laravel Sanctum**.

---

## 2. Modèle de Données & Isolation Multi-Tenant

### Concept d'isolation
Chaque professionnel libéral est représenté par un enregistrement dans la table `users`. **Toutes les données métier (clients, rendez-vous, factures, encaissements, notifications, comptes Mobile Money) sont strictement isolées par la clé étrangère `user_id`.**

```
                             ┌──────────────┐
                             │     User     │
                             │(Professionnel)
                             └──────┬───────┘
                                    │ 1
        ┌──────────────┬────────────┼────────────┬──────────────┐
        │ 1..N         │ 1..N       │ 1..N       │ 1..N         │ 1..N
┌───────▼──────┐ ┌─────▼──────┐ ┌───▼────┐ ┌─────▼──────┐ ┌─────▼─────────────┐
│    Client    │ │Appointment │ │Invoice │ │  Payment   │ │CompteMobileMoney  │
└───────┬──────┘ └────────────┘ └───┬────┘ └────────────┘ └───────────────────┘
        │ 1                         │ 1
        │ 1..N                      │ 1..N
        └──────────────┬────────────┘
                       │
             ┌─────────▼──────────┐
             │    InvoiceLine     │
             └────────────────────┘
```

### Relations principales
1. `User` ➔ `clients` (HasMany) : Liste des patients / clients gérés par le cabinet.
2. `User` ➔ `appointments` (HasMany) : Agendier des consultations.
3. `User` ➔ `invoices` (HasMany) : Factures émanant du cabinet.
4. `Client` ➔ `appointments` / `invoices` (HasMany) : Historique individuel par dossier.
5. `Invoice` ➔ `lines` (HasMany `InvoiceLine`) : Prestations détaillées composant la facture.
6. `Invoice` ➔ `payments` (HasMany) : Encaissements partiels ou solde de la facture.

---

## 3. Communication Frontend / Backend

- **Base URL** : Configuration via la variable d'environnement `VITE_API_URL` (par défaut `http://localhost:8000/api`).
- **Gestion des Tokens (Sanctum)** :
  1. À la connexion (`POST /api/login`), le serveur retourne un jeton API `plainTextToken`.
  2. Le frontend conserve ce jeton dans le `localStorage` sous la clé `auth_token`.
  3. L'intercepteur Axios dans `src/services/api.ts` attache automatiquement l'en-tête `Authorization: Bearer {token}` sur chaque requête.
  4. En cas de réponse `401 Unauthorized` (jeton expiré ou compte désactivé), le frontend efface les jetons locaux et redirige l'utilisateur vers `/login`.

---

## 4. Flux Métier Majeurs

### A. Flux Authentification & Session (`Auth.tsx` / `AuthController.php`)
1. **Connexion** : Saisie email/mot de passe ➔ vérification Hash Bcrypt ➔ invalide les anciens jetons Sanctum pour garantir une session unique ➔ retourne le jeton et les données utilisateur.
2. **Chargement d'application** : Au démarrage de la SPA, `AppProvider` vérifie `auth_user` et appelle `GET /api/me` pour valider le jeton.
3. **Contrôle d'accès Super Admin** : Les utilisateurs avec `role = 'admin'` ont accès au sous-menu d'administration globale (`/admin` et `/admin/users`).

### B. Flux Facturation ➔ Encaissement (`Factures.tsx` / `InvoiceController.php` / `PaymentController.php`)
1. **Création de facture** : Sélection d'un client ➔ saisie des lignes de prestation (quantité, prix unitaire) ➔ calcul automatique du sous-total et application d'éventuelles remises.
2. **Numérotation** : Génération du numéro selon le préfixe configuré par le professionnel (ex: `F-2026-0001`).
3. **Règlement / Marquage payée** :
   - Appel à `PATCH /api/invoices/{id}/mark-paid`.
   - Le statut passe à `payee`.
   - Création automatique d'un enregistrement `Payment` (`status: 'recu'`).
   - Création automatique d'une `Notification` interne ("Paiement confirmé").
   - **Règle de verrouillage** : Une facture payée est définitivement verrouillée contre toute modification ultérieure.

### C. Flux Rappels de Rendez-vous (`Agenda.tsx` / `SendAppointmentReminders.php`)
1. **Planification** : Prise de RDV dans l'agenda avec validation anti-chevauchement d'horaires.
2. **Traitement d'arrière-plan** : La commande planifiée `php artisan appointments:send-reminders` s'exécute régulièrement (toutes les 15 minutes).
3. **Distribution Email** :
   - Recherche des RDV à venir dans les 24h avec `email_sent = false`.
   - Vérification si le praticien a activé les rappels (`email_reminders = true`) et si le client possède une adresse e-mail.
   - Envoi de la notification `AppointmentReminderEmail` avec remplacement dynamique des variables (`{nom_client}`, `{nom_docteur}`, `{date_rdv}`, `{heure_rdv}`).
   - Marquage `email_sent = true` pour empêcher les doublons.

### D. Flux Supervision Super Admin & Permissions Modulaires (`AdminDashboard.tsx` / `AdminController.php`)
1. **Aiguillage automatique** : Lors de la connexion ou à la racine (`/`), l'utilisateur `admin` est directement dirigé vers son Dashboard de Supervision (`/admin`), tandis que le praticien `pro` est orienté vers son espace cabinet (`/dashboard`).
2. **Supervision multi-comptes** : Le Super Admin accède à des statistiques agrégées (inscriptions, spécialités, volumes encaissés globaux) et à un grand tableau supervisant tous les comptes avec compteurs d'activité individuels (clients, RDV, factures, total encaissé).
3. **Contrôle d'accès aux menus** :
   - Le Super Admin peut activer ou désactiver individuellement chaque menu (`agenda`, `clients`, `factures`, `mobile_money`, `rapports`) pour chaque compte pro via `PATCH /api/admin/users/{id}/menus`.
   - Les permissions sont stockées dans la colonne JSON `allowed_menus` de la table `users`.
   - Côté frontend, `Sidebar.tsx` masque les menus révoqués, et `ModuleGuard` dans `App.tsx` bloque toute tentative d'accès direct par URL en affichant un écran explicatif `RestrictedModule.tsx`.

---

## 5. Pratiques de Développement & Sécurité

- **Multi-tenant strict** : Toutes les requêtes d'accès aux modèles s'appuient sur `$request->user()->relation()` ou des vérifications `abort_if($entity->user_id !== $user->id, 403)`.
- **Protection contre l'élévation de privilèges** : Le champ `role` dans `User.php` est volontairement absent de `$fillable` pour bloquer les attaques par Mass Assignment. La promotion s'effectue exclusivement via la CLI (`php artisan admin:promote`).
